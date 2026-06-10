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
] as const;

export type Area = (typeof AREAS)[number];

/** Dia do ano (1-366) para a data informada. */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

/** Tema do dia, rotacionando pela lista de areas. */
export function temaDoDia(date = new Date()): Area {
  return AREAS[dayOfYear(date) % AREAS.length];
}

/** Carimbo de data YYYY-MM-DD (UTC) usado para nomear a pasta de saida. */
export function dateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
