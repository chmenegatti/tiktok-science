# Privacy Policy

_Last updated: June 10, 2026_

## 1. Overview

This Privacy Policy describes how tiktok-science ("the Application") handles
data. The Application is a personal, self-hosted tool maintained by Cesar
Menegatti (GitHub: [chmenegatti](https://github.com/chmenegatti)). It runs
under the control of its operator and is not offered as a hosted service to
third parties.

## 2. Data We Collect

The Application does **not** collect, store, or transmit personal data about
end users or third parties. It processes only:

- **API credentials** supplied by the operator (Google Gemini, TikTok, etc.),
  stored locally in a `.env` file on the operator's machine and never committed
  to source control.
- **Generated content** (scripts, narration, images, videos) written to a
  local `output/` directory.

## 3. How Data Is Used

- API credentials are used solely to authenticate requests to their respective
  third-party services.
- TikTok access tokens are used only to upload generated videos to the
  operator's own TikTok inbox as drafts.

No data is sold, shared, or used for advertising or analytics.

## 4. Data Storage and Retention

All credentials and generated content remain on the operator's local machine.
The Application maintains no remote database or backend. Retention is entirely
under the operator's control; deleting local files removes the data.

## 5. Third-Party Services

When the Application calls third-party APIs, the data sent to those services is
governed by their own privacy policies:

- **Google Gemini** — script and image generation.
- **TikTok Content Posting API** — video upload to the operator's inbox.
- **Edge TTS** and image providers — narration and image synthesis.

The operator should review the privacy policies of these providers.

## 6. TikTok Data

The Application requests the `video.upload` scope only. It uses the resulting
access token exclusively to send videos to the operator's own TikTok inbox as
drafts. It does not read, collect, or store any data from TikTok user accounts.

## 7. Security

Credentials are stored locally and excluded from version control via
`.gitignore`. The operator is responsible for securing their own machine and
credentials.

## 8. Children's Privacy

The Application is not directed to children and does not knowingly process any
personal data from children.

## 9. Changes to This Policy

This Privacy Policy may be updated at any time. The "Last updated" date above
reflects the most recent revision.

## 10. Contact

For questions regarding this Privacy Policy, contact Cesar Menegatti via
GitHub: [https://github.com/chmenegatti](https://github.com/chmenegatti).
