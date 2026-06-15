"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Document = {
  id: string;
  document_type: string;
  document_name: string;
  expiration_date: string | null;
  payment_date: string | null;
  amount: number | null;
  payment_status: string | null;
  notes: string | null;
};

const DOCUMENT_TYPES = [
  { value: "porto_armi", label: "Porto d'armi", defaultName: "Porto d'armi", rule: "Validità 5 anni dalla data di rilascio/pagamento." },
  { value: "assicurazione", label: "Assicurazione venatoria", defaultName: "Assicurazione venatoria", rule: "Durata 365 giorni dalla data di attivazione." },
  { value: "quota_atc", label: "Quota ATC", defaultName: "Quota ATC", rule: "Validità annuale: dal 15 maggio al 14 maggio dell'anno successivo." },
  { value: "concessione_governativa", label: "Concessione governativa", defaultName: "Concessione governativa", rule: "Da versare annualmente prima dell'utilizzo dell'arma." },
  { value: "tassa_regionale", label: "Tassa regionale", defaultName: "Tassa regionale", rule: "Da versare annualmente prima dell'attività venatoria." },
  { value: "tesserino", label: "Tesserino venatorio", defaultName: "Tesserino venatorio", rule: "Scadenza da indicare in base alla consegna/restituzione prevista." },
  { value: "bollettino", label: "Bollettino generico", defaultName: "Bollettino", rule: "Imposta manualmente pagamento e scadenza." },
  { value: "altro", label: "Altro", defaultName: "", rule: "Imposta manualmente pagamento e scadenza." },
];

