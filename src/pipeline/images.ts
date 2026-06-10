import { writeFile } from "node:fs/promises";
import { config, VIDEO } from "../config.js";

/**
 * Gera uma imagem para a cena e grava em `outPath`.
 *
 * Providers:
 *  - "gemini" (default): usa a MESMA chave GEMINI_API_KEY do roteiro. Free tier.
 *  - "pollinations": gratis sem chave, mas hoje fortemente limitado/instavel
 *    (HTTP 402); use POLLINATIONS_TOKEN para um tier melhor.
 *
 * O estagio de video faz scale+crop para 1080x1920, entao a imagem nao precisa
 * sair perfeitamente vertical.
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
              text: `Generate a vertical 9:16 cinematic image, high detail, no text overlay. Subject: ${prompt}`,
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
  const full = `${prompt}. Vertical 9:16 composition, cinematic, high detail, no text`;
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(full)}`);
  url.searchParams.set("width", String(VIDEO.width));
  url.searchParams.set("height", String(VIDEO.height));
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
