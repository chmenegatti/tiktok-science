import { execFile } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { config } from "../config.js";

const exec = promisify(execFile);

/** Maximo de itens em um carrossel da Graph API do Instagram. */
export const MAX_CARROSSEL = 10;

async function git(args: string[]): Promise<void> {
  try {
    await exec("git", args, { maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: string; message: string };
    throw new Error(`git ${args[0]} falhou: ${e.stderr || e.message}`);
  }
}

/** Espera uma URL responder 200 (Pages leva ~30-60s para publicar o build). */
async function aguardarUrl(url: string, tentativas = 30): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (res.ok) return;
    } catch {
      /* ainda nao no ar */
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error(`Timeout esperando ${url} ficar publico no GitHub Pages.`);
}

/**
 * Hospeda os PNGs dos slides no GitHub Pages (pasta docs/media/<data>) para que
 * a Graph API consiga busca-los por URL publica. Faz commit + push, limpando
 * media antiga para nao inflar o repo, e espera o build do Pages publicar.
 *
 * Retorna as URLs publicas, em ordem.
 */
async function hospedarSlides(slidePaths: string[], dateStamp: string): Promise<string[]> {
  const mediaRoot = join("docs", "media");
  const destDir = join(mediaRoot, dateStamp);
  await rm(mediaRoot, { recursive: true, force: true }); // mantem so o post do dia
  await mkdir(destDir, { recursive: true });

  const names: string[] = [];
  for (const p of slidePaths) {
    const name = basename(p);
    await copyFile(p, join(destDir, name));
    names.push(name);
  }

  await git(["add", "docs/media"]);
  await git(["commit", "-m", `Publica slides do carrossel (${dateStamp})`]);
  await git(["push", "origin", "HEAD"]);

  const base = config.publicBaseUrl().replace(/\/$/, "");
  const urls = names.map((n) => `${base}/media/${dateStamp}/${n}`);

  console.log("  Aguardando GitHub Pages publicar as imagens...");
  await aguardarUrl(urls[0]);
  return urls;
}

interface GraphResp {
  id?: string;
  error?: { message: string; type: string; code: number };
}

/** POST na Graph API; retorna o id criado ou lanca erro legivel. */
async function graphPost(path: string, params: Record<string, string>): Promise<string> {
  const ver = config.instagram.graphVersion();
  const url = `https://graph.facebook.com/${ver}/${path}`;
  const body = new URLSearchParams({
    ...params,
    access_token: config.instagram.accessToken(),
  });
  const res = await fetch(url, { method: "POST", body });
  const data = (await res.json()) as GraphResp;
  if (!res.ok || data.error || !data.id) {
    throw new Error(`Graph API ${path} falhou: ${JSON.stringify(data.error ?? data)}`);
  }
  return data.id;
}

/**
 * Publica os slides como um carrossel no feed do Instagram via Graph API.
 *
 * Fluxo:
 *  1. hospeda os PNGs no GitHub Pages (URLs publicas exigidas pela API);
 *  2. cria um container de midia por imagem (is_carousel_item=true);
 *  3. cria o container do carrossel (media_type=CAROUSEL, children, caption);
 *  4. publica o container.
 *
 * Requer IG_USER_ID e IG_ACCESS_TOKEN (long-lived). Rode `npm run auth`.
 * Retorna o id da midia publicada.
 */
export async function publicarCarrossel(
  slidePaths: string[],
  caption: string,
  dateStamp: string,
): Promise<string> {
  if (slidePaths.length > MAX_CARROSSEL) {
    throw new Error(
      `Carrossel tem ${slidePaths.length} slides; o limite da Graph API e ${MAX_CARROSSEL}.`,
    );
  }
  const igUser = config.instagram.userId();

  const urls = await hospedarSlides(slidePaths, dateStamp);

  console.log("  Criando containers de imagem...");
  const childIds: string[] = [];
  for (const image_url of urls) {
    const id = await graphPost(`${igUser}/media`, {
      image_url,
      is_carousel_item: "true",
    });
    childIds.push(id);
  }

  console.log("  Criando container do carrossel...");
  const carouselId = await graphPost(`${igUser}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });

  console.log("  Publicando...");
  return graphPost(`${igUser}/media_publish`, { creation_id: carouselId });
}
