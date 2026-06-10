# Música do Reel

Coloque aqui faixas **royalty-free** estilo **sci-fi** (`.mp3`, `.m4a`, `.wav`,
`.aac`, `.ogg`). A cada Reel a pipeline sorteia uma faixa, faz loop até cobrir a
duração do vídeo (~40s) e aplica fade-out.

## ⚠️ Licenciamento

Não use música com copyright. Reels publicados **via API** não têm acesso à
biblioteca licenciada do Instagram (só o app tem). Faixa protegida pode ser
**mutada ou bloqueada**. Use fontes livres, por exemplo:

- Pixabay Music (https://pixabay.com/music/) — busque "sci-fi", "cyberpunk", "space"
- YouTube Audio Library (licença livre)
- Free Music Archive (CC)

## Observações

- Os arquivos de áudio **não** entram no git (ver `.gitignore`) — ficam só na
  máquina que roda a pipeline.
- Sem nenhuma faixa na pasta, o Reel é gerado **sem áudio** (com aviso).
- O Reel final (com a música embutida) é hospedado publicamente no GitHub Pages
  para a Graph API; por isso a faixa precisa ser de uso livre.
