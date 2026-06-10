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

Cada execucao cria `output/AAAA-MM-DD/` com:

- `roteiro.json` — roteiro gerado
- `image_*.png` — imagens de fundo por slide
- `slide_*.png` — slides finais (imagem + texto)
- `caption.txt` — legenda + hashtags do post

Na publicacao, os slides finais sao copiados para `docs/media/AAAA-MM-DD/` e
commitados para o GitHub Pages servir as URLs publicas.

## Automacao diaria

Agende `npm run publish` via cron (ou systemd timer):

```cron
0 9 * * *  cd /home/cesar/js/tiktok && /usr/bin/npm run publish >> output/cron.log 2>&1
```
