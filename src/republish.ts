import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { publicarConteudo } from "./pipeline/publish.js";

/**
 * Republica a midia JA GERADA de um post que falhou no passo de publicacao.
 * Reaproveita os slides/Reel/caption em output/<stamp> — nao regenera nada,
 * nao queima outro assunto. Util quando a Graph API caiu transientemente.
 *
 * Uso: npm run republish -- <stamp>     ex.: npm run republish -- 2026-06-13-1
 */
async function main(): Promise<void> {
  const stamp = process.argv[2];
  if (!stamp) {
    console.error("Uso: npm run republish -- <stamp>   (ex.: 2026-06-13-1)");
    process.exit(1);
  }

  const dir = join("output", stamp);
  const arquivos = await readdir(dir);
  const slidePaths = arquivos
    .filter((n) => /^slide_\d+\.png$/.test(n))
    .sort()
    .map((n) => join(dir, n));
  if (slidePaths.length === 0) throw new Error(`Nenhum slide_*.png em ${dir}.`);

  const reelPath = arquivos.includes("reel.mp4") ? join(dir, "reel.mp4") : undefined;
  const caption = await readFile(join(dir, "caption.txt"), "utf8");

  console.log(`Republicando ${stamp}: ${slidePaths.length} slides${reelPath ? " + Reel" : ""}`);
  const resultado = await publicarConteudo({
    slidePaths,
    reelPath,
    caption,
    stamp,
    story: true,
    facebook: true,
  });
  console.log(`Publicado: ${JSON.stringify(resultado)}`);
}

main().catch((err) => {
  console.error("\nFalha no republish:", err.message);
  process.exit(1);
});
