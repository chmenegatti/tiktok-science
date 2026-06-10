import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { config } from "../config.js";

// PKCE: TikTok exige code_challenge. O verifier e gerado uma vez e reutilizado
// na troca pelo token. code_challenge = SHA256(verifier) em HEX (padrao TikTok).
const codeVerifier = randomBytes(32).toString("hex"); // 64 chars
const codeChallenge = createHash("sha256").update(codeVerifier).digest("hex");

/**
 * OAuth do TikTok (Content Posting API).
 *
 * Modo automatico (recomendado):
 *   npm run auth
 *   Abre um servidor local na porta do redirect_uri, imprime a URL de
 *   autorizacao, captura o `code` no callback, troca pelo access_token e
 *   grava TIKTOK_ACCESS_TOKEN no .env automaticamente.
 *
 * Modo manual (fallback):
 *   npm run auth -- --code SEU_CODE
 *
 * Pre-requisitos no .env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI.
 * O redirect_uri precisa estar cadastrado igual no TikTok Developer Portal,
 * e o app precisa do scope `video.upload`.
 */
const SCOPE = "video.upload";

function authorizeUrl(): string {
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", config.tiktok.clientKey());
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.tiktok.redirectUri());
  url.searchParams.set("state", "tiktok-ciencia");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  error?: string;
  error_description?: string;
}

async function trocarCodePorToken(code: string): Promise<TokenResponse> {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.tiktok.clientKey(),
      client_secret: config.tiktok.clientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: config.tiktok.redirectUri(),
      code_verifier: codeVerifier,
    }),
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || data.error) {
    throw new Error(`Falha ao trocar code: ${data.error_description || res.status}`);
  }
  return data;
}

/** Atualiza (ou adiciona) TIKTOK_ACCESS_TOKEN no .env. */
async function gravarToken(token: string): Promise<void> {
  let env = "";
  try {
    env = await readFile(".env", "utf8");
  } catch {
    /* .env pode nao existir ainda */
  }
  const line = `TIKTOK_ACCESS_TOKEN=${token}`;
  if (/^TIKTOK_ACCESS_TOKEN=.*$/m.test(env)) {
    env = env.replace(/^TIKTOK_ACCESS_TOKEN=.*$/m, line);
  } else {
    env += (env.endsWith("\n") || env === "" ? "" : "\n") + line + "\n";
  }
  await writeFile(".env", env);
}

function reportar(data: TokenResponse): void {
  console.log("\nSucesso. TIKTOK_ACCESS_TOKEN gravado no .env.");
  console.log(`(expira em ${data.expires_in}s; refresh_token=${data.refresh_token})`);
  console.log("\nAgora rode:  npm run publish");
}

async function main(): Promise<void> {
  const codeArgIdx = process.argv.indexOf("--code");

  // Modo manual: code informado por argumento.
  if (codeArgIdx !== -1) {
    const code = process.argv[codeArgIdx + 1];
    if (!code) throw new Error("Informe o code: npm run auth -- --code SEU_CODE");
    const data = await trocarCodePorToken(code);
    await gravarToken(data.access_token!);
    reportar(data);
    return;
  }

  // Modo automatico: sobe servidor local no redirect_uri e espera o callback.
  const redirect = new URL(config.tiktok.redirectUri());
  const port = Number(redirect.port) || 80;

  console.log("Abra esta URL no navegador e autorize:\n");
  console.log(authorizeUrl());
  console.log(`\nAguardando o callback em ${redirect.origin}${redirect.pathname} ...`);

  await new Promise<void>((resolve) => {
    const server = createServer(async (req, res) => {
      const reqUrl = new URL(req.url ?? "/", redirect.origin);
      if (reqUrl.pathname !== redirect.pathname) {
        res.writeHead(404).end();
        return;
      }

      const code = reqUrl.searchParams.get("code");
      const err = reqUrl.searchParams.get("error");

      if (err) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Erro na autorizacao: ${err}`);
        console.error(`\nAutorizacao negada: ${err}`);
        server.close(() => resolve());
        return;
      }
      if (!code) {
        res.writeHead(400).end("Sem code.");
        return;
      }

      try {
        const data = await trocarCodePorToken(code);
        await gravarToken(data.access_token!);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h2>Pronto! Pode fechar esta aba e voltar ao terminal.</h2>");
        reportar(data);
      } catch (e) {
        const msg = (e as Error).message;
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Falha: ${msg}`);
        console.error("\nFalha ao trocar code:", msg);
      } finally {
        server.close(() => resolve());
      }
    });
    server.listen(port);
  });
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
