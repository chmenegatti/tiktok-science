import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { config } from "../config.js";

/**
 * Sintetiza narracao em PT-BR via Edge TTS (gratis) e grava em `outPath` (mp3).
 *
 * Obs: a API do msedge-tts varia entre versoes. Aqui usamos toStream e
 * tratamos os dois formatos de retorno (Readable direto ou { audioStream }).
 */
export async function sintetizar(texto: string, outPath: string): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    config.ttsVoice(),
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );

  const result = tts.toStream(texto, { rate: config.ttsRate() }) as unknown;
  const stream: Readable =
    result instanceof Readable
      ? result
      : ((result as { audioStream: Readable }).audioStream);

  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(outPath);
    stream.pipe(out);
    out.on("finish", () => resolve());
    out.on("error", reject);
    stream.on("error", reject);
  });
}
