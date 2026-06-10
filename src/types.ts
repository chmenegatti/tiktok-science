/** Um slide do carrossel: um pedaco de conhecimento com imagem de fundo. */
export interface Slide {
  /** Titulo curto exibido no topo do slide (PT-BR). Ex: "Por que o ceu e azul?" */
  titulo: string;
  /** Corpo do slide (PT-BR). 1-3 frases curtas, didaticas. */
  corpo: string;
  /** Prompt para gerar a imagem de fundo. Em ingles (melhor p/ modelos de imagem). */
  prompt_imagem: string;
}

/** Roteiro completo de um carrossel educativo (10-15 slides). */
export interface Roteiro {
  /** Area cientifica do dia (ex: "Astrofisica"). */
  tema: string;
  /**
   * Frase curta identificando a curiosidade especifica escolhida (ex: "O Sol
   * nunca vai virar um buraco negro"). Registrada em data/assuntos.json para
   * a serie nunca repetir assunto, mesmo quando a area se repete.
   */
  assunto: string;
  /** Titulo curto e chamativo do post. */
  titulo: string;
  /** Slides em ordem. Primeiro = capa/gancho, ultimo = chamada para seguir. */
  slides: Slide[];
  /** Legenda do post no Instagram. */
  caption: string;
  /** Hashtags sem o "#". */
  hashtags: string[];
}

/** IDs das publicacoes feitas (quando --publish). */
export interface Publicacao {
  carouselId: string;
  reelId?: string;
  storyId?: string;
  facebookId?: string;
}

/** Resultado de uma execucao da pipeline. */
export interface ResultadoPipeline {
  dir: string;
  roteiro: Roteiro;
  /** Caminhos dos PNGs dos slides, em ordem. */
  slidePaths: string[];
  /** Caminho do mp4 do Reel. */
  reelPath: string;
  captionPath: string;
  /** IDs das publicacoes (quando --publish). */
  publicacao?: Publicacao;
}
