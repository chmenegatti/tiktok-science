import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dateStamp, temaDoDia } from "./themes.js";
import { gerarRoteiro } from "./pipeline/script.js";
import { sintetizar } from "./pipeline/tts.js";
import { gerarImagem } from "./pipeline/images.js";
import { montarVideo } from "./pipeline/video.js";
import { enviarParaInbox } from "./pipeline/publish.js";
import type { ResultadoPipeline } from "./types.js";

/**
 * Pipeline diaria:
 *   tema do dia -> roteiro (Claude) -> narracao (TTS) + imagens (IA)
 *   -> video (ffmpeg) -> [opcional] envio para inbox do TikTok.
 *
 * Uso:
 *   npm run today            gera o video do dia (sem publicar)
 *   npm run publish          gera e envia para a inbox do TikTok
 */
async function main(): Promise<ResultadoPipeline> {
  const publicar = process.argv.includes("--publish");
  const data = new Date();
  const tema = temaDoDia(data);
  const dir = join("output", dateStamp(data));
  // Limpa assets de execucoes anteriores do mesmo dia (evita arquivos orfaos).
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  console.log(`Tema do dia: ${tema}`);

  // 1. Roteiro
  console.log("Gerando roteiro com Gemini...");
  const roteiro = await gerarRoteiro(tema);
  await writeFile(join(dir, "roteiro.json"), JSON.stringify(roteiro, null, 2));
  console.log(`  "${roteiro.titulo}" - ${roteiro.cenas.length} cenas`);

  // 2. Narracao + imagens por cena (em paralelo)
  console.log("Gerando narracao (TTS) e imagens (IA)...");
  const assets = await Promise.all(
    roteiro.cenas.map(async (cena, i) => {
      const audio = join(dir, `audio_${i}.mp3`);
      const image = join(dir, `image_${i}.png`);
      await Promise.all([
        sintetizar(cena.narracao, audio),
        gerarImagem(cena.prompt_imagem, image),
      ]);
      return { image, audio, legenda: cena.legenda };
    }),
  );

  // 3. Montagem do video
  console.log("Montando video com ffmpeg...");
  const videoPath = await montarVideo(assets, dir);

  // 4. Caption + hashtags
  const captionPath = join(dir, "caption.txt");
  const caption = `${roteiro.caption}\n\n${roteiro.hashtags.map((h) => `#${h}`).join(" ")}`;
  await writeFile(captionPath, caption);

  console.log(`\nPronto: ${videoPath}`);
  console.log(`Caption: ${captionPath}`);

  // 5. Publicacao (opcional)
  let publishId: string | undefined;
  if (publicar) {
    console.log("Enviando para a inbox do TikTok (revisao manual)...");
    publishId = await enviarParaInbox(videoPath);
    console.log(`Enviado. publish_id=${publishId}`);
    console.log("Abra o app do TikTok para revisar e postar.");
  } else {
    console.log("\n(--publish nao informado: video so foi gerado localmente.)");
  }

  return { dir, roteiro, videoPath, captionPath, publishId };
}

main().catch((err) => {
  console.error("\nFalha na pipeline:", err.message);
  process.exit(1);
});
