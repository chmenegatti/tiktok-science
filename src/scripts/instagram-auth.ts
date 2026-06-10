import { config } from "../config.js";

/**
 * Ajuda a obter as credenciais do Instagram para a pipeline:
 *   IG_ACCESS_TOKEN (long-lived, ~60 dias) e IG_USER_ID (conta Business/Creator).
 *
 * Pre-requisitos (setup unico no Meta for Developers):
 *   1. Conta do Instagram em modo Business ou Creator.
 *   2. Uma Pagina do Facebook conectada a essa conta do Instagram.
 *   3. Um app no https://developers.facebook.com com o produto
 *      "Instagram Graph API" adicionado. Voce (admin do app) pode publicar na
 *      sua propria conta em modo de desenvolvimento, sem app review.
 *
 * Fluxo:
 *   npm run auth
 *     -> imprime instrucoes e as permissoes necessarias.
 *
 *   npm run auth -- --token SHORT_LIVED_USER_TOKEN
 *     -> troca o token de curta duracao por um long-lived (60 dias) e lista
 *        as Paginas + as contas do Instagram (IG_USER_ID) associadas.
 */

const ver = config.instagram.graphVersion();

const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

function instrucoes(): void {
  console.log(`
Setup de credenciais do Instagram
=================================

1. Em https://developers.facebook.com crie/abra seu app e adicione o produto
   "Instagram Graph API". Anote o App ID e App Secret e coloque no .env:
     META_APP_ID=...
     META_APP_SECRET=...

2. Abra o Graph API Explorer:
     https://developers.facebook.com/tools/explorer
   - Selecione seu app.
   - Em "Permissions" adicione:
       ${SCOPES.join("\n       ")}
   - Clique em "Generate Access Token" e autorize.
   - Copie o token gerado (curta duracao).

3. Troque o token por um long-lived e descubra seu IG_USER_ID:
     npm run auth -- --token SEU_TOKEN_CURTO

4. Coloque no .env os valores impressos:
     IG_ACCESS_TOKEN=<long-lived>
     IG_USER_ID=<id da sua conta Business>
`);
}

async function trocarToken(shortToken: string): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${ver}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", config.instagram.appId());
  url.searchParams.set("client_secret", config.instagram.appSecret());
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`Troca de token falhou: ${JSON.stringify(data.error ?? data)}`);
  }
  const dias = data.expires_in ? Math.round(data.expires_in / 86400) : 60;
  console.log(`\nIG_ACCESS_TOKEN (long-lived, ~${dias} dias):\n${data.access_token}\n`);
  return data.access_token;
}

async function listarContas(token: string): Promise<void> {
  const url = new URL(`https://graph.facebook.com/${ver}/me/accounts`);
  url.searchParams.set("fields", "name,instagram_business_account{id,username}");
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  const data = (await res.json()) as {
    data?: {
      name: string;
      instagram_business_account?: { id: string; username: string };
    }[];
    error?: { message: string };
  };
  if (!res.ok || !data.data) {
    throw new Error(`Listagem de Paginas falhou: ${JSON.stringify(data.error ?? data)}`);
  }

  console.log("Paginas e contas do Instagram associadas:");
  let achou = false;
  for (const pg of data.data) {
    const ig = pg.instagram_business_account;
    if (ig) {
      achou = true;
      console.log(`  Pagina "${pg.name}" -> IG @${ig.username}  IG_USER_ID=${ig.id}`);
    } else {
      console.log(`  Pagina "${pg.name}" -> (sem conta Instagram Business conectada)`);
    }
  }
  if (!achou) {
    console.log(
      "\nNenhuma conta Business encontrada. Confirme que a conta do Instagram\n" +
        "esta em modo Business/Creator e conectada a uma Pagina do Facebook.",
    );
  }
}

async function main(): Promise<void> {
  const i = process.argv.indexOf("--token");
  const shortToken = i >= 0 ? process.argv[i + 1] : undefined;

  if (!shortToken) {
    instrucoes();
    return;
  }

  const longToken = await trocarToken(shortToken);
  await listarContas(longToken);
}

main().catch((err) => {
  console.error("\nFalha:", err.message);
  process.exit(1);
});
