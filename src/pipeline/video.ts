import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { config, VIDEO } from "../config.js";

const exec = promisify(execFile);

/** Roda um binario e retorna stdout, falhando com stderr legivel. */
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

/** Quebra texto em linhas de ate `maxChars` para a legenda na tela. */
function wrap(text: string, maxChars = 22): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.join("\n");
}

interface CenaAsset {
  image: string;
  audio: string;
  legenda: string;
}

/**
 * Monta o video final 1080x1920:
 * - cada cena = imagem com efeito Ken Burns (zoompan) + legenda queimada + audio
 * - clipes concatenados em ordem
 * Requer ffmpeg e ffprobe no PATH.
 */
export async function montarVideo(
  cenas: CenaAsset[],
  workDir: string,
): Promise<string> {
  const { width, height, fps } = VIDEO;
  const font = config.fontFile();
  const clips: string[] = [];

  for (let i = 0; i < cenas.length; i++) {
    const cena = cenas[i];
    const dur = await duracao(cena.audio);
    const frames = Math.ceil(dur * fps);

    // Legenda em arquivo (evita inferno de escaping no filtro drawtext).
    const legendaPath = join(workDir, `legenda_${i}.txt`);
    await writeFile(legendaPath, wrap(cena.legenda));

    const clipPath = join(workDir, `clip_${i}.mp4`);
    const filter = [
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,`,
      `crop=${width}:${height},`,
      `zoompan=z='min(zoom+0.0012,1.4)':d=${frames}:s=${width}x${height}:fps=${fps},`,
      `setsar=1,`,
      `drawtext=textfile='${legendaPath}':fontfile='${font}':fontsize=56:`,
      `fontcolor=white:borderw=5:bordercolor=black@0.9:`,
      `x=(w-text_w)/2:y=h*0.70:line_spacing=12[v]`,
    ].join("");

    await run("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", cena.image,
      "-i", cena.audio,
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

  // Concatena os clipes (mesmos parametros -> stream copy).
  // Paths no list sao relativos a pasta do proprio list -> usar basename.
  const listPath = join(workDir, "clips.txt");
  await writeFile(listPath, clips.map((c) => `file '${basename(c)}'`).join("\n"));

  const finalPath = join(workDir, "video.mp4");
  await run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c", "copy",
    finalPath,
  ]);

  return finalPath;
}
