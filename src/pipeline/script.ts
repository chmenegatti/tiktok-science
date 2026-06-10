import { config, MODEL } from "../config.js";
import type { Roteiro } from "../types.js";

const SYSTEM = `Voce e um criador de carrosseis educativos sobre curiosidades cientificas para o Instagram, em portugues do Brasil. Seu objetivo e MAXIMIZAR ALCANCE (saves, compartilhamentos, comentarios e tempo de visualizacao).

Regras:
- Gere um carrossel com EXATAMENTE 10 slides sobre UMA curiosidade especifica e impactante da area pedida (limite do Instagram).
- ESTRUTURA OBRIGATORIA:
  - Slide 1 = CAPA / SCROLL-STOPPER: titulo = gancho irresistivel (pergunta ousada ou fato chocante) que faz PARAR de rolar. corpo = uma frase de curiosidade que termina com a deixa "Arrasta para o lado ->".
  - Slides do meio = CONTEUDO: cada um entrega UM ponto, em ordem logica e progressiva, com algo "salvavel" (dado, numero ou analogia memoravel).
  - Slide final = CHAMADA PARA ACAO: peca EXPLICITAMENTE para SALVAR, COMPARTILHAR com alguem e SEGUIR o perfil.
- titulo (por slide): MUITO curto, max ~6 palavras. Aparece no topo do slide.
- corpo (por slide): 1 a 3 frases curtas e didaticas. Max ~45 palavras. Linguagem simples, direta, sem jargao desnecessario.
- narracao (por slide): versao FALADA e bem curta do slide (8 a 12 palavras), natural para narrar em voz alta num Reel. Sem emojis.
- prompt_imagem: descricao visual em INGLES de uma imagem de fundo quadrada (1:1), cinematic, alta qualidade, SEM texto, coerente com o slide. Deve ter areas escuras/limpas onde texto branco fique legivel.
- caption: otimizada para alcance e SEO do Instagram, no formato:
  (1) PRIMEIRA LINHA = gancho forte (so ela aparece no feed);
  (2) 1 a 3 frases de valor usando PALAVRAS-CHAVE da area (o Instagram indexa a legenda na busca);
  (3) CTA explicito pedindo para Salvar, Compartilhar e Comentar.
- hashtags: EXATAMENTE 5, todas SEM o "#", altamente relevantes (especificas + de nicho, evite genericas demais). Inclua sempre "ciencia".
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
          narracao: { type: "STRING" },
          prompt_imagem: { type: "STRING" },
        },
        required: ["titulo", "corpo", "narracao", "prompt_imagem"],
        propertyOrdering: ["titulo", "corpo", "narracao", "prompt_imagem"],
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
