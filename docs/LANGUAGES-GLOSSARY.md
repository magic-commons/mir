# MIR · LANGUAGES GLOSSARY — the shared rules and the Latin-script columns

The translator's companion to `docs/LANGUAGES.md` §11. This file holds the rules every pack follows and the chosen term for each recurring word. This revision carries **Spanish (es), French (fr), Portuguese (pt-BR) and Indonesian (id)**; the other six languages' columns are handed to the join by their own lane. Every pack is a **draft** (`reviewed: false`) until a native reader has checked it.

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

## 2. Voice and convention per language

| Language | Commands and buttons | Hints and messages | Notes |
|---|---|---|---|
| es | infinitive (GUARDAR, COPIAR, ABRIR), the software convention | imperative, informal *tú* (Ableton, FL Studio and Logic in Spanish address the user as *tú*) | `ctrl+intro` for Enter; `Mayús` for the Shift key in prose, `Inicio` for Home |
| fr | infinitive (ENREGISTRER, COPIER, OUVRIR) | imperative, formal *vous* (French software convention) | `Maj` for Shift in prose, `Échap` for Esc in prose, `Origine` for Home; space before `: ; ! ?` |
| pt-BR | infinitive (SALVAR, COPIAR, ABRIR) | imperative with *você* forms (`toque`, `arraste`, `pressione`) | Brazilian software uses SALVAR, not GUARDAR; "tela" not "ecrã"; "arquivo" not "ficheiro" |
| id | the base verb (SIMPAN, SALIN, BUKA) | base verb or "Anda" where a subject is needed | musicians and audio software in Indonesian keep the English for most instrument terms (preset, input, output, trigger, gate, envelope, macro, knob, slider) |

## 3. Terms

Where the field keeps the English word, the cell says so by repeating it. **Bold** = a real choice, explained in the last column.

### 3.1 Controls and instrument terms

| English | es | fr | pt-BR | id | Why |
|---|---|---|---|---|---|
| LFO | LFO | LFO | LFO | LFO | universal |
| BPM | BPM | BPM | BPM | BPM | universal |
| MIDI | MIDI | MIDI | MIDI | MIDI | universal |
| preset / PRESETS | PRESETS | PRESETS | PRESETS | PRESET | the field's own word in all four |
| macro | macro | macro | macro | macro | Ableton, Serum, every modern synth |
| knob | mando | potard (potentiomètre) | botão | knob | es/fr/pt use the hardware word; id keeps English |
| fader / slider | deslizador | curseur | slider | slider | |
| RATE | **VELOC.** | **VITESSE** | **TAXA** | **LAJU** | LFO speed: Ableton es "Velocidad"; fr "Vitesse"; pt "Taxa" (Rate is "Taxa" in pt-BR synth UIs); id "Laju" |
| DEPTH | PROFUNDIDAD | PROFONDEUR | PROFUNDIDADE | KEDALAMAN | standard; written in full because it appears only in hints and aria-labels |
| PHASE | FASE | PHASE | FASE | FASE | |
| LEVEL | NIVEL | NIVEAU | NÍVEL | LEVEL | id musicians say "level" |
| RANGE | RANGO | PLAGE | FAIXA | RENTANG | fr "plage" is the standard for a value range; pt "faixa" |
| CURVE | CURVA | COURBE | CURVA | KURVA | |
| BIPOLAR / UNIPOLAR | BIPOLAR / UNIPOLAR | BIPOLAIRE / UNIPOLAIRE | BIPOLAR / UNIPOLAR | BIPOLAR / UNIPOLAR | |
| CENTRE | CENTRO | CENTRE | CENTRO | TENGAH | |
| MIN / MAX | MÍN / MÁX | MIN / MAX | MÍN / MÁX | MIN / MAKS | the accent follows the language's abbreviation rule; fr and the symbols stay bare |
| ATTACK | ATAQUE | ATTAQUE | ATAQUE | ATTACK | |
| RELEASE | RELEASE | RELEASE | RELEASE | RELEASE | **real choice**: es/fr/pt synth manuals mostly keep "release"; ATAQUE is translated in es, pt-BR and fr because it is the common word; release stays English |
| HOLD | **RETENCIÓN** | **MAINTIEN** | **RETENÇÃO** | **TAHAN** | the "peak hold" of a meter; no single field word, UNSURE |
| gate / noise gate | gate | gate | gate | gate | kept; "puerta de ruido" is rare in practice |
| GATED | **CERRADO** | **FERMÉ** | **FECHADO** | **TERTUTUP** | the state opposite OPEN: "the gate is closed"; UNSURE |
| TRIG / trigger | TRIG / disparo (noun) | TRIG / déclencheur | TRIG / trigger | TRIG / pemicu | the label TRIG is kept (4 letters); the noun follows the field |
| envelope | envolvente | enveloppe | envelope | envelope | |
| ENV | ENV | ENV | ENV | ENV | the stage name, kept |
| stage (of an envelope) | etapa | étape | estágio | tahap | |
| sustain | sustain | sustain | sustain | sustain | kept |
| tension | tensión | tension | tensão | tegangan | the bend of a curve segment |
| breakpoint | punto de ruptura | point de rupture | breakpoint | breakpoint | |
| stochastic | estocástica | stochastique | estocástica | stokastik | |
| analytic | analítica | analytique | analítica | analitik | |
| SINE | SENO | SINUS | SENO | SINUS | |
| waveform | forma de onda | forme d’onde | forma de onda | bentuk gelombang | |
| smooth | suavizar | lisser | suavizar | haluskan | |
| quantise | cuantizar | quantifier | quantizar | kuantisasi | |
| bar (musical) | compás | mesure | compasso | birama | |
| beat | pulso | temps (a beat of a bar) / tempo | batida | ketukan | |
| clock | reloj | horloge | relógio | jam | |
| WALL (clock) / FREE | RELOJ / LIBRE | HORLOGE / LIBRE | RELÓGIO / LIVRE | JAM / BEBAS | **real choice**: WALL = wall-clock time (elapsed real time), so the word is "clock" in each language; UNSURE |
| STUTTER, ANCHOR | kept | kept | kept | kept | mode names, not common words |
| AUDIO, HIT, BAND(S), LOW, MID, HIGH | AUDIO, HIT, BANDA(S), LOW, MID, HIGH | AUDIO, HIT, BANDE(S), LOW, MID, HIGH | AUDIO (ÁUDIO), HIT, BANDA(S), LOW, MID, HIGH | AUDIO, HIT, BAND, LOW, MID, HIGH | HIT is the audio onset event: kept. LOW/MID/HIGH are band names passed in as variables |
| meter | medidor | indicateur | medidor | meter | |
| follower | seguidor | suiveur | seguidor | pengikut | as in "envelope follower" |
| input / output | entrada / salida | entrée / sortie | entrada / saída | input / output | id keeps English |

