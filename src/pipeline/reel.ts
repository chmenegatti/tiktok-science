import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { REEL } from "../config.js";

const exec = promisify(execFile);

async function run(bin: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await exec(bin, args, { maxBuffer: 64 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    const e = err as { stderr?: string; message: string };
    throw new Error(`${bin} falhou: ${e.stderr || e.message}`);
  }
}

/** Duracao em segundos de um arquivo de audio via ffprobe. */
async function duracao(audioPath: string): Promise<number> {
  const out = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);
  const d = parseFloat(out.trim());
  if (!isFinite(d) || d <= 0) throw new Error(`Duracao invalida em ${audioPath}`);
  return d;
}

interface ReelAsset {
  /** Slide final (PNG 1080x1080, ja com texto). */
  slide: string;
  /** Narracao do slide (mp3). */
  audio: string;
}

/**
 * Monta um Reel 1080x1920 a partir dos slides do carrossel:
 * cada slide quadrado fica centralizado sobre uma versao borrada/escurecida de
 * si mesmo (preenche o 9:16), e dura o tempo da narracao do slide. Os clipes
 * sao concatenados. Requer ffmpeg e ffprobe no PATH.
 *
 * Retorna o caminho do mp4.
 */
export async function montarReel(assets: ReelAsset[], workDir: string): Promise<string> {
  const { width, height, fps } = REEL;
  const clips: string[] = [];

  for (let i = 0; i < assets.length; i++) {
    const { slide, audio } = assets[i];
    const dur = await duracao(audio);

    const clipPath = join(workDir, `reelclip_${String(i).padStart(2, "0")}.mp4`);
    const filter = [
      // Fundo: o slide ampliado para cobrir 9:16, borrado e escurecido.
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,`,
      `crop=${width}:${height},boxblur=20:2,eq=brightness=-0.25,setsar=1[bg];`,
      // Frente: o slide quadrado em tamanho original.
      `[0:v]scale=${width}:${width},setsar=1[fg];`,
      // Sobrepoe centralizado.
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`,
    ].join("");

    await run("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", slide,
      "-i", audio,
      "-t", dur.toFixed(3),
      "-filter_complex", filter,
      "-map", "[v]",
      "-map", "1:a",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      clipPath,
    ]);
    clips.push(clipPath);
  }

  // Concatena (mesmos params -> stream copy). Paths relativos ao list -> basename.
  const listPath = join(workDir, "reelclips.txt");
  await writeFile(listPath, clips.map((c) => `file '${basename(c)}'`).join("\n"));

  const finalPath = join(workDir, "reel.mp4");
  await run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c", "copy",
    "-movflags", "+faststart",
    finalPath,
  ]);

  return finalPath;
}
