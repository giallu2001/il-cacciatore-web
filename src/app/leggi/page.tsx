"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell, cardClass, inputClass, buttonClass } from "@/components/PageShell";

type Law = {
  id: string;
  title: string;
  region: string | null;
  atc_code: string | null;
  law_type: string | null;
  summary: string | null;
  source_url: string | null;
  pdf_url: string | null;
};

type Profile = {
  region: string | null;
  atc: string | null;
  primary_atc: string | null;
  secondary_atcs: string[] | null;
};

function norm(v?: string | null) {
  return (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function LeggiPage() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filters, setFilters] = useState({ q: "", region: "", atc: "" });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      let p: Profile | null = null;
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("region,atc,primary_atc,secondary_atcs")
          .eq("id", user.id)
          .single();

        p = profileData as Profile | null;
        setProfile(p);
      }

      const { data } = await supabase
        .from("laws_archive")
        .select("*")
        .limit(2000);

      setLaws((data ?? []) as Law[]);
    }

    load();
  }, []);

  const preferredRegion = norm(profile?.region || "Toscana");
  const preferredAtcs = [
    profile?.primary_atc,
    profile?.atc,
    ...(profile?.secondary_atcs ?? []),
    "PI 14",
    "ATC Pisa 14 Ovest"
  ].filter(Boolean).map((x) => norm(String(x)));

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase().trim();
    const r = filters.region.toLowerCase().trim();
    const a = norm(filters.atc);

    const unique = new Map<string, Law>();
    for (const law of laws) {
      const compactTitle = law.title.toLowerCase()
        .replace("normativa e documenti ", "")
        .replace("normativa ", "")
        .replace(/\s+/g, " ")
        .trim();
      const key = `${compactTitle}|${norm(law.atc_code)}|${norm(law.region)}|${law.source_url || ""}`;
      if (!unique.has(key)) unique.set(key, law);
    }

    return Array.from(unique.values())
      .filter((law) => {
        const text = `${law.title} ${law.summary ?? ""} ${law.law_type ?? ""} ${law.region ?? ""} ${law.atc_code ?? ""}`.toLowerCase();
        const atc = norm(law.atc_code);
        return (!q || text.includes(q)) &&
          (!r || (law.region ?? "").toLowerCase().includes(r)) &&
          (!a || atc.includes(a) || a.includes(atc));
      })
      .sort((x, y) => score(y) - score(x));
  }, [laws, filters, preferredRegion, preferredAtcs]);

  function score(law: Law) {
    let s = 0;
    const reg = norm(law.region);
    const atc = norm(law.atc_code);
    const title = norm(law.title);
    const summary = norm(law.summary);
    const all = `${title}${summary}${atc}${reg}`;

    // ATC cliente prima di tutto
    if (preferredAtcs.some((p) => p && (all.includes(p) || p.includes(atc)))) s += 10000;

    // Regioni profilo subito dopo
    if (preferredRegion && reg.includes(preferredRegion)) s += 2000;

    // Pisa 14 deve sempre essere prima se presente
    if (all.includes("pisa14") || all.includes("pi14") || all.includes("14ovest")) s += 5000;

    if ((law.law_type ?? "").toLowerCase().includes("atc")) s += 400;
    if ((law.law_type ?? "").toLowerCase().includes("calendario")) s += 250;
    if ((law.law_type ?? "").toLowerCase().includes("regione")) s += 100;

    // Piemonte non deve finire in cima se il profilo è Toscana/PI14
    if (preferredRegion && preferredRegion !== "piemonte" && reg.includes("piemonte")) s -= 1000;

    return s;
  }

  return (
    <PageShell
      eyebrow="Leggi e regolamenti"
      title="Archivio normativa venatoria"
      subtitle="Ordine corretto: prima ATC principale e secondari del profilo, poi Regione, poi resto d’Italia."
    >
      <div className={cardClass}>
        <div className="grid gap-3 md:grid-cols-4">
          <input className={inputClass} placeholder="Parola chiave" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <input className={inputClass} placeholder="Regione" onChange={(e) => setFilters({ ...filters, region: e.target.value })} />
          <input className={inputClass} placeholder="ATC" onChange={(e) => setFilters({ ...filters, atc: e.target.value })} />
          <button className={buttonClass}>Risultati: {filtered.length}</button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {filtered.map((law) => (
          <article key={`${law.id}-${law.title}`} className={cardClass}>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#2D4A22]">{law.law_type || "Normativa"}</p>
            <h2 className="mt-2 text-2xl font-black">{law.title}</h2>
            <p className="mt-3 text-[#3D3F38]">Area: {law.region || "Italia"} {law.atc_code ? `· ${law.atc_code}` : ""}</p>
            {law.summary && <p className="mt-3 text-sm leading-6 text-[#3D3F38]">{law.summary}</p>}
            <div className="mt-5 flex flex-wrap gap-4">
              {law.source_url && <a className="font-bold text-[#2D4A22]" href={law.source_url} target="_blank">Apri fonte →</a>}
              {law.pdf_url && <a className="font-bold text-[#2D4A22]" href={law.pdf_url} target="_blank">PDF →</a>}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