### 3.2 The modulation rack

| English | es | fr | pt-BR | id | Why |
|---|---|---|---|---|---|
| MODULATION | MODULACIÓN | MODULATION | MODULAÇÃO | MODULASI | |
| MODULATION MATRIX | MATRIZ DE MODULACIÓN | MATRICE DE MODULATION | MATRIZ DE MODULAÇÃO | MATRIKS MODULASI | |
| device | dispositivo | dispositif | dispositivo | perangkat | **real choice**: Ableton Live's word in es, fr and pt-BR |
| route (noun) | ruta | **liaison** | rota | rute | **real choice (fr)**: "route" is an English calque; modulation matrices say "assignation" (too long for a button); "liaison" is short and clear. UNSURE |
| ADD ROUTE | AÑADIR RUTA | AJOUTER LIAISON | ADICIONAR ROTA | TAMBAH RUTE | |
| source | fuente | source | fonte | sumber | |
| target | destino | cible | destino | target | |
| HAND (the unmodulated state) | **MANUAL** | **MANUEL** | **MANUAL** | **MANUAL** | "the hand's again" = back under manual control. A literal "mano/main/mão" would read as a body part |
| DEAD SENDS | ENVÍOS HUÉRFANOS | ENVOIS ORPHELINS | ENVIOS ÓRFÃOS | KIRIMAN YATIM | routes whose target is gone: "orphaned" is the idiom for a missing parent in all four |
| route (verb) | enrutar | router | rotear | merutekan | |
| arm / ARMED | armar / ARMADO | armer / ARMÉ | armar / ARMADO | menyiapkan / SIAP | id "siapkan" reads better than "mempersenjatai" |
| RIBBON | CINTA | RUBAN | FITA | PITA | the leave-the-window ribbon |
| MACRO rail | carril | rail | trilho | rel | RAIL is the narrow strip a window narrows to |
| DOCK | (not in the catalogue) | | | | |
| stutter | stutter | stutter | stutter | stutter | |
| audio follower | seguidor de audio | suiveur audio | seguidor de áudio | pengikut audio | |
| EVT | EVT | ÉVT | EVT | EVT | "event" abbreviation |
| CMP / FULL / COMPACT | CMP / COMPLETO / COMPACTO | CMP / COMPLET / COMPACT | CMP / COMPLETO / COMPACTO | CMP / PENUH / RINGKAS | |
| FACTORY | FÁBRICA | USINE | FÁBRICA | PABRIK | Ableton fr: "Usine" |
| OLDER MODEL | MODELO ANTIGUO | ANCIEN MODÈLE | MODELO ANTIGO | MODEL LAMA | |
| IDLE | INACTIVO | INACTIF | INATIVO | DIAM | |
| LIVE (capture) | EN VIVO | EN DIRECT | AO VIVO | LANGSUNG | |
| OPEN (gate state) | ABIERTO | OUVERT | ABERTO | TERBUKA | |

