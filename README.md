# instagram-ciencia

Gera **carrosseis de 10 slides** sobre curiosidades cientificas e publica no Instagram. **Dois posts por dia**, cada um com um tema diferente, rotacionando por ~110 areas (`src/themes.ts`).

## Pipeline

```
tema  ->  roteiro (Gemini)  ->  imagens de fundo (IA)  ->  slides 1080x1080 + Reel 9:16 com musica (ffmpeg)
      ->  carrossel + Reel + Story no Instagram  +  cross-post Facebook
```

1. **Tema** — rotaciona entre ~110 areas, 2 slots/dia (`src/themes.ts`).
2. **Roteiro** — Gemini (`gemini-2.5-flash`, free tier) gera 10 slides otimizados para alcance: capa scroll-stopper, conteudo "salvavel", caption com SEO + CTA e 5 hashtags.
3. **Imagens** — uma imagem de fundo (Gemini) por slide.
4. **Slides + Reel** — ffmpeg gera os PNGs 1080x1080 (texto sobre imagem escurecida) e monta um Reel 9:16 (slide sobre fundo borrado) com **musica sci-fi royalty-free** (sorteada de `assets/music/`).
5. **Publicacao** — hospeda a midia no GitHub Pages (URLs publicas exigidas pela API) e publica via Graph API: **carrossel + Reel + Story** no Instagram e **foto de capa na Pagina do Facebook**.

> **Musica do Reel:** coloque faixas royalty-free (sci-fi) em `assets/music/`.
> Veja `assets/music/README.md`. Sem faixas, o Reel sai sem audio.

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

Ao fim, `output/AAAA-MM-DD-<slot>/` contem apenas o necessario para o post:

- `slide_*.png` — slides finais (imagem + texto), em ordem
- `reel.mp4` — Reel vertical narrado
- `caption.txt` — legenda + hashtags do post

Os intermediarios (roteiro, imagens de fundo, audios, clipes, textos do
drawtext) sao gerados durante a execucao e removidos no final.

Na publicacao, os slides finais sao copiados para `docs/media/AAAA-MM-DD/` e
commitados para o GitHub Pages servir as URLs publicas.

### Selecionar o post (slot)

Cada dia tem 2 slots (`--slot 0` e `--slot 1`), cada um com um tema diferente:

```bash
npm run publish -- --slot 0   # post da manha
npm run publish -- --slot 1   # post da tarde
```

### Tema custom

`--theme` ignora a rotacao e usa o tema informado (qualquer texto; use aspas se
tiver espacos). Util para posts avulsos:

```bash
npm run publish -- --theme Games
npm run publish -- --theme "Ciencia de Dados"
```

A saida fica em `output/AAAA-MM-DD-<slot>-<slug>/`, isolada dos posts agendados.

Saida e media de cada post ficam isoladas por `output/AAAA-MM-DD-<slot>/` e
`docs/media/AAAA-MM-DD-<slot>/`.

## Automacao diaria (systemd --user)

Tres timers de usuario cuidam de tudo (arquivos em `~/.config/systemd/user/`):

- `instagram-ciencia@0.timer` — `npm run publish -- --slot 0` todo dia as 08:00.
- `instagram-ciencia@1.timer` — `npm run publish -- --slot 1` todo dia as 12:00.
- `instagram-ciencia-refresh.timer` — `npm run refresh-token` todo domingo as
  08:00, mantendo o token long-lived sempre dentro da validade de 60 dias.

Os dois primeiros usam o servico templated `instagram-ciencia@.service` (`%i` = slot).

```bash
systemctl --user daemon-reload
systemctl --user enable --now instagram-ciencia@0.timer instagram-ciencia@1.timer instagram-ciencia-refresh.timer
loginctl enable-linger "$USER"      # roda mesmo sem login aberto
systemctl --user list-timers 'instagram-ciencia*'         # confere os horarios
journalctl --user -u instagram-ciencia@0.service -n 50    # logs do post da manha
```

O `git push` da publicacao usa HTTPS + o credential helper do `gh` (headless,
sem ssh-agent). Para rodar manualmente uma vez agora: `npm run publish` ou
`systemctl --user start instagram-ciencia.service`.
