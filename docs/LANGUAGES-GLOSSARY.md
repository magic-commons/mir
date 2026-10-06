# MIR · LANGUAGES GLOSSARY — the shared rules and the ten columns

The translator's companion to `docs/LANGUAGES.md` §11. This file holds the rules every pack follows and the chosen term for each recurring word. It carries all ten draft packs: **Spanish (es), French (fr), Portuguese (pt-BR), Indonesian (id), Simplified Chinese (zh-Hans), Japanese (ja), Russian (ru), Hindi (hi), Bengali (bn) and Arabic (ar)**. Every pack is a **draft** (`reviewed: false`) until a native reader has checked it.

## 1. Rules (all languages)

| Rule | Detail |
|---|---|
| English is the key | the pack maps the English string to its translation; a missing key shows English |
| Never translated | product and app names (MIR, λWAVES, BASINS, METRO, SPRITES, FROST as a skin name), key caps and chords (Ctrl, Shift, Esc, Tab, Alt, ⌘), units and numbers, file extensions (`.mir`, `.MD`), maths, glyphs (· ‹ › ◐ ▤ ✥ + → …) |
| Placeholders | everything in `{braces}` is kept exactly; it may move inside the sentence |
| Case | a label that is capitals in English is capitals in the four Latin-script packs, with accents on the capitals (Á É Í Ó Ú Ñ Ç À Â Ê Î Ô Ã Õ). Sentences, hints and messages keep sentence case; the lower-case status lines stay lower case |
| Length | a knob label has about 8 letters, a button about 14. Where the natural word is much longer, the field's abbreviation is used (below) |
| Tone | plain and direct, as the English is |
| Quotes | `“ ”` are kept as the English has them in es, pt-BR and id; French uses `« … »` with a no-break space inside (typed as a normal space here) and `’` for the apostrophe |
| Names (1.5.0-alpha.5) | the catalogue's `names` list (the themes FROST, MORPH, CLASSIC, SWIFT, AURORA, NEON, their tones, MIR) is never translated; a key `name::X` is never in a pack |
| One word, two meanings | a key `context::WORD` (`theme mode::LIGHT`, `quality tier::LIGHT`, `peak hold::HOLD` …) is that meaning only: translate the meaning the context names |
| `{:LABEL}` | a button the sentence names: keep `{:LABEL}` exactly; it shows as your translation of that button |
| Counts | a key with `{n}` may hold forms: `{ "one": …, "few": …, "many": …, "other": … }` (CLDR names for your language; `other` required) |
| Notes | `en.json` → `notes` explains the jargon (WALL, FREE, HAND, GATED, HOLD, RECORD INPUT, shells, TONE, SKIN, THEME, RACK, SHELF …): read the note before choosing a word |
| Syntax | `{inline}` and `{display}` in the notebook hints are `$inline$` and `$$display$$`, typed exactly so: never translate them |

## 2. Voice and convention per language

| Language | Commands and buttons | Hints and messages | Notes |
|---|---|---|---|
| es | infinitive (GUARDAR, COPIAR, ABRIR), the software convention | imperative, informal *tú* (Ableton, FL Studio and Logic in Spanish address the user as *tú*) | `ctrl+intro` for Enter; `Mayús` for the Shift key in prose, `Inicio` for Home |
| fr | infinitive (ENREGISTRER, COPIER, OUVRIR) | imperative, formal *vous* (French software convention) | `Maj` for Shift in prose, `Échap` for Esc in prose, `Origine` for Home; space before `: ; ! ?` |
| pt-BR | infinitive (SALVAR, COPIAR, ABRIR) | imperative with *você* forms (`toque`, `arraste`, `pressione`) | Brazilian software uses SALVAR, not GUARDAR; "tela" not "ecrã"; "arquivo" not "ficheiro" |
| id | the base verb (SIMPAN, SALIN, BUKA) | base verb or "Anda" where a subject is needed | musicians and audio software in Indonesian keep the English for most instrument terms (preset, input, output, trigger, gate, envelope, macro, knob, slider) |

### 2.1 zh-Hans · ja · ru

Conventions. zh/ja: no space between CJK and Latin or digits (a space is kept only where the source has one around a unit-like token, e.g. `{n} 个`). Full-width punctuation in sentences; quotes “ ” (zh), 「 」 (ja), « » (ru). ru: capitals where the English is capitals; sentences in sentence case. Key names (Ctrl, Shift, Alt, Esc, Home, Tab), BPM, LFO, ADSR, MIDI-style acronyms, dB, Hz, kHz and product/skin names stay Latin (ru writes дБ, Гц, кГц, с, мс for units in sentences).

### 2.2 hi · bn · ar

Musicians working in Hindi, Bengali and Arabic overwhelmingly use the English names of DSP and modulation controls, because DAWs, plugins and tutorials are in English and the localised terms are not standard. So:

- **Kept in Latin capitals, exactly as the English label:** the names of knobs, meters, states and modulation sources that appear as a label on a control or readout: LFO, ENV, ADSR, BPM, ATTACK, DECAY, SUSTAIN, RELEASE, HOLD, GATE, TRIG, TRIG IN, DEPTH, RATE, RANGE, LEVEL, LOW, MID, HIGH, MIN, MAX, PHASE words in labels, BIPOLAR, UNIPOLAR, CENTRE, SINE, FREE, WALL, FULL, CMP, EVT, HIT, PAD, STUTTER, ANCHOR, FIT, plus the host demo's knob names (DIST, FOV, GRAIN, HUE, ISO, KNEE, LAP, PITCH, RES, RISE, SOFTNESS, STEPS, TURN, YAW, EXPOSURE, WINDOW). Why: they are control names a user matches against a manual, a video or another DAW; transliterating each (फ़ेज़, الطور) adds length and loses searchability.
- **Transliterated** (the way each community writes them): borrowed software and audio nouns that have no standard native word: macro (मैक्रो / ম্যাক্রো / ماكرو), device, preset, envelope in running prose (एन्वेलप / এনভেলপ / إنفلوب), curve (कर्व / কার্ভ / منحنى is translated in ar), modulation (मॉड्यूलेशन / মডুলেশন / التضمين), tension handle, knob (नॉब / নব / مقبض), slider, trigger, rack, stage, GPU names stay Latin.
- **Translated** with the standard Windows / Android / Google word: every ordinary interface word (file, save, open, close, window, settings, language, delete, rename, folder, notes, help, cancel, copy, import, export).
- **Where Latin is used inside a running sentence** the English capitals are written as in the label, so the sentence matches what is on screen. Where a sentence points at a button that is translated (RECORD INPUT, COPY DETAILS, AUDIO IN, SAVE, SAVE AS), the translated label is used, identical to the label's own string.
- Numbers, units, key names, product names and symbols are untouched; digits are Latin everywhere (checked by script). No direction marks were added in Arabic.

Palette names (lowercase in English): translated when ordinary words (aurora → ध्रुवीय ज्योति / মেরুজ্যোতি / الشفق القطبي, sea, ember, opal, twilight, neon, lasers, prism …); Latin when a technical or proper name (balmer, cmyk, cym, ukiyo, HSV, Re/Im).

**Labels at risk of clipping (hi, bn, ar).**

- Devanagari: विवरण कॉपी करें (COPY DETAILS), इस रूप में सहेजें (SAVE AS), इनपुट रिकॉर्ड करें (RECORD INPUT), प्रोजेक्ट में कॉपी करें (COPY TO PROJECT), शेल्फ़ पर कॉपी करें (COPY TO SHELF) are wider than their English. None was shortened below standard; they are on buttons, not knobs. Knob labels are all Latin by policy, so no knob label clips.
- Bengali: এভাবে সংরক্ষণ করুন, প্রজেক্টে কপি করুন, বিবরণ কপি করুন likewise.
- Arabic: نسخ إلى المشروع, حفظ باسم are compact enough; the longest are نسخ التفاصيل and تسجيل الإدخال.
- Shortened on purpose: SAVE in bn is "সংরক্ষণ করুন" (a button, fine) and the menu-wide tendency is for bn to be the longest. Short alternatives if a button clips: bn সংরক্ষণ (noun), hi सहेजें already short.
- Knob labels left in Latin because no short native word exists: every host.js knob (DIST … YAW) and the modulation knobs.

## 3. Terms

One table, ten language columns. The alpha.12 join added the timeline's and the pattern's terms (Group: Timeline and pattern (alpha.12): the words the packs already use, plus the new ones). The alpha.5 top-up added the terms the translators met on the new strings (Group: alpha.5 additions) and corrected some earlier cells. Where the field keeps the English word, the cell says so by repeating it; **bold** = a real choice, explained in the last column. A dash means that language's lane did not list the term (its pack still translates every catalogue string). The Latin-script columns came first; the CJK and Cyrillic columns and the Devanagari, Bengali and Arabic columns were matched to them by the English cell.

