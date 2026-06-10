# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Daily pipeline that generates a 10-slide Instagram carousel about scientific
curiosities (PT-BR) and publishes it to the feed via the Instagram Graph API.
One rotating science topic per day.

> History: this project started targeting TikTok (15s videos). It was pivoted to
> Instagram carousels because TikTok's app-review (mandatory demo video for the
> Content Posting API) was too heavy. The repo/Pages slug is still `tiktok-science`.

## Commands

```bash
npm install            # install deps (also need ffmpeg on PATH)
npm run today          # run pipeline, no publish -> output/<date>/slide_*.png
npm run publish        # run pipeline AND publish carousel to Instagram
npm run auth           # Instagram/Meta token helper (prints setup steps)
npm run auth -- --token SHORT   # exchange short token for long-lived + list IG_USER_ID
npm run refresh-token  # refresh IG_ACCESS_TOKEN in-place in .env (used by weekly timer)
npm run typecheck      # tsc --noEmit
```

Automation runs via two `systemd --user` timers in `~/.config/systemd/user/`:
`instagram-ciencia.timer` (daily 09:00 -> publish) and
`instagram-ciencia-refresh.timer` (weekly -> token refresh). `git push` uses
HTTPS + the `gh` credential helper so it works headless.

```bash
```

There is no test suite. Verification is manual: run `npm run today` and inspect
`output/<date>/slide_*.png`.

## Architecture

The pipeline is a strict 5-stage flow orchestrated by `src/index.ts`. Each stage
is one module under `src/pipeline/` with a single exported function — they are
composed, not coupled, so a stage can be swapped without touching the others:

| Stage | Module | Key fn | Notes |
|-------|--------|--------|-------|
| Topic | `themes.ts` | `temaDoDia()` | Deterministic: `dayOfYear % AREAS.length`. Same day -> same topic. |
| Script | `pipeline/script.ts` | `gerarRoteiro()` | Gemini `gemini-2.5-flash` via REST `fetch` (no SDK), **structured output** via `generationConfig.responseSchema`. Returns a `Roteiro` of exactly 10 `Slide`s. |
| Images | `pipeline/images.ts` | `gerarImagem()` | One background image per slide. Provider-abstracted (`config.imageProvider()`): `gemini` (default, reuses `GEMINI_API_KEY`, free tier) or `pollinations` (no key, rate-limited). Slide stage scale+crops to 1080x1080, so source need not be square. |
| Slides | `pipeline/slides.ts` | `montarSlides()` | ffmpeg via `child_process`. Per-slide: scale+crop + darken (`drawbox`) + title/body/handle (`drawtext`) -> one PNG. |
| Publish | `pipeline/publish.ts` | `publicarCarrossel()` | Hosts PNGs on GitHub Pages (public URLs), then Instagram Graph API: per-image containers -> CAROUSEL container -> publish. |

`Roteiro`/`Slide` shapes live in `src/types.ts` and are the contract between the
script stage and everything downstream. The `responseSchema` in `script.ts` must
stay in sync with these types (note: Gemini schema uses UPPERCASE types and has
no `additionalProperties`).

Per-slide image generation runs in parallel (`Promise.all`) in `index.ts`; the
slide compositing stage is sequential (one ffmpeg invocation per slide).

## Important details

- **ESM project** (`"type": "module"`). Intra-repo imports use `.js` extensions
  (e.g. `from "./themes.js"`) even though sources are `.ts` — required by
  Node ESM resolution. Keep this convention.
- **Script LLM is Gemini** (`gemini-2.5-flash`, free tier) called over plain
  `fetch` — no SDK dependency. Key: `GEMINI_API_KEY`.
- **Slide text** (title/body) is written to temp `.txt` files and passed to
  ffmpeg `drawtext` via `textfile=` to avoid escaping issues. `wrap()` in
  `slides.ts` does the line breaking (title ~18 chars, body ~30 chars).
- **Slide specs** are centralized in `config.SLIDE` (1080x1080).
- **Instagram carousel max = 10 images** (Graph API hard limit). The script
  generates exactly 10 slides; `publish.ts` enforces `MAX_CARROSSEL`.
- **Image hosting**: the Graph API fetches images by public URL, so it cannot
  take local binaries for feed images. `publish.ts` copies the final PNGs to
  `docs/media/<date>/`, commits + pushes, waits for the GitHub Pages build, and
  passes `${PUBLIC_BASE_URL}/media/<date>/slide_NN.png`. Old media is wiped each
  run to keep the repo lean.
- **All output** goes to `output/<YYYY-MM-DD>/` (gitignored). A final cleanup
  step (`limpar()` in `index.ts`) prunes the dir to just `slide_*.png` +
  `caption.txt`, deleting intermediates (background images, drawtext `.txt`,
  `roteiro.json`). `docs/media/` IS committed (Pages must serve it).
- **Config** is read lazily through `config.*()` getters so a missing env var
  only errors when that stage actually runs.

## External dependencies / gotchas

- `ffmpeg` must be installed system-wide.
- `FONT_FILE` env must point to a real font file or `drawtext` fails.
- Instagram publish requires a Business/Creator account linked to a Facebook
  Page, a Meta app with the Instagram Graph API product, plus `IG_USER_ID` and a
  long-lived `IG_ACCESS_TOKEN` from `npm run auth`. The token expires in ~60 days
  — re-auth when publishing starts 401ing.
- Publishing performs git commit/push from the pipeline; it assumes it runs from
  the repo root with push access to `origin`.
