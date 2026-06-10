# Privacy Policy

_Last updated: June 10, 2026_

## 1. Overview

This Privacy Policy describes how instagram-ciencia ("the Application") handles
data. The Application is a personal, self-hosted tool maintained by Cesar
Menegatti (GitHub: [chmenegatti](https://github.com/chmenegatti)). It runs
under the control of its operator and is not offered as a hosted service to
third parties.

## 2. Data We Collect

The Application does **not** collect, store, or transmit personal data about
end users or third parties. It processes only:

- **API credentials** supplied by the operator (Google Gemini, Meta/Instagram,
  etc.), stored locally in a `.env` file on the operator's machine and never
  committed to source control.
- **Generated content** (scripts, images, slides) written to a local `output/`
  directory; the final slide images are published to the operator's own
  Instagram account and hosted publicly on GitHub Pages to enable publishing.

## 3. How Data Is Used

- API credentials are used solely to authenticate requests to their respective
  third-party services.
- The Instagram access token is used only to publish generated carousels to the
  operator's own Instagram account.

No data is sold, shared, or used for advertising or analytics.

## 4. Data Storage and Retention

Credentials remain on the operator's local machine. Generated slides are
committed to the public `docs/media/` directory only to allow the Instagram
Graph API to fetch them by URL, and are overwritten on each run. The Application
maintains no other remote database or backend. Retention is under the operator's
control.

## 5. Third-Party Services

When the Application calls third-party APIs, the data sent to those services is
governed by their own privacy policies:

- **Google Gemini** — script and background-image generation.
- **GitHub Pages** — public hosting of the generated slide images.
- **Instagram Graph API (Meta)** — publishing the carousel to the operator's
  own account.

The operator should review the privacy policies of these providers.

## 6. Instagram Data

The Application requests only the permissions required to publish content
(`instagram_basic`, `instagram_content_publish`, and page-listing scopes). It
uses the resulting access token exclusively to publish carousels to the
operator's own Instagram account. It does not read, collect, or store data from
other Instagram users.

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
