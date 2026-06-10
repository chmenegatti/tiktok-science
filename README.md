# instagram-ciencia

Gera **carrosseis de 10 slides** sobre curiosidades cientificas (de biologia a astrofisica) e publica no Instagram. Um tema diferente por dia.

## Pipeline

```
tema do dia  ->  roteiro (Gemini)  ->  imagens de fundo (IA)  ->  slides 1080x1080 (ffmpeg)  ->  carrossel no Instagram
```

1. **Tema** — rotaciona por dia entre 15 areas cientificas (`src/themes.ts`).
2. **Roteiro** — Gemini (`gemini-2.5-flash`, free tier) gera 10 slides estruturados: capa/gancho, conteudo progressivo, chamada para seguir, alem de caption e hashtags.
3. **Imagens** — uma imagem de fundo por slide via Gemini (mesma chave do roteiro, free tier).
4. **Slides** — ffmpeg sobrepoe titulo + corpo + handle sobre a imagem escurecida, gerando um PNG 1080x1080 por slide.
5. **Publicacao** — hospeda os PNGs no GitHub Pages (URLs publicas exigidas pela API) e publica como **carrossel** no feed via Instagram Graph API.

## Pre-requisitos

- Node.js 18+
- **ffmpeg** no PATH (`sudo apt install ffmpeg`)
- Uma fonte para o texto dos slides (ajuste `FONT_FILE` no `.env`)
- Chave `GEMINI_API_KEY` (gratis em https://aistudio.google.com/apikey) — usada para roteiro E imagem.
- Conta do Instagram **Business/Creator** conectada a uma **Pagina do Facebook**.
- App no [Meta for Developers](https://developers.facebook.com) com o produto **Instagram Graph API**.

> **Limite da Graph API:** um carrossel aceita no maximo **10 imagens**. O roteiro gera exatamente 10 slides.

## Setup

```bash
npm install
cp .env.example .env   # preencha as chaves
```

## Uso

```bash
# Gera os slides do dia em output/AAAA-MM-DD/ (sem publicar)
npm run today

# Gera e publica o carrossel no Instagram
npm run publish
```

### Autenticar no Instagram (uma vez)

```bash
npm run auth                          # imprime o passo a passo e as permissoes
npm run auth -- --token SEU_TOKEN     # troca por token long-lived e lista o IG_USER_ID
```

Cole `IG_ACCESS_TOKEN` (long-lived, ~60 dias) e `IG_USER_ID` no `.env`. O token
expira em ~60 dias — rode `npm run auth` de novo quando os posts comecarem a 401.

## Saida

Ao fim, `output/AAAA-MM-DD/` contem apenas o necessario para o post:

- `slide_*.png` — slides finais (imagem + texto), em ordem
- `caption.txt` — legenda + hashtags do post

Os intermediarios (roteiro, imagens de fundo, textos do drawtext) sao gerados
durante a execucao e removidos no final.

Na publicacao, os slides finais sao copiados para `docs/media/AAAA-MM-DD/` e
commitados para o GitHub Pages servir as URLs publicas.

## Automacao diaria (systemd --user)

Dois timers de usuario cuidam de tudo (arquivos em `~/.config/systemd/user/`):

- `instagram-ciencia.timer` — roda `npm run publish` todo dia as 09:00.
- `instagram-ciencia-refresh.timer` — roda `npm run refresh-token` todo domingo
  as 08:00, mantendo o token long-lived sempre dentro da validade de 60 dias.

```bash
systemctl --user daemon-reload
systemctl --user enable --now instagram-ciencia.timer instagram-ciencia-refresh.timer
loginctl enable-linger "$USER"      # roda mesmo sem login aberto
systemctl --user list-timers 'instagram-ciencia*'   # confere os horarios
journalctl --user -u instagram-ciencia.service -n 50 # logs da ultima execucao
```

O `git push` da publicacao usa HTTPS + o credential helper do `gh` (headless,
sem ssh-agent). Para rodar manualmente uma vez agora: `npm run publish` ou
`systemctl --user start instagram-ciencia.service`.
