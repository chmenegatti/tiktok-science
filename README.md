# tiktok-ciencia

Gera videos de **15 segundos** sobre curiosidades cientificas (de biologia a astrofisica) e envia para o TikTok. Um tema diferente por dia.

## Pipeline

```
tema do dia  ->  roteiro (Gemini)  ->  narracao (Edge TTS) + imagens (Pollinations)  ->  video (ffmpeg)  ->  inbox do TikTok
```

1. **Tema** — rotaciona por dia entre 15 areas cientificas (`src/themes.ts`).
2. **Roteiro** — Gemini (`gemini-2.0-flash`, free tier) gera roteiro estruturado: gancho, 3-4 cenas, caption e hashtags.
3. **Narracao** — Edge TTS (gratis), voz PT-BR, um mp3 por cena.
4. **Imagens** — uma imagem por cena via Gemini (mesma chave do roteiro, free tier).
5. **Video** — ffmpeg monta cada cena com efeito Ken Burns + legenda queimada, concatena tudo (1080x1920).
6. **Publicacao** — envia para a **caixa de entrada** do TikTok. O video chega como rascunho; voce revisa e posta manualmente no app.

## Pre-requisitos

- Node.js 18+
- **ffmpeg** e **ffprobe** no PATH (`sudo apt install ffmpeg`)
- Uma fonte para as legendas (ajuste `FONT_FILE` no `.env`)
- Chave `GEMINI_API_KEY` (gratis em https://aistudio.google.com/apikey) — usada para roteiro E imagem.
- App no [TikTok Developer Portal](https://developers.tiktok.com/) com Content Posting API + scope `video.upload`

## Setup

```bash
npm install
cp .env.example .env   # preencha as chaves
```

## Uso

```bash
# Gera o video do dia em output/AAAA-MM-DD/ (sem publicar)
npm run today

# Gera e envia para a inbox do TikTok (revisao manual no app)
npm run publish
```

### Autenticar no TikTok (uma vez)

```bash
npm run auth                       # imprime a URL de autorizacao
npm run auth -- --code SEU_CODE    # troca o code pelo access_token
```

Cole o `TIKTOK_ACCESS_TOKEN` retornado no `.env`.

## Saida

Cada execucao cria `output/AAAA-MM-DD/` com:

- `roteiro.json` — roteiro gerado
- `audio_*.mp3`, `image_*.png` — assets por cena
- `clip_*.mp4` — clipes intermediarios
- `video.mp4` — video final
- `caption.txt` — legenda + hashtags do post

## Automacao diaria

Agende `npm run publish` via cron (ou systemd timer):

```cron
0 9 * * *  cd /home/cesar/js/tiktok && /usr/bin/npm run publish >> output/cron.log 2>&1
```
