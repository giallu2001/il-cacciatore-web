"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ResultItem = {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  href: string;
  score: number;
};

const storeProducts = [
  { title: "Scarponi impermeabili", desc: "Stabilità e comfort su ogni terreno", category: "Store equipaggiamento caccia", price: "€129,00" },
  { title: "Zaino tecnico 35L", desc: "Leggero, capiente e resistente", category: "Store zaino caccia", price: "€89,00" },
  { title: "Giacca camouflage", desc: "Silenziosa e adatta a tutte le stagioni", category: "Store abbigliamento caccia", price: "€149,00" },
  { title: "Binocolo 10x42", desc: "Alta definizione e campo visivo ampio", category: "Store ottica osservazione", price: "€199,00" },
  { title: "Richiamo per anatre", desc: "Accessorio consentito dove previsto", category: "Store richiami anatre acquatici", price: "€34,90" },
  { title: "Guanti tecnici", desc: "Presa sicura e tessuto caldo", category: "Store abbigliamento caccia", price: "€29,90" },
];

function normalize(text: unknown) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function expandTerms(query: string) {
  const base = normalize(query).split(/\s+/).filter(Boolean);
  const extra: Record<string, string[]> = {
    beccaccia: ["scolopax", "date", "periodo", "carniere", "prelievo", "specie"],
    colombaccio: ["columba", "palumbus", "date", "periodo", "carniere", "prelievo", "appostamento"],
    date: ["periodo", "apertura", "chiusura", "calendario", "opening", "closing"],
    carniere: ["capi", "limite", "prelevabili", "daily", "bag"],
    orari: ["ora", "orario", "alba", "tramonto", "giornata"],
    atc: ["ambito", "territoriale", "caccia"],
    pisa: ["pi", "pi14", "pi 14"],
  };
  return Array.from(new Set(base.flatMap((t) => [t, ...(extra[t] || [])])));
}

function scoreRecord(query: string, fields: unknown[]) {
  const terms = expandTerms(query);
  const haystack = normalize(fields.filter(Boolean).join(" "));
  if (!terms.length || !haystack) return 0;

  let score = 0;
  if (haystack.includes(normalize(query))) score += 40;
  for (const term of terms) {
    if (haystack.includes(term)) score += 10;
    if (haystack.split(" ").some((word) => word.startsWith(term))) score += 3;
  }
  return score;
}

