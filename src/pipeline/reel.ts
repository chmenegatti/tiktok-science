import { execFile } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { config, REEL } from "../config.js";

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

const AUDIO_EXT = [".mp3", ".m4a", ".aac", ".wav", ".ogg"];

/** Sorteia uma faixa de musica da pasta configurada, ou null se nao houver. */
async function escolherMusica(): Promise<string | null> {
  const dir = config.musicDir();
  let nomes: string[];
  try {
    nomes = (await readdir(dir)).filter((n) =>
      AUDIO_EXT.includes(n.slice(n.lastIndexOf(".")).toLowerCase()),
    );
  } catch {
    return null;
  }
  if (nomes.length === 0) return null;
  return join(dir, nomes[Math.floor(Math.random() * nomes.length)]);
}

/**
 * Monta um Reel 1080x1920 a partir dos slides do carrossel:
 * cada slide quadrado fica centralizado sobre uma versao borrada/escurecida de
 * si mesmo, por `REEL.slideSeconds` segundos. Os clipes (mudos) sao concatenados
 * e recebe uma trilha de musica (royalty-free) em loop com fade-out.
 * Se nao houver musica na pasta, gera o Reel sem audio (com aviso).
 * Requer ffmpeg no PATH. Retorna o caminho do mp4.
 */
export async function montarReel(slidePaths: string[], workDir: string): Promise<string> {
  const { width, height, fps, slideSeconds } = REEL;

  // 1. Clipe mudo por slide.
  const clips: string[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const clipPath = join(workDir, `reelclip_${String(i).padStart(2, "0")}.mp4`);
    const filter = [
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,`,
      `crop=${width}:${height},boxblur=20:2,eq=brightness=-0.25,setsar=1[bg];`,
      `[0:v]scale=${width}:${width},setsar=1[fg];`,
      `[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`,
    ].join("");

    await run("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", slidePaths[i],
      "-t", String(slideSeconds),
      "-filter_complex", filter,
      "-map", "[v]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      clipPath,
    ]);
    clips.push(clipPath);
  }

  // 2. Concatena os clipes mudos (mesmos params -> stream copy).
  const listPath = join(workDir, "reelclips.txt");
  await writeFile(listPath, clips.map((c) => `file '${basename(c)}'`).join("\n"));
  const mudoPath = join(workDir, "reel_mudo.mp4");
  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", mudoPath,
  ]);

  const finalPath = join(workDir, "reel.mp4");
  const total = slidePaths.length * slideSeconds;

  // 3. Adiciona a musica (loop + fade-out), ou exporta sem audio se nao houver.
  const musica = await escolherMusica();
  if (!musica) {
    console.warn(
      `  [reel] sem musica em "${config.musicDir()}"; gerando Reel sem audio. ` +
        `Adicione faixas royalty-free para melhorar o alcance.`,
    );
    await run("ffmpeg", ["-y", "-i", mudoPath, "-c", "copy", "-movflags", "+faststart", finalPath]);
    return finalPath;
  }

  console.log(`  [reel] musica: ${basename(musica)}`);
  const fadeStart = Math.max(0, total - 2);
  await run("ffmpeg", [
    "-y",
    "-i", mudoPath,
    "-stream_loop", "-1", "-i", musica,
    "-map", "0:v",
    "-map", "1:a",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "160k",
    "-af", `afade=t=out:st=${fadeStart}:d=2`,
    "-shortest",
    "-movflags", "+faststart",
    finalPath,
  ]);
  return finalPath;
}
