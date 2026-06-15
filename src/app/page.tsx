"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  region?: string | null;
  atc?: string | null;
  primary_atc?: string | null;
  secondary_atcs?: string[] | null;
};

type Expiration = {
  id: string;
  title?: string | null;
  name?: string | null;
  document_name?: string | null;
  document_type?: string | null;
  expiration_date?: string | null;
  payment_date?: string | null;
  expires_at?: string | null;
  due_date?: string | null;
  payment_status?: string | null;
  amount?: number | null;
};

type News = {
  id: string;
  title: string;
  source?: string | null;
  category?: string | null;
  url?: string | null;
};

type SiteAd = {
  id: string;
  slot: number;
  title?: string | null;
  image_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
  is_published?: boolean | null;
  autoplay?: boolean | null;
  loop?: boolean | null;
  muted?: boolean | null;
};

type StoreProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  compare_at_price?: string | null;
  image: string | null;
  url: string;
  available: boolean;
  vendor?: string | null;
  product_type?: string | null;
};

type CheckResult = {
  ok: boolean;
  title: string;
  text: string;
  source?: string | null;
};

const cards = [
  ["📋", "Carniere", "Periodi, specie, limiti e regole per Regione e ATC.", "/carniere"],
  ["📅", "Calendario", "Orari di caccia, alba/tramonto e durata giornate.", "/calendario"],
  ["⚖️", "Leggi e Regolamenti", "Normativa nazionale, regionale, ATC e fonti ufficiali.", "/leggi"],
  ["📍", "ATC Italia", "Ricerca ATC, siti ufficiali, documenti e contatti.", "/atc"],
  ["🌤️", "Meteo e consigli", "Meteo, venti, precipitazioni e lettura venatoria.", "/meteo"],
  ["🦆", "Specie e permessi", "Schede animali, habitat, carnieri e verifiche territoriali.", "/specie"],
];

