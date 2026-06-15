"use client";

import { useEffect, useMemo, useState } from "react";

const STORE_BASE = "https://store.infocacciatore.com";
const shellClass = "min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#1A1C18]";
const cardClass = "rounded-2xl border border-[#DDD4C0] bg-white p-6 shadow-sm";
const btnClass = "inline-flex rounded-md bg-[#4A5C2A] px-4 py-2 text-sm font-bold text-white hover:bg-[#6B7C3E]";

type StoreProduct = {
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

function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <a href="/" className="mb-6 inline-block font-bold text-[#2D4A22]">← Home</a>
        <p className="text-xs font-black uppercase tracking-[.25em] text-[#2D4A22]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-[#3D3F38]">{subtitle}</p>
      </div>
      <a href={STORE_BASE} target="_blank" className={btnClass}>Apri store completo →</a>
    </div>
  );
}

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/store-products?limit=250", { cache: "no-store" });
        const json = await res.json();

        if (!json.ok) throw new Error(json.error || "Errore caricamento catalogo.");
        setProducts(json.products || []);
      } catch (err: any) {
        setError(err?.message || "Errore caricamento catalogo.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return products;
    return products.filter((p) =>
      `${p.title} ${p.description} ${p.product_type || ""} ${p.vendor || ""}`.toLowerCase().includes(term)
    );
  }, [products, q]);

  return (
    <main className={shellClass}>
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Store"
          title="Catalogo InfoCacciatore"
          subtitle="Catalogo collegato direttamente allo store ufficiale. Prodotti, prezzi e immagini vengono letti automaticamente da store.infocacciatore.com."
        />

        <div className={cardClass}>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]"
              placeholder="Cerca prodotto, es. binocolo, richiamo, custodia..."
            />
            <a href={STORE_BASE} target="_blank" className="rounded-xl bg-[#4A5C2A] p-4 text-center font-bold text-white hover:bg-[#6B7C3E]">
              Vai al checkout
            </a>
          </div>
        </div>

        {loading && <div className={cardClass + " mt-6"}>Caricamento catalogo...</div>}
        {error && <div className={cardClass + " mt-6 text-red-800"}>{error}</div>}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border border-[#DDD4C0] bg-white shadow-sm">
              <a href={p.url} target="_blank" className="block">
                {p.image ? (
                  <img src={p.image} alt={p.title} className="h-56 w-full bg-[#1A1C18] object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-gradient-to-br from-[#2D4A22] to-[#6B4226] text-6xl">🛒</div>
                )}
              </a>

              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6B4226]">
                  {p.product_type || p.vendor || "Prodotto"}
                </p>
                <h2 className="mt-1 text-xl font-black">{p.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-[#3D3F38]">{p.description || "Prodotto disponibile nello store InfoCacciatore."}</p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <b>{p.price || "Vedi prezzo"}</b>
                    
                  </div>
                  <a className={btnClass} href={p.url} target="_blank">Apri</a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className={cardClass + " mt-6"}>Nessun prodotto trovato.</div>
        )}
      </div>
    </main>
  );
}
