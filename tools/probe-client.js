/* probe-client.js — the page half of tools/probe.mjs (the REMOTE PROBE).  The probe server adds
 *   <script src="/__probe/client.js"></script>
 * as the first thing in <head> of every HTML page it serves; nothing in the kit or the app carries it.  It reports to the server the
 * device, everything that goes wrong (console, errors, rejections, CSP, WebGPU device loss and uncaptured errors, WebGL context loss),
 * what the user does (taps, gestures, keys: the key only, never text typed into a field), the frame timings while the page animates,
 * and it runs the scripts this machine queues (see docs/PROBE.md).
 * Plain script, no modules, nothing newer than ES2018 (old Safari).  It must never break the page: everything is in try / catch, and
 * when the server cannot be reached it goes quiet and retries slowly.  ?probe=quiet in the URL hides the status dot. */
(function () {
  'use strict';
  if (window.__probe) return;
  var BASE = '/__probe/';
  var nowMs = function () { try { return Math.round(performance.now() * 10) / 10; } catch (e) { return Date.now(); } };
  var pad = function (n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; };
  var d0 = new Date();
  var SID = d0.getFullYear() + pad(d0.getMonth() + 1) + pad(d0.getDate()) + '-' + pad(d0.getHours()) + pad(d0.getMinutes()) + pad(d0.getSeconds()) + '-' + Math.random().toString(36).slice(2, 6);
  var quiet = false; try { quiet = /(^|[?&])probe=quiet(&|$)/.test(location.search); } catch (e) {}
  var nativeRaf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(function () { f(nowMs()); }, 16); };

  /* ---------- safe serialisation: strings cut at 2,000 characters, objects to depth 3, errors with their stack ---------- */
  function describe(el) {
    try {
      if (!el) return null;
      if (el === window) return 'window'; if (el === document) return 'document';
      if (!el.tagName) return String(el.nodeName || el);
      var s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      var cls = el.className && typeof el.className === 'object' ? el.className.baseVal : el.className;
      if (cls) s += '.' + String(cls).trim().split(/\s+/).slice(0, 4).join('.');
      var data = []; if (el.attributes) for (var i = 0; i < el.attributes.length && data.length < 4; i++) { var a = el.attributes[i].name; if (a.indexOf('data-') === 0) data.push(a.slice(5)); }
      if (data.length) s += '[' + data.join(',') + ']';
      var label = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('data-label') || el.getAttribute('title'));
      if (label) s += ' "' + String(label).slice(0, 40) + '"';
      return s;
    } catch (e) { return '?'; }
  }
  function ser(v, depth, cap, seen) {
    cap = cap || 2000; seen = seen || [];
    try {
      if (v === null || v === undefined) return v === null ? null : '(undefined)';
      var t = typeof v;
      if (t === 'string') return v.length > cap ? v.slice(0, cap) + '…(' + v.length + ')' : v;
      if (t === 'number') return isFinite(v) ? v : String(v);
      if (t === 'boolean') return v;
      if (t === 'bigint') return String(v) + 'n';
      if (t === 'symbol') return String(v);
      if (t === 'function') return '(function ' + (v.name || 'anonymous') + ')';
      if (v instanceof Error || (v && typeof v.message === 'string' && typeof v.stack === 'string')) return { error: v.name || 'Error', message: ser(v.message, 0, cap), stack: ser(String(v.stack || ''), 0, cap) };
      if (typeof Element !== 'undefined' && v instanceof Element) return '<' + describe(v) + '>';
      if (v === window) return '(window)';
      if (seen.indexOf(v) >= 0) return '(cycle)';
      if (depth <= 0) return Array.isArray(v) ? '(array ' + v.length + ')' : '(' + ((v.constructor && v.constructor.name) || 'object') + ')';
      if (ArrayBuffer.isView && ArrayBuffer.isView(v)) return '(' + v.constructor.name + ' ' + v.length + ')';
      seen.push(v);
      var out;
      if (Array.isArray(v)) { out = []; for (var i = 0; i < v.length && i < 50; i++) out.push(ser(v[i], depth - 1, cap, seen)); if (v.length > 50) out.push('…(' + v.length + ')'); }
      else {
        out = {}; var n = 0;
        for (var k in v) { if (n++ >= 50) { out['…'] = 'more keys'; break; } var x; try { x = v[k]; } catch (e) { x = '(throws)'; } out[k] = k === '__png' ? x : ser(x, depth - 1, cap, seen); }
      }
      seen.pop();
      return out;
    } catch (e) { return '(unserialisable)'; }
  }

  /* ---------- the queue: batched, posted every half second, capped (the oldest are dropped and counted) ---------- */
  var CAP = 2000, queue = [], dropped = 0, ready = false, inflight = false, failures = 0, nextTry = 0, dot = null, okState = null;
  function rec(k, o) {
    try {
      var r = o || {}; r.k = k; r.t = nowMs();
      queue.push(r);
      if (queue.length > CAP) { dropped += queue.length - CAP; queue.splice(0, queue.length - CAP); }
    } catch (e) {}
  }
  function mark(ok) {
    okState = ok;
    try { if (dot) dot.style.background = ok ? '#2bd46b' : '#ff4040'; } catch (e) {}
  }
  function post(path, body) {
    return fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body), cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r; });
  }
  function take() {
    var batch = queue.splice(0, 200);
    if (dropped) { batch.unshift({ k: 'dropped', t: nowMs(), n: dropped }); dropped = 0; }
    return batch;
  }
  function flush() {
    try {
      if (!ready || inflight || !queue.length && !dropped) return;
      if (Date.now() < nextTry) return;
      var batch = take(); inflight = true;
      post('log', { s: SID, recs: batch }).then(function () { inflight = false; failures = 0; nextTry = 0; mark(true); },
        function () {
          inflight = false; failures++; mark(false);
          nextTry = Date.now() + Math.min(30000, 2000 * failures);          // quiet: retry slowly
          queue = batch.concat(queue); if (queue.length > CAP) { dropped += queue.length - CAP; queue.splice(0, queue.length - CAP); }
        });
    } catch (e) { inflight = false; }
  }
  setInterval(flush, 500);

  /* ---------- the device report: the first record ---------- */
  function media(q, values) { try { for (var i = 0; i < values.length; i++) if (matchMedia('(' + q + ': ' + values[i] + ')').matches) return values[i]; return 'none-matched'; } catch (e) { return 'unsupported'; } }
  function safeArea() {
    try {
      var p = document.createElement('div');
      p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)';
      (document.body || document.documentElement).appendChild(p);
      var cs = getComputedStyle(p), r = { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
      p.parentNode.removeChild(p); return r;
    } catch (e) { return 'unmeasured'; }
  }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (res) { setTimeout(function () { res('(timed out)'); }, ms); })]); }
  function gpuReport() {
    var g = navigator.gpu;
    if (!g) return Promise.resolve({ present: false });
    var out = { present: true };
    try { out.preferredFormat = g.getPreferredCanvasFormat ? g.getPreferredCanvasFormat() : '(none)'; } catch (e) { out.preferredFormat = ser(e); }
    try { if (g.wgslLanguageFeatures) out.wgsl = Array.from(g.wgslLanguageFeatures); } catch (e) {}
    var req = GPU_ORIG.requestAdapter || g.requestAdapter;
    return timeout(Promise.resolve(req.call(g)).then(function (a) {
      if (!a) { out.adapter = null; return out; }
      var ad = {};
      try { ad.fallback = !!a.isFallbackAdapter || !!(a.info && a.info.isFallbackAdapter); } catch (e) {}
      try { ad.features = Array.from(a.features).sort(); } catch (e) {}
      try { var L = {}; for (var k in a.limits) { var v = a.limits[k]; if (typeof v === 'number') L[k] = v; } ad.limits = L; } catch (e) {}
      var info = function (i) { var o = {}; try { for (var k in i) { if (typeof i[k] !== 'function') o[k] = ser(i[k], 2); } } catch (e) {} return o; };
      if (a.info) { ad.info = info(a.info); out.adapter = ad; return out; }
      if (a.requestAdapterInfo) return a.requestAdapterInfo().then(function (i) { ad.info = info(i); out.adapter = ad; return out; }, function () { out.adapter = ad; return out; });
      out.adapter = ad; return out;
    }, function (e) { out.adapter = null; out.error = ser(e); return out; }), 4000);
  }
  function deviceReport() {
    var r = {};
    try {
      var n = navigator, s = screen, vv = window.visualViewport;
      r.url = location.href; r.ua = n.userAgent; r.platform = n.platform; r.vendor = n.vendor; r.language = n.language;
      try { r.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
      r.maxTouchPoints = n.maxTouchPoints; r.hardwareConcurrency = n.hardwareConcurrency; r.deviceMemory = n.deviceMemory;
      r.standalone = !!n.standalone || media('display-mode', ['standalone', 'fullscreen', 'minimal-ui', 'browser']);
      r.frame = window.top !== window;
      r.secure = window.isSecureContext; r.crossOriginIsolated = window.crossOriginIsolated;
      r.screen = { w: s.width, h: s.height, availW: s.availWidth, availH: s.availHeight, colorDepth: s.colorDepth, orientation: s.orientation ? s.orientation.type : window.orientation };
      r.viewport = { innerW: innerWidth, innerH: innerHeight, clientW: document.documentElement.clientWidth, clientH: document.documentElement.clientHeight };
      r.dpr = window.devicePixelRatio;
      r.visualViewport = vv ? { w: vv.width, h: vv.height, scale: vv.scale, top: vv.offsetTop, left: vv.offsetLeft } : null;
      r.safeArea = safeArea();
      r.media = {
        pointer: media('pointer', ['fine', 'coarse', 'none']), anyPointer: media('any-pointer', ['fine', 'coarse', 'none']),
        hover: media('hover', ['hover', 'none']), anyHover: media('any-hover', ['hover', 'none']),
        colorScheme: media('prefers-color-scheme', ['dark', 'light']), reducedMotion: media('prefers-reduced-motion', ['reduce', 'no-preference']),
        reducedTransparency: media('prefers-reduced-transparency', ['reduce', 'no-preference']), contrast: media('prefers-contrast', ['more', 'less', 'custom', 'no-preference']),
        dynamicRange: media('dynamic-range', ['high', 'standard']), colorGamut: media('color-gamut', ['rec2020', 'p3', 'srgb'])
      };
      try { r.backdropFilter = CSS.supports('backdrop-filter', 'blur(2px)') ? 'yes' : CSS.supports('-webkit-backdrop-filter', 'blur(2px)') ? '-webkit- only' : 'no'; } catch (e) { r.backdropFilter = 'unknown'; }
      var ls = false; try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); ls = true; } catch (e) {}
      r.storage = { localStorage: ls, indexedDB: !!window.indexedDB, storageManager: !!(n.storage && n.storage.estimate) };
      r.wakeLock = !!n.wakeLock; r.clipboard = n.clipboard ? { read: !!n.clipboard.readText, write: !!n.clipboard.writeText } : false;
      r.audio = { AudioContext: !!(window.AudioContext || window.webkitAudioContext), AudioWorklet: typeof AudioWorkletNode !== 'undefined' };
      r.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    } catch (e) { r.reportError = ser(e); }
    var est = (navigator.storage && navigator.storage.estimate) ? timeout(navigator.storage.estimate().then(function (e) { r.storage.usage = e.usage; r.storage.quota = e.quota; }, function () {}), 1500) : Promise.resolve();
    return Promise.all([gpuReport().then(function (g) { r.gpu = g; }, function (e) { r.gpu = { error: ser(e) }; }), est]).then(function () { return r; });
  }

  /* ---------- everything that goes wrong ---------- */
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    try {
      var orig = console[level]; if (typeof orig !== 'function') return;
      console[level] = function () {
        try { var a = []; for (var i = 0; i < arguments.length && i < 10; i++) a.push(ser(arguments[i], 3)); rec('console', { level: level, args: a }); } catch (e) {}
        return orig.apply(console, arguments);
      };
    } catch (e) {}
  });
  window.addEventListener('error', function (e) {
    try {
      var t = e.target;
      if (t && t !== window && t.tagName) { rec('error', { resource: true, target: describe(t), src: ser(t.currentSrc || t.src || t.href || '', 0, 500) }); return; }
      rec('error', { message: ser(e.message), file: e.filename, line: e.lineno, col: e.colno, stack: e.error && e.error.stack ? ser(String(e.error.stack)) : null });
    } catch (x) {}
  }, true);
  window.addEventListener('unhandledrejection', function (e) { try { rec('rejection', { reason: ser(e.reason, 3) }); } catch (x) {} });
  document.addEventListener('securitypolicyviolation', function (e) { try { rec('csp', { directive: e.violatedDirective, blocked: e.blockedURI, file: e.sourceFile, line: e.lineNumber }); } catch (x) {} });
  window.addEventListener('webglcontextlost', function (e) { try { rec('webgl', { ev: 'contextlost', target: describe(e.target) }); } catch (x) {} }, true);
  window.addEventListener('webglcontextrestored', function (e) { try { rec('webgl', { ev: 'contextrestored', target: describe(e.target) }); } catch (x) {} }, true);
  var GPU_ORIG = {};
  try {
    if (window.GPU && GPU.prototype.requestAdapter) {
      GPU_ORIG.requestAdapter = GPU.prototype.requestAdapter;
      GPU.prototype.requestAdapter = function () {
        var p = GPU_ORIG.requestAdapter.apply(this, arguments);
        try { p.then(function (a) { rec('gpu', { ev: 'adapter', ok: !!a }); }, function (e) { rec('gpu', { ev: 'adapter', ok: false, error: ser(e) }); }); } catch (x) {}
        return p;
      };
    }
    if (window.GPUAdapter && GPUAdapter.prototype.requestDevice) {
      var origDev = GPUAdapter.prototype.requestDevice;
      GPUAdapter.prototype.requestDevice = function () {
        var p = origDev.apply(this, arguments);
        try {
          p.then(function (dev) {
            try {
              rec('gpu', { ev: 'device' });
              dev.lost.then(function (info) { rec('gpu', { ev: 'lost', reason: info && info.reason, message: info && ser(info.message) }); });
              dev.addEventListener('uncapturederror', function (ev) { var er = ev.error || {}; rec('gpu', { ev: 'uncapturederror', type: er.constructor ? er.constructor.name : 'GPUError', message: ser(er.message) }); });
            } catch (x) {}
          }, function (e) { rec('gpu', { ev: 'device-failed', error: ser(e) }); });
        } catch (x) {}
        return p;
      };
    }
  } catch (e) {}

  /* ---------- what the user does: one record a press, one summary a gesture (moves are never sent one by one) ---------- */
  var gestures = {};
  function pt(e) { return { x: Math.round(e.clientX), y: Math.round(e.clientY) }; }
  function onPointer(e) {
    try {
      var id = e.pointerId, g;
      if (e.type === 'pointermove') { g = gestures[id]; if (!g) return; g.n++; g.len += Math.hypot(e.clientX - g.x, e.clientY - g.y); g.x = e.clientX; g.y = e.clientY; return; }
      var r = { ev: e.type, type: e.pointerType, id: id, x: Math.round(e.clientX), y: Math.round(e.clientY), target: describe(e.target) };
      if (e.isTrusted === false) r.synthetic = true;
      if (e.type === 'pointerdown') gestures[id] = { n: 0, len: 0, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: nowMs() };
      else if ((g = gestures[id])) { r.moves = g.n; r.path = Math.round(g.len); r.dx = Math.round(e.clientX - g.x0); r.dy = Math.round(e.clientY - g.y0); r.ms = Math.round(nowMs() - g.t0); delete gestures[id]; }
      rec('input', r);
    } catch (x) {}
  }
  ['pointerdown', 'pointerup', 'pointercancel', 'pointermove'].forEach(function (t) { window.addEventListener(t, onPointer, { capture: true, passive: true }); });
  function onTouch(e) {
    try {
      var ch = []; for (var i = 0; i < e.changedTouches.length && i < 5; i++) { var c = e.changedTouches[i]; ch.push({ id: c.identifier, x: Math.round(c.clientX), y: Math.round(c.clientY) }); }
      rec('input', { ev: e.type, touches: e.touches.length, changed: ch, target: describe(e.target) });
    } catch (x) {}
  }
  ['touchstart', 'touchend', 'touchcancel'].forEach(function (t) { window.addEventListener(t, onTouch, { capture: true, passive: true }); });
  ['gesturestart', 'gestureend'].forEach(function (t) { window.addEventListener(t, function (e) { try { rec('input', { ev: e.type, scale: e.scale, rotation: e.rotation, target: describe(e.target) }); } catch (x) {} }, { capture: true, passive: true }); });
  window.addEventListener('click', function (e) { try { var r = { ev: 'click', x: Math.round(e.clientX), y: Math.round(e.clientY), target: describe(e.target) }; if (!e.isTrusted) r.synthetic = true; rec('input', r); } catch (x) {} }, true);
  function editable(t) { try { return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); } catch (e) { return false; } }
  window.addEventListener('keydown', function (e) {
    try {
      var k = e.key, field = editable(e.target);
      if (field && k && k.length === 1) k = '(a character)';                 // never the text typed into a field
      var mods = (e.ctrlKey ? 'Ctrl+' : '') + (e.metaKey ? 'Meta+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey && !(k && k.length === 1) ? 'Shift+' : '');
      rec('input', { ev: 'keydown', key: mods + k, field: field || undefined, repeat: e.repeat || undefined, target: describe(e.target) });
    } catch (x) {}
  }, true);
  var viewTimer = null;
  function viewRec(ev) {
    var vv = window.visualViewport;
    rec('view', { ev: ev, w: innerWidth, h: innerHeight, vv: vv ? { w: Math.round(vv.width), h: Math.round(vv.height), scale: vv.scale, top: Math.round(vv.offsetTop) } : undefined, orientation: screen.orientation ? screen.orientation.type : window.orientation });
  }
  function viewLater(ev) { return function () { try { clearTimeout(viewTimer); viewTimer = setTimeout(function () { try { viewRec(ev); } catch (x) {} }, 250); } catch (x) {} }; }
  window.addEventListener('resize', viewLater('resize'));
  window.addEventListener('orientationchange', function () { try { viewRec('orientationchange'); } catch (x) {} });
  try { if (window.visualViewport) visualViewport.addEventListener('resize', viewLater('visualViewport')); } catch (e) {}
  document.addEventListener('visibilitychange', function () { try { rec('view', { ev: 'visibilitychange', state: document.visibilityState }); } catch (x) {} });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (t) { document.addEventListener(t, function () { try { rec('view', { ev: 'fullscreenchange', on: !!(document.fullscreenElement || document.webkitFullscreenElement) }); } catch (x) {} }); });
  window.addEventListener('pagehide', function (e) {
    try {
      rec('view', { ev: 'pagehide', persisted: e.persisted });
      var batch = take();
      if (navigator.sendBeacon) navigator.sendBeacon(BASE + 'log', new Blob([JSON.stringify({ s: SID, recs: batch })], { type: 'text/plain' }));
    } catch (x) {}
  });

  /* ---------- frames: one record a second while the page's own requestAnimationFrame callbacks run, nothing while it is still ---------- */
  var frameTimes = [], lastStamp = -1;
  function stats(ts) {
    var d = []; for (var i = 1; i < ts.length; i++) { var g = ts[i] - ts[i - 1]; if (g > 0 && g < 1000) d.push(g); }
    if (!d.length) return null;
    var sum = 0, max = 0, o33 = 0, o50 = 0; for (i = 0; i < d.length; i++) { sum += d[i]; if (d[i] > max) max = d[i]; if (d[i] > 33.4) o33++; if (d[i] > 50) o50++; }
    var s = d.slice().sort(function (a, b) { return a - b; });
    var r1 = function (x) { return Math.round(x * 10) / 10; };
    return { frames: d.length, mean: r1(sum / d.length), p95: r1(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]), max: r1(max), over33: o33, over50: o50 };
  }
  try {
    window.requestAnimationFrame = function (cb) {
      return nativeRaf(function (ts) {
        try { if (ts !== lastStamp) { lastStamp = ts; frameTimes.push(ts); } } catch (x) {}
        return cb(ts);
      });
    };
  } catch (e) {}
  var carry = null;
  setInterval(function () {
    try {
      if (!frameTimes.length) { carry = null; return; }
      var ts = carry !== null ? [carry].concat(frameTimes) : frameTimes;
      carry = frameTimes[frameTimes.length - 1]; frameTimes = [];
      var s = stats(ts); if (s) rec('frames', s);
    } catch (x) {}
  }, 1000);

  /* ---------- commands: the long-poll loop and the probe helpers ---------- */
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var el = function (x) { if (typeof x === 'string') { var e = document.querySelector(x); if (!e) throw new Error('probe: nothing matches ' + x); return e; } if (!x) throw new Error('probe: no element'); return x; };
  function pointer(type, target, x, y, o, buttons) {
    var init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: o.pointerId, pointerType: o.pointerType, isPrimary: true, button: type === 'pointermove' ? -1 : 0, buttons: buttons, pressure: buttons ? 0.5 : 0, view: window };
    var ev; try { ev = new PointerEvent(type, init); } catch (e) { ev = new MouseEvent(type, init); }
    target.dispatchEvent(ev);
  }
  function mouse(type, target, x, y, buttons) { try { target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: buttons, view: window })); } catch (e) {} }
  function centre(t) { var b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
  function onTop(t, c) { var h = document.elementFromPoint(c.x, c.y); return h && (h === t || t.contains(h)) ? h : (h || t); }
  var probe = {
    session: SID,
    q: function (s) { return document.querySelector(s); },
    qa: function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); },
    describe: describe,
    rect: function (x) { var b = el(x).getBoundingClientRect(); return { x: Math.round(b.left * 10) / 10, y: Math.round(b.top * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; },
    style: function (x, props) {
      var cs = getComputedStyle(el(x)), o = {};
      (props || ['display', 'visibility', 'opacity', 'position', 'z-index', 'pointer-events', 'color', 'background-color', 'backdrop-filter', '-webkit-backdrop-filter', 'transform']).forEach(function (p) { o[p] = cs.getPropertyValue(p); });
      return o;
    },
    hit: function (x, y) { return describe(document.elementFromPoint(x, y)); },
    /** a synthetic tap at the element's centre, delivered to what is on top there (as a finger would be); not a trusted event */
    tap: function (x, opt) {
      var o = { pointerType: (opt && opt.pointerType) || 'mouse' }; o.pointerId = o.pointerType === 'mouse' ? 1 : 2;
      var t = el(x), c = centre(t), h = onTop(t, c);
      pointer('pointerdown', h, c.x, c.y, o, 1); mouse('mousedown', h, c.x, c.y, 1);
      pointer('pointerup', h, c.x, c.y, o, 0); mouse('mouseup', h, c.x, c.y, 0);
      mouse('click', h, c.x, c.y, 0);
      return { hit: describe(h), onTarget: h === t || t.contains(h) };
    },
    /** a synthetic drag from the element's centre by (dx, dy): steps moves over ms; moves go to the pressed element (they bubble to window) */
    drag: function (x, dx, dy, opt) {
      opt = opt || {}; var o = { pointerType: opt.pointerType || 'mouse' }; o.pointerId = o.pointerType === 'mouse' ? 1 : 2;
      var steps = opt.steps || 10, ms = opt.ms === undefined ? 300 : opt.ms, t = el(x), c = centre(t), h = onTop(t, c);
      pointer('pointerdown', h, c.x, c.y, o, 1); if (o.pointerType === 'mouse') mouse('mousedown', h, c.x, c.y, 1);
      var i = 0;
      return new Promise(function (res) {
        (function step() {
          i++; var px = c.x + dx * i / steps, py = c.y + dy * i / steps;
          try { pointer('pointermove', h, px, py, o, 1); if (o.pointerType === 'mouse') mouse('mousemove', h, px, py, 1); } catch (e) {}
          if (i < steps) { setTimeout(step, ms / steps); return; }
          try { pointer('pointerup', h, px, py, o, 0); if (o.pointerType === 'mouse') mouse('mouseup', h, px, py, 0); } catch (e) {}
          res({ from: { x: Math.round(c.x), y: Math.round(c.y) }, to: { x: Math.round(px), y: Math.round(py) }, target: describe(h) });
        })();
      });
    },
    /** the display's frame statistics over a window of ms (the probe's own frames, whether the page draws or not) */
    frames: function (ms) {
      ms = ms || 1000; var ts = [], start = null;
      return new Promise(function (res) {
        (function f(t) { ts.push(t); if (start === null) start = t; if (t - start < ms) nativeRaf(f); else res(stats(ts)); })(nowMs());
      });
    },
    /** a canvas (the largest visible one by default) to PNG, read inside a frame callback, after the page's own draw in that frame */
    shot: function (x) {
      var c = x ? el(x) : null;
      if (!c) { var best = 0; probe.qa('canvas').forEach(function (k) { var b = k.getBoundingClientRect(), a = b.width * b.height; if (a > best) { best = a; c = k; } }); }
      if (!c || !c.toDataURL) throw new Error('probe.shot: no canvas');
      return new Promise(function (res, rej) {
        nativeRaf(function () {
          try {
            var url = c.toDataURL('image/png'), s = document.createElement('canvas'); s.width = 32; s.height = 32;
            var g = s.getContext('2d'), seen = {}, distinct = 0, opaque = 0;
            g.drawImage(c, 0, 0, 32, 32); var px = g.getImageData(0, 0, 32, 32).data;
            for (var i = 0; i < px.length; i += 4) { if (px[i + 3] > 0) opaque++; var key = (px[i] >> 3) + ',' + (px[i + 1] >> 3) + ',' + (px[i + 2] >> 3) + ',' + (px[i + 3] >> 3); if (!seen[key]) { seen[key] = 1; distinct++; } }
            res({ __png: url, canvas: describe(c), width: c.width, height: c.height, sampleColours: distinct, sampleOpaque: opaque, blank: distinct <= 1 });
          } catch (e) { rej(e); }
        });
      });
    },
    wait: sleep,
    until: function (fn, ms) {
      ms = ms || 5000; var t0 = Date.now();
      return new Promise(function (res, rej) {
        (function poll() {
          Promise.resolve().then(fn).then(function (v) { if (v) res(v); else if (Date.now() - t0 > ms) rej(new Error('probe.until: timed out after ' + ms + ' ms')); else setTimeout(poll, 50); }, rej);
        })();
      });
    },
    log: function () { var a = []; for (var i = 0; i < arguments.length; i++) a.push(ser(arguments[i], 3)); rec('probe', { args: a }); }
  };
  var AsyncFn = null; try { AsyncFn = Object.getPrototypeOf(async function () {}).constructor; } catch (e) {}
  function runCommand(cmd) {
    var t0 = nowMs();
    return Promise.resolve().then(function () {
      if (!AsyncFn) throw new Error('probe: this page cannot compile a script (no async functions)');   // a CSP without 'unsafe-eval' refuses it below, and says so
      return new AsyncFn('probe', cmd.code)(probe);
    }).then(function (v) { return { id: cmd.id, ok: true, value: ser(v, 6, 200000), ms: Math.round(nowMs() - t0) }; },
      function (e) { return { id: cmd.id, ok: false, error: ser(e, 2), ms: Math.round(nowMs() - t0) }; })
      .then(function (r) { r.s = SID; return post('result', r).catch(function () {}); });
  }
  var pollFailures = 0;
  function poll() {
    if (!ready) { setTimeout(poll, 300); return; }
    fetch(BASE + 'next?s=' + encodeURIComponent(SID), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
      .then(function (j) { pollFailures = 0; if (okState === false && !failures) mark(true); return j && j.cmd ? runCommand(j.cmd) : null; })
      .then(function () { setTimeout(poll, 0); },
        function () { pollFailures++; mark(false); setTimeout(poll, Math.min(30000, 2000 * pollFailures)); });
  }

  /* ---------- the mark: one small dot, fixed in the top-right corner inside the safe area; no layout, no pointer ---------- */
  function addDot() {
    try {
      if (quiet || dot) return;
      dot = document.createElement('div'); dot.id = '__probe-dot'; dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top, 0px) + 3px);right:calc(env(safe-area-inset-right, 0px) + 3px);width:7px;height:7px;border-radius:50%;background:#888;box-shadow:0 0 0 1px rgba(0,0,0,.45);pointer-events:none;z-index:2147483647;contain:strict';
      document.documentElement.appendChild(dot);
      if (okState !== null) mark(okState);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addDot); else addDot();

  window.__probe = probe;
  /* the autorun: a script this machine set with `probe.mjs autorun <file>`, run once the page has loaded (it survives Safari's
     reloads, which a `run` command does not); its value or error is one record */
  function autorun() {
    fetch(BASE + 'autorun.js', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (code) {
        if (!code || !AsyncFn) return;
        var t0 = nowMs();
        return new AsyncFn('probe', code)(probe).then(function (v) { rec('autorun', { ok: true, value: ser(v, 4, 20000), ms: Math.round(nowMs() - t0) }); },
          function (e) { rec('autorun', { ok: false, error: ser(e, 2), ms: Math.round(nowMs() - t0) }); });
      }).catch(function () {});
  }
  function start() {
    deviceReport().then(function (r) { queue.unshift({ k: 'device', t: nowMs(), report: r }); ready = true; flush(); }, function (e) { queue.unshift({ k: 'device', t: nowMs(), report: { reportError: ser(e) } }); ready = true; });
    poll();
    if (document.readyState === 'complete') setTimeout(autorun, 0); else window.addEventListener('load', function () { setTimeout(autorun, 0); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
