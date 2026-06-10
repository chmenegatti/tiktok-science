import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Registro de um assunto ja publicado (a serie nunca repete assunto). */
export interface AssuntoPublicado {
  /** YYYY-MM-DD da publicacao. */
  data: string;
  slot: number;
  /** Area cientifica (ex: "Astrofisica"). */
  tema: string;
  /** Frase curta que identifica a curiosidade (vem do campo `assunto` do roteiro). */
  assunto: string;
}

/** Arquivo versionado com o historico (committed no publish). */
const ARQUIVO = "data/assuntos.json";

/** Le o historico de assuntos ja publicados ([] se ainda nao existe). */
export async function lerAssuntos(): Promise<AssuntoPublicado[]> {
  try {
    return JSON.parse(await readFile(ARQUIVO, "utf8")) as AssuntoPublicado[];
  } catch {
    return [];
  }
}

/** Acrescenta um assunto ao historico, criando o arquivo se preciso. */
export async function registrarAssunto(novo: AssuntoPublicado): Promise<void> {
  const todos = await lerAssuntos();
  todos.push(novo);
  await mkdir(dirname(ARQUIVO), { recursive: true });
  await writeFile(ARQUIVO, JSON.stringify(todos, null, 2) + "\n");
}
