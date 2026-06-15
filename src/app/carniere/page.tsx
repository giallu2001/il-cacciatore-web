"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell, cardClass, inputClass, buttonClass } from "@/components/PageShell";

type Rule = {
  id: string;
  region: string;
  atc_code: string | null;
  species_name: string;
  season: string | null;
  opening_date: string | null;
  closing_date: string | null;
  notes: string | null;
  source_url: string | null;
  daily_bag_limit?: string | null;
  seasonal_bag_limit?: string | null;
  allowed_days?: string | null;
  hunting_type?: string | null;
  restrictions?: string | null;
};

export default function CarnierePage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [filters, setFilters] = useState({ region: "", atc: "", specie: "", season: "2025/2026" });

  useEffect(() => {
    supabase
      .from("hunting_calendar_rules")
      .select("*")
      .order("region", { ascending: true })
      .order("species_name", { ascending: true })
      .limit(1200)
      .then(({ data }) => setRules((data ?? []) as Rule[]));
  }, []);

  const filtered = useMemo(() => {
    const r = filters.region.toLowerCase();
    const a = filters.atc.toLowerCase();
    const s = filters.specie.toLowerCase();
    const season = filters.season.toLowerCase();

    return rules.filter((item) =>
      (!r || item.region.toLowerCase().includes(r)) &&
      (!a || (item.atc_code ?? "").toLowerCase().includes(a)) &&
      (!s || item.species_name.toLowerCase().includes(s)) &&
      (!season || (item.season ?? "").toLowerCase().includes(season))
    );
  }, [rules, filters]);

  return (
    <PageShell
      eyebrow="Carniere e periodi"
      title="Carniere, periodi, limiti e specie"
      subtitle="Questa sezione raccoglie periodi, giornate, carnieri e limitazioni per specie, Regione e ATC. I dati vanno sempre verificati con la fonte ufficiale."
    >
      <div className={cardClass}>
        <div className="grid gap-3 md:grid-cols-5">
          <input className={inputClass} placeholder="Regione" onChange={(e) => setFilters({ ...filters, region: e.target.value })} />
          <input className={inputClass} placeholder="ATC" onChange={(e) => setFilters({ ...filters, atc: e.target.value })} />
          <input className={inputClass} placeholder="Specie" onChange={(e) => setFilters({ ...filters, specie: e.target.value })} />
          <input className={inputClass} value={filters.season} onChange={(e) => setFilters({ ...filters, season: e.target.value })} />
          <button className={buttonClass}>Risultati: {filtered.length}</button>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {filtered.length === 0 && <div className={cardClass}>Nessun dato carniere inserito. Vai su /admin per aggiungerlo.</div>}
        {filtered.map((r) => (
          <article key={r.id} className={cardClass}>
            <div className="grid gap-6 lg:grid-cols-[1fr_430px]">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-[#6B4226]">{r.region} · {r.atc_code || "regionale"} · {r.season || "2025/2026"}</p>
                <h2 className="mt-2 text-3xl font-black">{r.species_name}</h2>
                <p className="mt-3 text-[#3D3F38]">Apertura: <b>{r.opening_date || "da verificare"}</b> · Chiusura: <b>{r.closing_date || "da verificare"}</b></p>
                {r.notes && <p className="mt-3 text-sm leading-6 text-[#3D3F38]">{r.notes}</p>}
                {r.source_url && <a className="mt-4 inline-block font-bold text-[#2D4A22]" href={r.source_url} target="_blank">Fonte ufficiale →</a>}
              </div>

              <div className="grid gap-3 rounded-xl bg-[#F5F0E8] p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Tipo" value={r.hunting_type || "da verificare"} />
                  <Info label="Giorni" value={r.allowed_days || "da verificare"} />
                  <Info label="Carniere giornaliero" value={r.daily_bag_limit || "da verificare"} />
                  <Info label="Carniere stagionale" value={r.seasonal_bag_limit || "da verificare"} />
                </div>
                <div className="rounded-lg border border-[#DDD4C0] bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[.2em] text-[#2D4A22]">Limitazioni</p>
                  <p className="mt-2 text-sm text-[#3D3F38]">{r.restrictions || "Verificare sempre calendario regionale, ATC e provvedimenti successivi."}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#DDD4C0] bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C4922A]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
