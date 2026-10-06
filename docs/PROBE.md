# The remote probe

The remote probe lets a page opened on another device (Safari on the iPad, Chrome on an Android phone, any browser on the network) report to this machine. It sends the device's details, its console and errors, its WebGPU details, what the user touches and how smooth the frames are. It also runs the test scripts this machine sends it. WebKit cannot run on this machine, so this is how the kit and the apps get tested on Safari.

It is a development tool in `tools/` and only exists while it is running. Nothing in `mir/**` or in an app changes. The probe server serves the app's folder the same way `tools/serve.mjs --https --lan` does, and adds one line as the first thing in the `<head>` of every HTML page:

```html
<script src="/__probe/client.js"></script>
```

Apart from that line, the page is served byte for byte as it is.

## Start it

```sh
node tools/probe.mjs serve 8931 <the app's folder>
```

For BASINS as adopted, that is:

```sh
node tools/probe.mjs serve 8931 "/home/joshua-hosain/Documents/MANDELBROT APP/project/.claude/worktrees/mir-1.5-adopt/app"
```

The server uses TLS on every network address, with the kit's self-signed certificate from `tools/.certs/`. It prints the address to type on the device, for example `https://10.0.0.18:8931/`. Use `--http` for plain HTTP on 127.0.0.1 only, which suits tests and a desktop browser. Add `--lan` to `--http` to open plain HTTP to the network, but note that WebGPU needs a secure context, so a device on the network only gets WebGPU over TLS.

## What Josh does

1. Open the printed address in Safari.
2. The first time only, Safari warns that the certificate is not trusted. Tap through and accept it.
3. Look for a small dot in the top-right corner, inside the safe area. Green means the page is reporting. Red means it cannot reach this machine, and it keeps retrying quietly. Add `?probe=quiet` to the address to hide the dot.

That is all. Each page load is one **session**, and its id is the start time plus a short random part, for example `20261006-153801-rin3`.

## What is recorded, and what never is

Recorded, under `tools/.probe/<session>/`, which is gitignored:

- **The device report** comes first. It covers:
  - the user agent, platform, touch points and standalone mode;
  - the screen, viewport, `devicePixelRatio`, `visualViewport` and safe-area insets;
  - the media answers for pointer, hover, colour scheme, reduced motion, reduced transparency, contrast, dynamic range and gamut;
  - `backdrop-filter` support;
  - WebGPU: whether it is present, plus the adapter's info, features and limits and the preferred canvas format;
  - whether storage, wake lock and the clipboard are available;
  - the page URL.
- **Everything that goes wrong**:
  - `console.log/info/warn/error/debug` (the real console still gets every call);
  - `error` events with their stack, and resources that fail to load;
  - `unhandledrejection` and CSP violations;
  - WebGPU device loss and uncaptured errors, and a failed adapter request;
  - WebGL context loss.
- **What the user does**:
  - pointer down, up and cancel;
  - touch start, end and cancel;
  - Safari's gesture start and end;
  - clicks and keys;
  - resize, orientation, visibility, `pagehide`, full screen and `visualViewport` changes.

  Each record describes its target: tag, id, classes, `data-*` names and label. Moves are never sent one by one. A gesture gets one summary with its count of moves, path length and duration.
- **Frames**: one record per second while the page's own `requestAnimationFrame` callbacks are running. Each gives the number of frames, the mean, the 95th percentile, the max, and how many frames ran over 33 ms and over 50 ms. Nothing is sent while the page is still.

`log.ndjson` holds one record per line, with the server's receive time `rt` and the page's own time `t` (ms since the page loaded). Command results go in `results/<n>.json` and canvas shots in `shots/<n>.png`.

**Never recorded:** the text typed into a field. In an input, a textarea, a select or an editable region, a printable key is recorded only as `(a character)`. Only named keys such as Enter, Escape, Tab and the arrows are kept. **Nothing leaves this machine's network.** The page reports only to the server it was loaded from.

## The security line

**Only this machine can run script in the page.**

The page-side endpoints are open to the network, because the device has to reach them:

