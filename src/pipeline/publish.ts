import { readFile } from "node:fs/promises";
import { config } from "../config.js";

/**
 * Envia o video para a CAIXA DE ENTRADA do TikTok via Content Posting API
 * (endpoint /inbox/). O video NAO e publicado automaticamente: ele chega
 * como rascunho no app, onde voce revisa e finaliza a postagem manualmente.
 *
 * Requer TIKTOK_ACCESS_TOKEN valido (scope video.upload). Rode `npm run auth`.
 * Retorna o publish_id.
 */
export async function enviarParaInbox(videoPath: string): Promise<string> {
  const token = config.tiktok.accessToken();
  const bytes = await readFile(videoPath);
  const size = bytes.byteLength;

  // 1. Inicializa o upload.
  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: size,
          chunk_size: size,
          total_chunk_count: 1,
        },
      }),
    },
  );

  if (!initRes.ok) {
    throw new Error(`init falhou (${initRes.status}): ${await initRes.text()}`);
  }

  const init = (await initRes.json()) as {
    data: { publish_id: string; upload_url: string };
    error?: { code: string; message: string };
  };
  if (init.error && init.error.code !== "ok") {
    throw new Error(`init erro: ${init.error.message}`);
  }

  const { publish_id, upload_url } = init.data;

  // 2. Faz upload do arquivo (chunk unico).
  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${size - 1}/${size}`,
      "Content-Length": String(size),
    },
    body: bytes,
  });

  if (!putRes.ok) {
    throw new Error(`upload falhou (${putRes.status}): ${await putRes.text()}`);
  }

  return publish_id;
}
