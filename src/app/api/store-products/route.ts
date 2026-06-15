import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE_BASE = "https://store.infocacciatore.com";

type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  price: string;
  compare_at_price?: string | null;
  image: string | null;
  url: string;
  available: boolean;
  vendor?: string | null;
  product_type?: string | null;
};

function euro(value: unknown) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value || "");
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function stripHtml(input: string) {
  return String(input || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("//")) return `https:${path}`;
  if (path.startsWith("http")) return path;
  return `${STORE_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

function normalizeShopifyProduct(p: any): Product {
  const variant = p.variants?.[0] || {};
  const image = p.images?.[0]?.src || p.image?.src || null;

  return {
    id: String(p.id || p.handle || p.title),
    title: p.title || "Prodotto",
    handle: p.handle || "",
    description: stripHtml(p.body_html || p.description || "").slice(0, 180),
    price: euro(variant.price || p.price || 0),
    compare_at_price: variant.compare_at_price ? euro(variant.compare_at_price) : null,
    image: absoluteUrl(image),
    url: `${STORE_BASE}/products/${p.handle}`,
    available: variant.available !== false,
    vendor: p.vendor || null,
    product_type: p.product_type || null,
  };
}

async function fetchProductsJson(limit: number) {
  const urls = [
    `${STORE_BASE}/products.json?limit=${limit}`,
    `${STORE_BASE}/collections/all/products.json?limit=${limit}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "IlCacciatoreStoreSync/1.0", "Accept": "application/json,text/plain,*/*" },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const json = await res.json();
      const products = (json.products || []).map(normalizeShopifyProduct);
      if (products.length) return products;
    } catch {}
  }

  return [];
}

function parseHtmlProducts(html: string, limit: number) {
  const products: Product[] = [];
  const seen = new Set<string>();

  const blockRegex = /<a[^>]+href=["'](\/products\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(blockRegex)) {
    const url = absoluteUrl(m[1]) || "";
    const raw = stripHtml(m[2]);
    if (!url || seen.has(url)) continue;

    const title = raw.split("€")[0].trim();
    if (!title || title.length < 3 || title.toLowerCase().includes("image")) continue;

    seen.add(url);
    products.push({
      id: url,
      title: title.slice(0, 120),
      handle: url.split("/products/")[1] || "",
      description: "Prodotto disponibile nello store InfoCacciatore.",
      price: "",
      compare_at_price: null,
      image: null,
      url,
      available: true,
    });

    if (products.length >= limit) break;
  }

  return products;
}

async function fetchProductsHtml(limit: number) {
  const res = await fetch(`${STORE_BASE}/collections/all`, {
    headers: { "User-Agent": "IlCacciatoreStoreSync/1.0", "Accept": "text/html" },
    cache: "no-store",
  });

  if (!res.ok) return [];
  const html = await res.text();
  return parseHtmlProducts(html, limit);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 250);
    const featured = url.searchParams.get("featured") === "1";

    let products = await fetchProductsJson(limit);
    if (!products.length) products = await fetchProductsHtml(limit);

    if (featured) products = products.slice(0, Math.min(limit, 8));

    return NextResponse.json({
      ok: true,
      store_url: STORE_BASE,
      count: products.length,
      products,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err), products: [] }, { status: 500 });
  }
}