function addDays(dateString: string, days: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addYears(dateString: string, years: number) {
  const date = new Date(dateString + "T00:00:00");
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function atcExpiration(paymentDate: string) {
  const paid = new Date(paymentDate + "T00:00:00");
  const year = paid.getFullYear();
  const may14ThisYear = new Date(year, 4, 14);
  const expYear = paid <= may14ThisYear ? year : year + 1;
  return `${expYear}-05-14`;
}

function calculateExpiration(type: string, paymentDate: string) {
  if (!paymentDate) return "";
  if (type === "porto_armi") return addYears(paymentDate, 5);
  if (type === "assicurazione") return addDays(paymentDate, 365);
  if (type === "quota_atc") return atcExpiration(paymentDate);
  if (type === "concessione_governativa") return addYears(paymentDate, 1);
  if (type === "tassa_regionale") return addYears(paymentDate, 1);
  return "";
}

function formatDate(value: string | null) {
  if (!value) return "non impostata";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT");
}

function daysLeft(expirationDate: string | null) {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate + "T00:00:00");
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function statusLabel(expirationDate: string | null, paymentStatus?: string | null) {
  if (paymentStatus === "da_pagare") return "Da pagare";
  const diff = daysLeft(expirationDate);
  if (diff === null) return "Nessuna scadenza";
  if (diff < 0) return "Scaduto";
  if (diff === 0) return "Scade oggi";
  if (diff === 1) return "Scade domani";
  if (diff <= 30) return `Tra ${diff} giorni`;
  return "Valido";
}

function statusClass(expirationDate: string | null, paymentStatus?: string | null) {
  if (paymentStatus === "da_pagare") return "bg-yellow-100 text-yellow-800";
  const diff = daysLeft(expirationDate);
  if (diff === null) return "bg-[#E8DCC8] text-[#2D4A22]";
  if (diff < 0) return "bg-red-100 text-red-800";
  if (diff <= 30) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function typeLabel(value: string) {
  return DOCUMENT_TYPES.find((x) => x.value === value)?.label ?? value;
}

function paymentLabel(value: string | null) {
  if (value === "pagato") return "Pagato";
  if (value === "da_pagare") return "Da pagare";
  if (value === "non_applicabile") return "Non applicabile";
  return "n/d";
}

function paymentAdvice(doc: Document) {
  if (doc.payment_status === "pagato") return `Pagato il ${formatDate(doc.payment_date)}`;
  if (doc.expiration_date) return `Da pagare entro il ${formatDate(doc.expiration_date)}`;
  return "Pagamento da completare";
}

export default function DocumentiScadenzePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("");

  const [documentType, setDocumentType] = useState("porto_armi");
  const [documentName, setDocumentName] = useState("Porto d'armi");
  const [paymentDate, setPaymentDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("da_pagare");
  const [notes, setNotes] = useState("");

  const selectedType = useMemo(() => DOCUMENT_TYPES.find((x) => x.value === documentType) ?? DOCUMENT_TYPES[0], [documentType]);

  const summary = useMemo(() => {
    const toPay = documents.filter((d) => d.payment_status === "da_pagare").length;
    const expiring = documents.filter((d) => {
      const diff = daysLeft(d.expiration_date);
      return diff !== null && diff >= 0 && diff <= 30;
    }).length;
    const expired = documents.filter((d) => {
      const diff = daysLeft(d.expiration_date);
      return diff !== null && diff < 0;
    }).length;
    return { total: documents.length, toPay, expiring, expired };
  }, [documents]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.push("/accedi");
        return;
      }

      setUserId(user.id);
      await loadDocuments(user.id);
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadDocuments(uid: string) {
    const { data, error } = await supabase
      .from("hunter_documents")
      .select("id, document_type, document_name, expiration_date, payment_date, amount, payment_status, notes")
      .eq("user_id", uid)
      .order("expiration_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!error) setDocuments((data ?? []) as Document[]);
  }

  function applyType(type: string) {
    const item = DOCUMENT_TYPES.find((x) => x.value === type);
    setDocumentType(type);
    if (item?.defaultName) setDocumentName(item.defaultName);
    if (paymentDate) {
      const calculated = calculateExpiration(type, paymentDate);
      if (calculated) setExpirationDate(calculated);
    }
  }

  function handlePaymentDate(value: string) {
    setPaymentDate(value);
    const calculated = calculateExpiration(documentType, value);
    if (calculated) setExpirationDate(calculated);
  }

  function quickSelect(type: string) {
    applyType(type);
    const item = DOCUMENT_TYPES.find((x) => x.value === type);
    if (item?.defaultName) setDocumentName(item.defaultName);
  }

  async function saveDocument(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!userId) return;

    if (!documentName.trim()) {
      setMessage("Inserisci almeno il nome del documento.");
      return;
    }

    const { error } = await supabase.from("hunter_documents").insert({
      user_id: userId,
      document_type: documentType,
      document_name: documentName.trim(),
      payment_date: paymentDate || null,
      expiration_date: expirationDate || null,
      amount: amount ? Number(amount.replace(",", ".")) : null,
      payment_status: paymentStatus,
      notes: notes || null,
      reminder_enabled: true,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setDocumentType("porto_armi");
    setDocumentName("Porto d'armi");
    setPaymentDate("");
    setExpirationDate("");
    setAmount("");
    setPaymentStatus("da_pagare");
    setNotes("");
    setMessage("Documento salvato correttamente.");
    await loadDocuments(userId);
  }

  async function deleteDocument(id: string) {
    if (!userId) return;
    await supabase.from("hunter_documents").delete().eq("id", id).eq("user_id", userId);
    await loadDocuments(userId);
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F5F0E8] p-10">Caricamento...</main>;
  }

  return (
    <main className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#1A1C18]">
      <div className="mx-auto mb-8 flex max-w-7xl items-center justify-between">
        <Link href="/profilo" className="font-bold text-[#2D4A22]">← Profilo</Link>
        <Link href="/" className="font-bold text-[#2D4A22]">Home</Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[430px_1fr]">
        <section className="rounded-2xl border border-[#DDD4C0] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#4A5C2A]">Area personale</p>
          <h1 className="mt-3 text-4xl font-black">Aggiungi documento</h1>
          <p className="mt-3 text-sm text-[#3D3F38]">
            Inserisci pagamento e scadenza dei documenti venatori. La scadenza viene calcolata automaticamente quando possibile.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {DOCUMENT_TYPES.filter((x) => ["porto_armi", "assicurazione", "quota_atc", "concessione_governativa", "tassa_regionale"].includes(x.value)).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => quickSelect(item.value)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-bold ${documentType === item.value ? "border-[#4A5C2A] bg-[#4A5C2A] text-white" : "border-[#DDD4C0] bg-[#F5F0E8] text-[#2D4A22] hover:bg-[#E8DCC8]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={saveDocument} className="mt-6 space-y-4">
            <select value={documentType} onChange={(e) => applyType(e.target.value)} className="w-full rounded-lg border border-[#DDD4C0] p-4">
              {DOCUMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <div className="rounded-lg bg-[#F5F0E8] p-3 text-xs leading-5 text-[#3D3F38]">
              <b>Regola:</b> {selectedType.rule}
            </div>

            <input value={documentName} onChange={(e) => setDocumentName(e.target.value)} className="w-full rounded-lg border border-[#DDD4C0] p-4" placeholder="Nome documento, es. Assicurazione 2026" />

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[.15em] text-[#4A5C2A]">Data pagamento</span>
                <input value={paymentDate} onChange={(e) => handlePaymentDate(e.target.value)} type="date" className="w-full rounded-lg border border-[#DDD4C0] p-4" />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[.15em] text-[#4A5C2A]">Data scadenza</span>
                <input value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} type="date" className="w-full rounded-lg border border-[#DDD4C0] p-4" />
              </label>
            </div>

            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-[#DDD4C0] p-4" placeholder="Importo opzionale" />

            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full rounded-lg border border-[#DDD4C0] p-4">
              <option value="da_pagare">Da pagare</option>
              <option value="pagato">Pagato</option>
              <option value="non_applicabile">Non applicabile</option>
            </select>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24 w-full rounded-lg border border-[#DDD4C0] p-4" placeholder="Note opzionali" />

            <button className="w-full rounded-lg bg-[#4A5C2A] p-4 font-bold text-white hover:bg-[#6B7C3E]">Salva documento</button>
          </form>

          {message && <div className="mt-4 rounded-lg bg-[#E8DCC8] p-4">{message}</div>}
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-[#4A5C2A]">Le tue scadenze</p>
          <h2 className="mt-3 text-4xl font-black">Documenti e bollettini</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#DDD4C0] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#6B4226]">Totali</p>
              <b className="mt-2 block text-3xl">{summary.total}</b>
            </div>
            <div className="rounded-2xl border border-[#DDD4C0] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#6B4226]">Da pagare</p>
              <b className="mt-2 block text-3xl text-yellow-700">{summary.toPay}</b>
            </div>
            <div className="rounded-2xl border border-[#DDD4C0] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#6B4226]">Vicini</p>
              <b className="mt-2 block text-3xl text-orange-700">{summary.expiring}</b>
            </div>
            <div className="rounded-2xl border border-[#DDD4C0] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#6B4226]">Scaduti</p>
              <b className="mt-2 block text-3xl text-red-700">{summary.expired}</b>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-[#DDD4C0] bg-white p-8">
                <h3 className="text-2xl font-black">Nessun documento inserito</h3>
                <p className="mt-2 text-[#3D3F38]">Puoi aggiungere i tuoi documenti quando vuoi per tenere sotto controllo le scadenze.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-[#DDD4C0] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#6B4226]">{typeLabel(doc.document_type)}</p>
                      <h3 className="mt-1 text-2xl font-black">{doc.document_name}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#3D3F38]">
                        Pagamento: {formatDate(doc.payment_date)} · Scadenza: {formatDate(doc.expiration_date)} · Stato: {paymentLabel(doc.payment_status)}
                        {doc.amount ? ` · Importo: €${Number(doc.amount).toFixed(2).replace(".", ",")}` : ""}
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#4A5C2A]">{paymentAdvice(doc)}</p>
                      {doc.notes && <p className="mt-2 text-sm text-[#3D3F38]">{doc.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-4 py-2 text-sm font-bold ${statusClass(doc.expiration_date, doc.payment_status)}`}>
                        {statusLabel(doc.expiration_date, doc.payment_status)}
                      </span>
                      <button onClick={() => deleteDocument(doc.id)} className="rounded-lg bg-red-900/70 px-4 py-2 font-bold text-white hover:bg-red-900">Elimina</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
