import { config, MODEL } from "../config.js";
import type { Roteiro } from "../types.js";

const SYSTEM = (handle: string) => `Voce e o roteirista de uma SERIE DIARIA de carrosseis virais sobre curiosidades cientificas no Instagram, em portugues do Brasil. Cada post e um EPISODIO numerado da serie (ex: #001, #002...). Seu objetivo e MAXIMIZAR ALCANCE ORGANICO: curtidas, comentarios, compartilhamentos, saves e retencao ate o ultimo slide.

Regras de conteudo:
- Gere um carrossel com EXATAMENTE 10 slides sobre UMA curiosidade especifica, surpreendente e VERDADEIRA da area pedida (limite do Instagram).
- ESTRUTURA OBRIGATORIA:
  - Slide 1 = CAPA / SCROLL-STOPPER: titulo = gancho irresistivel com curiosity gap (numero chocante, quebra de expectativa, "ninguem te contou isso", pergunta ousada) que faz PARAR de rolar. corpo = uma frase que aumenta a curiosidade SEM entregar a resposta, terminando com "Arrasta para o lado ->".
  - Slides 2 a 8 = CONTEUDO: cada um entrega UM ponto, em ordem logica e progressiva, com algo "salvavel" (dado, numero ou analogia memoravel do cotidiano). Termine 2 ou 3 desses slides com um micro-gancho para o proximo ("E fica melhor...", "Mas tem um detalhe...", "O mais bizarro vem agora:") para segurar a retencao.
  - Slide 9 = PERGUNTA: feche o conteudo e termine com uma pergunta direta e facil de opinar, pedindo resposta NOS COMENTARIOS.
  - Slide 10 = CTA: peca EXPLICITAMENTE para CURTIR, COMENTAR, COMPARTILHAR com alguem que precisa ver isso, SALVAR para reler e SEGUIR o perfil para nao perder o proximo episodio da serie (cite o numero do proximo episodio).
- titulo (por slide): MUITO curto, max ~6 palavras. Aparece no topo do slide.
- corpo (por slide): 1 a 3 frases curtas e didaticas. Max ~45 palavras. Linguagem simples, direta, sem jargao desnecessario.
- prompt_imagem: descricao visual em INGLES da imagem de fundo quadrada (1:1) do slide.
  - IDENTIDADE VISUAL FIXA da serie: comece TODO prompt com "cinematic editorial photography, dramatic volumetric lighting, deep dark moody background, high contrast, teal and amber accents, hyper detailed".
  - Depois descreva UM sujeito visual claro, concreto e impressionante, coerente com o conteudo do slide. Compozicao com grandes areas escuras/limpas onde texto branco fique legivel.
  - A capa deve ter a imagem mais epica/impactante das 10.
  - SEM texto, SEM logo, SEM marca d'agua.
- caption: otimizada para alcance e SEO do Instagram, no formato:
  (1) PRIMEIRA LINHA = gancho forte (so ela aparece no feed);
  (2) 2 a 4 frases de valor usando PALAVRAS-CHAVE da area (o Instagram indexa a legenda na busca);
  (3) diga que este e o episodio N da serie e que sai episodio novo TODO DIA;
  (4) uma pergunta convidando a responder nos comentarios;
  (5) CTA explicito: Curtir, Comentar, Compartilhar, Salvar e Seguir.
- hashtags: EXATAMENTE 5, todas SEM o "#", altamente relevantes (especificas + de nicho, evite genericas demais). Inclua sempre "ciencia".
- Conteudo cientificamente correto. Nada de pseudociencia. O gancho deve prometer exatamente o que o conteudo entrega (sem clickbait falso).
- O perfil oficial e @${handle}. Sempre que citar o perfil (CTA, caption), use EXATAMENTE esse handle. NUNCA invente nome de perfil, serie, canal ou marca.`;

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

/**
 * Gera o roteiro do episodio do dia para uma area cientifica usando o Gemini.
 * `episodio` e o rotulo da serie (ex: "#001"), usado na caption e no CTA.
 */
export async function gerarRoteiro(tema: string, episodio: string): Promise<Roteiro> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${config.geminiKey()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM(config.igHandle()) }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Crie o episodio ${episodio} da serie. Area: ${tema}. Escolha UMA curiosidade especifica e impactante dentro dessa area.`,
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
