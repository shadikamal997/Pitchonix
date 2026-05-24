# Installing LibreOffice + Poppler for True PowerPoint Render Validation

Phase 38.4A wires Pitchonix to LibreOffice headless for ground-truth pixel
comparison against PowerPoint output. Without these binaries the visual
fidelity engine runs in **internal mode** (Pitchonix-render vs Pitchonix-render)
which is good enough for regression but not for absolute fidelity scoring.

## Quick check

```bash
curl -s -H "Authorization: Bearer <jwt>" \
  http://localhost:3000/pptx-import/diagnostics/renderer | jq
```

Sample output when nothing is installed:

```json
{
  "soffice":  { "available": false, "error": "not found" },
  "pdftoppm": { "available": false, "error": "not found" },
  "ready":    false,
  "installHint": "brew install --cask libreoffice && brew install poppler"
}
```

Once both binaries are present, `ready: true` and visual scores switch from
*internal* to *reference* mode automatically.

## macOS

```bash
brew install --cask libreoffice   # ~500MB
brew install poppler              # pdftoppm
```

LibreOffice installs `soffice` at `/Applications/LibreOffice.app/Contents/MacOS/soffice`.
Make it discoverable on `PATH` (or set `LIBREOFFICE_BIN`):

```bash
export LIBREOFFICE_BIN="/Applications/LibreOffice.app/Contents/MacOS/soffice"
```

## Linux (Debian / Ubuntu)

```bash
sudo apt-get install -y libreoffice-impress poppler-utils
```

Headless servers don't need the GUI components — `libreoffice-impress` already
brings everything `soffice --headless` requires.

## Linux (Alpine)

```bash
apk add libreoffice poppler-utils
```

## Windows

```powershell
choco install libreoffice-fresh poppler   # or scoop install libreoffice poppler
```

You'll likely need to add the install dirs to `PATH` manually, or set
`LIBREOFFICE_BIN` / `PDFTOPPM_BIN` to the full executable paths in your
`.env`.

## Docker

Add to your image:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-impress poppler-utils fontconfig \
    && rm -rf /var/lib/apt/lists/*

ENV LIBREOFFICE_BIN=/usr/bin/soffice
ENV PDFTOPPM_BIN=/usr/bin/pdftoppm
```

LibreOffice + Poppler adds ~600MB to the image. If image size matters, run
visual regression in a separate worker image and keep the main API image
slim.

## Configuration knobs

| Env var | Default | Meaning |
|---|---|---|
| `LIBREOFFICE_BIN` | `soffice` | Path to the LibreOffice executable |
| `PDFTOPPM_BIN`    | `pdftoppm` | Path to the Poppler `pdftoppm` executable |
| `LIBREOFFICE_TIMEOUT_MS` | `30000` | Hard timeout per conversion step |
| `PPTX_BASELINE_DIR` | `./visual-regression-baselines` | Where baseline PNGs live |
| `PPTX_FIXTURE_DIR`  | `./scripts/fixtures-pptx` | Drop directory for real PPTX fixtures |

## How the pipeline works

1. Pitchonix exports the deck to PPTX in-memory (with our OOXML animations
   + transitions + extension XML).
2. The PPTX is dropped on disk in `os.tmpdir()`.
3. `soffice --headless --convert-to pdf` produces a PDF.
4. `pdftoppm` splits the PDF into one PNG per slide.
5. Pitchonix renders the same slides in-process and runs `pixelmatch` against
   the LibreOffice PNGs.
6. The diff result drives the **visual** sub-score of the certification.

If LibreOffice is missing the engine falls back to internal-mode diff
(rendering both sides via our own SVG-rect approximation) — useful for CI
regression but not absolute fidelity scoring.

## Why LibreOffice instead of PowerPoint COM?

* Cross-platform (macOS / Linux / Windows / Docker).
* No licence cost.
* Better OOXML coverage than COM for the structural side.
* Can run headless on a server with no GUI.

We could swap to PowerPoint COM by replacing
`backend/src/pptx-import/libreoffice-renderer.ts` with a COM-based shell-out;
the `SlideRenderer` contract is small enough that the visual-fidelity engine
won't care.
