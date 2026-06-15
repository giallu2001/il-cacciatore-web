import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

function stripHtml(input: string) {
  return String(input || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const r = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = block.match(r);
  return m ? stripHtml(m[1]) : "";
}

function attrTag(block: string, tagName: string, attrName: string) {
  const r = new RegExp(`<${tagName}[^>]+${attrName}=["']([^"']+)["'][^>]*>`, "i");
  const m = block.match(r);
  return m ? m[1] : "";
}

function absoluteUrl(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function parseDate(input: string) {
  if (!input) return new Date().toISOString();
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalize(text: unknown) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const huntingTerms = [
  "caccia", "cacciatore", "venatorio", "calendario venatorio", "atc", "fauna",
  "cinghiale", "capriolo", "daino", "cervo", "colombaccio", "beccaccia",
  "tordo", "fagiano", "lepre", "toscana", "pisa", "peste suina", "prelievo",
  "ordinanza", "regolamento", "carniere", "tesserino", "licenza", "porto d'armi"
];

function isRelevant(title: string, url: string, source: any) {
  const text = normalize([title, url, source.category, source.section, source.region, source.atc_code].join(" "));
  return huntingTerms.some((term) => text.includes(normalize(term)));
}

function inferCategory(title: string, fallback: string) {
  const t = normalize(title);
  if (t.includes("atc")) return "ATC";
  if (t.includes("calendario") || t.includes("venatorio")) return "Calendario venatorio";
  if (t.includes("peste suina") || t.includes("cinghiale")) return "Cinghiale / PSA";
  if (t.includes("ordinanza") || t.includes("legge") || t.includes("regolamento")) return "Normativa";
  if (t.includes("fauna") || t.includes("ispra")) return "Fauna e ambiente";
  return fallback || "News";
}

function parseFeed(xml: string) {
  const items = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map((m) => m[0]);
  if (items.length) {
    return items.map((item) => ({
      title: tag(item, "title"),
      link: tag(item, "link") || tag(item, "guid"),
      summary: tag(item, "description") || tag(item, "content:encoded"),
      published_at: parseDate(tag(item, "pubDate") || tag(item, "dc:date")),
    })).filter((x) => x.title && x.link);
  }

  const entries = Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map((m) => m[0]);
  return entries.map((entry) => ({
    title: tag(entry, "title"),
    link: attrTag(entry, "link", "href") || tag(entry, "id"),
    summary: tag(entry, "summary") || tag(entry, "content"),
    published_at: parseDate(tag(entry, "updated") || tag(entry, "published")),
  })).filter((x) => x.title && x.link);
}

function parseHtmlLinks(html: string, baseUrl: string, source: any) {
  const out: Array<{ title: string; link: string; summary: string; published_at: string }> = [];
  const seen = new Set<string>();

  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(anchorRegex)) {
    const href = m[1];
    const title = stripHtml(m[2]);
    if (!href || !title || title.length < 8) continue;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    const link = absoluteUrl(baseUrl, href);
    if (seen.has(link)) continue;
    seen.add(link);

    if (!isRelevant(title, link, source)) continue;

    out.push({
      title: title.slice(0, 240),
      link,
      summary: `Notizia rilevata automaticamente da ${source.name}. Verificare la fonte ufficiale prima di prendere decisioni operative.`,
      published_at: new Date().toISOString(),
    });

    if (out.length >= 25) break;
  }

  return out;
}

async function fetchSourceItems(source: any) {
  const url = source.rss_url || source.site_url || source.url;
  if (!url) return [];

  const res = await fetch(url, {
    headers: {
      "User-Agent": "IlCacciatoreBot/1.0 (+https://ilcacciatore.it)",
      "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const isXml = contentType.includes("xml") || /<rss|<feed|<channel/i.test(body.slice(0, 1000));

  if (isXml || source.source_type === "rss" || source.rss_url) {
    const parsed = parseFeed(body);
    if (parsed.length) return parsed;
  }

  return parseHtmlLinks(body, url, source);
}

async function refreshNews() {
  const db = supabaseAdmin();

  const { data: sources, error: sourceError } = await db
    .from("content_sources")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (sourceError) throw sourceError;

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const source of sources || []) {
    const url = source.rss_url || source.site_url || source.url;
    if (!url) continue;

    try {
      const feedItems = (await fetchSourceItems(source)).slice(0, 25);

      for (const item of feedItems) {
        if (!item.title || !item.link) continue;

        const { data: existing } = await db
          .from("news_articles")
          .select("id")
          .eq("source_url", item.link)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const { error } = await db.from("news_articles").insert({
          title: item.title.slice(0, 240),
          summary: item.summary?.slice(0, 1200) || null,
          category: inferCategory(item.title, source.category || source.section || "News"),
          region: source.region || null,
          atc_code: source.atc_code || null,
          source: source.name || null,
          source_url: item.link,
          published_at: item.published_at || new Date().toISOString(),
        });

        if (error) {
          errors.push(`${source.name}: ${error.message}`);
        } else {
          inserted++;
        }
      }

      await db
        .from("content_sources")
        .update({ last_fetch_at: new Date().toISOString(), last_checked_at: new Date().toISOString() })
        .eq("id", source.id);
    } catch (err: any) {
      errors.push(`${source.name || url}: ${err?.message || String(err)}`);
    }
  }

  await db.from("news_import_logs").insert({
    inserted_count: inserted,
    skipped_count: skipped,
    error_count: errors.length,
    errors,
    ran_at: new Date().toISOString(),
  }).then(() => null);

  return { inserted, skipped, errors };
}

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

  try {
    const result = await refreshNews();
    return NextResponse.json({ ok: true, mode: "daily-cron-free-sources", ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 401 });
  }

  try {
    const result = await refreshNews();
    return NextResponse.json({ ok: true, mode: "manual-admin-free-sources", ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
