"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const OWNER_EMAIL = "giallu2001@gmail.com";

type Profile = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  region?: string | null;
  atc?: string | null;
  primary_atc?: string | null;
  role?: string | null;
  is_banned?: boolean | null;
  created_at?: string | null;
};

type SiteAd = {
  id?: string;
  slot: number;
  title?: string | null;
  image_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
  is_published?: boolean | null;
  autoplay?: boolean | null;
  loop?: boolean | null;
  muted?: boolean | null;
  updated_at?: string | null;
};

type ContentSource = {
  id: string;
  name: string;
  source_type?: string | null;
  category?: string | null;
  section?: string | null;
  region?: string | null;
  atc_code?: string | null;
  rss_url?: string | null;
  site_url?: string | null;
  is_active?: boolean | null;
  last_fetch_at?: string | null;
  created_at?: string | null;
};

type Tab = "dashboard" | "users" | "news" | "notices" | "laws" | "ads" | "calendar" | "sources";

function value(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) || fallback).trim();
}

export default function AdminPage() {
  const [me, setMe] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [ads, setAds] = useState<SiteAd[]>([]);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, banned: 0, admins: 0, news: 0, atc: 0, species: 0, laws: 0, ads: 0, sources: 0 });
  const [calendarPreview, setCalendarPreview] = useState<any[]>([]);
  const [calendarRawText, setCalendarRawText] = useState("");
  const [calendarImporting, setCalendarImporting] = useState(false);
  const [calendarMeta, setCalendarMeta] = useState({ region: "Toscana", atc: "PI 14", season: "2026/2027", source_url: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    setMe(user || null);

    if (!user) { setLoading(false); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setMyProfile((prof ?? null) as Profile | null);

    const allowed = user.email === OWNER_EMAIL || (prof as Profile | null)?.role === "admin";
    if (!allowed) { setLoading(false); return; }

    const [profiles, news, atc, species, laws, siteAds, contentSources] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("news_articles").select("id", { count: "exact", head: true }),
      supabase.from("atc_areas").select("id", { count: "exact", head: true }),
      supabase.from("hunting_species").select("id", { count: "exact", head: true }),
      supabase.from("laws_archive").select("id", { count: "exact", head: true }),
      supabase.from("site_ads").select("*").order("slot", { ascending: true }),
      supabase.from("content_sources").select("*").order("created_at", { ascending: false }),
    ]);

    const allUsers = (profiles.data ?? []) as Profile[];
    const allAds = (siteAds.data ?? []) as SiteAd[];
    const allSources = (contentSources.data ?? []) as ContentSource[];
    setUsers(allUsers);
    setAds(allAds);
    setSources(allSources);
    setStats({
      users: allUsers.length,
      banned: allUsers.filter((u) => u.is_banned).length,
      admins: allUsers.filter((u) => u.role === "admin" || u.email === OWNER_EMAIL).length,
      news: news.count ?? 0,
      atc: atc.count ?? 0,
      species: species.count ?? 0,
      laws: laws.count ?? 0,
      ads: allAds.filter((a) => a.is_published).length,
      sources: allSources.filter((s) => s.is_active !== false).length,
    });
    setLoading(false);
  }

  const isOwner = me?.email === OWNER_EMAIL;
  const isAdmin = isOwner || myProfile?.role === "admin";

  async function updateUser(user: Profile, patch: Partial<Profile>) {
    setMessage("");
    if (user.email === OWNER_EMAIL) {
      setMessage("Operazione bloccata: il proprietario non può essere bannato o rimosso dagli admin.");
      return;
    }
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setMessage(error ? `Errore: ${error.message}` : "Utente aggiornato correttamente.");
    await load();
  }


  async function uploadAdFile(file: File, slot: number) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "media";
    const path = `slot-${slot}/${Date.now()}-${safeName}.${ext}`;
    const { error } = await supabase.storage.from("site-ads").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("site-ads").getPublicUrl(path);
    return data.publicUrl;
  }

  async function addNews(formData: FormData) {
    const payload = { title: value(formData, "title"), category: value(formData, "category", "News"), region: value(formData, "region"), source_url: value(formData, "source_url"), summary: value(formData, "summary"), published_at: new Date().toISOString() };
    if (!payload.title) { setMessage("Inserisci almeno il titolo."); return; }
    const { error } = await supabase.from("news_articles").insert(payload);
    setMessage(error ? `Errore: ${error.message}` : "News/Post aggiunto correttamente.");
    await load();
  }

  async function addNotice(formData: FormData) {
    const payload = { title: value(formData, "title"), category: value(formData, "category", "Avviso"), region: value(formData, "region"), source_url: value(formData, "source_url"), summary: value(formData, "summary"), published_at: new Date().toISOString() };
    if (!payload.title) { setMessage("Inserisci almeno il titolo dell'avviso."); return; }
    const { error } = await supabase.from("news_articles").insert(payload);
    setMessage(error ? `Errore: ${error.message}` : "Notifica/Avviso pubblicato correttamente.");
    await load();
  }

  async function addLaw(formData: FormData) {
    const payload = { title: value(formData, "title"), law_type: value(formData, "law_type", "Normativa"), region: value(formData, "region"), atc_code: value(formData, "atc_code"), source_url: value(formData, "source_url"), summary: value(formData, "summary") };
    if (!payload.title) { setMessage("Inserisci almeno il titolo della normativa/documento."); return; }
    const { error } = await supabase.from("laws_archive").insert(payload);
    setMessage(error ? `Errore: ${error.message}` : "Normativa/Documento aggiunto correttamente.");
    await load();
  }

  async function saveAd(formData: FormData) {
    setMessage("");
    const slot = Number(value(formData, "slot", "1"));
    let mediaUrl = value(formData, "image_url");
    let clickUrl = value(formData, "link_url");
    let selectedType = value(formData, "media_type", "auto");
    const file = formData.get("media_file");

    if (![1, 2].includes(slot)) { setMessage("Lo slot deve essere 1 o 2."); return; }

    try {
      if (file instanceof File && file.size > 0) {
        mediaUrl = await uploadAdFile(file, slot);
        if (file.type.startsWith("video/")) selectedType = "video";
        else if (file.type.includes("gif")) selectedType = "gif";
        else selectedType = "image";
      }

      const maybeMediaInClick = clickUrl && (clickUrl.includes("youtube.com") || clickUrl.includes("youtu.be") || clickUrl.includes("vimeo.com") || /\.(mp4|webm|ogg|gif|png|jpe?g|webp|mov)(\?|$)/i.test(clickUrl));
      if ((!mediaUrl || selectedType === "embed") && maybeMediaInClick) {
        mediaUrl = clickUrl;
        clickUrl = "";
      }

      const payload = {
        slot,
        title: value(formData, "title", `Pubblicità slot ${slot}`),
        image_url: mediaUrl,
        media_type: selectedType,
        link_url: clickUrl,
        is_published: formData.get("is_published") === "on",
        autoplay: formData.get("autoplay") === "on",
        loop: formData.get("loop") === "on",
        muted: formData.get("muted") === "on",
        updated_at: new Date().toISOString(),
      };
      if (!payload.image_url) { setMessage("Inserisci un URL oppure carica un file dal PC."); return; }
      const { error } = await supabase.from("site_ads").upsert(payload, { onConflict: "slot" });
      setMessage(error ? `Errore: ${error.message}` : `Pubblicità slot ${slot} salvata correttamente.`);
      await load();
    } catch (err: any) {
      setMessage(`Errore upload: ${err?.message || String(err)}. Controlla di aver eseguito lo SQL e creato il bucket site-ads.`);
    }
  }


  async function analyzeCalendar(formData: FormData) {
    setMessage("");
    setCalendarImporting(true);
    setCalendarPreview([]);

    try {
      const res = await fetch("/api/admin/import-calendar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Errore durante l'analisi del calendario.");
        return;
      }

      setCalendarPreview(json.rows || []);
      setCalendarRawText(json.rawText || "");
      setCalendarMeta({
        region: json.meta?.region || value(formData, "region", "Toscana"),
        atc: json.meta?.atc || value(formData, "atc", "PI 14"),
        season: json.meta?.season || value(formData, "season", "2026/2027"),
        source_url: json.meta?.source_url || value(formData, "pdf_url"),
      });
      setMessage(`Anteprima pronta: trovate ${json.rows?.length || 0} righe. Controlla i dati e poi conferma la pubblicazione.`);
    } catch (err: any) {
      setMessage(`Errore import calendario: ${err?.message || String(err)}`);
    } finally {
      setCalendarImporting(false);
    }
  }

  async function publishCalendarImport() {
    setMessage("");
    if (!calendarPreview.length) {
      setMessage("Prima analizza un PDF/link e genera l'anteprima.");
      return;
    }

    setCalendarImporting(true);
    try {
      const res = await fetch("/api/admin/import-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", rows: calendarPreview, meta: calendarMeta, rawText: calendarRawText }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMessage(json.error || "Errore durante la pubblicazione del calendario.");
        return;
      }

      setMessage(`Calendario pubblicato: ${json.inserted || 0} righe aggiornate in hunting_calendar_rules.`);
      await load();
    } catch (err: any) {
      setMessage(`Errore pubblicazione: ${err?.message || String(err)}`);
    } finally {
      setCalendarImporting(false);
    }
  }


  async function addSource(formData: FormData) {
    setMessage("");
    const rssUrl = value(formData, "rss_url");
    const siteUrl = value(formData, "site_url");
    const payload = {
      name: value(formData, "name"),
      source_type: value(formData, "source_type", rssUrl ? "rss" : "site"),
      category: value(formData, "category", "News"),
      section: value(formData, "section", "news"),
      region: value(formData, "region"),
      atc_code: value(formData, "atc_code"),
      url: rssUrl || siteUrl,
      rss_url: rssUrl,
      site_url: siteUrl,
      is_active: formData.get("is_active") === "on",
    };

    if (!payload.name || (!payload.rss_url && !payload.site_url)) {
      setMessage("Inserisci nome fonte e almeno un RSS/link sito.");
      return;
    }

    const { error } = await supabase.from("content_sources").insert(payload);
    setMessage(error ? `Errore fonte: ${error.message}` : "Fonte aggiunta correttamente.");
    await load();
  }

  async function toggleSource(source: ContentSource) {
    setMessage("");
    const { error } = await supabase.from("content_sources").update({ is_active: !source.is_active }).eq("id", source.id);
    setMessage(error ? `Errore: ${error.message}` : "Fonte aggiornata.");
    await load();
  }

  async function deleteSource(id: string) {
    setMessage("");
    const { error } = await supabase.from("content_sources").delete().eq("id", id);
    setMessage(error ? `Errore: ${error.message}` : "Fonte eliminata.");
    await load();
  }

  async function refreshNewsNow() {
    setMessage("");
    try {
      const res = await fetch("/api/news-refresh", { method: "POST" });
      const json = await res.json();
      setMessage(json.ok ? `Aggiornamento completato: ${json.inserted || 0} notizie nuove, ${json.skipped || 0} già presenti.` : (json.error || "Errore aggiornamento."));
      await load();
    } catch (err: any) {
      setMessage(`Errore aggiornamento: ${err?.message || String(err)}`);
    }
  }

  const tabs = useMemo<[Tab, string][]>(() => [
    ["dashboard", "Resoconto"],
    ["users", "Iscritti"],
    ["ads", "Pubblicità home"],
    ["calendar", "Importa calendario"],
    ["sources", "Fonti automatiche"],
    ["news", "News/Post"],
    ["notices", "Notifiche/Avvisi"],
    ["laws", "Leggi/Documenti"],
  ], []);

  if (loading) return <AdminShell><div className="rounded-2xl bg-white p-8 shadow">Caricamento pannello admin...</div></AdminShell>;
  if (!me) return <AdminShell><div className="rounded-2xl bg-white p-8 shadow"><h1 className="text-4xl font-black">Admin</h1><p className="mt-3">Devi accedere per entrare nel pannello.</p><Link href="/accedi" className="mt-6 inline-block rounded-xl bg-[#4A5C2A] px-6 py-3 font-bold text-white">Accedi</Link></div></AdminShell>;
  if (!isAdmin) return <AdminShell><div className="rounded-2xl bg-white p-8 shadow"><h1 className="text-4xl font-black">Accesso negato</h1><p className="mt-3">Questo account non è admin.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-[#4A5C2A] px-6 py-3 font-bold text-white">Torna alla home</Link></div></AdminShell>;

  return <AdminShell>
    <Link href="/" className="font-bold text-[#153b17]">← Home</Link>
    <p className="mt-8 text-xs font-bold uppercase tracking-[.3em] text-[#2D4A22]">Pannello admin</p>
    <h1 className="mt-2 text-5xl font-black">Gestione Il Cacciatore</h1>
    <p className="mt-3 text-[#3D3F38]">Accesso: <b>{me.email}</b></p>
    {message && <div className="mt-6 rounded-xl bg-[#E8DCC8] p-4 font-bold text-[#1A1C18]">{message}</div>}

    <div className="mt-8 flex flex-wrap gap-3">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-5 py-3 font-bold shadow ${tab === id ? "bg-[#4A5C2A] text-white" : "bg-white text-[#1A1C18]"}`}>{label}</button>)}</div>

    {tab === "dashboard" && <section className="mt-8 grid gap-5 md:grid-cols-4"><Stat label="Iscritti totali" value={stats.users} /><Stat label="Admin" value={stats.admins} /><Stat label="Bannati" value={stats.banned} /><Stat label="News/Post" value={stats.news} /><Stat label="ATC" value={stats.atc} /><Stat label="Specie" value={stats.species} /><Stat label="Leggi/fonti" value={stats.laws} /><Stat label="Pubblicità attive" value={stats.ads} /><Stat label="Fonti automatiche" value={stats.sources} /></section>}

    {tab === "users" && <UsersTable users={users} updateUser={updateUser} />}

    {tab === "ads" && <section className="mt-8 grid gap-6 lg:grid-cols-2">
      {[1, 2].map((slot) => <AdEditor key={slot} slot={slot} ad={ads.find((a) => a.slot === slot)} saveAd={saveAd} />)}
    </section>}

    {tab === "calendar" && <CalendarImportPanel
      analyzeCalendar={analyzeCalendar}
      publishCalendarImport={publishCalendarImport}
      previewRows={calendarPreview}
      importing={calendarImporting}
      meta={calendarMeta}
      setPreviewRows={setCalendarPreview}
      setMeta={setCalendarMeta}
    />}

    {tab === "sources" && <SourcesPanel
      sources={sources}
      addSource={addSource}
      toggleSource={toggleSource}
      deleteSource={deleteSource}
      refreshNewsNow={refreshNewsNow}
    />}

    {tab === "news" && <AdminForm title="Aggiungi news/post" action={addNews} fields={[["title", "Titolo"], ["category", "Categoria"], ["region", "Regione / ATC opzionale"], ["source_url", "Link fonte"], ["summary", "Testo/Riassunto"]]} />}
    {tab === "notices" && <AdminForm title="Aggiungi notifica/avviso" action={addNotice} fields={[["title", "Titolo avviso"], ["category", "Categoria"], ["region", "Regione / ATC opzionale"], ["source_url", "Link opzionale"], ["summary", "Testo avviso"]]} />}
    {tab === "laws" && <AdminForm title="Aggiungi normativa/documento" action={addLaw} fields={[["title", "Titolo"], ["law_type", "Tipo normativa"], ["region", "Regione"], ["atc_code", "ATC"], ["source_url", "Link fonte/PDF"], ["summary", "Descrizione/Riassunto"]]} />}
  </AdminShell>;
}

function UsersTable({ users, updateUser }: { users: Profile[]; updateUser: (user: Profile, patch: Partial<Profile>) => void }) {
  return <section className="mt-8 rounded-2xl bg-white p-6 shadow">
    <h2 className="text-3xl font-black">Resoconto iscritti</h2>
    <p className="mt-2 text-sm text-[#3D3F38]">Puoi bannare/sbannare utenti e nominare/rimuovere admin. Il proprietario è protetto.</p>
    <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b bg-[#F5F0E8]"><th className="p-3">Nome e cognome</th><th className="p-3">Email</th><th className="p-3">Telefono</th><th className="p-3">Regione / ATC</th><th className="p-3">Ruolo</th><th className="p-3">Azioni</th></tr></thead><tbody>
      {users.map((u) => { const owner = u.email === OWNER_EMAIL; return <tr key={u.id} className="border-b align-top"><td className="p-3 font-bold">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}</td><td className="p-3">{u.email || "-"}</td><td className="p-3">{u.phone || "-"}</td><td className="p-3">{u.region || "-"} · {u.primary_atc || u.atc || "-"}</td><td className="p-3"><span className="rounded-full bg-[#E8DCC8] px-3 py-1 text-xs font-black text-[#2D4A22]">{owner ? "Proprietario" : u.role || "user"}</span>{u.is_banned ? <span className="ml-2 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">Bannato</span> : null}</td><td className="flex flex-wrap gap-2 p-3"><button disabled={owner} onClick={() => updateUser(u, { is_banned: !u.is_banned })} className="rounded bg-[#9c4141] px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{u.is_banned ? "Sbanna" : "Banna"}</button><button disabled={owner} onClick={() => updateUser(u, { role: u.role === "admin" ? "user" : "admin" })} className="rounded bg-[#4A5C2A] px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{u.role === "admin" ? "Rimuovi admin" : "Rendi admin"}</button></td></tr>; })}
    </tbody></table></div>
  </section>;
}

function detectMediaType(url: string) {
  const clean = url.toLowerCase().split("?")[0];
  if (!url) return "auto";
  if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg")) return "video";
  if (clean.includes("youtube.com") || clean.includes("youtu.be") || clean.includes("vimeo.com")) return "embed";
  if (clean.endsWith(".gif")) return "gif";
  return "image";
}

function embedUrl(url: string) {
  if (url.includes("youtu.be/")) return `https://www.youtube.com/embed/${url.split("youtu.be/")[1]?.split(/[?&]/)[0] || ""}`;
  if (url.includes("watch?v=")) return `https://www.youtube.com/embed/${url.split("watch?v=")[1]?.split(/[?&]/)[0] || ""}`;
  return url;
}

