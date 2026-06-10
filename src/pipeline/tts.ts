import { writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { config } from "../config.js";

/**
 * Sintetiza `texto` em um mp3 PT-BR via Edge TTS (gratis) e grava em `outPath`.
 *
 * A API do msedge-tts varia entre versoes: `toStream()` pode devolver um
 * `Readable` direto ou um objeto `{ audioStream }`. Tratamos os dois.
 */
export async function sintetizar(texto: string, outPath: string): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    config.ttsVoice(),
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );

  const res = tts.toStream(texto, { rate: config.ttsRate() }) as
    | Readable
    | { audioStream: Readable };
  const stream: Readable = res instanceof Readable ? res : res.audioStream;

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve());
    stream.on("close", () => resolve());
    stream.on("error", reject);
  });

  await writeFile(outPath, Buffer.concat(chunks));
}
