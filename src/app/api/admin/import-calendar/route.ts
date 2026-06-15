import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

type CalendarRow = {
  region: string;
  atc_code: string;
  season: string;
  species_name: string;
  opening_date: string | null;
  closing_date: string | null;
  allowed_days: string | null;
  daily_hours: string | null;
  daily_bag_limit: string | null;
  seasonal_bag_limit: string | null;
  hunting_type: string | null;
  restrictions: string | null;
  notes: string | null;
  source_url: string | null;
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

function cleanText(input: string) {
  return input
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalize(input: unknown) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toDate(raw: string, season: string) {
  const value = raw.trim().replace(/[.]/g, "/");
  const match = value.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = match[3] ? Number(match[3]) : NaN;

  if (year < 100) year += 2000;
  if (!year) {
    const years = season.match(/(20\d{2})\D+(20\d{2})/);
    if (years) {
      const startYear = Number(years[1]);
      const endYear = Number(years[2]);
      year = month >= 6 ? startYear : endYear;
    } else {
      year = new Date().getFullYear();
    }
  }

  if (!day || !month || !year) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const knownSpecies = [
  "Colombaccio",
  "Beccaccia",
  "Tordo bottaccio",
  "Tordo sassello",
  "Cesena",
  "Merlo",
  "Fagiano",
  "Lepre",
  "Cinghiale",
  "Volpe",
  "Alzavola",
  "Germano reale",
  "Marzaiola",
  "Mestolone",
  "Canapiglia",
  "Codone",
  "Fischione",
  "Moriglione",
  "Folaga",
  "Gallinella d'acqua",
  "Porciglione",
  "Quaglia",
  "Tortora",
  "Cornacchia grigia",
  "Gazza",
  "Ghiandaia",
  "Starna",
  "Pernice rossa",
];

function speciesInLine(line: string) {
  const n = normalize(line);
  return knownSpecies.find((s) => n.includes(normalize(s)));
}

function extractBag(line: string) {
  const m = line.match(/(?:capi?|carniere|giornalier[oa]|max|massimo|limite)[^\d]{0,20}(\d{1,3})/i) || line.match(/(\d{1,3})\s*(?:capi?)/i);
  return m ? `${m[1]} capi/giorno` : "";
}

function extractHours(line: string) {
  const m = line.match(/((?:da|dalle)\s+[^.;,\n]{3,80}(?:tramonto|sole|ore\s*\d{1,2}[:.]\d{2}|[.;,]))/i);
  if (m) return m[1].replace(/[.;,]$/, "").trim();
  if (/alba|tramonto|sorgere|sole/i.test(line)) return line.slice(0, 180);
  return "";
}

function parseCalendarText(text: string, meta: { region: string; atc: string; season: string; source_url: string }) {
  const rows: CalendarRow[] = [];
  const lines = cleanText(text).split(/\n/).map((x) => x.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const species = speciesInLine(line);
    if (!species) continue;

    const windowText = [line, lines[i + 1] || "", lines[i + 2] || ""].join(" ");
    const dateMatches = Array.from(windowText.matchAll(/(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)/g)).map((m) => m[1]);
    if (dateMatches.length < 2) continue;

    const opening = toDate(dateMatches[0], meta.season);
    const closing = toDate(dateMatches[1], meta.season);

    rows.push({
      region: meta.region,
      atc_code: meta.atc,
      season: meta.season,
      species_name: species,
      opening_date: opening,
      closing_date: closing,
      allowed_days: /martedi|martedì|venerdi|venerdì|silenzio/i.test(windowText) ? windowText.slice(0, 220) : "Secondo calendario venatorio ufficiale e disposizioni ATC.",
      daily_hours: extractHours(windowText) || "Secondo orario venatorio ufficiale della giornata.",
      daily_bag_limit: extractBag(windowText) || "",
      seasonal_bag_limit: "",
      hunting_type: "Secondo calendario venatorio ufficiale.",
      restrictions: "",
      notes: windowText.slice(0, 350),
      source_url: meta.source_url || null,
    });
  }

  // dedupe by species/date
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.region}|${r.atc_code}|${r.season}|${r.species_name}|${r.opening_date}|${r.closing_date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function textFromRequest(formData: FormData) {
  let rawText = String(formData.get("calendar_text") || "");
  const pdfUrl = String(formData.get("pdf_url") || "").trim();
  const file = formData.get("pdf_file");

  if (file instanceof File && file.size > 0) {
    const fileText = await file.text();
    rawText += "\n" + fileText;
  }

  if (pdfUrl) {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`Impossibile scaricare il PDF/link: ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text") || pdfUrl.endsWith(".txt")) {
      rawText += "\n" + await res.text();
    } else {
      const buffer = await res.arrayBuffer();
      const decoded = Buffer.from(buffer).toString("latin1");
      rawText += "\n" + decoded;
    }
  }

  return cleanText(rawText);
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.action !== "publish") {
        return NextResponse.json({ ok: false, error: "Azione JSON non valida." }, { status: 400 });
      }

      const rows = (body.rows || []) as CalendarRow[];
      const meta = body.meta || {};
      if (!rows.length) {
        return NextResponse.json({ ok: false, error: "Nessuna riga da pubblicare." }, { status: 400 });
      }

      const db = supabaseAdmin();
      const region = meta.region || rows[0]?.region;
      const season = meta.season || rows[0]?.season;

      // Sostituisce la stagione/regione importata. Così eviti duplicati quando re-importi il calendario nuovo.
      if (region && season) {
        await db.from("hunting_calendar_rules").delete().eq("region", region).eq("season", season);
      }

      const payload = rows
        .filter((r) => r.species_name)
        .map((r) => ({
          region: r.region || region || "Toscana",
          atc_code: r.atc_code || meta.atc || null,
          season: r.season || season || null,
          species_name: r.species_name,
          opening_date: r.opening_date || null,
          closing_date: r.closing_date || null,
          allowed_days: r.allowed_days || null,
          daily_hours: r.daily_hours || null,
          daily_bag_limit: r.daily_bag_limit || null,
          seasonal_bag_limit: r.seasonal_bag_limit || null,
          hunting_type: r.hunting_type || null,
          restrictions: r.restrictions || null,
          notes: r.notes || null,
          source_url: r.source_url || meta.source_url || null,
        }));

      const { error } = await db.from("hunting_calendar_rules").insert(payload);
      if (error) throw error;

      return NextResponse.json({ ok: true, inserted: payload.length });
    }

    const formData = await req.formData();
    const meta = {
      region: String(formData.get("region") || "Toscana").trim(),
      atc: String(formData.get("atc") || "PI 14").trim(),
      season: String(formData.get("season") || "2026/2027").trim(),
      source_url: String(formData.get("pdf_url") || "").trim(),
    };

    const rawText = await textFromRequest(formData);
    const rows = parseCalendarText(rawText, meta);

    return NextResponse.json({
      ok: true,
      meta,
      rows,
      rawText: rawText.slice(0, 20000),
      warning: rows.length ? null : "Non ho trovato righe sicure. Prova a incollare il testo del PDF nel campo manuale e rilancia l'analisi.",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
