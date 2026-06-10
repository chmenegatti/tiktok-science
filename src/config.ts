import "dotenv/config";

/** Le uma env var obrigatoria, lancando erro claro se ausente. */
export function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variavel de ambiente ${name} ausente. Copie .env.example para .env e preencha.`,
    );
  }
  return v;
}

/** Le uma env var opcional com default. */
export function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  geminiKey: () => required("GEMINI_API_KEY"),
  imageProvider: () => optional("IMAGE_PROVIDER", "gemini"),
  geminiImageModel: () =>
    optional("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"),
  pollinationsToken: () => optional("POLLINATIONS_TOKEN", ""),
  fontFile: () =>
    optional("FONT_FILE", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),

  /** Voz e ritmo do Edge TTS usados na narracao do Reel. */
  ttsVoice: () => optional("TTS_VOICE", "pt-BR-AntonioNeural"),
  ttsRate: () => optional("TTS_RATE", "+8%"),

  /** Handle exibido no slide final (CTA) e usado na caption. */
  igHandle: () => optional("IG_HANDLE", "cmenegatti"),

  instagram: {
    /** IG Business/Creator user id (numerico). Use `npm run auth` para descobrir. */
    userId: () => required("IG_USER_ID"),
    /** Long-lived access token (60 dias). Obtido via `npm run auth`. */
    accessToken: () => required("IG_ACCESS_TOKEN"),
    /** App id/secret do Meta (so necessarios para trocar/renovar token). */
    appId: () => required("META_APP_ID"),
    appSecret: () => required("META_APP_SECRET"),
    graphVersion: () => optional("META_GRAPH_VERSION", "v21.0"),
  },

  /**
   * Base publica onde os slides ficam acessiveis para a Graph API buscar.
   * Aponta para o GitHub Pages deste repo (pasta docs/).
   */
  publicBaseUrl: () =>
    optional("PUBLIC_BASE_URL", "https://www.cesarmenegatti.com/tiktok-science"),
};

/** Modelo Gemini usado para gerar o roteiro. */
export const MODEL = "gemini-2.5-flash";

/** Dimensoes do slide (quadrado, padrao carrossel Instagram). */
export const SLIDE = {
  width: 1080,
  height: 1080,
} as const;

/** Dimensoes do Reel (vertical 9:16). */
export const REEL = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;
