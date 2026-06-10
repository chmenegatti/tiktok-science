/** Uma cena do video: ~3-4s de narracao com imagem e legenda. */
export interface Cena {
  /** Texto narrado pela voz (PT-BR). Curto. */
  narracao: string;
  /** Texto exibido na tela (PT-BR). Bem curto, vai ser queimado no video. */
  legenda: string;
  /** Prompt para gerar a imagem da cena. Em ingles (melhor p/ modelos de imagem). */
  prompt_imagem: string;
}

/** Roteiro completo de um video de ~15s. */
export interface Roteiro {
  /** Area cientifica do dia (ex: "Astrofisica"). */
  tema: string;
  /** Titulo curto e chamativo. */
  titulo: string;
  /** Cenas em ordem. Soma das narracoes deve dar ~15s. */
  cenas: Cena[];
  /** Legenda do post no TikTok. */
  caption: string;
  /** Hashtags sem o "#". */
  hashtags: string[];
}

/** Resultado de uma execucao da pipeline. */
export interface ResultadoPipeline {
  dir: string;
  roteiro: Roteiro;
  videoPath: string;
  captionPath: string;
  publishId?: string;
}