function SearchContent() {
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [items, setItems] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function run() {
      if (!q) {
        setItems([]);
        return;
      }

      setLoading(true);

      const [species, atc, laws, news, rules] = await Promise.all([
        supabase.from("hunting_species").select("*").limit(1000),
        supabase.from("atc_areas").select("*").limit(1000),
        supabase.from("laws_archive").select("*").limit(1000),
        supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(1000),
        supabase.from("hunting_calendar_rules").select("*").limit(1000),
      ]);

      const result: ResultItem[] = [];

      (species.data || []).forEach((x: any) => {
        const score = scoreRecord(q, [x.name, x.scientific_name, x.category, x.habitat, x.description, x.hunt_status, x.hunting_status]);
        if (score > 0) result.push({
          id: `specie-${x.id}`,
          type: "Specie",
          title: x.name,
          subtitle: [x.scientific_name, x.category, x.habitat].filter(Boolean).join(" · "),
          href: `/specie/${x.id}`,
          score,
        });
      });

      (atc.data || []).forEach((x: any) => {
        const score = scoreRecord(q, [x.name, x.code, x.region, x.province, x.municipalities, x.description]);
        if (score > 0) result.push({
          id: `atc-${x.id}`,
          type: "ATC",
          title: x.name || x.code,
          subtitle: [x.region, x.province, x.code].filter(Boolean).join(" · "),
          href: `/atc?q=${encodeURIComponent(x.code || x.name || "")}`,
          score,
        });
      });

      (laws.data || []).forEach((x: any) => {
        const score = scoreRecord(q, [x.title, x.region, x.atc_code, x.category, x.law_type, x.summary]);
        if (score > 0) result.push({
          id: `legge-${x.id}`,
          type: "Leggi",
          title: x.title,
          subtitle: [x.region, x.atc_code, x.category, x.law_type, x.summary].filter(Boolean).join(" · ").slice(0, 180),
          href: x.source_url || "/leggi",
          score,
        });
      });

      (rules.data || []).forEach((x: any) => {
        const score = scoreRecord(q, [x.species_name, x.species, x.region, x.atc_code, x.season, x.opening_date, x.closing_date, x.allowed_days, x.daily_hours, x.hours, x.daily_bag_limit, x.bag_limit, x.hunting_type, x.notes, x.restrictions]);
        if (score > 0) result.push({
          id: `regola-${x.id}`,
          type: "Carniere",
          title: x.species_name || x.species || "Regola venatoria",
          subtitle: [x.region, x.atc_code, x.opening_date && `Apertura: ${x.opening_date}`, x.closing_date && `Chiusura: ${x.closing_date}`, x.daily_bag_limit && `Capi: ${x.daily_bag_limit}`, x.daily_hours || x.hours, x.notes].filter(Boolean).join(" · ").slice(0, 240),
          href: `/carniere?specie=${encodeURIComponent(x.species || "")}&regione=${encodeURIComponent(x.region || "")}&atc=${encodeURIComponent(x.atc_code || "")}`,
          score,
        });
      });

      (news.data || []).forEach((x: any) => {
        const score = scoreRecord(q, [x.title, x.source, x.category, x.region, x.summary]);
        if (score > 0) result.push({
          id: `news-${x.id}`,
          type: "News/Post",
          title: x.title,
          subtitle: [x.source, x.category, x.region, x.summary].filter(Boolean).join(" · ").slice(0, 180),
          href: x.source_url || x.url || "/news",
          score,
        });
      });

      storeProducts.forEach((x, index) => {
        const score = scoreRecord(q, [x.title, x.desc, x.category, x.price]);
        if (score > 0) result.push({
          id: `store-${index}`,
          type: "Store",
          title: x.title,
          subtitle: [x.desc, x.price, x.category].join(" · "),
          href: "/store",
          score,
        });
      });

      setItems(result.sort((a, b) => b.score - a.score).slice(0, 100));
      setLoading(false);
    }

    run();
  }, [q]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, ResultItem[]>>((acc, item) => {
      acc[item.type] ||= [];
      acc[item.type].push(item);
      return acc;
    }, {});
  }, [items]);

  const suggestions = ["Colombaccio Toscana", "Calendario ATC PI 14", "Beccaccia Toscana", "Orari caccia Pisa", "Cinghiale apertura"];

  return (
    <main className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#101510]">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="font-bold text-[#153b17]">← Home</Link>

        <p className="mt-8 text-xs font-bold uppercase tracking-[.3em] text-[#2D4A22]">Ricerca</p>
        <h1 className="mt-2 text-5xl font-black">Ricerca intelligente</h1>
        <p className="mt-3 max-w-2xl text-[#3D3F38]">
          La ricerca confronta tutte le parole inserite con specie, carniere, ATC, leggi, documenti, store e news/post. Puoi scrivere frasi tipo “beccaccia date”, “beccaccia carniere Toscana”, “scarponi”, “PI 14 colombaccio”.
        </p>

        <form className="mt-8 flex overflow-hidden rounded-2xl border border-[#DDD4C0] bg-white p-2 shadow">
          <input
            name="q"
            defaultValue={q}
            placeholder="Cerca per regione, ATC, specie o normativa..."
            className="flex-1 px-5 py-4 outline-none"
          />
          <button className="rounded-xl bg-[#4A5C2A] px-8 font-bold text-white hover:bg-[#3f642f]">Cerca</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Link key={s} href={`/cerca?q=${encodeURIComponent(s)}`} className="rounded-full border border-[#DDD4C0] bg-white px-4 py-2 text-xs font-bold text-[#3D3F38] hover:bg-[#E8DCC8]">
              {s}
            </Link>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-[#DDD4C0] bg-white p-6 shadow">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#2D4A22]">Hai cercato</p>
          <h2 className="mt-2 text-3xl font-black">{q || "Nessun termine inserito"}</h2>
          {loading && <p className="mt-4">Ricerca in corso...</p>}
          {!loading && q && <p className="mt-2 text-[#3D3F38]">Risultati trovati: <b>{items.length}</b></p>}
          {!loading && q && items.length === 0 && <p className="mt-4">Nessun risultato trovato. Prova con una parola più semplice, tipo “colombaccio”, “Toscana”, “PI 14”.</p>}
        </section>

        <div className="mt-8 space-y-8">
          {Object.entries(grouped).map(([group, groupItems]) => (
            <section key={group}>
              <h3 className="mb-4 text-2xl font-black">{group}</h3>
              <div className="grid gap-5 md:grid-cols-3">
                {groupItems.map((item) => {
                  const external = item.href.startsWith("http");
                  const card = (
                    <article className="h-full rounded-2xl border border-[#DDD4C0] bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg">
                      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">{item.type}</p>
                      <h4 className="mt-3 text-2xl font-black">{item.title}</h4>
                      {item.subtitle && <p className="mt-3 text-sm leading-6 text-[#3D3F38]">{item.subtitle}</p>}
                      <p className="mt-5 font-bold text-[#2D4A22]">Apri →</p>
                    </article>
                  );

                  return external ? (
                    <a key={item.id} href={item.href} target="_blank" rel="noreferrer">{card}</a>
                  ) : (
                    <Link key={item.id} href={item.href}>{card}</Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
