import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { config, SLIDE } from "../config.js";

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

/** Quebra texto em linhas de ate `maxChars` para caber no slide. */
function wrap(text: string, maxChars: number): string {
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

interface SlideAsset {
  /** Imagem de fundo gerada por IA. */
  image: string;
  titulo: string;
  corpo: string;
}

/**
 * Compoe os slides 1080x1080 do carrossel:
 * - imagem de fundo (scale+crop) + escurecimento para legibilidade
 * - titulo no topo, corpo ao centro, handle no rodape (todos queimados)
 * Cada slide vira um PNG. Requer ffmpeg no PATH.
 *
 * Retorna os caminhos dos PNGs em ordem.
 */
export async function montarSlides(
  slides: SlideAsset[],
  workDir: string,
): Promise<string[]> {
  const { width, height } = SLIDE;
  const font = config.fontFile();
  const handle = `@${config.igHandle()}`;
  const out: string[] = [];

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];

    // Textos em arquivo (evita inferno de escaping no filtro drawtext).
    const tituloPath = join(workDir, `titulo_${i}.txt`);
    const corpoPath = join(workDir, `corpo_${i}.txt`);
    await writeFile(tituloPath, wrap(s.titulo, 18));
    await writeFile(corpoPath, wrap(s.corpo, 30));

    const slidePath = join(workDir, `slide_${String(i).padStart(2, "0")}.png`);
    const filter = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase,`,
      `crop=${width}:${height},setsar=1,`,
      // Escurece a imagem inteira para o texto branco ficar legivel.
      `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.45:t=fill,`,
      // Titulo (topo).
      `drawtext=textfile='${tituloPath}':fontfile='${font}':fontsize=64:`,
      `fontcolor=white:borderw=4:bordercolor=black@0.85:`,
      `x=(w-text_w)/2:y=h*0.10:line_spacing=12,`,
      // Corpo (centro).
      `drawtext=textfile='${corpoPath}':fontfile='${font}':fontsize=46:`,
      `fontcolor=white:borderw=3:bordercolor=black@0.85:`,
      `x=(w-text_w)/2:y=h*0.42:line_spacing=16,`,
      // Handle (rodape).
      `drawtext=text='${handle}':fontfile='${font}':fontsize=34:`,
      `fontcolor=white@0.9:x=(w-text_w)/2:y=h-90`,
    ].join("");

    await run("ffmpeg", [
      "-y",
      "-i", s.image,
      "-vf", filter,
      "-frames:v", "1",
      slidePath,
    ]);
    out.push(slidePath);
  }

  return out;
}
