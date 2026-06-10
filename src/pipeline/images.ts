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
export async function gerarImagem(prompt: string, outPath: string): Promise<void> {
  const provider = config.imageProvider();
  if (provider === "gemini") return gerarImagemGemini(prompt, outPath);
  if (provider === "pollinations") return gerarImagemPollinations(prompt, outPath);
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
  });

  if (!res.ok) {
    throw new Error(`Gemini image falhou (${res.status}): ${await res.text()}`);
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
  });
  if (!res.ok) {
    throw new Error(`Pollinations falhou (${res.status}): ${await res.text()}`);
  }
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
}
