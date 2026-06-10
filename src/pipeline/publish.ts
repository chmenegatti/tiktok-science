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

/** Espera uma URL responder 200. O build do Pages pode levar varios minutos. */
async function aguardarUrl(url: string, tentativas = 90): Promise<void> {
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
 * Copia arquivos locais para docs/media/<stamp>/, faz commit + push e espera o
 * GitHub Pages publicar. Limpa media antiga para nao inflar o repo.
 * Retorna um mapa nome-do-arquivo -> URL publica.
 */
async function hospedar(paths: string[], stamp: string): Promise<Record<string, string>> {
  const mediaRoot = join("docs", "media");
  const destDir = join(mediaRoot, stamp);
  await rm(mediaRoot, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  const base = config.publicBaseUrl().replace(/\/$/, "");
  const urls: Record<string, string> = {};
  for (const p of paths) {
    const name = basename(p);
    await copyFile(p, join(destDir, name));
    urls[name] = `${base}/media/${stamp}/${name}`;
  }

  // data/ guarda o historico de assuntos (registrado antes do publish).
  await git(["add", "docs/media", "data"]);
  await git(["commit", "-m", `Publica midia (${stamp})`]);
  await git(["push", "origin", "HEAD"]);

  console.log("  Aguardando GitHub Pages publicar a midia...");
  for (const url of Object.values(urls)) await aguardarUrl(url);
  return urls;
}

interface GraphResp {
  id?: string;
  error?: { message: string; type: string; code: number };
}

/** POST na Graph API (Instagram, com o IG access token); retorna o id criado. */
async function igPost(path: string, params: Record<string, string>): Promise<string> {
  const ver = config.instagram.graphVersion();
  const url = `https://graph.facebook.com/${ver}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: config.instagram.accessToken() });
  const res = await fetch(url, { method: "POST", body });
  const data = (await res.json()) as GraphResp;
  if (!res.ok || data.error || !data.id) {
    throw new Error(`Graph API ${path} falhou: ${JSON.stringify(data.error ?? data)}`);
  }
  return data.id;
}

/** Espera um container de midia terminar o processamento (status FINISHED). */
async function aguardarContainer(id: string, tentativas = 40): Promise<void> {
  const ver = config.instagram.graphVersion();
  for (let i = 0; i < tentativas; i++) {
    const url = `https://graph.facebook.com/${ver}/${id}?fields=status_code&access_token=${config.instagram.accessToken()}`;
    const res = await fetch(url);
    const data = (await res.json()) as { status_code?: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error(`Container ${id} falhou ao processar.`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timeout esperando o container ${id} ficar pronto.`);
}

const igUser = () => config.instagram.userId();

/** Publica um carrossel (ate 10 imagens) no feed. Retorna o media id. */
async function publicarCarrossel(urls: string[], caption: string): Promise<string> {
  if (urls.length > MAX_CARROSSEL) {
    throw new Error(`Carrossel tem ${urls.length} imagens; limite e ${MAX_CARROSSEL}.`);
  }
  console.log("  [carrossel] criando containers...");
  const children: string[] = [];
  for (const image_url of urls) {
    children.push(await igPost(`${igUser()}/media`, { image_url, is_carousel_item: "true" }));
  }
  const carouselId = await igPost(`${igUser()}/media`, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  await aguardarContainer(carouselId);
  console.log("  [carrossel] publicando...");
  return igPost(`${igUser()}/media_publish`, { creation_id: carouselId });
}

/** Publica um Reel no feed. Retorna o media id. */
async function publicarReel(videoUrl: string, caption: string): Promise<string> {
  console.log("  [reel] criando container...");
  const containerId = await igPost(`${igUser()}/media`, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
  });
  await aguardarContainer(containerId);
  console.log("  [reel] publicando...");
  return igPost(`${igUser()}/media_publish`, { creation_id: containerId });
}

/** Publica um Story de imagem. Retorna o media id. */
async function publicarStory(imageUrl: string): Promise<string> {
  console.log("  [story] publicando...");
  const containerId = await igPost(`${igUser()}/media`, {
    media_type: "STORIES",
    image_url: imageUrl,
  });
  await aguardarContainer(containerId);
  return igPost(`${igUser()}/media_publish`, { creation_id: containerId });
}

/** Pega (id, token) da primeira Pagina do Facebook do usuario, ou null. */
async function paginaFacebook(): Promise<{ id: string; token: string } | null> {
  const ver = config.instagram.graphVersion();
  const url = `https://graph.facebook.com/${ver}/me/accounts?fields=id,access_token&access_token=${config.instagram.accessToken()}`;
  const res = await fetch(url);
  const data = (await res.json()) as { data?: { id: string; access_token: string }[] };
  const pg = data.data?.[0];
  return pg ? { id: pg.id, token: pg.access_token } : null;
}

/** Cross-posta a imagem de capa + legenda na Pagina do Facebook. Retorna o id ou null. */
async function crossPostFacebook(coverUrl: string, caption: string): Promise<string | null> {
  const pg = await paginaFacebook();
  if (!pg) {
    console.log("  [facebook] nenhuma Pagina encontrada; pulando.");
    return null;
  }
  console.log("  [facebook] postando na Pagina...");
  const ver = config.instagram.graphVersion();
  const body = new URLSearchParams({ url: coverUrl, caption, access_token: pg.token });
  const res = await fetch(`https://graph.facebook.com/${ver}/${pg.id}/photos`, {
    method: "POST",
    body,
  });
  const data = (await res.json()) as { id?: string; post_id?: string; error?: unknown };
  if (data.error) {
    console.log(`  [facebook] falhou (ignorado): ${JSON.stringify(data.error)}`);
    return null;
  }
  return data.post_id ?? data.id ?? null;
}

export interface PublicarArgs {
  slidePaths: string[];
  reelPath?: string;
  caption: string;
  /** Identificador unico do post (data-slot), usado nas pastas de media. */
  stamp: string;
  story?: boolean;
  facebook?: boolean;
}

export interface PublicarResultado {
  carouselId: string;
  reelId?: string;
  storyId?: string;
  facebookId?: string;
}

/**
 * Hospeda a midia no GitHub Pages (uma vez) e publica:
 *   carrossel no feed; (opcional) Reel; (opcional) Story; (opcional) Facebook.
 * Reel e Story ampliam alcance; o Story usa a capa do carrossel.
 */
export async function publicarConteudo(args: PublicarArgs): Promise<PublicarResultado> {
  const { slidePaths, reelPath, caption, stamp } = args;

  const arquivos = reelPath ? [...slidePaths, reelPath] : [...slidePaths];
  const urls = await hospedar(arquivos, stamp);

  const slideUrls = slidePaths.map((p) => urls[basename(p)]);
  const carouselId = await publicarCarrossel(slideUrls, caption);

  let reelId: string | undefined;
  if (reelPath) reelId = await publicarReel(urls[basename(reelPath)], caption);

  let storyId: string | undefined;
  if (args.story) storyId = await publicarStory(slideUrls[0]);

  let facebookId: string | undefined;
  if (args.facebook) {
    facebookId = (await crossPostFacebook(slideUrls[0], caption)) ?? undefined;
  }

  return { carouselId, reelId, storyId, facebookId };
}
