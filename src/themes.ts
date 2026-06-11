/**
 * Areas cientificas que rotacionam por dia. Cada dia um tema diferente,
 * de biologia a astrofisica. A rotacao usa o dia do ano para ser
 * deterministica (rodar 2x no mesmo dia da o mesmo tema).
 */
export const AREAS = [
  "Astrofisica",
  "Biologia",
  "Quimica",
  "Fisica",
  "Neurociencia",
  "Geologia",
  "Paleontologia",
  "Oceanografia",
  "Genetica",
  "Ecologia",
  "Astronomia",
  "Microbiologia",
  "Botanica",
  "Cosmologia",
  "Zoologia",
  "Matematica",
  "Estatistica",
  "Ciencia da Computacao",
  "Inteligencia Artificial",
  "Ciencia de Dados",
  "Engenharia",
  "Engenharia Aeroespacial",
  "Engenharia Eletrica",
  "Engenharia Mecanica",
  "Engenharia Civil",
  "Engenharia Quimica",
  "Engenharia Biomedica",
  "Robotica",
  "Nanotecnologia",
  "Ciencia dos Materiais",
  "Bioquimica",
  "Biofisica",
  "Biotecnologia",
  "Imunologia",
  "Virologia",
  "Parasitologia",
  "Entomologia",
  "Ornitologia",
  "Ictiologia",
  "Herpetologia",
  "Primatologia",
  "Etologia",
  "Fisiologia",
  "Anatomia",
  "Embriologia",
  "Citologia",
  "Histologia",
  "Epidemiologia",
  "Farmacologia",
  "Toxicologia",
  "Patologia",
  "Medicina",
  "Veterinaria",
  "Odontologia",
  "Nutricao",
  "Psicologia",
  "Neuropsicologia",
  "Psiquiatria",
  "Psicanalise",
  "Ciencias Cognitivas",
  "Linguistica",
  "Filologia",
  "Antropologia",
  "Arqueologia",
  "Historia",
  "Geografia",
  "Cartografia",
  "Demografia",
  "Sociologia",
  "Ciencia Politica",
  "Relacoes Internacionais",
  "Economia",
  "Administracao",
  "Contabilidade",
  "Marketing",
  "Direito",
  "Criminologia",
  "Filosofia",
  "Etica",
  "Logica",
  "Teologia",
  "Historia da Arte",
  "Artes Visuais",
  "Musica",
  "Cinema",
  "Literatura",
  "Arquitetura",
  "Urbanismo",
  "Educacao",
  "Pedagogia",
  "Comunicacao",
  "Jornalismo",
  "Biblioteconomia",
  "Arquivologia",
  "Ciencia da Informacao",
  "Meteorologia",
  "Climatologia",
  "Hidrologia",
  "Espeleologia",
  "Sismologia",
  "Vulcanologia",
  "Glaciologia",
  "Limnologia",
  "Agronomia",
  "Silvicultura",
  "Ciencias Ambientais",
  "Desenvolvimento Sustentavel",
  "Seguranca Cibernetica",
  "Computacao Quantica",
  "Blockchain",
  "Realidade Virtual",
  "Realidade Aumentada",
] as const;

/** Quantidade de posts por dia (cada um com um tema diferente). */
export const POSTS_POR_DIA = 2;

export type Area = (typeof AREAS)[number];

/** Dia do ano (1-366) para a data informada. */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

/**
 * Tema de um post do dia, rotacionando pela lista de areas. Cada dia tem
 * `POSTS_POR_DIA` slots (0, 1, ...) e cada slot cai numa area diferente.
 * Deterministico: mesma data + slot -> mesma area.
 */
export function temaDoDia(date = new Date(), slot = 0): Area {
  return AREAS[(dayOfYear(date) * POSTS_POR_DIA + slot) % AREAS.length];
}

/**
 * Data (UTC) de referencia da serie: o #001 saiu em 2026-06-10 (post avulso
 * de Buracos Negros). Por isso o dia seguinte comeca em #002 (sem o "+1" na
 * formula). Datas anteriores clampam em 1.
 */
export const SERIE_INICIO = Date.UTC(2026, 5, 10); // 2026-06-10

/**
 * Numero do episodio da serie para uma data+slot. Deterministico e sem
 * estado: derivado da data, mesmo dia+slot -> mesmo numero. Dois episodios
 * por dia (slots 0 e 1). Se a pipeline falhar num dia, o numero "pula" —
 * aceitavel em troca de nao precisar de contador persistido.
 */
export function numeroEpisodio(date = new Date(), slot = 0): number {
  const dia = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dias = Math.round((dia - SERIE_INICIO) / 86_400_000);
  return Math.max(1, dias * POSTS_POR_DIA + slot);
}

/** Rotulo do episodio para exibicao: 1 -> "#001". */
export function rotuloEpisodio(n: number): string {
  return `#${String(n).padStart(3, "0")}`;
}

/** Carimbo de data YYYY-MM-DD (UTC) usado para nomear a pasta de saida. */
export function dateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