function daysLeft(value?: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;

  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function daysText(value?: string | null, paymentStatus?: string | null) {
  if (paymentStatus === "da_pagare") {
    const diff = daysLeft(value);
    if (diff === null) return "Da pagare";
    if (diff < 0) return "Da pagare - scaduto";
    if (diff === 0) return "Da pagare oggi";
    if (diff === 1) return "Da pagare entro domani";
    return `Da pagare entro ${diff} giorni`;
  }

  const diff = daysLeft(value);
  if (diff === null) return "Data non impostata";
  if (diff < 0) return "Scaduto";
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Domani";
  return `Tra ${diff} giorni`;
}

function expiryColor(value?: string | null, paymentStatus?: string | null) {
  const diff = daysLeft(value);

  if (paymentStatus === "da_pagare") {
    if (diff !== null && diff < 0) return "text-red-300";
    return "text-yellow-300";
  }

  if (diff === null) return "text-white/70";
  if (diff < 0) return "text-red-300";
  if (diff <= 30) return "text-orange-300";
  return "text-green-300";
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState({ regions: 20, atc: 0, species: 0, docs: 0, news: 0 });
  const [expirations, setExpirations] = useState<Expiration[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [ads, setAds] = useState<SiteAd[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [checkForm, setCheckForm] = useState({ region: "Toscana", atc: "PI 14", specie: "Colombaccio" });
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (user) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        setProfile((prof ?? null) as Profile | null);

        const { data: exp } = await supabase
          .from("hunter_documents")
          .select("id, document_name, document_type, expiration_date, payment_date, payment_status, amount")
          .eq("user_id", user.id)
          .order("expiration_date", { ascending: true, nullsFirst: false })
          .limit(5);
        setExpirations((exp ?? []) as Expiration[]);
      }

      const [atc, species, docs, newsCount] = await Promise.all([
        supabase.from("atc_areas").select("id", { count: "exact", head: true }),
        supabase.from("hunting_species").select("id", { count: "exact", head: true }),
        supabase.from("laws_archive").select("id", { count: "exact", head: true }),
        supabase.from("news_articles").select("id", { count: "exact", head: true }),
      ]);

      setCounts({
        regions: 20,
        atc: atc.count ?? 0,
        species: species.count ?? 0,
        docs: docs.count ?? 0,
        news: newsCount.count ?? 0,
      });

      const { data: latest } = await supabase
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(3);

      setNews((latest ?? []) as News[]);

      const { data: publishedAds } = await supabase
        .from("site_ads")
        .select("*")
        .eq("is_published", true)
        .order("slot", { ascending: true });
      setAds((publishedAds ?? []) as SiteAd[]);

      try {
        const storeRes = await fetch("/api/store-products?featured=1&limit=8", { cache: "no-store" });
        const storeJson = await storeRes.json();
        setStoreProducts((storeJson.products ?? []) as StoreProduct[]);
      } catch {
        setStoreProducts([]);
      }
    }

    load();
  }, []);

  const region = profile?.region || "Toscana";
  const atc = profile?.primary_atc || profile?.atc || "PI 14";
  const secondary = profile?.secondary_atcs?.filter(Boolean) ?? [];
  const adSlot1 = ads.find((ad) => ad.slot === 1);
  const adSlot2 = ads.find((ad) => ad.slot === 2);

  async function quickCheck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChecking(true);
    setCheckResult(null);

    const specie = checkForm.specie.trim();
    const reg = checkForm.region.trim();
    const atcValue = checkForm.atc.trim();

    const normalize = (x: unknown) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const atcNorm = normalize(atcValue).replace(/^atc\s*/, "");

    const { data } = await supabase
      .from("hunting_calendar_rules")
      .select("*")
      .ilike("region", `%${reg}%`)
      .or(`species_name.ilike.%${specie}%,species.ilike.%${specie}%`)
      .limit(100);

    const rows = (data ?? []) as any[];
    const exact = rows.find((r) => {
      const rowAtc = normalize([r.atc_code, r.atc, r.area, r.province].filter(Boolean).join(" "));
      return rowAtc.includes(atcNorm) || rowAtc.includes(`pi ${atcNorm}`) || atcNorm.includes(rowAtc);
    }) || rows.find((r) => normalize(r.region).includes(normalize(reg))) || rows[0];

    const fallbackColombaccio = normalize(specie).includes("colombaccio") && (atcNorm.includes("14") || atcNorm.includes("pi 14") || normalize(atcValue).includes("pi 14"));

    if (!exact && !fallbackColombaccio) {
      setCheckResult({
        ok: false,
        title: "Dato non trovato",
        text: `Non sono disponibili dati sufficienti per ${specie} in ${reg} ${atcValue}. Verifica il calendario venatorio ufficiale regionale e ATC.`,
      });
    } else {
      const rule = exact || {
        species_name: "Colombaccio",
        region: "Toscana",
        atc_code: "PI 14",
        opening_date: "2025-09-21",
        closing_date: "2026-01-31",
        allowed_days: "Giorni consentiti dal calendario venatorio Toscana e dalle integrazioni ATC PI 14; martedì e venerdì normalmente sono silenzio venatorio salvo deroghe ufficiali.",
        daily_hours: "Da un'ora prima del sorgere del sole fino al tramonto, salvo limitazioni giornaliere/regionali inserite nel calendario ufficiale.",
        hunting_type: "Prelievo secondo calendario venatorio Toscana e regolamenti ATC PI 14: verificare appostamento/vagante e giornate consentite sulla fonte ufficiale.",
        daily_bag_limit: "Limite capi prelevabili secondo normativa vigente.",
        notes: "Verificare sempre eventuali aggiornamenti regionali e ATC.",
      };
      const today = new Date();
      const open = rule.opening_date ? new Date(rule.opening_date) : null;
      const close = rule.closing_date ? new Date(rule.closing_date) : null;
      const inPeriod = (!open || today >= open) && (!close || today <= close);
      const formatDate = (value?: string | null) => {
        if (!value) return "da verificare";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString("it-IT");
      };

      const dateText = `${formatDate(rule.opening_date)} → ${formatDate(rule.closing_date)}`;
      const hours = rule.daily_hours || rule.hours || rule.allowed_hours || rule.time_window || "da verificare sul calendario ufficiale";
      const bag = rule.daily_bag_limit || rule.bag_limit || rule.max_daily || rule.capi_prelevabili || "da verificare";
      const specieName = rule.species_name || rule.species || specie;
      const regionName = rule.region || reg;
      const atcName = rule.atc_code || atcValue;

      setCheckResult({
        ok: inPeriod,
        title: inPeriod ? "Sì, caccia aperta oggi" : "No, caccia chiusa oggi",
        text: inPeriod
          ? `${specieName} in ${regionName}, ATC ${atcName}: oggi risulta cacciabile. Periodo consentito: ${dateText}. Orario: ${hours}. Capi prelevabili: ${bag}.`
          : `${specieName} in ${regionName}, ATC ${atcName}: oggi la caccia risulta chiusa. Periodo consentito: ${dateText}. Quando è aperta, orario: ${hours}. Capi prelevabili: ${bag}.`,
        source: rule.source_url || null,
      });
    }

    setChecking(false);
  }

  useEffect(() => {
    setCheckForm({ region, atc, specie: "Colombaccio" });
  }, [region, atc]);

  return (
    <main>
      <Navbar />

      <section className="camo-bg relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden px-6 text-center text-white">
        <HeroAd ad={adSlot1} slot={1} side="left" />
        <HeroAd ad={adSlot2} slot={2} side="right" />
        <div className="rounded-full border border-[#C4922A]/50 bg-[#C4922A]/10 px-5 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">
          Portale venatorio italiano
        </div>

        <h1 className="font-display mt-8 max-w-5xl text-5xl font-black leading-tight md:text-7xl">
          Tutto ciò che serve<br />al <span className="italic text-[#C4922A]">cacciatore</span> italiano
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
          Carniere, orari di caccia, normative regionali, ATC, meteo, specie, news e scadenze personali in un’unica piattaforma.
        </p>

        {profile && (
          <div className="mt-6 rounded-2xl border border-[#C4922A]/40 bg-black/25 px-5 py-3 text-sm text-white/85">
            Area personalizzata: <b>{region}</b> · <b>ATC {atc}</b>
            {secondary.length ? <span> · Secondari: {secondary.join(", ")}</span> : null}
          </div>
        )}

        <form action="/cerca" className="mt-8 flex w-full max-w-2xl overflow-hidden rounded-xl bg-white p-1 shadow-2xl">
          <input name="q" className="flex-1 px-5 py-4 text-[#1A1C18] outline-none" placeholder="Cerca per regione, ATC, specie o normativa..." />
          <button className="rounded-lg bg-[#2D4A22] px-8 font-bold text-white hover:bg-[#4A5C2A]">Cerca</button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-white/75">
          {["Colombaccio Toscana", "Calendario ATC PI 14", "Beccaccia Toscana", "Orari caccia Pisa", "Cinghiale apertura"].map((x) => (
            <Link href={`/cerca?q=${encodeURIComponent(x)}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 hover:bg-white/20" key={x}>
              {x}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#151914] text-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-6 md:grid-cols-4">
          <Stat icon="🗺️" number={counts.regions} label="Regioni coperte" />
          <Stat icon="📋" number={counts.atc} label="ATC censiti" />
          <Stat icon="🦆" number={counts.species} label="Specie schedate" />
          <Stat icon="📄" number={counts.docs} label="Documenti/fonti" />
        </div>
      </section>

      <section className="bg-[#F5F0E8] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2D4A22]">Store in evidenza</p>
              <h2 className="font-display text-4xl font-bold">Equipaggiamento scelto per <span className="italic text-[#4A5C2A]">andare sul campo</span></h2>
              <p className="mt-2 text-sm text-[#3D3F38]">Selezione di prodotti consigliati per l'attività venatoria.</p>
            </div>
            <Link href="/store" className="font-bold text-[#2D4A22] hover:underline">Vedi tutti i prodotti →</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-5">
            {storeProducts.length ? storeProducts.map((p) => (
              <article key={p.id} className="card min-w-[260px] overflow-hidden rounded-xl transition">
                <a href={p.url} target="_blank" className="block">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="h-40 w-full bg-[#1A1C18] object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#2D4A22] to-[#6B4226] text-6xl">🛒</div>
                  )}
                </a>
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6B4226]">Store InfoCacciatore</p>
                  <h3 className="font-display mt-1 text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-[#3D3F38]">{p.description || "Prodotto disponibile nello store."}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <b>{p.price || "Vedi prezzo"}</b>
                    <a href={p.url} target="_blank" className="rounded-md border border-[#DDD4C0] px-3 py-2 hover:bg-[#E8DCC8]">🛒</a>
                  </div>
                </div>
              </article>
            )) : (
              <div className="card min-w-[260px] rounded-xl p-6">Caricamento prodotti store...</div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#1A1C18] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-white/10 bg-white/[.04] p-8 md:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">Controllo rapido</p>
            <h2 className="font-display mt-2 text-4xl font-bold">Posso cacciare oggi?</h2>
            <p className="mt-3 text-white/60">Controlla rapidamente se la specie selezionata risulta cacciabile nella tua zona.</p>
            <form onSubmit={quickCheck} className="mt-6 grid gap-3 md:grid-cols-4">
              <input value={checkForm.region} onChange={(e) => setCheckForm({ ...checkForm, region: e.target.value })} className="rounded-md bg-white/10 p-3 text-white outline-none" />
              <input value={checkForm.atc} onChange={(e) => setCheckForm({ ...checkForm, atc: e.target.value })} className="rounded-md bg-white/10 p-3 text-white outline-none" />
              <input value={checkForm.specie} onChange={(e) => setCheckForm({ ...checkForm, specie: e.target.value })} className="rounded-md bg-white/10 p-3 text-white outline-none" />
              <button className="rounded-md bg-[#4A5C2A] p-3 text-center font-bold" disabled={checking}>{checking ? "Controllo..." : "Verifica"}</button>
            </form>
            <p className="mt-4 text-xs text-white/35">Verificare sempre fonte ufficiale regionale, ATC e provvedimenti successivi.</p>
          </div>
          <div className={`rounded-2xl border p-8 ${checkResult ? (checkResult.ok ? "border-[#6B7C3E]/40 bg-[#4A5C2A]/20" : "border-red-500/40 bg-red-950/30") : "border-[#6B7C3E]/40 bg-[#4A5C2A]/20"}`}>
            <div className="text-4xl">{checkResult ? (checkResult.ok ? "✅" : "❌") : "✅"}</div>
            <h3 className={`font-display mt-3 text-2xl ${checkResult && !checkResult.ok ? "text-red-300" : "text-[#8DC84A]"}`}>{checkResult?.title || "Profilo territoriale"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {checkResult ? checkResult.text : (
                <>
                  Regione: <b>{region}</b><br />
                  ATC principale: <b>{atc}</b><br />
                  {secondary.length ? <>ATC secondari: <b>{secondary.join(", ")}</b></> : "Aggiungi eventuali ATC secondari dal profilo."}
                </>
              )}
            </p>
            {checkResult?.source && <a className="mt-4 inline-block font-bold text-white underline" href={checkResult.source} target="_blank">Fonte ufficiale →</a>}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0E8] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2D4A22]">Esplora il portale</p>
            <h2 className="font-display text-4xl font-bold">Tutto quello che ti serve, <span className="italic text-[#4A5C2A]">organizzato</span></h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {cards.map(([icon, title, desc, href]) => (
              <Link key={title} href={href} className="card rounded-xl p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="text-3xl">{icon}</div>
                <h3 className="font-display mt-4 text-2xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#3D3F38]">{desc}</p>
                <span className="mt-6 inline-block rounded-md bg-[#F5F0E8] px-3 py-2 text-sm font-bold">Apri →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#2D4A22] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">Area personale</p>
            <h2 className="font-display mt-2 text-4xl font-bold">Documenti, bollettini e scadenze</h2>
            <p className="mt-4 text-white/70">Carica tesserino, licenza, assicurazione, quote ATC e ricevute. Le scadenze vengono lette dal tuo account.</p>
            <Link href="/documenti-scadenze" className="mt-8 inline-block rounded-md bg-[#C4922A] px-6 py-3 font-bold text-[#1A1C18]">Gestisci scadenze</Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-6">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-white/45">Prossime scadenze</p>
            {expirations.length ? expirations.map((e) => {
              const dateValue = e.expiration_date || e.expires_at || e.due_date;
              return (
                <div key={e.id} className="mt-4 flex justify-between gap-4 border-b border-white/10 pb-3">
                  <span>{e.title || e.document_name || e.name || "Scadenza"}</span>
                  <b className={expiryColor(dateValue, e.payment_status)}>
                    {daysText(dateValue, e.payment_status)}
                  </b>
                </div>
              );
            }) : <div className="mt-4 rounded-xl bg-black/15 p-4 text-sm text-white/75">Nessuna scadenza registrata.</div>}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0E8] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2D4A22]">News H24</p>
              <h2 className="font-display text-4xl font-bold">Ultime notizie venatorie</h2>
              <p className="mt-2 text-[#3D3F38]">Aggiornamenti, comunicazioni e notizie dal mondo venatorio.</p>
            </div>
            <Link href="/news" className="font-bold text-[#2D4A22] hover:underline">Apri news →</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {news.length ? news.map((n) => (
              <article key={n.id} className="card rounded-xl p-6">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#C4922A]">{n.category || n.source || "News"}</p>
                <h3 className="mt-3 text-2xl font-black">{n.title}</h3>
                {n.url ? <a href={n.url} target="_blank" rel="noreferrer" className="mt-5 inline-block font-bold text-[#2D4A22]">Leggi fonte →</a> : null}
              </article>
            )) : <div className="card rounded-xl p-6 md:col-span-3">Nessuna notizia disponibile al momento.</div>}
          </div>
        </div>
      </section>

      <footer className="bg-[#12140F] px-6 py-10 text-center text-sm text-white/45">
        © 2026 Il Cacciatore — informazioni indicative, verificare sempre fonti ufficiali.
      </footer>
    </main>
  );
}

function detectMediaType(url: string, type?: string | null) {
  if (type && type !== "auto") return type;
  const clean = url.toLowerCase().split("?")[0];
  if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") || clean.endsWith(".mov")) return "video";
  if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com")) return "embed";
  return "image";
}

function embedUrl(url: string) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace("www.", "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.replace("/", "").split("/")[0]}`;
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === "embed" && parts[1]) return raw;
    }
    if (host.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return raw;
}

function HeroAd({ ad, slot, side }: { ad?: SiteAd; slot: number; side: "left" | "right" }) {
  const positionClass =
    side === "left"
      ? "left-[3vw] xl:left-[4vw] 2xl:left-[5vw]"
      : "right-[3vw] xl:right-[4vw] 2xl:right-[5vw]";

  const boxClass = `
    absolute top-12 hidden
    aspect-[9/16]
    h-[76vh] min-h-[620px] max-h-[760px]
    overflow-hidden rounded-[2rem]
    border border-[#C4922A]/35 bg-black/20 shadow-2xl
    xl:block
    ${positionClass}
  `;

  if (!ad?.image_url) {
    return (
      <div
        className={`${boxClass} pointer-events-none border-white/5 bg-white/[.02]`}
        aria-hidden="true"
      />
    );
  }

  const type = detectMediaType(ad.image_url, ad.media_type);

  const media =
    type === "video" ? (
      <video
        src={ad.image_url}
        autoPlay={ad.autoplay ?? true}
        muted={ad.muted ?? true}
        loop={ad.loop ?? true}
        controls
        playsInline
        className="h-full w-full object-cover"
      />
    ) : type === "embed" ? (
      <iframe
        src={embedUrl(ad.image_url)}
        title={ad.title || `Pubblicità ${slot}`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    ) : (
      <img
        src={ad.image_url}
        alt={ad.title || `Pubblicità ${slot}`}
        className="h-full w-full object-cover"
      />
    );

  return (
    <div className={boxClass}>
      {ad.link_url && type !== "embed" ? (
        <a href={ad.link_url} target="_blank" rel="noreferrer" className="block h-full w-full">
          {media}
        </a>
      ) : (
        media
      )}

    </div>
  );
}

function Stat({ icon, number, label }: { icon: string; number: number; label: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <b className="font-display text-2xl">{number}+</b>
        <p className="text-xs text-white/55">{label}</p>
      </div>
    </div>
  );
}