| English | es | fr | pt-BR | id | 简体中文 zh-Hans | 日本語 ja | Русский ru | हिन्दी hi | বাংলা bn | العربية ar | Group | Why |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LFO | LFO | LFO | LFO | LFO | LFO | LFO | LFO | — | — | — | Controls and instrument terms | universal · zh/ja/ru: field keeps it |
| BPM | BPM | BPM | BPM | BPM | — | — | — | — | — | — | Controls and instrument terms | universal |
| MIDI | MIDI | MIDI | MIDI | MIDI | — | — | — | — | — | — | Controls and instrument terms | universal |
| preset / PRESETS | PRESETS | PRESETS | PRESETS | PRESET | — | — | — | — | — | — | Controls and instrument terms | the field's own word in all four |
| macro | macro | macro | macro | macro | 宏 | マクロ | макро | मैक्रो | ম্যাক্রো | ماكرو | Controls and instrument terms | Ableton, Serum, every modern synth · zh/ja/ru: ru invariant |
| knob | mando | potard (potentiomètre) | botão | knob | 旋钮 | ノブ | ручка / регулятор | — | — | — | Controls and instrument terms | es/fr/pt use the hardware word; id keeps English · zh/ja/ru: ru: «ручка» for the physical knob, «регулятор» for any control |
| fader / slider | deslizador | curseur | slider | slider | 推子 / 滑块 | フェーダー / スライダー | фейдер / ползунок | — | — | — | Controls and instrument terms |  |
| RATE | **VELOC.** | **VITESSE** | **TAXA** | **LAJU** | 速率 | レート | СКОРОСТЬ | — | — | — | Controls and instrument terms | LFO speed: Ableton es "Velocidad"; fr "Vitesse"; pt "Taxa" (Rate is "Taxa" in pt-BR synth UIs); id "Laju" |
| DEPTH | PROFUNDIDAD | PROFONDEUR | PROFUNDIDADE | KEDALAMAN | 深度 | デプス | ГЛУБИНА | — | — | — | Controls and instrument terms | standard; written in full because it appears only in hints and aria-labels |
| PHASE | FASE | PHASE | FASE | FASE | 相位 | フェーズ | ФАЗА | — | — | — | Controls and instrument terms |  |
| LEVEL | NIVEL | NIVEAU | NÍVEL | LEVEL | 电平 | レベル | УРОВЕНЬ | — | — | — | Controls and instrument terms | id musicians say "level" |
| RANGE | RANGO | PLAGE | FAIXA | RENTANG | 范围 | レンジ | ДИАПАЗОН | — | — | — | Controls and instrument terms | fr "plage" is the standard for a value range; pt "faixa" |
| CURVE | CURVA | COURBE | CURVA | KURVA | 曲线 | カーブ | КРИВАЯ | कर्व | কার্ভ | منحنى | Controls and instrument terms |  |
| BIPOLAR / UNIPOLAR | BIPOLAR / UNIPOLAR | BIPOLAIRE / UNIPOLAIRE | BIPOLAR / UNIPOLAR | BIPOLAR / UNIPOLAR | 双极 / 单极 | バイポーラ / ユニポーラ | БИПОЛЯРНЫЙ / УНИПОЛЯРНЫЙ | — | — | — | Controls and instrument terms |  |
| CENTRE | CENTRO | CENTRE | CENTRO | TENGAH | 中心 | センター | ЦЕНТР | — | — | — | Controls and instrument terms |  |
| MIN / MAX | MÍN / MÁX | MIN / MAX | MÍN / MÁX | MIN / MAKS | 最小 / 最大 | 最小 / 最大 | МИН / МАКС | — | — | — | Controls and instrument terms | the accent follows the language's abbreviation rule; fr and the symbols stay bare |
| ATTACK | ATAQUE | ATTAQUE | ATAQUE | ATTACK | — | — | — | — | — | — | Controls and instrument terms |  |
| RELEASE | RELEASE | RELEASE | RELEASE | RELEASE | — | — | — | — | — | — | Controls and instrument terms | **real choice**: es/fr/pt synth manuals mostly keep "release"; ATAQUE is translated in es, pt-BR and fr because it is the common word; release stays English |
| HOLD | HOLD | HOLD | HOLD | HOLD | 保持 | ホールド | УДЕРЖАНИЕ | — | — | — | Controls and instrument terms | the "peak hold" of a meter; no single field word, UNSURE · zh/ja/ru: in sentences the label is left as HOLD where it is not a catalogue key · alpha.5: es/fr/pt-BR/id keep HOLD in English (ADSR-adjacent; the first pass translated it) |
| gate / noise gate | gate | gate | gate | gate | — | — | — | — | — | — | Controls and instrument terms | kept; "puerta de ruido" is rare in practice |
| GATED | **CERRADO** | **FERMÉ** | **FECHADO** | **TERTUTUP** | — | — | — | — | — | — | Controls and instrument terms | the state opposite OPEN: "the gate is closed"; UNSURE |
| TRIG / trigger | TRIG / disparo (noun) | TRIG / déclencheur | TRIG / trigger | TRIG / pemicu | 触发 | トリガー | ТРИГ / триггер | — | — | — | Controls and instrument terms | the label TRIG is kept (4 letters); the noun follows the field · zh/ja/ru: ru label abbreviation |
| envelope | envolvente | enveloppe | envelope | envelope | 包络 | エンベロープ | огибающая | — | — | — | Controls and instrument terms |  |
| ENV | ENV | ENV | ENV | ENV | — | — | — | — | — | — | Controls and instrument terms | the stage name, kept |
| stage (of an envelope) | etapa | étape | estágio | tahap | — | — | — | — | — | — | Controls and instrument terms |  |
| sustain | sustain | sustain | sustain | sustain | — | — | — | — | — | — | Controls and instrument terms | kept |
| tension | tensión | tension | tensão | tegangan | — | — | — | टेंशन | টেনশন | الشد | Controls and instrument terms | the bend of a curve segment |
| breakpoint | punto de ruptura | point de rupture | breakpoint | breakpoint | — | — | — | — | — | — | Controls and instrument terms |  |
| stochastic | estocástica | stochastique | estocástica | stokastik | — | — | — | — | — | — | Controls and instrument terms |  |
| analytic | analítica | analytique | analítica | analitik | — | — | — | — | — | — | Controls and instrument terms |  |
| SINE | SENO | SINUS | SENO | SINUS | 正弦 | サイン | СИНУС | — | — | — | Controls and instrument terms |  |
| waveform | forma de onda | forme d’onde | forma de onda | bentuk gelombang | — | — | — | — | — | — | Controls and instrument terms |  |
| smooth | suavizar | lisser | suavizar | haluskan | — | — | — | — | — | — | Controls and instrument terms |  |
| quantise | cuantizar | quantifier | quantizar | kuantisasi | — | — | — | — | — | — | Controls and instrument terms |  |
| bar (musical) | compás | mesure | compasso | birama | — | — | — | — | — | — | Controls and instrument terms |  |
| beat | pulso | temps (a beat of a bar) / tempo | batida | ketukan | — | — | — | — | — | — | Controls and instrument terms |  |
| clock | reloj | horloge | relógio | jam | — | — | — | — | — | — | Controls and instrument terms |  |
| WALL (clock) / FREE | RELOJ / LIBRE | HORLOGE / LIBRE | RELÓGIO / LIVRE | JAM / BEBAS | — | — | — | — | — | — | Controls and instrument terms | **real choice**: WALL = wall-clock time (elapsed real time), so the word is "clock" in each language; UNSURE |
| STUTTER, ANCHOR | kept | kept | kept | kept | — | — | — | — | — | — | Controls and instrument terms | mode names, not common words |
| AUDIO, HIT, BAND(S), LOW, MID, HIGH | AUDIO, HIT, BANDA(S), LOW, MID, HIGH | AUDIO, HIT, BANDE(S), LOW, MID, HIGH | AUDIO (ÁUDIO), HIT, BANDA(S), LOW, MID, HIGH | AUDIO, HIT, BAND, LOW, MID, HIGH | — | — | — | — | — | — | Controls and instrument terms | HIT is the audio onset event: kept. LOW/MID/HIGH are band names passed in as variables |
| meter | medidor | indicateur | medidor | meter | — | — | — | — | — | — | Controls and instrument terms |  |
| follower | seguidor | suiveur | seguidor | pengikut | — | — | — | — | — | — | Controls and instrument terms | as in "envelope follower" |
| input / output | entrada / salida | entrée / sortie | entrada / saída | input / output | — | — | — | — | — | — | Controls and instrument terms | id keeps English |
| MODULATION | MODULACIÓN | MODULATION | MODULAÇÃO | MODULASI | 调制 | モジュレーション | модуляция | मॉड्यूलेशन | মডুলেশন | التضمين | The modulation rack | hi/bn/ar: ar UNSURE |
| MODULATION MATRIX | MATRIZ DE MODULACIÓN | MATRICE DE MODULATION | MATRIZ DE MODULAÇÃO | MATRIKS MODULASI | — | — | — | मॉड्यूलेशन मैट्रिक्स | মডুলেশন ম্যাট্রিক্স | مصفوفة التضمين | The modulation rack |  |
| device | dispositivo | dispositif | dispositivo | perangkat | 设备 | デバイス | устройство | डिवाइस | ডিভাইস | جهاز | The modulation rack | **real choice**: Ableton Live's word in es, fr and pt-BR |
| route (noun) | ruta | **liaison** | rota | rute | 路由 | ルート | маршрут | — | — | — | The modulation rack | **real choice (fr)**: "route" is an English calque; modulation matrices say "assignation" (too long for a button); "liaison" is short and clear. UNSURE |
| ADD ROUTE | AÑADIR RUTA | AJOUTER LIAISON | ADICIONAR ROTA | TAMBAH RUTE | — | — | — | — | — | — | The modulation rack |  |
| source | fuente | source | fonte | sumber | 来源 | ソース | источник | — | — | — | The modulation rack |  |
| target | destino | cible | destino | target | 目标 | ターゲット | цель | — | — | — | The modulation rack |  |
| HAND (the unmodulated state) | **MANUAL** | **MANUEL** | **MANUAL** | **MANUAL** | 手动 | 手動 | РУЧНОЙ | — | — | — | The modulation rack | "the hand's again" = back under manual control. A literal "mano/main/mão" would read as a body part · alpha.5: ru РУЧНОЙ (was РУКА) |
| DEAD SENDS | ENVÍOS HUÉRFANOS | ENVOIS ORPHELINS | ENVIOS ÓRFÃOS | KIRIMAN YATIM | 无效发送 | 無効なセンド | МЁРТВЫЕ ПОСЫЛЫ | — | — | — | The modulation rack | routes whose target is gone: "orphaned" is the idiom for a missing parent in all four |
| route (verb) | enrutar | router | rotear | merutekan | 路由 | ルーティング | назначить маршрут | — | — | — | The modulation rack |  |
| arm / ARMED | armar / ARMADO | armer / ARMÉ | armar / ARMADO | menyiapkan / SIAP | — | — | — | — | — | — | The modulation rack | id "siapkan" reads better than "mempersenjatai" |
| RIBBON | CINTA | RUBAN | FITA | PITA | — | — | — | — | — | — | The modulation rack | the leave-the-window ribbon |
| MACRO rail | carril | rail | trilho | rel | — | — | — | — | — | — | The modulation rack | RAIL is the narrow strip a window narrows to |
| DOCK | (not in the catalogue) |  |  |  | 停靠 | ドック | док | — | — | — | The modulation rack | zh/ja/ru: not in catalogue |
| stutter | stutter | stutter | stutter | stutter | STUTTER | STUTTER | STUTTER | — | — | — | The modulation rack | zh/ja/ru: a named effect, kept |
| audio follower | seguidor de audio | suiveur audio | seguidor de áudio | pengikut audio | 音频跟随器 | オーディオフォロワー | аудиофолловер | ऑडियो फ़ॉलोअर | অডিও ফলোয়ার | متتبّع صوت | The modulation rack |  |
| EVT | EVT | ÉVT | EVT | EVT | — | — | — | — | — | — | The modulation rack | "event" abbreviation |
| CMP / FULL / COMPACT | CMP / COMPLETO / COMPACTO | CMP / COMPLET / COMPACT | CMP / COMPLETO / COMPACTO | CMP / PENUH / RINGKAS | — | — | — | — | — | — | The modulation rack |  |
| FACTORY | FÁBRICA | USINE | FÁBRICA | PABRIK | 出厂 | ファクトリー | ЗАВОДСКОЙ | फ़ैक्टरी | ফ্যাক্টরি | المصنع | The modulation rack | Ableton fr: "Usine" |
| OLDER MODEL | MODELO ANTIGUO | ANCIEN MODÈLE | MODELO ANTIGO | MODEL LAMA | — | — | — | — | — | — | The modulation rack |  |
| IDLE | INACTIVO | INACTIF | INATIVO | DIAM | — | — | — | — | — | — | The modulation rack |  |
| LIVE (capture) | EN VIVO | EN DIRECT | AO VIVO | LANGSUNG | 收音 | 入力中 | СЛУШАЕТ | — | — | — | The modulation rack |  |
| OPEN (gate state) | ABIERTO | OUVERT | ABERTO | TERBUKA | — | — | — | — | — | — | The modulation rack |  |
| window | ventana | fenêtre | janela | jendela | 窗口 | ウィンドウ | окно | — | — | — | Windows, menus and the shell |  |
| rack | rack | rack | rack | rack | — | — | — | रैक | র‍্যাক | الراك | Windows, menus and the shell | the instrument rack; kept · hi/bn/ar: ar now differs from SHELF · alpha.5: ar الراك, transliterated so it differs from SHELF (الرف) |
| stage | escenario | scène | palco | panggung | — | — | — | स्टेज | স্টেজ | المسرح | Windows, menus and the shell |  |
| fold / unfold (a window) | plegar / desplegar | replier / déplier (hints say "réduire / développer") | recolher / expandir | ciutkan / lebarkan | — | — | — | — | — | — | Windows, menus and the shell | the hints use the common software verbs (contraer/expandir, réduire/développer, recolher/expandir) |
| ABOUT | ACERCA DE | À PROPOS | SOBRE | TENTANG | 关于 | について | О ПРОГРАММЕ | परिचय | পরিচিতি | حول | Windows, menus and the shell | menu word · zh/ja/ru: menu name; ja 「MIR について」 |
| LANGUAGE | (menu title; not a catalogue key) |  |  |  | 语言 | 言語 | ЯЗЫК | — | — | — | Windows, menus and the shell | zh/ja/ru: not a key |
| KEYBOARD | TECLADO | CLAVIER | TECLADO | PAPAN KETIK | — | — | — | — | — | — | Windows, menus and the shell | the computer keyboard |
| KEYS | TECLAS | TOUCHES | TECLAS | TOMBOL | — | — | — | — | — | — | Windows, menus and the shell |  |
| chord (a key combination) | combinación | combinaison | combinação | kombinasi | — | — | — | — | — | — | Windows, menus and the shell | "acorde" would read as music |
| modifier | modificador | modificateur | modificador | pengubah | 修饰键 | 修飾キー | модификатор | मॉडिफ़ायर | মডিফায়ার | مفتاح معدِّل | Windows, menus and the shell |  |
| RECORD INPUT | GRABAR ENTRADA | ENREGISTRER LA SAISIE | GRAVAR ENTRADA | REKAM INPUT | 录制按键 | キーを記録 | ЗАПИСАТЬ КЛАВИШУ | इनपुट रिकॉर्ड करें | ইনপুট রেকর্ড করুন | تسجيل الإدخال | Windows, menus and the shell | "record the keys you press"; fr "saisie" = typed input |
| Unbound | Sin asignar | Non assignée | Sem atalho | Belum ditetapkan | — | — | — | — | — | — | Windows, menus and the shell |  |
| GUI | GUI | GUI | GUI | GUI | — | — | — | — | — | — | Windows, menus and the shell | kept |
| LOOK | ASPECTO | ASPECT | APARÊNCIA | TAMPILAN | 外观 | ルック | ВИД | रूप | চেহারা | المظهر | Windows, menus and the shell | the options of the look |
| SKIN | SKIN | SKIN | SKIN | SKIN | 皮肤 | スキン | СКИН | स्किन | স্কিন | السمة | Windows, menus and the shell | **real choice**: the field says "skin" in all four |
| THEME, LIGHT/DARK | (THEME not a key) |  |  |  | — | — | — | — | — | — | Windows, menus and the shell |  |
| LIGHT | **LIGERO** | **LÉGER** | **LEVE** | **RINGAN** | — | — | — | प्रकाश | আলো | الإضاءة | Windows, menus and the shell | the one catalogue key serves both the "light" tier (cheap) and a light theme; the tier sense was chosen (see UNSURE) |
| FROST | FROST | FROST | FROST | FROST | FROST | FROST | FROST | FROST | FROST | FROST | Windows, menus and the shell | the skin's name, kept · zh/ja/ru: skin name, kept (see UNSURE: same key as the FROST segment) · hi/bn/ar: skin name |
| GLASS | VIDRIO | VERRE | VIDRO | KACA | 玻璃 | ガラス | СТЕКЛО | काँच | কাচ | زجاج | Windows, menus and the shell |  |
| BLUR | DESENFOQUE | FLOU | DESFOQUE | BURAM | — | — | — | धुंधलापन | ঝাপসা | تمويه | Windows, menus and the shell |  |
| SHADOW | SOMBRA | OMBRE | SOMBRA | BAYANGAN | — | — | ТЕНЬ | छाया | ছায়া | الظل | Windows, menus and the shell | alpha.5: ru ТЕНЬ / ПОЛКА were swapped in the first draft |
| FRAME | FOTOGRAMA | IMAGE | QUADRO | FRAME | 帧时间 | フレーム時間 | ВРЕМЯ КАДРА | फ़्रेम | ফ্রেম | إطار | Windows, menus and the shell | frame time |
| SHOW | MOSTRAR | AFFICHER | EXIBIR | TAMPIL | — | — | — | दिखाएँ | দেখান | إظهار | Windows, menus and the shell |  |
| compositor pass | pasada del compositor | passe du compositeur | passada do compositor | pass compositor | — | — | — | — | — | — | Windows, menus and the shell |  |
| NOTEBOOK | CUADERNO | CARNET | CADERNO | BUKU CATATAN | 笔记本 | ノートブック | БЛОКНОТ | — | — | — | Windows, menus and the shell |  |
| notes | notas | notes | notas | catatan | — | — | — | — | — | — | Windows, menus and the shell |  |
| SHELF | ESTANTE | ÉTAGÈRE | ESTANTE | RAK | — | — | ПОЛКА | शेल्फ़ | শেলফ | الرف | Windows, menus and the shell | the shelf of saved notes; id "rak" (a rack in id is kept as "rack") · hi/bn/ar: the shelf of saved notes |
| page | página | page | página | halaman | 页 / 页面 | ページ | страница | पृष्ठ | পাতা | صفحة | Windows, menus and the shell |  |
| tab | pestaña | onglet | aba | tab | — | — | — | — | — | — | Windows, menus and the shell |  |
| FOLDERS / folder | CARPETAS / carpeta | DOSSIERS / dossier | PASTAS / pasta | FOLDER / folder | 文件夹 | フォルダー | папки | — | — | — | Windows, menus and the shell |  |
| PROJECTS | PROYECTOS | PROJETS | PROJETOS | PROYEK | 项目 | プロジェクト | проекты | — | — | — | Windows, menus and the shell |  |
| (root) / ROOT | (raíz) / RAÍZ | (racine) / RACINE | (raiz) / RAIZ | (akar) / AKAR | — | — | — | — | — | — | Windows, menus and the shell |  |
| gallery | galería | galerie | galeria | galeri | 图库 | ギャラリー | галерея | — | — | — | Windows, menus and the shell |  |
| layout (of windows) | disposición | disposition | layout | tata letak | — | — | — | — | — | — | Windows, menus and the shell |  |
| work bars | barras de trabajo | barres de travail | barras de trabalho | bar kerja | 工作栏 | ワークバー | рабочие панели | — | — | — | Windows, menus and the shell |  |
| picture (an image that carries a project) | imagen | image | imagem | gambar | — | — | — | — | — | — | Windows, menus and the shell |  |
| draft | borrador | brouillon | rascunho | draf | 草稿 | 草稿 | ЧЕРНОВИК | — | — | — | Windows, menus and the shell |  |
| SAVE | GUARDAR | ENREGISTRER | SALVAR | SIMPAN | — | — | — | सहेजें | সংরক্ষণ করুন | حفظ | File actions and messages | hi/bn/ar: Google/Windows form |
| SAVE AS | GUARDAR COMO | ENREG. SOUS | SALVAR COMO | SIMPAN SEBAGAI | — | — | — | इस रूप में सहेजें | এভাবে সংরক্ষণ করুন | حفظ باسم | File actions and messages | fr abbreviation: "Enreg. sous", standard in menus |
| OPEN (verb) | ABRIR | OUVRIR | ABRIR | BUKA | — | — | — | — | — | — | File actions and messages |  |
| COPY / COPIED | COPIAR / COPIADO | COPIER / COPIÉ | COPIAR / COPIADO | SALIN / TERSALIN | — | — | — | — | — | — | File actions and messages |  |
| EXPORT / IMPORT / IMPORTED | EXPORTAR / IMPORTAR / IMPORTADO | EXPORTER / IMPORTER / IMPORTÉ | EXPORTAR / IMPORTAR / IMPORTADO | EKSPOR / IMPOR / DIIMPOR | — | — | — | — | — | — | File actions and messages |  |
| REMOVE | QUITAR | RETIRER | REMOVER | LEPAS | — | — | — | — | — | — | File actions and messages | take away but keep (a route, a macro) |
| delete | eliminar | supprimer | excluir | hapus | — | — | — | — | — | — | File actions and messages | destroy (pt-BR "excluir" is the software word) |
| REMOVE ALL | QUITAR TODO | TOUT RETIRER | REMOVER TUDO | LEPAS SEMUA | — | — | — | — | — | — | File actions and messages |  |
| UNDO / REDO | DESHACER / REHACER | ANNULER / RÉTABLIR | DESFAZER / REFAZER | URUNGKAN / ULANGI | 撤销 / 重做 | 取り消し / やり直し | ОТМЕНИТЬ / ПОВТОРИТЬ | — | — | — | File actions and messages |  |
| RESET | REINICIAR | RÉINIT. | REDEFINIR | ATUR ULANG | 重置 | リセット | СБРОС | रीसेट | রিসেট | إعادة ضبط | File actions and messages | restore a value to its start; fr abbreviation "Réinit." |
| RESET TO DEFAULT | RESTABLECER VALOR POR DEFECTO | RÉTABLIR PAR DÉFAUT | VOLTAR AO PADRÃO | KEMBALI KE BAWAAN | — | — | — | — | — | — | File actions and messages |  |
| RETRY | REINTENTAR | RÉESSAYER | TENTAR DE NOVO | COBA LAGI | — | — | — | फिर कोशिश करें | আবার চেষ্টা করুন | إعادة المحاولة | File actions and messages |  |
| CLOSE | CERRAR | FERMER | FECHAR | TUTUP | — | — | — | बंद करें | বন্ধ করুন | إغلاق | File actions and messages |  |
| Cancel / OK | Cancelar / OK | Annuler / OK | Cancelar / OK | Batal / OK | — | — | — | — | — | — | File actions and messages |  |
| MOVE TO | MOVER A | DÉPLACER VERS | MOVER PARA | PINDAH KE | — | — | — | — | — | — | File actions and messages |  |
| rename | renombrar | renommer | renomear | ganti nama | — | — | — | नाम बदलें | নাম বদলান | إعادة تسمية | File actions and messages |  |
| duplicate | duplicar | dupliquer | duplicar | duplikat | — | — | — | — | — | — | File actions and messages |  |
| Sort | Ordenar | Trier | Ordenar | Urutkan | 排序 | 並べ替え | Сортировка | क्रमबद्ध करें | সাজান | ترتيب | File actions and messages |  |
| UNSAVED CHANGES | CAMBIOS SIN GUARDAR | MODIFICATIONS NON ENREGISTRÉES | ALTERAÇÕES NÃO SALVAS | PERUBAHAN BELUM DISIMPAN | — | — | — | — | — | — | File actions and messages |  |
| UNTITLED | SIN TÍTULO | SANS TITRE | SEM TÍTULO | TANPA JUDUL | — | — | — | — | — | — | File actions and messages |  |
| ON / OFF | ON / OFF | ON / OFF | ON / OFF | ON / OFF | — | — | — | चालू / बंद | চালু / বন্ধ | تشغيل / إيقاف | File actions and messages | kept: the label on every hardware switch |
| yes / no | sí / no | oui / non | sim / não | ya / tidak | — | — | — | — | — | — | File actions and messages |  |
| DRAFT | BORRADOR | BROUILLON | RASCUNHO | DRAF | 草稿 | 草稿 | ЧЕРНОВИК | — | — | — | File actions and messages | the language menu's mark |
| EXPOSURE | EXPOSICIÓN | EXPOSITION | EXPOSIÇÃO | EKSPOSUR | — | — | — | — | — | — | Camera and look knobs (host.js labels) | photographic |
| HUE | TONO | TEINTE | MATIZ | HUE | — | — | — | HUE | HUE | HUE | Camera and look knobs (host.js labels) | colour wheel · hi/bn/ar: stays Latin (also a host knob) |
| GRAIN | GRANO | GRAIN | GRÃO | BUTIR | — | — | — | — | — | — | Camera and look knobs (host.js labels) |  |
| SOFTNESS | SUAVIDAD | DOUCEUR | SUAVIDADE | KELEMBUTAN | — | — | — | — | — | — | Camera and look knobs (host.js labels) |  |
| ISO / FOV | ISO / FOV | ISO / FOV | ISO / FOV | ISO / FOV | — | — | — | — | — | — | Camera and look knobs (host.js labels) |  |
| KNEE | KNEE | COUDE | KNEE | KNEE | — | — | — | — | — | — | Camera and look knobs (host.js labels) | **real choice**: the tone curve's knee; es/pt/id keep the English term |
| RES | RES | RÉS. | RES | RES | — | — | — | — | — | — | Camera and look knobs (host.js labels) | resolution |
| DIST | DIST | DIST | DIST | JARAK | — | — | — | — | — | — | Camera and look knobs (host.js labels) |  |
| STEPS | PASOS | PAS | PASSOS | LANGKAH | 步数 | ステップ | ШАГИ | — | — | — | Camera and look knobs (host.js labels) |  |
| WINDOW (time window, s) | VENTANA | FENÊTRE | JANELA | JENDELA | — | — | — | — | — | — | Camera and look knobs (host.js labels) | same word as the interface window; see UNSURE |
| YAW | GUIÑADA | LACET | GUINADA | YAW | — | — | — | — | — | — | Camera and look knobs (host.js labels) | aircraft axes |
| PITCH | CABECEO | TANGAGE | ARFAGEM | PITCH | — | — | ВЫСОТА | — | — | — | Camera and look knobs (host.js labels) | the camera axis, not musical pitch |
| LAP / TURN / RISE | VUELTA / GIRO / ASCENSO | TOUR / ROTATION / MONTÉE | VOLTA / GIRO / SUBIDA | PUTARAN / PUTAR / NAIK | — | — | — | — | — | — | Camera and look knobs (host.js labels) | the camera orbit presets |
| UP / DOWN | ARRIBA / ABAJO | HAUT / BAS | CIMA / BAIXO | ATAS / BAWAH | — | — | — | — | — | — | Camera and look knobs (host.js labels) |  |
| control | — | — | — | — | 控件 | コントロール | регулятор | — | — | — | more terms |  |
| ENV / ADSR | — | — | — | — | ENV / ADSR | ENV / ADSR | ENV / ADSR | — | — | — | more terms | zh/ja/ru: kept |
| GATE | — | — | — | — | 门限 / 门 | ゲート | гейт | — | — | — | more terms | zh/ja/ru: zh: 噪声门 for the noise gate; state words 门开 / 门关 |
| GATED / OPEN (gate state) | — | — | — | — | 门关 / 门开 | ゲート閉 / ゲート開 | ЗАКРЫТ / ОТКРЫТ | — | — | — | more terms |  |
| attack / release / sustain | — | — | — | — | 起音 / 释放 / 延音 | アタック / リリース / サステイン | атака / релиз / сустейн | — | — | — | more terms |  |
| ENV stage | — | — | — | — | 段 | ステージ | стадия | — | — | — | more terms |  |
| ARM (arm a macro) | — | — | — | — | 就绪 | 待機 / アーム | взвести | — | — | — | more terms | zh/ja/ru: real choice: "armed, waiting for a tap" |
| patch | — | — | — | — | 补丁 | パッチ | патч | पैच | প্যাচ | رقعة | more terms | zh/ja/ru: see UNSURE · hi/bn/ar: ar: "رقعة" UNSURE |
| preset | — | — | — | — | 预设 | プリセット | пресет | — | — | — | more terms |  |
| tension (curve) | — | — | — | — | 张力 | テンション | натяжение | — | — | — | more terms |  |
| point / handle | — | — | — | — | 点 / 手柄 | 点 / ハンドル | точка / ручка | बिंदु / हैंडल | বিন্দু / হ্যান্ডেল | نقطة / مقبض | more terms |  |
| ANCHOR | — | — | — | — | ANCHOR | ANCHOR | ANCHOR | — | — | — | more terms | zh/ja/ru: named mode, kept |
| WALL / FREE (clock) | — | — | — | — | 实际 / 自由 | 実時間 / フリー | РЕАЛ / СВОБОДНО | — | — | — | more terms | zh/ja/ru: WALL = wall-clock time · alpha.5: zh WALL 实际 and LIVE 收音 now differ |
| transport | — | — | — | — | 传输栏 | トランスポート | транспорт | ट्रांसपोर्ट | ট্রান্সপোর্ট | الناقل | more terms |  |
| tap tempo (verb) | — | — | — | — | 点按 | タップ | нажимать в такт | — | — | — | more terms |  |
| BPM / bar / beat | — | — | — | — | BPM / 小节 / 拍 | BPM / 小節 / 拍 | BPM / такт / доля | — | — | — | more terms |  |
| AUDIO IN | — | — | — | — | 音频输入 | オーディオ入力 | АУДИОВХОД | ऑडियो इन | অডিও ইন | مدخل الصوت | more terms |  |
| band (LOW/MID/HIGH) | — | — | — | — | 频段 | バンド | полоса | — | — | — | more terms | zh/ja/ru: LOW/MID/HIGH themselves not in catalogue, stay Latin |
| microphone | — | — | — | — | 麦克风 | マイク | микрофон | माइक्रोफ़ोन | মাইক্রোফোন | الميكروفون | more terms |  |
| rack / stage | — | — | — | — | 机架 / 舞台 | ラック / ステージ | стойка / сцена | — | — | — | more terms |  |
| rail | — | — | — | — | 栏 | レール | панель / рейка | रेल | রেল | شريط | more terms | zh/ja/ru: zh 宏栏; ru «панель макро», «сузить до рейки» |
| fold / collapse | — | — | — | — | 折叠 | 折りたたむ | свернуть | — | — | — | more terms |  |
| frost (material, in hints) | — | — | — | — | 磨砂 | フロスト | матовое стекло | — | — | — | more terms |  |
| TINTED | — | — | — | — | 着色 | ティント | ТОНИРОВАННЫЙ | — | — | — | more terms | zh/ja/ru: keys live in gui.js, not catalogue |
| REFRACTIVE | — | — | — | — | 折射 | 屈折 | ПРЕЛОМЛЯЮЩИЙ | — | — | — | more terms | zh/ja/ru: (not a catalogue key) |
| BLUR / SHADOW | — | — | — | — | 模糊 / 阴影 | ぼかし / シャドウ | РАЗМЫТИЕ / ТЕНЬ | — | — | — | more terms |  |
| pane / surface | — | — | — | — | 面板 / 表面 | ペイン / サーフェス | панель / поверхность | — | — | — | more terms |  |
| TIER | NIVEL | PALIER | NÍVEL | TINGKAT | 档位 | ティア | УРОВЕНЬ | — | — | — | more terms | zh/ja/ru: not a key |
| FULL / LIGHT / CLASSIC | — | — | — | — | 完整 / 轻量 / 经典 | フル / ライト / クラシック | ПОЛНЫЙ / ЛЁГКИЙ / КЛАССИКА | — | — | — | more terms |  |
| ROOT | — | — | — | — | 根目录 | 最上位 | КОРЕНЬ | रूट | রুট | الجذر | more terms | alpha.5: ja no longer ルート |
| SAVE / SAVE AS | — | — | — | — | 保存 / 另存为 | 保存 / 名前を付けて保存 | СОХРАНИТЬ / СОХРАНИТЬ КАК | — | — | — | more terms |  |
| OPEN / EXPORT / IMPORT | — | — | — | — | 打开 / 导出 / 导入 | 開く / 書き出し / 読み込み | ОТКРЫТЬ / ЭКСПОРТ / ИМПОРТ | — | — | — | more terms |  |
| COPY / PASTE | — | — | — | — | 复制 / 粘贴 | コピー / 貼り付け | КОПИРОВАТЬ / ВСТАВИТЬ | — | — | — | more terms |  |
| REMOVE / delete | — | — | — | — | 移除 / 删除 | 削除 | УДАЛИТЬ | — | — | — | more terms |  |
| RENAME / DUPLICATE | — | — | — | — | 重命名 / 复制 | 名前を変更 / 複製 | переименовать / дублировать | — | — | — | more terms | zh/ja/ru: zh uses 复制 for both copy and duplicate |
| notes / SHELF | — | — | — | — | 笔记 / 书架 | ノート / シェルフ | заметки / полка | — | — | — | more terms |  |
| OPTIONS | — | — | — | — | 选项 | オプション | НАСТРОЙКИ | विकल्प | বিকল্প | خيارات | more terms |  |
| KEYBOARD / KEYS | — | — | — | — | 键盘 / 按键 | キーボード / キー | КЛАВИАТУРА / КЛАВИШИ | — | — | — | more terms |  |
| chord (key combination) | — | — | — | — | 组合键 | キーの組み合わせ | сочетание | — | — | — | more terms |  |
| bound / unbound | — | — | — | — | 绑定 / 未绑定 | 割り当て / 未割り当て | назначено / не назначено | असाइन / असाइन नहीं | অ্যাসাইন / অ্যাসাইন নেই | معيّن / غير معيّن | more terms |  |
| PHOTOSENSITIVITY WARNING | — | — | — | — | 光敏性癫痫警告 | 光過敏性発作に関する警告 | ПРЕДУПРЕЖДЕНИЕ О ФОТОСЕНСИТИВНОСТИ | प्रकाश-संवेदनशीलता की चेतावनी | আলোক-সংবেদনশীলতা সতর্কতা | تحذير من الحساسية الضوئية | more terms |  |
| WebGPU, GPU, GNU GPL, SIL OFL | — | — | — | — | kept | kept | kept | — | — | — | more terms |  |
| OPEN | — | — | — | — | — | — | — | खोलें | খুলুন | فتح | more terms |  |
| COPY | — | — | — | — | — | — | — | कॉपी करें | কপি করুন | نسخ | more terms |  |
| COPIED | — | — | — | — | — | — | — | कॉपी हुआ | কপি হয়েছে | تم النسخ | more terms |  |
| REMOVE (take away) | — | — | — | — | — | — | — | हटाएँ | সরান | إزالة | more terms | hi/bn/ar: kept distinct from delete |
| delete (destroy) | — | — | — | — | — | — | — | हटाएँ | মুছুন | حذف | more terms | hi/bn/ar: hi has one verb for both |
| UNDO | — | — | — | — | — | — | — | पूर्ववत करें | পূর্বাবস্থায় ফেরান | تراجع | more terms |  |
| REDO | — | — | — | — | — | — | — | फिर करें | পুনরায় করুন | إعادة | more terms |  |
| CANCEL | — | — | — | — | — | — | — | रद्द करें | বাতিল করুন | إلغاء | more terms |  |
| OK | — | — | — | — | — | — | — | ठीक है | ঠিক আছে | موافق | more terms |  |
| IMPORT / EXPORT | — | — | — | — | — | — | — | आयात / निर्यात | ইমপোর্ট / এক্সপোর্ট | استيراد / تصدير | more terms | hi/bn/ar: bn uses the loanwords, as Google Bengali does |
| MOVE | — | — | — | — | — | — | — | ले जाएँ | সরান | نقل | more terms | hi/bn/ar: bn "সরান" is also REMOVE: context separates |
| LANGUAGE / DRAFT | — | — | — | — | — | — | — | भाषा / ड्राफ़्ट | ভাষা / খসড়া | اللغة / مسودة | more terms |  |
| FOLDER(S) | — | — | — | — | — | — | — | फ़ोल्डर | ফোল্ডার | مجلد / المجلدات | more terms |  |
| PROJECT(S) | — | — | — | — | — | — | — | प्रोजेक्ट | প্রজেক্ট | مشروع / المشاريع | more terms |  |
| NOTES / NOTEBOOK | — | — | — | — | — | — | — | नोट्स / नोटबुक | নোট / নোটবুক | ملاحظات / دفتر الملاحظات | more terms |  |
| WINDOW (the UI thing) | — | — | — | — | — | — | — | विंडो | উইন্ডো | نافذة | more terms |  |
| WINDOW (the knob, host.js) | — | — | — | — | — | — | — | WINDOW | WINDOW | WINDOW | more terms | hi/bn/ar: kept Latin to tell it from the UI word |
| DOCK / WORK BARS | — | — | — | — | — | — | — | वर्क बार | ওয়ার্ক বার | أشرطة العمل | more terms |  |
| CLASSIC / CUSTOM / COMPACT | — | — | — | — | — | — | — | क्लासिक / कस्टम / कॉम्पैक्ट | ক্লাসিক / কাস্টম / কমপ্যাক্ট | كلاسيكي / مخصص / مدمج | more terms |  |
| ROUTE / ROUTING | — | — | — | — | — | — | — | रूट / रूटिंग | রুট / রুটিং | مسار / توجيه | more terms | hi/bn/ar: verb "route" = रूट करना / রুট করা / توجيه |
| PRESETS | — | — | — | — | — | — | — | प्रीसेट | প্রিসেট | إعدادات مسبقة | more terms |  |
| MY PRESETS | — | — | — | — | — | — | — | मेरे प्रीसेट | আমার প্রিসেট | إعداداتي المسبقة | more terms |  |
| envelope (prose) | — | — | — | — | — | — | — | एन्वेलप | এনভেলপ | إنفلوب | more terms | hi/bn/ar: label ENV stays Latin |
| AUDIO ON | — | — | — | — | — | — | — | ऑडियो चालू | অডিও চালু | الصوت قيد التشغيل | more terms |  |
| COPY DETAILS | — | — | — | — | — | — | — | विवरण कॉपी करें | বিবরণ কপি করুন | نسخ التفاصيل | more terms |  |
| KEYS / KEYBOARD | — | — | — | — | — | — | — | कुंजियाँ / कीबोर्ड | কী / কীবোর্ড | المفاتيح / لوحة المفاتيح | more terms |  |
| chord (key combo) | — | — | — | — | — | — | — | संयोजन | কী-সংযোগ | تركيبة | more terms |  |
| LIVE / IDLE / GATED | — | — | — | — | — | — | — | Latin | Latin | Latin | more terms | hi/bn/ar: status words of the audio capture; see UNSURE |
| HAND | — | — | — | — | — | — | — | हाथ | হাত | اليد | more terms | hi/bn/ar: the manual, un-modulated value |
| browser / GPU / adapter | — | — | — | — | — | — | — | ब्राउज़र / GPU / एडाप्टर | ব্রাউজার / GPU / অ্যাডাপ্টার | المتصفح / GPU / محوِّل | more terms |  |
| SPECIAL THANKS | — | — | — | — | — | — | — | विशेष आभार | বিশেষ ধন্যবাদ | شكر خاص | more terms |  |
| yes / no / sure? | — | — | — | — | — | — | — | हाँ / नहीं / पक्का? | হ্যাঁ / না / নিশ্চিত? | نعم / لا / متأكد؟ | more terms |  |
| ANCHOR (LFO resume mode) | ANCLA | ANCRE | ÂNCORA | JANGKAR | — | — | — | — | — | — | alpha.5 additions | now a label, so translated (was kept in sentences) |
| AIRY / TIGHT (rack spacing) | AIREADO / AJUSTADO | AÉRÉ / SERRÉ | AREJADO / APERTADO | LEGA / RAPAT | — | — | — | — | — | — | alpha.5 additions | 16 px vs 3 px gap |
| STILL (frost while the picture is still) | ESTÁTICO | FIXE | PARADO | DIAM | — | — | — | — | — | — | alpha.5 additions |  |
| ALWAYS / AUTO / SYSTEM | SIEMPRE / AUTO / SISTEMA | TOUJOURS / AUTO / SYSTÈME | SEMPRE / AUTO / SISTEMA | SELALU / AUTO / SISTEM | — | — | — | — | — | — | alpha.5 additions |  |
| theme mode LIGHT / DARK | CLARO / OSCURO | CLAIR / SOMBRE | CLARO / ESCURO | TERANG / GELAP | 浅色 / 深色 | ライト / ダーク | СВЕТЛЫЙ / ТЁМНЫЙ | लाइट / डार्क | লাইট / ডার্ক | فاتح / داكن | alpha.5 additions | the context key `theme mode::` |
| text ink LIGHT / DARK | CLARO / OSCURO | CLAIR / FONCÉ | CLARO / ESCURO | TERANG / GELAP | 浅色 / 深色 | ライト / ダーク | СВЕТЛЫЙ / ТЁМНЫЙ | — | — | — | alpha.5 additions | light ink = white text |
| light source LIGHT | LUZ | LUMIÈRE | LUZ | CAHAYA | 光源 | ライト | СВЕТ | प्रकाश | আলো | الإضاءة | alpha.5 additions | the light itself |
| quality tier LIGHT / FULL | LIGERO / COMPLETO | LÉGER / COMPLET | LEVE / COMPLETO | RINGAN / PENUH | — | — | — | — | — | — | alpha.5 additions |  |
| peak hold HOLD / envelope HOLD | HOLD | HOLD | HOLD | HOLD | — | — | — | — | — | — | alpha.5 additions | ADSR-adjacent; kept English (reverses the first-pass RETENCIÓN/MAINTIEN/RETENÇÃO/TAHAN, which was hint-only) |
| clock state HOLD | en pausa | en pause | em pausa | jeda | — | — | — | — | — | — | alpha.5 additions | the clock held in place |
| time span WINDOW | DURACIÓN | DURÉE | DURAÇÃO | DURASI | — | — | — | अवधि | সময়সীমা | المدة | alpha.5 additions | not an interface window · hi/bn/ar: not the UI window |
| DECAY / SUSTAIN / RUN / REL | kept | kept | kept | kept | — | — | — | — | — | — | alpha.5 additions | ADSR words kept like RELEASE |
| TINT / HUE / TONE | TINTE / TONO / VARIANTE | COLORIS / TEINTE / VARIANTE | TINTA / MATIZ / VARIANTE | TINT / HUE / VARIAN | — | — | — | — | — | — | alpha.5 additions | three colour words that must stay distinct |
| SHINE / SHINE SOFT(NESS) | REFLEJO | REFLET | REFLEXO | KILAU | — | — | — | — | — | — | alpha.5 additions | specular light across the pane edge |
| BRIGHT | BRILLO | CLARTÉ | BRILHO | CERAH | — | — | — | उजलापन | উজ্জ্বলতা | السطوع | alpha.5 additions | glass lightness |
| VEIL | VELO | VOILE | VÉU | KERUDUNG | — | — | — | परदा | পর্দা | الحجاب | alpha.5 additions |  |
| PANE / MATERIAL / FACES | PANEL / MATERIAL / CARAS | PANNEAU / MATÉRIAU / FACES | PAINEL / MATERIAL / FACES | PANEL / MATERIAL / MUKA | — | — | — | — | — | — | alpha.5 additions |  |
| SOLID / TINTED / REFRACTIVE | SÓLIDO / TEÑIDO / REFRACTIVO | OPAQUE / TEINTÉ / RÉFRACTIF | SÓLIDO / TINGIDO / REFRATIVO | PADAT / BERWARNA / REFRAKTIF | — | — | — | — | — | — | alpha.5 additions | glass materials |
| frost setting FROST | escarcha | givre | fosco | embun | 磨砂 | フロスト | МАТОВОСТЬ | — | — | — | alpha.5 additions | the option word; the theme FROST is a name, never translated · zh/ja/ru: STILL 静止 / 静止時 / ПОКОЙ, ALWAYS 始终 / 常時 / ВСЕГДА |
| LOWER / UPPER (dB boundary) | INFERIOR / SUPERIOR | INFÉRIEUR / SUPÉRIEUR | INFERIOR / SUPERIOR | BAWAH / ATAS | — | — | — | — | — | — | alpha.5 additions | response boundaries |
| Lower / Raise {window} | Bajar / Subir | Abaisser / Monter | Abaixar / Subir | Turunkan / Naikkan | — | — | — | — | — | — | alpha.5 additions | window stacking |
| KNOB / TRIGGER (macro kinds) | MANDO / DISPARADOR | POTARD / DÉCLENCHEUR | BOTÃO / TRIGGER | KNOB / TRIGGER | — | — | — | नॉब / ट्रिगर | নব / ট্রিগার | مقبض / محفِّز | alpha.5 additions |  |
| SENSE / HIT SENSE | SENS. | SENSIB. | SENSIB. | SENSIT. | — | — | — | — | — | — | alpha.5 additions | abbreviated for knob width |
| DROP GUIDES / DROP SHADOW | GUÍAS DE DESTINO / SOMBRA PROYECTADA | GUIDES DE DÉPÔT / OMBRE PORTÉE | GUIAS DE SOLTAR / SOMBRA PROJETADA | PANDU LETAK / BAYANGAN JATUH | — | — | — | — | — | — | alpha.5 additions |  |
| DISCONNECTED (headers apart) | SEPARADOS | SÉPARÉS | SEPARADOS | TERPISAH | — | — | — | — | — | — | alpha.5 additions |  |
| DOTTED / TRIPLET (note values) | CON PUNTILLO / TRESILLO | POINTÉE / TRIOLET | PONTUADA / TRÍOLA | BERTITIK / TRIOL | — | — | — | — | — | — | alpha.5 additions |  |
| FIT / FLIP / INVERT | AJUSTAR / VOLTEAR / INVERTIR | ADAPTER / RETOURNER / INVERSER | AJUSTAR / VIRAR / INVERTER | PAS / BALIK / INVERSI | — | — | — | — | — | — | alpha.5 additions |  |
| ASKING / DENIED / CLOSED (capture states) | PIDIENDO / DENEGADO / CERRADO | DEMANDE / REFUSÉ / FERMÉ | PEDINDO / NEGADO / FECHADO | MEMINTA / DITOLAK / TERTUTUP | — | — | — | — | — | — | alpha.5 additions |  |
| waveform names SAW↑ SAW↓ SQR TRI S&H MULTI-SAW MULTI-TRI DRIFT | kept | kept | kept | kept | — | — | — | — | — | — | alpha.5 additions | per the note |
| HINTS | SUGERENCIAS | INFOBULLES | DICAS | PETUNJUK | — | — | — | — | — | — | alpha.5 additions | hover hints |
| SPACING | ESPACIADO | ESPACEMENT | ESPAÇAMENTO | SPASI | — | — | — | — | — | — | alpha.5 additions |  |
| conditioning sheet | acondicionamiento | conditionnement | condicionamento | pengondisian | — | — | — | कंडीशनिंग शीट | কন্ডিশনিং শিট | ورقة التهيئة | alpha.5 additions |  |
| THEME (light/dark mode) | — | — | — | — | 明暗 | モード | РЕЖИМ | — | — | — | alpha.5 additions | zh/ja/ru: not 主题/テーマ/ТЕМА: those mean the FROST-style theme |
| quality tier LIGHT | — | — | — | — | 轻量 | ライト | ЛЁГКИЙ | हल्का | হালকা | خفيف | alpha.5 additions |  |
| TONE (colour variant) | — | — | — | — | 色调 | トーン | ВАРИАНТ | — | — | — | alpha.5 additions |  |
| HUE / TINT / BRIGHT | — | — | — | — | 色相 / 着色 / 亮度 | 色相 / ティント / 明るさ | ОТТЕНОК / ОТТЕНОК / ЯРКОСТЬ | — | — | — | alpha.5 additions | zh/ja/ru: ru HUE and TINT collide (оттенок); consider ТОН / ПОДКРАСКА |
| SHINE / VEIL / RELIEF | — | — | — | — | 高光 / 薄纱 / 浮雕 | シャイン / ベール / レリーフ | БЛИК / ВУАЛЬ / РЕЛЬЕФ | — | — | — | alpha.5 additions |  |
| LIGHT ANGLE | — | — | — | — | 光照角度 | 光の角度 | УГОЛ СВЕТА | — | — | — | alpha.5 additions |  |
| PANE / SOLID / TINTED / REFRACTIVE | — | — | — | — | 面板 / 实心 / 着色 / 折射 | ペイン / ソリッド / ティント / 屈折 | ПАНЕЛЬ / СПЛОШНОЙ / ТОНИРОВАННЫЙ / ПРЕЛОМЛЯЮЩИЙ | — | — | — | alpha.5 additions |  |
| tier BALANCED / FULL | — | — | — | — | 均衡 / 完整 | バランス / フル | СБАЛАНС. / ПОЛНЫЙ | — | — | — | alpha.5 additions |  |
| macro KNOB / TRIGGER | — | — | — | — | 旋钮 / 触发器 | ノブ / トリガー | РУЧКА / ТРИГГЕР | — | — | — | alpha.5 additions |  |
| stage HOLD (envelope) | — | — | — | — | 保持 | ホールド | ВЫДЕРЖКА | — | — | — | alpha.5 additions |  |
| peak hold HOLD | — | — | — | — | 保持 | ホールド | УДЕРЖ. | — | — | — | alpha.5 additions |  |
| clock HOLD / RUN | — | — | — | — | 暂停 / 运行 | 一時停止 / 実行中 | ПАУЗА / ХОД | — | — | — | alpha.5 additions |  |
| STUTTER HOLD 1 | — | — | — | — | 保持 1 | ホールド 1 | УДЕРЖ. 1 | — | — | — | alpha.5 additions |  |
| DECAY / SUSTAIN / ATTACK / RELEASE | — | — | — | — | 衰减 / 延音 / 起音 / 释放 | ディケイ / サステイン / アタック / リリース | СПАД / САСТЕЙН / АТАКА / РЕЛИЗ | — | — | — | alpha.5 additions | zh/ja/ru: initials in "A R H" line: 起 释 保 / ア リ ホ / А Р У |
| LOWER / UPPER (response boundary) | — | — | — | — | 下限 / 上限 | 下限 / 上限 | НИЖНЯЯ / ВЕРХНЯЯ | — | — | — | alpha.5 additions |  |
| LOW / MID / HIGH | — | — | — | — | 低 / 中 / 高 | ロー / ミッド / ハイ | НЧ / СЧ / ВЧ | — | — | — | alpha.5 additions |  |
| HIT | — | — | — | — | 击点 | ヒット | УДАР | — | — | — | alpha.5 additions |  |
| NOISE GATE / GATE | — | — | — | — | 噪声门 / 门 | ノイズゲート / ゲート | ШУМОВОЙ ГЕЙТ / ГЕЙТ | — | — | — | alpha.5 additions |  |
| HYST | — | — | — | — | 滞回 | ヒステリシス | ГИСТ. | — | — | — | alpha.5 additions |  |
| DESTINATION / SOURCE / POLARITY / AMOUNT | — | — | — | — | 目标 / 来源 / 极性 / 数量 | デスティネーション / ソース / ポラリティ / 量 | НАЗНАЧЕНИЕ / ИСТОЧНИК / ПОЛЯРНОСТЬ / ВЕЛИЧИНА | — | — | — | alpha.5 additions |  |
| TRANSPORT / dock / undock | — | — | — | — | 传输栏 / 停靠 / 取消停靠 | トランスポート / ドック / ドック解除 | ТРАНСПОРТ / закрепить / открепить | — | — | — | alpha.5 additions |  |
| CONDITIONING | — | — | — | — | 调节 | コンディショニング | ОБРАБОТКА | — | — | — | alpha.5 additions |  |
| waveform names (SAW↑ SAW↓ SQR TRI S&H DRIFT MULTI-SAW MULTI-TRI SINE) | — | — | — | — | kept | kept | kept | — | — | — | alpha.5 additions | zh/ja/ru: per the note |
| BEAT / TAP / TRIPLET / DOTTED | — | — | — | — | 节拍 / 点按 / 三连音 / 附点 | ビート / タップ / 三連符 / 付点 | БИТ / ТАП / ТРИОЛЬ / С ТОЧКОЙ | — | — | — | alpha.5 additions |  |
| MOD | — | — | — | — | 调制 | MOD | МОД | — | — | — | alpha.5 additions |  |
| the rack / the shelf | — | — | — | — | 机架 / 书架 | ラック / シェルフ | стойка / полка | — | — | — | alpha.5 additions |  |
| ROOT (folder tree top) | — | — | — | — | 根目录 | 最上位 | КОРЕНЬ | — | — | — | alpha.5 additions |  |
| visiting model | — | — | — | — | 来访的模型 | 訪れたモデル | приходящая модель | — | — | — | alpha.5 additions |  |
| RACK (the docked column) | — | — | — | — | — | — | — | रैक | র‍্যাক | الراك | alpha.5 additions | hi/bn/ar: ar: transliterated so it differs from SHELF (الرف, where notes are kept); keeps the producers' word |
| SHINE | — | — | — | — | — | — | — | चमक | দীপ্তি | اللمعان | alpha.5 additions |  |
| TINT | — | — | — | — | — | — | — | रंगत | আভা | الصبغة | alpha.5 additions |  |
| SOLID | — | — | — | — | — | — | — | ठोस | নিরেট | معتم | alpha.5 additions |  |
| SATURATION | — | — | — | — | — | — | — | संतृप्ति | সম্পৃক্তি | التشبّع | alpha.5 additions |  |
| LIGHT ANGLE / ANGLE | — | — | — | — | — | — | — | प्रकाश कोण / कोण | আলোর কোণ / কোণ | زاوية الضوء / الزاوية | alpha.5 additions |  |
| RELIEF | — | — | — | — | — | — | — | उभार | উঁচু-নিচু ভাব | التجسيم | alpha.5 additions |  |
| PARALLAX / POLARITY | — | — | — | — | — | — | — | पैरालैक्स / ध्रुवता | প্যারালাক্স / পোলারিটি | المنظور المتحرك / القطبية | alpha.5 additions |  |
| QUALITY / TIER | — | — | — | — | — | — | — | गुणवत्ता / स्तर | মান / স্তর | الجودة / المستوى | alpha.5 additions |  |
| FULL (motion, tier) | — | — | — | — | — | — | — | पूर्ण | পূর্ণ | كامل | alpha.5 additions | hi/bn/ar: device-view FULL stays Latin beside CMP |
| waveform names SAW↑ SAW↓ SQR TRI S&H DRIFT MULTI-* | — | — | — | — | — | — | — | Latin | Latin | Latin | alpha.5 additions | hi/bn/ar: as the catalogue note suggests |
| DOTTED / TRIPLET / HOLD 1/4 | — | — | — | — | — | — | — | Latin | Latin | Latin | alpha.5 additions | hi/bn/ar: note values |
| dead-send inspector | — | — | — | — | — | — | — | डेड-सेंड निरीक्षक | ডেড-সেন্ড পরিদর্শক | مفتش الإرسال الميت | alpha.5 additions |  |
| TIMELINE | LÍNEA DE TIEMPO | TIMELINE | LINHA DO TEMPO | LINIMASA | 时间线 | タイムライン | ТАЙМЛАЙН | टाइमलाइन | টাইমলাইন | الخط الزمني | Timeline and pattern (alpha.12) | the second plugin's window and its name in "{what} · TIMELINE"; from the alpha.11 pack |
| lane | carril | couloir | pista | lajur | 轨道 | レーン | дорожка | लेन | লেন | مسار | Timeline and pattern (alpha.12) | a row of the arrangement that holds clips; from the alpha.11 pack |
| clip | clip | clip | clipe | klip | 片段 | クリップ | клип | क्लिप | ক্লিপ | مقطع | Timeline and pattern (alpha.12) | a block on a lane; from the alpha.11 pack |
| playhead | cabezal | tête de lecture | cursor de reprodução | playhead | 播放头 | 再生ヘッド | курсор воспроизведения | प्लेहेड | প্লেহেড | مؤشر التشغيل | Timeline and pattern (alpha.12) | the moving line on the ruler; from the alpha.11 pack |
| ruler | regla | règle | régua | penggaris | 标尺 | ルーラー | линейка | रूलर | রুলার | مسطرة | Timeline and pattern (alpha.12) | the beat scale above the lanes; from the alpha.11 pack |
| scrub | scrub | scrub | scrub | scrub | 拖播 | スクラブ | СКРАБ | स्क्रब | স্ক্রাব | التمرير | Timeline and pattern (alpha.12) | dragging along the ruler; SCRUB is the SAMPLING row, `scrub::LIVE / LIGHT` its levels |
| automation | automatización | automation | automação | otomasi | 自动化 | オートメーション | АВТОМАТИЗАЦИЯ | ऑटोमेशन | অটোমেশন | أتمتة | Timeline and pattern (alpha.12) | a curve that moves a parameter; `automation::FRAME` is a grid level of SAMPLING |
| PATTERN | PATRÓN | PATTERN | PADRÃO | PATTERN | 样式 | パターン | ПАТТЕРН | पैटर्न | প্যাটার্ন | نمط | Timeline and pattern (alpha.12) | the step sequencer window; `history::PATTERN` is the undo domain |
| step | paso | pas | passo | langkah | 步 | ステップ | шаг | स्टेप | স্টেপ | خطوة | Timeline and pattern (alpha.12) |  |
| SAMPLING | MUESTREO | ÉCHANTILLONNAGE | AMOSTRAGEM | SAMPLING | 采样 | サンプリング | ДИСКРЕТИЗАЦИЯ | सैंपलिंग | স্যাম্পলিং | أخذ العينات | Timeline and pattern (alpha.12) | the GUI group: how a scrub and the automation read the engine |
| STARTER | INICIAL | DE DÉPART | INICIAL | AWAL | 内置 | スターター | СТАРТОВЫЙ | स्टार्टर | স্টার্টার | مبدئي | Timeline and pattern (alpha.12) | a bundled starter preset (alpha.12) |
| FORGET | OLVIDAR | OUBLIER | ESQUECER | LUPAKAN | 忘记 | 消去 | ЗАБЫТЬ | भूलें | ভুলুন | نسيان | Timeline and pattern (alpha.12) | wipes this browser's saved settings and reloads |
| BRIGHTNESS | LUMINOSIDAD | LUMINOSITÉ | LUMINOSIDADE | KECERAHAN | 亮度 | 明るさ | ЯРКОСТЬ | ब्राइटनेस | ব্রাইটনেস | الإشراق | Timeline and pattern (alpha.12) | ACCENT BRIGHTNESS (toward white): kept apart from the glass BRIGHT |
| STATUS TAGS | ETIQUETAS DE ESTADO | ÉTIQUETTES D’ÉTAT | ETIQUETAS DE STATUS | LABEL STATUS | 状态标签 | ステータスタグ | МЕТКИ СОСТОЯНИЯ | स्टेटस टैग | স্ট্যাটাস ট্যাগ | علامات الحالة | Timeline and pattern (alpha.12) | the small status labels over the picture |
| TRANSPORT BAR | BARRA DE TRANSPORTE | BARRE DE TRANSPORT | BARRA DE TRANSPORTE | BAR TRANSPORT | 传输栏 | トランスポートバー | ПАНЕЛЬ ТРАНСПОРТА | ट्रांसपोर्ट बार | ট্রান্সপোর্ট বার | شريط الناقل | Timeline and pattern (alpha.12) | show the main transport bar |
| RESET LAYOUT | RESTABLECER DISPOSICIÓN | RÉINITIALISER LA DISPOSITION | REDEFINIR LAYOUT | ATUR ULANG TATA LETAK | 重置布局 | レイアウトをリセット | СБРОС РАСКЛАДКИ | लेआउट रीसेट | লেআউট রিসেট | إعادة ضبط التخطيط | Timeline and pattern (alpha.12) | restore the default window layout |
| envelope (ENV) | envolvente (ENV) | enveloppe (ENV) | envelope (ENV) | envelope (ENV) | 包络 | エンベロープ | огибающая | एन्वेलप (label ENV) | এনভেলপ (label ENV) | إنفلوب (label ENV) | Timeline and pattern (alpha.12) | the ADSR-style source; ENV stays Latin where the glossary says so |

## 4. Abbreviations used for length

| Language | Abbreviation | Full word |
|---|---|---|
| es | VELOC. | velocidad (RATE) |
| fr | ENREG. SOUS | enregistrer sous (SAVE AS) |
| fr | RÉINIT., RÉS. | réinitialiser, résolution |
| es / pt-BR | MÍN, MÁX | mínimo, máximo |
| id | MAKS | maksimum |

Only a handful were needed: the labels that exceed 1.6x the English are reported by `tests/i18n-packs.node.mjs`, and each fits a button (14 letters) except where noted in UNSURE.