### 3.3 Windows, menus and the shell

| English | es | fr | pt-BR | id | Why |
|---|---|---|---|---|---|
| window | ventana | fenêtre | janela | jendela | |
| rack | rack | rack | rack | rack | the instrument rack; kept |
| stage | escenario | scène | palco | panggung | |
| fold / unfold (a window) | plegar / desplegar | replier / déplier (hints say "réduire / développer") | recolher / expandir | ciutkan / lebarkan | the hints use the common software verbs (contraer/expandir, réduire/développer, recolher/expandir) |
| ABOUT | ACERCA DE | À PROPOS | SOBRE | TENTANG | menu word |
| LANGUAGE | (menu title; not a catalogue key) | | | | |
| KEYBOARD | TECLADO | CLAVIER | TECLADO | PAPAN KETIK | the computer keyboard |
| KEYS | TECLAS | TOUCHES | TECLAS | TOMBOL | |
| chord (a key combination) | combinación | combinaison | combinação | kombinasi | "acorde" would read as music |
| modifier | modificador | modificateur | modificador | pengubah | |
| RECORD INPUT | GRABAR ENTRADA | ENREGISTRER LA SAISIE | GRAVAR ENTRADA | REKAM INPUT | "record the keys you press"; fr "saisie" = typed input |
| Unbound | Sin asignar | Non assignée | Sem atalho | Belum ditetapkan | |
| GUI | GUI | GUI | GUI | GUI | kept |
| LOOK | ASPECTO | ASPECT | APARÊNCIA | TAMPILAN | the options of the look |
| SKIN | SKIN | SKIN | SKIN | SKIN | **real choice**: the field says "skin" in all four |
| THEME, LIGHT/DARK | (THEME not a key) | | | | |
| LIGHT | **LIGERO** | **LÉGER** | **LEVE** | **RINGAN** | the one catalogue key serves both the "light" tier (cheap) and a light theme; the tier sense was chosen (see UNSURE) |
| FROST | FROST | FROST | FROST | FROST | the skin's name, kept |
| GLASS | VIDRIO | VERRE | VIDRO | KACA | |
| BLUR | DESENFOQUE | FLOU | DESFOQUE | BURAM | |
| SHADOW | SOMBRA | OMBRE | SOMBRA | BAYANGAN | |
| FRAME | FOTOGRAMA | IMAGE | QUADRO | FRAME | frame time |
| SHOW | MOSTRAR | AFFICHER | EXIBIR | TAMPIL | |
| compositor pass | pasada del compositor | passe du compositeur | passada do compositor | pass compositor | |
| NOTEBOOK | CUADERNO | CARNET | CADERNO | BUKU CATATAN | |
| notes | notas | notes | notas | catatan | |
| SHELF | ESTANTE | ÉTAGÈRE | ESTANTE | RAK | the shelf of saved notes; id "rak" (a rack in id is kept as "rack") |
| page | página | page | página | halaman | |
| tab | pestaña | onglet | aba | tab | |
| FOLDERS / folder | CARPETAS / carpeta | DOSSIERS / dossier | PASTAS / pasta | FOLDER / folder | |
| PROJECTS | PROYECTOS | PROJETS | PROJETOS | PROYEK | |
| (root) / ROOT | (raíz) / RAÍZ | (racine) / RACINE | (raiz) / RAIZ | (akar) / AKAR | |
| gallery | galería | galerie | galeria | galeri | |
| layout (of windows) | disposición | disposition | layout | tata letak | |
| work bars | barras de trabajo | barres de travail | barras de trabalho | bar kerja | |
| picture (an image that carries a project) | imagen | image | imagem | gambar | |
| draft | borrador | brouillon | rascunho | draf | |

### 3.4 File actions and messages

