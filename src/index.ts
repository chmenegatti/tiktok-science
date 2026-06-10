import { mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { dateStamp, temaDoDia } from "./themes.js";
import { gerarRoteiro } from "./pipeline/script.js";
import { gerarImagem } from "./pipeline/images.js";
import { montarSlides } from "./pipeline/slides.js";
import { publicarCarrossel } from "./pipeline/publish.js";
import type { ResultadoPipeline } from "./types.js";

/**
 * Pipeline diaria:
 *   tema do dia -> roteiro (Gemini) -> imagens de fundo (IA) por slide
 *   -> slides 1080x1080 (ffmpeg) -> [opcional] carrossel no Instagram.
 *
 * Uso:
 *   npm run today            gera os slides do dia (sem publicar)
 *   npm run publish          gera e publica o carrossel no Instagram
 */
async function main(): Promise<ResultadoPipeline> {
  const publicar = process.argv.includes("--publish");
  const data = new Date();
  const stamp = dateStamp(data);
  const tema = temaDoDia(data);
  const dir = join("output", stamp);
  // Limpa assets de execucoes anteriores do mesmo dia (evita arquivos orfaos).
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  console.log(`Tema do dia: ${tema}`);

  // 1. Roteiro
  console.log("Gerando roteiro com Gemini...");
  const roteiro = await gerarRoteiro(tema);
  await writeFile(join(dir, "roteiro.json"), JSON.stringify(roteiro, null, 2));
  console.log(`  "${roteiro.titulo}" - ${roteiro.slides.length} slides`);

  // 2. Imagem de fundo por slide (em paralelo)
  console.log("Gerando imagens de fundo (IA)...");
  const assets = await Promise.all(
    roteiro.slides.map(async (slide, i) => {
      const image = join(dir, `image_${String(i).padStart(2, "0")}.png`);
      await gerarImagem(slide.prompt_imagem, image);
      return { image, titulo: slide.titulo, corpo: slide.corpo };
    }),
  );

  // 3. Composicao dos slides
  console.log("Compondo slides com ffmpeg...");
  const slidePaths = await montarSlides(assets, dir);

  // 4. Caption + hashtags
  const captionPath = join(dir, "caption.txt");
  const caption = `${roteiro.caption}\n\n${roteiro.hashtags.map((h) => `#${h}`).join(" ")}`;
  await writeFile(captionPath, caption);

  console.log(`\nPronto: ${slidePaths.length} slides em ${dir}`);
  console.log(`Caption: ${captionPath}`);

  // 5. Publicacao (opcional)
  let mediaId: string | undefined;
  if (publicar) {
    console.log("Publicando carrossel no Instagram...");
    mediaId = await publicarCarrossel(slidePaths, caption, stamp);
    console.log(`Publicado. media_id=${mediaId}`);
  } else {
    console.log("\n(--publish nao informado: slides so foram gerados localmente.)");
  }

  // 6. Limpeza: mantem so os slides finais e a caption; remove intermediarios
  //    (imagens de fundo, textos de drawtext, roteiro.json).
  await limpar(dir, slidePaths, captionPath);

  return { dir, roteiro, slidePaths, captionPath, mediaId };
}

/** Remove de `dir` tudo que nao seja um slide final ou a caption. */
async function limpar(dir: string, slidePaths: string[], captionPath: string): Promise<void> {
  const manter = new Set([...slidePaths, captionPath].map((p) => basename(p)));
  for (const nome of await readdir(dir)) {
    if (!manter.has(nome)) await unlink(join(dir, nome));
  }
}

main().catch((err) => {
  console.error("\nFalha na pipeline:", err.message);
  process.exit(1);
});
