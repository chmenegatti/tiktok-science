import { config, MODEL } from "../config.js";
import type { Roteiro } from "../types.js";

const SYSTEM = `Voce e roteirista de videos curtos (15 segundos) sobre curiosidades cientificas para o TikTok, em portugues do Brasil.

Regras:
- O video tem ~15s. Use 3 cenas.
- REGRA CRITICA DE DURACAO: a soma de TODAS as narracoes deve ter no MAXIMO 35 palavras (cerca de 11 por cena). Frases curtas. Isso e obrigatorio para caber em 15s.
- Cena 1 e um GANCHO forte: uma pergunta ou fato surpreendente que prende em 2s.
- Narracao: linguagem simples, direta, ritmo de TikTok. Sem jargao desnecessario.
- legenda: versao MUITO curta do que aparece na tela (max ~6 palavras). Vai ser queimada no video.
- prompt_imagem: descricao visual em INGLES, vertical, cinematic, alta qualidade, coerente com a narracao da cena.
- caption: legenda do post, instigante, 1-2 frases.
- hashtags: 5 a 8 hashtags relevantes SEM o "#". Inclua sempre "ciencia" e "curiosidades".
- Conteudo cientificamente correto. Nada de pseudociencia.`;

// Schema no formato aceito pelo Gemini (subset do OpenAPI 3.0; tipos em MAIUSCULO,
// sem additionalProperties). Forca saida JSON estruturada.
const SCHEMA = {
  type: "OBJECT",
  properties: {
    tema: { type: "STRING" },
    titulo: { type: "STRING" },
    cenas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          narracao: { type: "STRING" },
          legenda: { type: "STRING" },
          prompt_imagem: { type: "STRING" },
        },
        required: ["narracao", "legenda", "prompt_imagem"],
        propertyOrdering: ["narracao", "legenda", "prompt_imagem"],
      },
    },
    caption: { type: "STRING" },
    hashtags: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["tema", "titulo", "cenas", "caption", "hashtags"],
  propertyOrdering: ["tema", "titulo", "cenas", "caption", "hashtags"],
} as const;

/** Gera o roteiro do dia para uma area cientifica usando o Gemini. */
export async function gerarRoteiro(tema: string): Promise<Roteiro> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${config.geminiKey()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Crie o roteiro de hoje. Area: ${tema}. Escolha UMA curiosidade especifica e impactante dentro dessa area.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini falhou (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini nao retornou roteiro: ${JSON.stringify(data)}`);
  }

  return JSON.parse(text) as Roteiro;
}
