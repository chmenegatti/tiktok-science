import { config, MODEL } from "../config.js";
import type { Roteiro } from "../types.js";

const SYSTEM = `Voce e um criador de carrosseis educativos sobre curiosidades cientificas para o Instagram, em portugues do Brasil.

Regras:
- Gere um carrossel com EXATAMENTE 10 slides sobre UMA curiosidade especifica e impactante da area pedida (limite do Instagram).
- ESTRUTURA OBRIGATORIA:
  - Slide 1 = CAPA: titulo forte/gancho (uma pergunta ou fato surpreendente). corpo curto provocando curiosidade.
  - Slides do meio = CONTEUDO: cada um explica UM ponto, em ordem logica e progressiva.
  - Slide final = CHAMADA PARA ACAO: convide a seguir o perfil para mais ciencia (ex: "Siga para mais curiosidades").
- titulo (por slide): MUITO curto, max ~6 palavras. Aparece no topo do slide.
- corpo (por slide): 1 a 3 frases curtas e didaticas. Max ~45 palavras. Linguagem simples, direta, sem jargao desnecessario.
- prompt_imagem: descricao visual em INGLES de uma imagem de fundo quadrada (1:1), cinematic, alta qualidade, SEM texto, coerente com o slide. Deve ter areas escuras/limpas onde texto branco fique legivel.
- caption: legenda do post, instigante, 1-2 frases, convidando a deslizar os slides.
- hashtags: 6 a 10 hashtags relevantes SEM o "#". Inclua sempre "ciencia" e "curiosidades".
- Conteudo cientificamente correto. Nada de pseudociencia.`;

// Schema no formato aceito pelo Gemini (subset do OpenAPI 3.0; tipos em MAIUSCULO,
// sem additionalProperties). Forca saida JSON estruturada.
const SCHEMA = {
  type: "OBJECT",
  properties: {
    tema: { type: "STRING" },
    titulo: { type: "STRING" },
    slides: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titulo: { type: "STRING" },
          corpo: { type: "STRING" },
          prompt_imagem: { type: "STRING" },
        },
        required: ["titulo", "corpo", "prompt_imagem"],
        propertyOrdering: ["titulo", "corpo", "prompt_imagem"],
      },
    },
    caption: { type: "STRING" },
    hashtags: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["tema", "titulo", "slides", "caption", "hashtags"],
  propertyOrdering: ["tema", "titulo", "slides", "caption", "hashtags"],
} as const;

/** Gera o roteiro do carrossel do dia para uma area cientifica usando o Gemini. */
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
              text: `Crie o carrossel de hoje. Area: ${tema}. Escolha UMA curiosidade especifica e impactante dentro dessa area.`,
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
