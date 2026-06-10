# Demo Video — Recording Script

Script for the demo video required by TikTok app review. The video must show
the **complete end-to-end flow** of the Content Posting API integration
(`video.upload` scope), recorded in the **sandbox** environment.

## Specs (per TikTok requirements)

- Format: `.mp4` or `.mov`
- Max 5 files, ≤ 50 MB each
- Must clearly show the UI and user interactions
- Must demonstrate the `video.upload` scope via the Content Posting API
- Domain shown must match the verified website URL
  (`https://www.cesarmenegatti.com/tiktok-science/`)

## Before recording

- [ ] Use the **sandbox** app credentials in `.env` (not production).
- [ ] Have a target test TikTok account installed on a phone, logged in.
- [ ] Have a screen recorder ready (terminal + browser; phone screen mirror or
      a separate phone-screen clip).
- [ ] Clear an old `output/` so a fresh video is visibly generated.
- [ ] Increase terminal font so commands are readable on playback.

## Scene-by-scene

### Scene 0 — Context (5s)
Show the project page in the browser:
`https://www.cesarmenegatti.com/tiktok-science/`
Briefly show the Terms of Service and Privacy Policy links. This ties the demo
to the verified domain.

### Scene 1 — OAuth authorization (20s)
1. In the terminal run:
   ```bash
   npm run auth
   ```
2. The CLI prints the TikTok authorize URL. Open it in the browser.
3. Show the TikTok consent screen — point out the **`video.upload`** scope.
4. Authorize. Copy the returned `code`.
5. Exchange it:
   ```bash
   npm run auth -- --code <CODE>
   ```
6. Show the terminal confirming an access token was obtained.

### Scene 2 — Generate + upload (40s)
1. Run the full pipeline with publish:
   ```bash
   npm run publish
   ```
2. Let the terminal show each stage running: topic → script → narration →
   images → video assembly (ffmpeg).
3. Show the generated file appearing at `output/<date>/video.mp4`.
   Optionally open it briefly to prove it is a real 1080x1920 video.
4. Show the final log line confirming the video was sent to the TikTok
   **inbox** via the Content Posting API `/inbox/` endpoint.

### Scene 3 — Draft in TikTok inbox (20s)
1. Switch to the phone.
2. Open the TikTok app on the test account.
3. Open notifications / inbox and show the **draft** that just arrived.
4. Open the draft to show it is the generated video, ready for **manual**
   review and posting.
5. Emphasize: the app does **not** auto-publish — the user posts manually.

### Scene 4 — Wrap (5s)
Return to the terminal showing the success state. End.

## Narration / on-screen notes to include

- Name the product: **Content Posting API**.
- Name the scope: **`video.upload`**.
- State clearly: content is sent as a **draft to the inbox**, never
  auto-published.
- Show the verified domain at least once.

## After recording

- Trim to keep it focused; keep each file ≤ 50 MB.
- Export as `.mp4`.
- Upload in the app-review form's "Upload demo video" field.
