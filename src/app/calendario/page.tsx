"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell, cardClass, inputClass, buttonClass } from "@/components/PageShell";

type HuntingDay = {
  id: string;
  region: string;
  atc_code: string | null;
  date: string;
  sunrise_time: string | null;
  sunset_time: string | null;
  hunting_start_time: string | null;
  hunting_end_time: string | null;
  day_length: string | null;
  notes: string | null;
};

export default function CalendarioPage() {
  const [days, setDays] = useState<HuntingDay[]>([]);
  const [filters, setFilters] = useState({ region: "Toscana", atc: "PI 14", month: "" });

  useEffect(() => {
    supabase
      .from("hunting_day_times")
      .select("*")
      .order("date", { ascending: true })
      .limit(1200)
      .then(({ data }) => setDays((data ?? []) as HuntingDay[]));
  }, []);

  const filtered = useMemo(() => {
    const r = filters.region.toLowerCase().trim();
    const a = filters.atc.toLowerCase().replace(/\s+/g, "");
    const m = filters.month;

    const unique = new Map<string, HuntingDay>();
    for (const d of days) {
      const key = `${d.region}|${d.atc_code || ""}|${d.date}`;
      if (!unique.has(key)) unique.set(key, d);
    }

    return Array.from(unique.values()).filter((d) => {
      const dayAtc = (d.atc_code ?? "").toLowerCase().replace(/\s+/g, "");
      return (!r || d.region.toLowerCase().includes(r)) &&
        (!a || dayAtc.includes(a) || a.includes(dayAtc)) &&
        (!m || d.date.startsWith(m));
    });
  }, [days, filters]);

  return (
    <PageShell
      eyebrow="Calendario giornate"
      title="Orari di caccia e durata delle giornate"
      subtitle="Alba, tramonto, inizio/fine attività venatoria e durata indicativa della giornata. Verifica sempre calendario ufficiale, comune e disposizioni ATC."
    >
      <div className={cardClass}>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_160px_170px]">
          <input className={inputClass} value={filters.region} placeholder="Regione" onChange={(e) => setFilters({ ...filters, region: e.target.value })} />
          <input className={inputClass} value={filters.atc} placeholder="ATC" onChange={(e) => setFilters({ ...filters, atc: e.target.value })} />
          <input className={inputClass} type="month" onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
          <button className={buttonClass} type="button">Risultati: {filtered.length}</button>
          <a className="rounded-lg border border-[#DDD4C0] px-5 py-3 text-center font-bold text-[#2D4A22]" href="/carniere">Vai al carniere →</a>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#DDD4C0] bg-white shadow-sm">
        <div className="hidden grid-cols-[170px_110px_140px_140px_110px_120px_1fr] bg-[#1A211A] px-5 py-4 text-xs font-black uppercase tracking-[.14em] text-white md:grid">
          <span>Data</span>
          <span>Alba</span>
          <span>Inizio</span>
          <span>Fine</span>
          <span>Tramonto</span>
          <span>Durata</span>
          <span>Note</span>
        </div>

        {filtered.length === 0 && <div className="p-6">Nessun orario inserito. Esegui il nuovo SQL.</div>}

        {filtered.map((d) => (
          <div key={`${d.region}-${d.atc_code}-${d.date}`} className="grid gap-3 border-t border-[#EEE4D3] px-5 py-4 text-sm md:grid-cols-[170px_110px_140px_140px_110px_120px_1fr] md:items-center">
            <b>{formatDate(d.date)}</b>
            <Field label="Alba" value={d.sunrise_time || "-"} />
            <Field label="Inizio" value={d.hunting_start_time || "-"} />
            <Field label="Fine" value={d.hunting_end_time || "-"} />
            <Field label="Tramonto" value={d.sunset_time || "-"} />
            <Field label="Durata" value={d.day_length || "-"} />
            <span className="text-xs leading-5 text-[#3D3F38]">{d.notes || "Verifica fonte ufficiale."}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small className="mr-2 font-bold uppercase text-[#6B4226] md:hidden">{label}:</small>
      {value}
    </span>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}
