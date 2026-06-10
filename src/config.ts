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
  ttsVoice: () => optional("TTS_VOICE", "pt-BR-AntonioNeural"),
  ttsRate: () => optional("TTS_RATE", "+12%"),
  fontFile: () =>
    optional("FONT_FILE", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
  tiktok: {
    clientKey: () => required("TIKTOK_CLIENT_KEY"),
    clientSecret: () => required("TIKTOK_CLIENT_SECRET"),
    redirectUri: () =>
      optional("TIKTOK_REDIRECT_URI", "http://localhost:3000/callback"),
    accessToken: () => required("TIKTOK_ACCESS_TOKEN"),
  },
};

/** Modelo Gemini usado para gerar o roteiro. */
export const MODEL = "gemini-2.5-flash";

/** Dimensoes do video (vertical TikTok). */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;