- `GET /__probe/client.js`
- `POST /__probe/log`
- `GET /__probe/next` (the long poll)
- `POST /__probe/result`

The control endpoints are under `/__probe/ctl/`. They queue a command, list the sessions and read a log, and they answer **only** a request whose remote address is this machine's loopback (`127.0.0.0/8`, `::1`). Every other address gets 403, and that includes this machine's own LAN address. Anyone else on the network can load the page, but nobody else can queue a command. The probe only runs while you run it, so stop it (Ctrl-C) when you are done.

## The commands

They talk to the running server on 127.0.0.1. The port defaults to 8931, and `--port <n>` changes it. Wherever a command takes a session id, `latest` means the newest session.

```sh
node tools/probe.mjs sessions                       # newest first: id, device, start, last seen, records, problems, ● connected now
node tools/probe.mjs report latest                  # the device report, readable
node tools/probe.mjs log latest                     # the log, one line per record
node tools/probe.mjs log latest --errors            # only the problems: errors, rejections, CSP, GPU/WebGL trouble, console.error/warn
node tools/probe.mjs log latest --since 120 --kind frames
node tools/probe.mjs run latest -e "return probe.rect('.mir-menubar')"
node tools/probe.mjs run latest checks/safari.js --timeout 60000
node tools/probe.mjs shot latest                    # the largest canvas, to PNG; prints the PNG's path
node tools/probe.mjs shot latest '#canvas'
```

`run` sends a script, waits for the result (30 s by default, `--timeout` changes it) and prints the value as JSON. The script is the body of an async function with one argument, `probe`, so it can use `await` and must `return` its value. If the page is asleep or in the background, `run` says the command was not delivered.

### The `probe` helpers

| helper | what it does |
|---|---|
| `probe.q(sel)` / `probe.qa(sel)` | `querySelector` / `querySelectorAll`, the second one as an array |
| `probe.rect(elOrSel)` | the element's box `{ x, y, w, h }` |
| `probe.style(elOrSel, [props])` | computed style, for the props you name or a useful default set |
| `probe.hit(x, y)` | what `elementFromPoint` finds there, described |
| `probe.tap(elOrSel, { pointerType })` | a synthetic tap at the centre, delivered to whatever is on top there; returns `{ hit, onTarget }` |
| `probe.drag(elOrSel, dx, dy, { steps, ms, pointerType })` | a synthetic drag from the centre; the moves go to the pressed element and bubble to `window` |
| `probe.frames(ms)` | the display's frame statistics over a window, whether the page draws or not |
| `probe.shot(canvasOrSel)` | the canvas as a PNG (the server writes it and returns its path), plus a 32×32 sample saying whether it is blank |
| `probe.wait(ms)`, `probe.until(fn, ms)` | sleep; poll `fn` until it returns something truthy (it fails after `ms`, 5 s by default) |
| `probe.log(...)` | puts a record in the log |

## The limits

- **Synthetic input is not trusted input.** `probe.tap` and `probe.drag` dispatch pointer and mouse events, so the page's handlers run and a pan or a button press works. But the browser marks them `isTrusted: false` and does not treat them as a user gesture. Anything that needs a real gesture needs Josh's finger: audio unlock, full screen, the clipboard, file pickers, wake lock on some browsers. The input trace marks synthetic events as `(synthetic)`.
- **A WebGPU canvas shot can come back blank.** A WebGPU canvas can only be read in the same frame as its draw, so `probe.shot` reads it inside a `requestAnimationFrame` callback, after the page's own callback for that frame. If the page did not draw in that frame, a browser may hand back an empty canvas, and the shot then says `BLANK`. Shoot while something moves, for example during a `probe.drag`, or try again.
- **There is no DOM screenshot.** `shot` captures a canvas only, not the glass, the windows or the text over it. When the look matters, ask Josh for a screenshot from the device.
- Long polls can stall while Safari is in the background or the device sleeps. The page picks up again when it comes back.
- A page whose Content Security Policy forbids `unsafe-eval` cannot run commands. It still reports everything else, and `run` returns the browser's refusal as the error.
