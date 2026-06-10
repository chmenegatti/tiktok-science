import { mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { dateStamp, temaDoDia } from "./themes.js";
import { gerarRoteiro } from "./pipeline/script.js";
import { gerarImagem } from "./pipeline/images.js";
import { montarSlides } from "./pipeline/slides.js";
import { montarReel } from "./pipeline/reel.js";
import { publicarConteudo } from "./pipeline/publish.js";
import type { ResultadoPipeline } from "./types.js";

/**
 * Pipeline diaria:
 *   tema do dia -> roteiro (Gemini) -> imagens de fundo (IA) por slide
 *   -> slides 1080x1080 + Reel 9:16 com musica (ffmpeg)
 *   -> [opcional] carrossel + Reel + Story no Instagram + cross-post Facebook.
 *
 * Uso:
 *   npm run today               gera slides e Reel localmente (sem publicar)
 *   npm run publish             gera e publica tudo
 *   npm run publish -- --slot 1 escolhe o slot do dia (0 = manha, 1 = tarde)
 */
async function main(): Promise<ResultadoPipeline> {
  const publicar = process.argv.includes("--publish");
  const si = process.argv.indexOf("--slot");
  const slot = si >= 0 ? Number(process.argv[si + 1]) : 0;
  const data = new Date();
  // Id unico por post do dia (data + slot) para isolar pastas dos 2 posts diarios.
  const stamp = `${dateStamp(data)}-${slot}`;
  const tema = temaDoDia(data, slot);
  const dir = join("output", stamp);
  // Limpa assets de execucoes anteriores do mesmo post (evita arquivos orfaos).
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  console.log(`Tema do dia (slot ${slot}): ${tema}`);

  // 1. Roteiro
  console.log("Gerando roteiro com Gemini...");
  const roteiro = await gerarRoteiro(tema);
  await writeFile(join(dir, "roteiro.json"), JSON.stringify(roteiro, null, 2));
  console.log(`  "${roteiro.titulo}" - ${roteiro.slides.length} slides`);

  // 2. Imagem de fundo (IA) por slide, em paralelo
  console.log("Gerando imagens de fundo (IA)...");
  const assets = await Promise.all(
    roteiro.slides.map(async (slide, i) => {
      const image = join(dir, `image_${String(i).padStart(2, "0")}.png`);
      await gerarImagem(slide.prompt_imagem, image);
      return { image, titulo: slide.titulo, corpo: slide.corpo };
    }),
  );

  // 3. Composicao dos slides (carrossel) e do Reel (com musica sci-fi)
  console.log("Compondo slides com ffmpeg...");
  const slidePaths = await montarSlides(assets, dir);
  console.log("Montando Reel com ffmpeg...");
  const reelPath = await montarReel(slidePaths, dir);

  // 4. Caption + hashtags
  const captionPath = join(dir, "caption.txt");
  const caption = `${roteiro.caption}\n\n${roteiro.hashtags.map((h) => `#${h}`).join(" ")}`;
  await writeFile(captionPath, caption);

  console.log(`\nPronto: ${slidePaths.length} slides + Reel em ${dir}`);
  console.log(`Caption: ${captionPath}`);

  // 5. Publicacao (opcional): carrossel + Reel + Story + Facebook
  let resultado: ResultadoPipeline["publicacao"];
  if (publicar) {
    console.log("Publicando no Instagram (carrossel + Reel + Story) e Facebook...");
    resultado = await publicarConteudo({
      slidePaths,
      reelPath,
      caption,
      stamp,
      story: true,
      facebook: true,
    });
    console.log(`Publicado: ${JSON.stringify(resultado)}`);
  } else {
    console.log("\n(--publish nao informado: midia so foi gerada localmente.)");
  }

  // 6. Limpeza: mantem so os slides finais, o Reel e a caption.
  await limpar(dir, [...slidePaths, reelPath, captionPath]);

  return { dir, roteiro, slidePaths, reelPath, captionPath, publicacao: resultado };
}

/** Remove de `dir` tudo que nao esteja na lista de arquivos a manter. */
async function limpar(dir: string, manterPaths: string[]): Promise<void> {
  const manter = new Set(manterPaths.map((p) => basename(p)));
  for (const nome of await readdir(dir)) {
    if (!manter.has(nome)) await unlink(join(dir, nome));
  }
}

main().catch((err) => {
  console.error("\nFalha na pipeline:", err.message);
  process.exit(1);
});
