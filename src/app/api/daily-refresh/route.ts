import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const secret = process.env.NEWS_CRON_SECRET;
  if (!secret) return true;

  const url = new URL(req.url);
  const token = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const auth = req.headers.get("authorization") || "";
  return token === secret || auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 401 });
  }

  const base = new URL(req.url).origin;
  const secret = process.env.NEWS_CRON_SECRET || "";
  const results: any = {
    ok: true,
    ran_at: new Date().toISOString(),
    steps: {},
  };

  try {
    const newsRes = await fetch(`${base}/api/news-refresh${secret ? `?secret=${encodeURIComponent(secret)}` : ""}`, {
      method: "GET",
      cache: "no-store",
    });
    results.steps.news = await newsRes.json();
  } catch (err: any) {
    results.steps.news = { ok: false, error: err?.message || String(err) };
  }

  results.steps.calendar = {
    ok: true,
    message: "Il calendario venatorio si aggiorna quando pubblichi un PDF/link da Admin > Importa calendario. Le fonti calendario vengono comunque monitorate nelle news automatiche.",
  };

  results.steps.weather = {
    ok: true,
    message: "Il meteo non viene salvato: la pagina Meteo legge dati live gratuiti da Open-Meteo a ogni apertura.",
  };

  return NextResponse.json(results);
}

export async function POST(req: Request) {
  return GET(req);
}