function MediaPreview({ url, title, type, autoplay = true, loop = true, muted = true }: { url: string; title: string; type?: string; autoplay?: boolean; loop?: boolean; muted?: boolean }) {
  const finalType = type && type !== "auto" ? type : detectMediaType(url);
  const box = "aspect-[9/16] w-full max-w-[360px] mx-auto rounded-[1.6rem] overflow-hidden bg-[#151914]";
  if (!url) return <div className={`${box} flex items-center justify-center border border-dashed border-white/30 text-center text-white/50`}>Inserisci URL media oppure carica un file dal PC</div>;
  if (finalType === "video") return <video src={url} controls autoPlay={autoplay} muted={muted} loop={loop} playsInline className={`${box} object-cover`} />;
  if (finalType === "embed") return <iframe src={embedUrl(url)} title={title} className={box} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  return <img src={url} alt={title} className={`${box} object-cover`} />;
}

function AdEditor({ slot, ad, saveAd }: { slot: number; ad?: SiteAd; saveAd: (data: FormData) => void }) {
  const [preview, setPreview] = useState({ title: ad?.title || `Pubblicità slot ${slot}`, image_url: ad?.image_url || "", media_type: ad?.media_type || "auto", link_url: ad?.link_url || "", is_published: !!ad?.is_published, autoplay: ad?.autoplay ?? true, loop: ad?.loop ?? true, muted: ad?.muted ?? true });
  return <div className="rounded-2xl bg-white p-6 shadow">
    <h2 className="text-3xl font-black">Slot pubblicità {slot}</h2>
    <p className="mt-2 text-sm text-[#3D3F38]">Anteprima prima della pubblicazione. Puoi inserire immagini, GIF, video MP4/WebM/MOV caricati dal PC oppure link YouTube/Vimeo. Gli slot sono in formato 9:16.</p>
    <form action={saveAd} className="mt-6 grid gap-4">
      <input type="hidden" name="slot" value={slot} />
      <input name="title" value={preview.title} onChange={(e) => setPreview({ ...preview, title: e.target.value })} placeholder="Titolo interno" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
      <input name="image_url" value={preview.image_url} onChange={(e) => setPreview({ ...preview, image_url: e.target.value })} placeholder="URL CONTENUTO da mostrare: immagine, GIF, video MP4/WebM, YouTube/Vimeo" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
      <label className="rounded-xl border border-dashed border-[#C4922A] bg-[#FFF8E8] p-4 font-bold text-[#1A1C18]">
        Carica file dal PC
        <input name="media_file" type="file" accept="image/*,video/*,.gif,.mp4,.webm,.mov" className="mt-3 block w-full text-sm" onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const localUrl = URL.createObjectURL(f);
          setPreview({ ...preview, image_url: localUrl, media_type: f.type.startsWith("video/") ? "video" : f.type.includes("gif") ? "gif" : "image" });
        }} />
        <span className="mt-2 block text-xs font-normal text-[#3D3F38]">Quando salvi, il file viene caricato su Supabase Storage e poi pubblicato nella home.</span>
      </label>
      <select name="media_type" value={preview.media_type} onChange={(e) => setPreview({ ...preview, media_type: e.target.value })} className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]">
        <option value="auto">Rileva automaticamente</option>
        <option value="image">Immagine / GIF</option>
        <option value="video">Video da URL o file PC</option>
        <option value="embed">Embed YouTube/Vimeo</option>
      </select>
      <input name="link_url" value={preview.link_url} onChange={(e) => setPreview({ ...preview, link_url: e.target.value })} placeholder="Link quando cliccano la pubblicità" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
      <div className="grid gap-3 rounded-xl bg-[#F5F0E8] p-4 font-bold md:grid-cols-2">
        <label className="flex items-center gap-3"><input type="checkbox" name="is_published" checked={preview.is_published} onChange={(e) => setPreview({ ...preview, is_published: e.target.checked })} /> Pubblica sul sito</label>
        <label className="flex items-center gap-3"><input type="checkbox" name="autoplay" checked={preview.autoplay} onChange={(e) => setPreview({ ...preview, autoplay: e.target.checked })} /> Autoplay</label>
        <label className="flex items-center gap-3"><input type="checkbox" name="loop" checked={preview.loop} onChange={(e) => setPreview({ ...preview, loop: e.target.checked })} /> Loop infinito</label>
        <label className="flex items-center gap-3"><input type="checkbox" name="muted" checked={preview.muted} onChange={(e) => setPreview({ ...preview, muted: e.target.checked })} /> Senza audio</label>
      </div>
      <div className="rounded-2xl border border-[#DDD4C0] bg-[#101510] p-4 text-white"><p className="mb-3 text-xs font-black uppercase tracking-[.2em] text-[#C4922A]">Anteprima 9:16</p><MediaPreview url={preview.image_url} title={preview.title} type={preview.media_type} autoplay={preview.autoplay} loop={preview.loop} muted={preview.muted} /><p className="mt-3 font-bold">{preview.title}</p>{preview.link_url && <p className="text-xs text-white/60">Click: {preview.link_url}</p>}</div>
      <button className="rounded-xl bg-[#4A5C2A] px-6 py-4 font-bold text-white hover:bg-[#3f642f]">Salva slot {slot}</button>
    </form>
  </div>;
}