| English | es | fr | pt-BR | id | Why |
|---|---|---|---|---|---|
| SAVE | GUARDAR | ENREGISTRER | SALVAR | SIMPAN | |
| SAVE AS | GUARDAR COMO | ENREG. SOUS | SALVAR COMO | SIMPAN SEBAGAI | fr abbreviation: "Enreg. sous", standard in menus |
| OPEN (verb) | ABRIR | OUVRIR | ABRIR | BUKA | |
| COPY / COPIED | COPIAR / COPIADO | COPIER / COPIÉ | COPIAR / COPIADO | SALIN / TERSALIN | |
| EXPORT / IMPORT / IMPORTED | EXPORTAR / IMPORTAR / IMPORTADO | EXPORTER / IMPORTER / IMPORTÉ | EXPORTAR / IMPORTAR / IMPORTADO | EKSPOR / IMPOR / DIIMPOR | |
| REMOVE | QUITAR | RETIRER | REMOVER | LEPAS | take away but keep (a route, a macro) |
| delete | eliminar | supprimer | excluir | hapus | destroy (pt-BR "excluir" is the software word) |
| REMOVE ALL | QUITAR TODO | TOUT RETIRER | REMOVER TUDO | LEPAS SEMUA | |
| UNDO / REDO | DESHACER / REHACER | ANNULER / RÉTABLIR | DESFAZER / REFAZER | URUNGKAN / ULANGI | |
| RESET | REINICIAR | RÉINIT. | REDEFINIR | ATUR ULANG | restore a value to its start; fr abbreviation "Réinit." |
| RESET TO DEFAULT | RESTABLECER VALOR POR DEFECTO | RÉTABLIR PAR DÉFAUT | VOLTAR AO PADRÃO | KEMBALI KE BAWAAN | |
| RETRY | REINTENTAR | RÉESSAYER | TENTAR DE NOVO | COBA LAGI | |
| CLOSE | CERRAR | FERMER | FECHAR | TUTUP | |
| Cancel / OK | Cancelar / OK | Annuler / OK | Cancelar / OK | Batal / OK | |
| MOVE TO | MOVER A | DÉPLACER VERS | MOVER PARA | PINDAH KE | |
| rename | renombrar | renommer | renomear | ganti nama | |
| duplicate | duplicar | dupliquer | duplicar | duplikat | |
| Sort | Ordenar | Trier | Ordenar | Urutkan | |
| UNSAVED CHANGES | CAMBIOS SIN GUARDAR | MODIFICATIONS NON ENREGISTRÉES | ALTERAÇÕES NÃO SALVAS | PERUBAHAN BELUM DISIMPAN | |
| UNTITLED | SIN TÍTULO | SANS TITRE | SEM TÍTULO | TANPA JUDUL | |
| ON / OFF | ON / OFF | ON / OFF | ON / OFF | ON / OFF | kept: the label on every hardware switch |
| yes / no | sí / no | oui / non | sim / não | ya / tidak | |
| DRAFT | BORRADOR | BROUILLON | RASCUNHO | DRAF | the language menu's mark |

### 3.5 Camera and look knobs (host.js labels)

| English | es | fr | pt-BR | id | Why |
|---|---|---|---|---|---|
| EXPOSURE | EXPOSICIÓN | EXPOSITION | EXPOSIÇÃO | EKSPOSUR | photographic |
| HUE | TONO | TEINTE | MATIZ | HUE | colour wheel |
| GRAIN | GRANO | GRAIN | GRÃO | BUTIR | |
| SOFTNESS | SUAVIDAD | DOUCEUR | SUAVIDADE | KELEMBUTAN | |
| ISO / FOV | ISO / FOV | ISO / FOV | ISO / FOV | ISO / FOV | |
| KNEE | KNEE | COUDE | KNEE | KNEE | **real choice**: the tone curve's knee; es/pt/id keep the English term |
| RES | RES | RÉS. | RES | RES | resolution |
| DIST | DIST | DIST | DIST | JARAK | |
| STEPS | PASOS | PAS | PASSOS | LANGKAH | |
| WINDOW (time window, s) | VENTANA | FENÊTRE | JANELA | JENDELA | same word as the interface window; see UNSURE |
| YAW | GUIÑADA | LACET | GUINADA | YAW | aircraft axes |
| PITCH | CABECEO | TANGAGE | ARFAGEM | PITCH | the camera axis, not musical pitch |
| LAP / TURN / RISE | VUELTA / GIRO / ASCENSO | TOUR / ROTATION / MONTÉE | VOLTA / GIRO / SUBIDA | PUTARAN / PUTAR / NAIK | the camera orbit presets |
| UP / DOWN | ARRIBA / ABAJO | HAUT / BAS | CIMA / BAIXO | ATAS / BAWAH | |

## 4. Abbreviations used for length

| Language | Abbreviation | Full word |
|---|---|---|
| es | VELOC. | velocidad (RATE) |
| fr | ENREG. SOUS | enregistrer sous (SAVE AS) |
| fr | RÉINIT., RÉS. | réinitialiser, résolution |
| es / pt-BR | MÍN, MÁX | mínimo, máximo |
| id | MAKS | maksimum |

Only a handful were needed: the labels that exceed 1.6x the English are reported by `tests/i18n-packs.node.mjs`, and each fits a button (14 letters) except where noted in UNSURE.
