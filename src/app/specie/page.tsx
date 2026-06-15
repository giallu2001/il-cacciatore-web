"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageShell, cardClass, inputClass, buttonClass } from "@/components/PageShell";

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


export default function SpeciePage() {
  const [items, setItems] = useState<Species[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("hunting_species")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => setItems((data ?? []) as Species[]));
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return items.filter((s) => {
      const text = `${s.name} ${s.scientific_name ?? ""} ${s.category ?? ""} ${s.habitat ?? ""} ${s.description ?? ""}`.toLowerCase();
      return !term || text.includes(term);
    });
  }, [items, q]);

  return (
    <PageShell
      eyebrow="Specie e permessi"
      title="Specie cacciabili e prelevabili in deroga"
      subtitle="Clicca una specie per aprire la scheda. Il prelievo cambia per Regione, ATC, stagione e fonte ufficiale."
    >
      <div className={cardClass}>
        <div className="grid gap-3 md:grid-cols-5">
          <input className={inputClass} placeholder="Specie" onChange={(e) => setQ(e.target.value)} />
          <input className={inputClass} placeholder="Regione" />
          <input className={inputClass} placeholder="ATC" />
          <input className={inputClass} placeholder="Cacciabile / Deroga" />
          <button className={buttonClass}>Risultati: {filtered.length}</button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-4">
        {filtered.map((s) => {
          const slug = s.slug || slugify(s.name);
          return (
            <Link key={s.id || s.name} href={`/specie/${slug}`} className="overflow-hidden rounded-xl border border-[#DDD4C0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="h-44 bg-[#2D4A22]">
                <img
                  src={photoPath(s.name)}
                  alt={s.name}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) parent.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-[#2D4A22] p-4 text-center text-sm font-bold text-white">Metti foto in public/img/specie</div>';
                  }}
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#C4922A]">{statusOf(s)}</p>
                <h2 className="mt-2 text-2xl font-black">{s.name}</h2>
                {s.scientific_name && <p className="italic">{s.scientific_name}</p>}
                <p className="mt-3 font-bold text-[#2D4A22]">{s.category || "Specie"}</p>
                <p className="mt-2 text-sm leading-6 text-[#3D3F38]">{s.habitat || "Habitat da completare"}</p>
                <span className="mt-5 inline-block font-bold text-[#2D4A22]">Apri scheda →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