function SourcesPanel({
  sources,
  addSource,
  toggleSource,
  deleteSource,
  refreshNewsNow,
}: {
  sources: ContentSource[];
  addSource: (data: FormData) => void;
  toggleSource: (source: ContentSource) => void;
  deleteSource: (id: string) => void;
  refreshNewsNow: () => void;
}) {
  return <section className="mt-8 grid gap-6">
    <div className="rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#4A5C2A]">Aggiornamento automatico</p>
          <h2 className="mt-2 text-3xl font-black">Fonti giornaliere news, ATC e categorie</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#3D3F38]">
            Inserisci RSS o link delle fonti ufficiali. Ogni giorno il cron richiama <b>/api/news-refresh</b>,
            scarica le notizie nuove e le salva in <b>news_articles</b>. Le pagine News, Cerca e Home si aggiornano automaticamente.
          </p>
        </div>
        <button onClick={refreshNewsNow} className="rounded-xl bg-[#C4922A] px-6 py-3 font-black text-[#101510] hover:bg-[#d7aa3b]">
          Aggiorna ora
        </button>
      </div>

      <form action={addSource} className="mt-6 grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input name="name" placeholder="Nome fonte, es. Regione Toscana" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
          <select name="source_type" defaultValue="rss" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]">
            <option value="rss">RSS</option>
            <option value="site">Sito web</option>
            <option value="atc">ATC</option>
            <option value="pdf">PDF</option>
          </select>
          <select name="section" defaultValue="news" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]">
            <option value="news">News generali</option>
            <option value="atc">ATC</option>
            <option value="calendario">Calendario venatorio</option>
            <option value="leggi">Leggi/documenti</option>
            <option value="specie">Specie/fauna</option>
            <option value="store">Store/partner</option>
          </select>
          <input name="category" placeholder="Categoria, es. ATC / Peste suina / Gare" defaultValue="News" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="region" placeholder="Regione opzionale" defaultValue="Toscana" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
          <input name="atc_code" placeholder="ATC opzionale, es. PI 14" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
        </div>
        <input name="rss_url" placeholder="URL RSS consigliato" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
        <input name="site_url" placeholder="URL sito/fonte alternativa" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
        <label className="flex items-center gap-3 rounded-xl bg-[#F5F0E8] p-4 font-bold">
          <input type="checkbox" name="is_active" defaultChecked /> Fonte attiva
        </label>
        <button className="rounded-xl bg-[#4A5C2A] px-6 py-4 font-bold text-white hover:bg-[#3f642f]">
          Salva fonte
        </button>
      </form>
    </div>

    <div className="rounded-2xl bg-white p-6 shadow">
      <h3 className="text-3xl font-black">Fonti salvate</h3>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b bg-[#F5F0E8]">
              <th className="p-3">Fonte</th>
              <th className="p-3">Tipo</th><th className="p-3">Sezione</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Regione / ATC</th>
              <th className="p-3">Ultimo aggiornamento</th>
              <th className="p-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {sources.length ? sources.map((s) => (
              <tr key={s.id} className="border-b align-top">
                <td className="p-3">
                  <b>{s.name}</b>
                  <p className="mt-1 max-w-[320px] truncate text-xs text-[#3D3F38]">{s.rss_url || s.site_url || s.url}</p>
                </td>
                <td className="p-3">{s.source_type || "-"}</td><td className="p-3">{s.section || "news"}</td>
                <td className="p-3">{s.category || "News"}</td>
                <td className="p-3">{s.region || "-"} · {s.atc_code || "-"}</td>
                <td className="p-3">{s.last_fetch_at ? new Date(s.last_fetch_at).toLocaleString("it-IT") : "Mai"}</td>
                <td className="flex flex-wrap gap-2 p-3">
                  <button onClick={() => toggleSource(s)} className="rounded bg-[#4A5C2A] px-3 py-2 text-sm font-bold text-white">
                    {s.is_active === false ? "Attiva" : "Disattiva"}
                  </button>
                  <button onClick={() => deleteSource(s.id)} className="rounded bg-red-900/70 px-3 py-2 text-sm font-bold text-white">
                    Elimina
                  </button>
                </td>
              </tr>
            )) : <tr><td className="p-6 text-[#3D3F38]" colSpan={7}>Nessuna fonte salvata. Aggiungi RSS ufficiali o fonti attendibili.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}


