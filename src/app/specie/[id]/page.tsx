"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cardClass } from "@/components/PageShell";

type Species = {
  id: string;
  name: string;
  slug?: string | null;
  scientific_name?: string | null;
  category?: string | null;
  habitat?: string | null;
  description?: string | null;
  hunt_status?: string | null;
  hunting_status?: string | null;
  daily_bag_limit?: string | null;
  seasonal_bag_limit?: string | null;
  conservation_notes?: string | null;
  reproduction_period?: string | null;
  diet?: string | null;
  life_notes?: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function photoPath(name: string) {
  return `/img/specie/${slugify(name)}.png`;
}

function statusOf(s: Species) {
  return s.hunt_status || s.hunting_status || "Verifica calendario regionale/ATC";
}


export default function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [item, setItem] = useState<Species | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function load() {
      const { id } = await params;
      const { data } = await supabase.from("hunting_species").select("*").order("name", { ascending: true });
      const all = (data ?? []) as Species[];
      const found = all.find((s) => (s.slug || slugify(s.name)) === id || s.id === id);
      if (found) setItem(found);
      else setMissing(true);
    }
    load();
  }, [params]);

  if (missing) {
    return (
      <main className="min-h-screen bg-[#F5F0E8] px-6 py-10">
        <Link href="/specie" className="font-bold text-[#2D4A22]">← Torna alle specie</Link>
        <h1 className="mt-8 text-4xl font-black">Specie non trovata</h1>
      </main>
    );
  }

  if (!item) return <main className="min-h-screen bg-[#F5F0E8] px-6 py-10">Caricamento...</main>;

  return (
    <main className="min-h-screen bg-[#F5F0E8] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/specie" className="font-bold text-[#2D4A22]">← Torna alle specie</Link>

        <div className="mt-8 grid gap-8 md:grid-cols-[420px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-[#DDD4C0] bg-white shadow-sm">
            <div className="h-[360px] bg-[#2D4A22]">
              <img
                src={photoPath(item.name)}
                alt={item.name}
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) parent.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-[#2D4A22] p-4 text-center text-sm font-bold text-white">Foto da caricare in public/img/specie</div>';
                }}
              />
            </div>
          </div>

          <section className={cardClass}>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#C4922A]">{statusOf(item)}</p>
            <h1 className="mt-2 text-5xl font-black">{item.name}</h1>
            {item.scientific_name && <p className="mt-2 text-xl italic">{item.scientific_name}</p>}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Info title="Categoria" value={item.category || "Da completare"} />
              <Info title="Habitat" value={item.habitat || "Da completare"} />
              <Info title="Carniere giornaliero" value={item.daily_bag_limit || "Dipende da calendario regionale/ATC"} />
              <Info title="Carniere stagionale" value={item.seasonal_bag_limit || "Dipende da calendario regionale/ATC"} />
              <Info title="Riproduzione" value={item.reproduction_period || "Da completare"} />
              <Info title="Alimentazione" value={item.diet || "Da completare"} />
            </div>

            <Box title="Descrizione" text={item.description || "Scheda descrittiva da completare con abitudini, alimentazione, riproduzione, habitat e periodi di presenza."} />
            <Box title="Vita e comportamento" text={item.life_notes || "Informazioni su comportamento, orari di attività, rimessa, alimentazione e habitat da completare."} />
            <Box title="Conservazione e prelievo" text={item.conservation_notes || "Verificare calendario regionale, ATC, carnieri, giornate e limitazioni locali."} />

            <div className="mt-6 rounded-xl bg-[#2D4A22] p-6 text-white">
              <h2 className="text-2xl font-black">Regione e ATC</h2>
              <p className="mt-3 leading-7 text-white/85">La possibilità di caccia, prelievo selettivo o deroga cambia per regione, ATC, stagione, date e disposizioni locali.</p>
              <a href="/carniere" className="mt-5 inline-block rounded-md bg-[#C4922A] px-4 py-2 font-bold text-[#1A1C18]">Cerca nel carniere →</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-[#F5F0E8] p-5"><p className="text-xs font-black uppercase tracking-[.2em] text-[#2D4A22]">{title}</p><p className="mt-2 text-lg font-black">{value}</p></div>;
}

function Box({ title, text }: { title: string; text: string }) {
  return <div className="mt-6 rounded-xl border border-[#DDD4C0] bg-white p-5"><h2 className="text-2xl font-black">{title}</h2><p className="mt-3 leading-7 text-[#3D3F38]">{text}</p></div>;
}
