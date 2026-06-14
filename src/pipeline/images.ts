import { writeFile } from "node:fs/promises";
import { config, SLIDE } from "../config.js";

/**
 * Gera a imagem de fundo de um slide e grava em `outPath`.
 *
 * Providers:
 *  - "gemini" (default): usa a MESMA chave GEMINI_API_KEY do roteiro. Free tier.
 *  - "pollinations": gratis sem chave, mas hoje fortemente limitado/instavel
 *    (HTTP 402); use POLLINATIONS_TOKEN para um tier melhor.
 *
 * O estagio de slides faz scale+crop para 1080x1080 e sobrepoe o texto, entao a
 * imagem nao precisa sair perfeitamente quadrada nem conter texto.
 */
/** Erro de provider que pode ser tentado de novo (5xx, 429, rede). */
class ErroTransiente extends Error {}

const RETRY_MAX = 4;
const RETRY_BASE_MS = 2_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executa `fn`, tentando de novo em erros transientes (5xx/429/rede) com backoff
 * exponencial. Erros nao-transientes (ex.: 400 prompt invalido) sobem na hora.
 */
async function comRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await fn();
    } catch (err) {
      const transiente = err instanceof ErroTransiente;
      if (!transiente || tentativa >= RETRY_MAX) throw err;
      const espera = RETRY_BASE_MS * 2 ** (tentativa - 1);
      console.warn(
        `${label}: tentativa ${tentativa}/${RETRY_MAX} falhou (${(err as Error).message.slice(0, 120)}); nova tentativa em ${espera}ms`,
      );
      await sleep(espera);
    }
  }
}

export async function gerarImagem(prompt: string, outPath: string): Promise<void> {
  const provider = config.imageProvider();
  if (provider === "gemini") return comRetry(() => gerarImagemGemini(prompt, outPath), "Gemini image");
  if (provider === "pollinations")
    return comRetry(() => gerarImagemPollinations(prompt, outPath), "Pollinations");
  throw new Error(`IMAGE_PROVIDER "${provider}" nao suportado (use "gemini" ou "pollinations").`);
}

async function gerarImagemGemini(prompt: string, outPath: string): Promise<void> {
  const model = config.geminiImageModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a square 1:1 image. Style: cinematic editorial photography, dramatic volumetric lighting, deep dark moody background, high contrast, hyper detailed, 8k. Leave large dark clean areas for white text overlay. Absolutely no text, no watermark, no logo. Subject: ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  }).catch((e) => {
    throw new ErroTransiente(`Gemini image rede: ${e.message}`);
  });

  if (!res.ok) {
    const msg = `Gemini image falhou (${res.status}): ${await res.text()}`;
    throw res.status >= 500 || res.status === 429 ? new ErroTransiente(msg) : new Error(msg);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data: string } }[] } }[];
  };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  const b64 = part?.inlineData?.data;
  if (!b64) {
    throw new Error(`Gemini nao retornou imagem: ${JSON.stringify(data).slice(0, 400)}`);
  }
  await writeFile(outPath, Buffer.from(b64, "base64"));
}

async function gerarImagemPollinations(prompt: string, outPath: string): Promise<void> {
  const full = `${prompt}. Square 1:1 composition, cinematic editorial photography, dramatic volumetric lighting, deep dark moody background, high contrast, hyper detailed, no text, no watermark, no logo`;
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(full)}`);
  url.searchParams.set("width", String(SLIDE.width));
  url.searchParams.set("height", String(SLIDE.height));
  url.searchParams.set("model", "flux");
  url.searchParams.set("nologo", "true");
  url.searchParams.set("seed", String(Math.floor(Math.random() * 1e9)));

  const token = config.pollinationsToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(120_000),
  }).catch((e) => {
    throw new ErroTransiente(`Pollinations rede: ${e.message}`);
  });
  if (!res.ok) {
    const msg = `Pollinations falhou (${res.status}): ${await res.text()}`;
    throw res.status >= 500 || res.status === 429 ? new ErroTransiente(msg) : new Error(msg);
  }
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
}
