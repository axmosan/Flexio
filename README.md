# Flexio

A script launcher panel for After Effects, Premiere Pro, Photoshop and Illustrator.

<img width="672" height="410" alt="Flexio" src="https://github.com/user-attachments/assets/37971cf9-0546-49d0-b0e1-233a7699f1c0" />

After Effects has KBar; the rest of the Adobe suite has nothing comparable, so a script you wrote for Photoshop or Illustrator stays buried in a menu. Flexio is one launcher that runs natively on all four hosts and knows which one it is in.

## Features

- **Host-aware** — the panel detects its host and shows that application's buttons. Each of the four applications keeps its own set, so the same panel is a different tool in each.
- **Buttons** — point one at a `.jsx` script and give it an icon: an image, or up to six characters of text with an icon generated from them. Reorder by dragging.
- **Toolsets** — group buttons into sets and switch between them, so a project's scripts stay together instead of filling one flat grid.
- **Four panel slots** per host (`Flexio 1`–`Flexio 4`), each with its own toolset allocation, column count (fixed 1–6 or auto) and display mode — icon, name, or both.
- **Export / import** — a preset file carries the button layout *and* the script and icon files themselves, Base64-encoded into a single JSON, so a setup moves to another machine in one file. Name clashes prompt for merge or overwrite.
- **Search** filters buttons by name as you type.

## Setup

**Install.** Download a release, run the bundled installer, and restart the host application. The panel appears under **Window ▸ Extensions ▸ Flexio**. Unsigned panels need CEP `PlayerDebugMode` enabled.

**Develop.** The panel is React and TypeScript built with Vite. Clone the repository, then:

| Command | |
| --- | --- |
| `npm install` | install dependencies |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm run install-ext` | install the built panel into the CEP extensions folder |
| `npm run package` | build and sign a distributable ZXP |

## License

Licensed under the Apache License 2.0 — see [LICENSE](LICENSE).
