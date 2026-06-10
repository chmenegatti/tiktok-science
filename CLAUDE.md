# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Daily pipeline that generates 15-second TikTok videos about scientific
curiosities (PT-BR) and sends them to the user's TikTok inbox for manual
review/posting. One rotating science topic per day.

## Commands

```bash
npm install            # install deps (also need ffmpeg + ffprobe on PATH)
npm run today          # run full pipeline, no publish -> output/<date>/video.mp4
npm run publish        # run pipeline AND upload to TikTok inbox
npm run auth           # TikTok OAuth: print authorize URL
npm run auth -- --code SEU_CODE   # exchange code for access_token
npm run typecheck      # tsc --noEmit
```

There is no test suite. Verification is manual: run `npm run today` and inspect
`output/<date>/video.mp4`.

## Architecture

The pipeline is a strict 5-stage flow orchestrated by `src/index.ts`. Each stage
is one module under `src/pipeline/` with a single exported function — they are
composed, not coupled, so a stage can be swapped without touching the others:

| Stage | Module | Key fn | Notes |
|-------|--------|--------|-------|
| Topic | `themes.ts` | `temaDoDia()` | Deterministic: `dayOfYear % AREAS.length`. Same day -> same topic. |
| Script | `pipeline/script.ts` | `gerarRoteiro()` | Gemini `gemini-2.0-flash` via REST `fetch` (no SDK), **structured output** via `generationConfig.responseSchema`. Returns a `Roteiro`. |
| Narration | `pipeline/tts.ts` | `sintetizar()` | Edge TTS (free), one mp3 per scene. |
| Images | `pipeline/images.ts` | `gerarImagem()` | One image per scene. Provider-abstracted (`config.imageProvider()`): `gemini` (default, reuses `GEMINI_API_KEY`, free tier) or `pollinations` (no key, rate-limited). Video stage scale+crops, so source need not be vertical. |
| Video | `pipeline/video.ts` | `montarVideo()` | ffmpeg via `child_process`. Per-scene Ken Burns (zoompan) + burned subtitle, then concat. |
| Publish | `pipeline/publish.ts` | `enviarParaInbox()` | TikTok Content Posting API `/inbox/` endpoint = draft for manual posting (not auto-publish). |

`Roteiro`/`Cena` shapes live in `src/types.ts` and are the contract between the
script stage and everything downstream. The `responseSchema` in `script.ts` must
stay in sync with these types (note: Gemini schema uses UPPERCASE types and has
no `additionalProperties`).

Per-scene narration + image generation run in parallel (`Promise.all`) in
`index.ts`; the video stage is sequential because clip durations come from
`ffprobe` on the generated audio.

## Important details

- **ESM project** (`"type": "module"`). Intra-repo imports use `.js` extensions
  (e.g. `from "./themes.js"`) even though sources are `.ts` — required by
  Node ESM resolution. Keep this convention.
- **Script LLM is Gemini** (`gemini-2.0-flash`, free tier) called over plain
  `fetch` — no SDK dependency. Key: `GEMINI_API_KEY`.
- **Subtitles** are written to a temp `.txt` and passed to ffmpeg `drawtext` via
  `textfile=` to avoid escaping issues. `wrap()` in `video.ts` does the line
  breaking. Subtitle text = `cena.legenda` (short); narration audio = `cena.narracao`.
- **Video specs** are centralized in `config.VIDEO` (1080x1920, 30fps). Clips
  share identical encode params so the concat step uses stream copy (`-c copy`).
- **All output** goes to `output/<YYYY-MM-DD>/` (gitignored).
- **Config** is read lazily through `config.*()` getters so a missing env var
  only errors when that stage actually runs.

## External dependencies / gotchas

- `ffmpeg` + `ffprobe` must be installed system-wide.
- `FONT_FILE` env must point to a real font file or `drawtext` fails.
- `msedge-tts` API differs across versions; `tts.ts` handles both the
  `Readable` and `{ audioStream }` return shapes of `toStream()`.
- TikTok publish requires a valid `TIKTOK_ACCESS_TOKEN` (scope `video.upload`)
  obtained via `npm run auth`. Tokens expire — re-auth when uploads start 401ing.