function CalendarImportPanel({
  analyzeCalendar,
  publishCalendarImport,
  previewRows,
  importing,
  meta,
  setPreviewRows,
  setMeta,
}: {
  analyzeCalendar: (data: FormData) => void;
  publishCalendarImport: () => void;
  previewRows: any[];
  importing: boolean;
  meta: any;
  setPreviewRows: (rows: any[]) => void;
  setMeta: (meta: any) => void;
}) {
  function updateRow(index: number, key: string, val: string) {
    const copy = [...previewRows];
    copy[index] = { ...copy[index], [key]: val };
    setPreviewRows(copy);
  }

  function removeRow(index: number) {
    setPreviewRows(previewRows.filter((_, i) => i !== index));
  }

  function addEmptyRow() {
    setPreviewRows([
      ...previewRows,
      {
        region: meta.region || "Toscana",
        atc_code: meta.atc || "PI 14",
        season: meta.season || "2026/2027",
        species_name: "",
        opening_date: "",
        closing_date: "",
        allowed_days: "",
        daily_hours: "",
        daily_bag_limit: "",
        seasonal_bag_limit: "",
        hunting_type: "",
        restrictions: "",
        notes: "",
        source_url: meta.source_url || "",
      },
    ]);
  }

  return <section className="mt-8 grid gap-6">
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-[#4A5C2A]">Calendario venatorio</p>
      <h2 className="mt-2 text-3xl font-black">Importa calendario da PDF o link</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#3D3F38]">
        Carica il PDF ufficiale o incolla il link. Il sistema estrae una bozza, ti mostra l'anteprima e pubblica solo quando confermi.
        Le righe confermate aggiornano la tabella <b>hunting_calendar_rules</b>, usata da home, carniere e ricerca.
      </p>

      <form action={analyzeCalendar} className="mt-6 grid gap-4">
        <input type="hidden" name="action" value="preview" />
        <div className="grid gap-3 md:grid-cols-3">
          <input name="region" defaultValue={meta.region || "Toscana"} placeholder="Regione" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
          <input name="atc" defaultValue={meta.atc || "PI 14"} placeholder="ATC / Provincia" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
          <input name="season" defaultValue={meta.season || "2026/2027"} placeholder="Stagione, es. 2026/2027" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />
        </div>

        <input name="pdf_url" defaultValue={meta.source_url || ""} placeholder="Link PDF ufficiale Regione/ATC" className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />

        <label className="rounded-xl border border-dashed border-[#C4922A] bg-[#FFF8E8] p-4 font-bold text-[#1A1C18]">
          Carica PDF dal PC
          <input name="pdf_file" type="file" accept=".pdf,text/plain" className="mt-3 block w-full text-sm" />
          <span className="mt-2 block text-xs font-normal text-[#3D3F38]">
            Se il PDF ha tabelle scansionate o testo non estraibile, incolla sotto il testo copiato dal PDF.
          </span>
        </label>

        <textarea
          name="calendar_text"
          placeholder="Opzionale: incolla qui il testo del calendario venatorio copiato dal PDF per migliorare l'estrazione."
          className="min-h-40 rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]"
        />

        <button disabled={importing} className="rounded-xl bg-[#4A5C2A] px-6 py-4 font-bold text-white hover:bg-[#3f642f] disabled:opacity-60">
          {importing ? "Analisi in corso..." : "Analizza PDF / Link"}
        </button>
      </form>
    </div>

    {previewRows.length > 0 && <div className="rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#C4922A]">Anteprima prima della pubblicazione</p>
          <h3 className="mt-2 text-3xl font-black">Righe estratte: {previewRows.length}</h3>
          <p className="mt-1 text-sm text-[#3D3F38]">Correggi eventuali errori qui sotto, poi clicca “Pubblica calendario”.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={addEmptyRow} className="rounded-xl border border-[#DDD4C0] bg-[#F5F0E8] px-5 py-3 font-bold text-[#2D4A22]">+ Riga manuale</button>
          <button type="button" onClick={publishCalendarImport} disabled={importing} className="rounded-xl bg-[#C4922A] px-6 py-3 font-black text-[#101510] hover:bg-[#d7aa3b] disabled:opacity-60">
            {importing ? "Pubblicazione..." : "Pubblica calendario"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {previewRows.map((row, i) => <div key={i} className="rounded-2xl border border-[#DDD4C0] bg-[#F9F5EC] p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input value={row.species_name || ""} onChange={(e) => updateRow(i, "species_name", e.target.value)} placeholder="Specie" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.opening_date || ""} onChange={(e) => updateRow(i, "opening_date", e.target.value)} placeholder="Apertura YYYY-MM-DD" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.closing_date || ""} onChange={(e) => updateRow(i, "closing_date", e.target.value)} placeholder="Chiusura YYYY-MM-DD" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.daily_bag_limit || ""} onChange={(e) => updateRow(i, "daily_bag_limit", e.target.value)} placeholder="Capi giornalieri" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.region || ""} onChange={(e) => updateRow(i, "region", e.target.value)} placeholder="Regione" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.atc_code || ""} onChange={(e) => updateRow(i, "atc_code", e.target.value)} placeholder="ATC" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.season || ""} onChange={(e) => updateRow(i, "season", e.target.value)} placeholder="Stagione" className="rounded-lg border border-[#DDD4C0] p-3" />
            <input value={row.daily_hours || ""} onChange={(e) => updateRow(i, "daily_hours", e.target.value)} placeholder="Orari" className="rounded-lg border border-[#DDD4C0] p-3" />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <textarea value={row.allowed_days || ""} onChange={(e) => updateRow(i, "allowed_days", e.target.value)} placeholder="Giorni consentiti" className="min-h-20 rounded-lg border border-[#DDD4C0] p-3" />
            <textarea value={row.notes || ""} onChange={(e) => updateRow(i, "notes", e.target.value)} placeholder="Note / restrizioni" className="min-h-20 rounded-lg border border-[#DDD4C0] p-3" />
          </div>
          <button type="button" onClick={() => removeRow(i)} className="mt-3 rounded-lg bg-red-900/70 px-4 py-2 font-bold text-white hover:bg-red-900">Rimuovi riga</button>
        </div>)}
      </div>
    </div>}
  </section>;
}


function AdminShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#101510]"><div className="mx-auto max-w-7xl">{children}</div></main>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-white p-6 shadow"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">{label}</p><b className="mt-3 block text-4xl">{value}</b></div>; }
function AdminForm({ title, action, fields }: { title: string; action: (data: FormData) => void; fields: string[][] }) { return <section className="mt-8 rounded-2xl bg-white p-6 shadow"><h2 className="text-3xl font-black">{title}</h2><form action={action} className="mt-6 grid gap-4">{fields.map(([name, placeholder]) => name === "summary" || name === "description" ? <textarea key={name} name={name} placeholder={placeholder} className="min-h-32 rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" /> : <input key={name} name={name} placeholder={placeholder} className="rounded-xl border border-[#DDD4C0] p-4 outline-none focus:border-[#4A5C2A]" />)}<button className="rounded-xl bg-[#4A5C2A] px-6 py-4 font-bold text-white hover:bg-[#3f642f]">Salva</button></form></section>; }
