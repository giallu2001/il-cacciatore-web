"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegistratiPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const firstName = String(form.get("first_name") || "");
    const lastName = String(form.get("last_name") || "");
    const region = String(form.get("region") || "");
    const province = String(form.get("province") || "");
    const municipality = String(form.get("municipality") || "");
    const atc = String(form.get("atc") || "");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          region,
          province,
          municipality,
          atc,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        region,
        province,
        municipality,
        atc,
      });
    }

    setMessage("Registrazione completata. Controlla la tua email per confermare l'account.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0f1a12] px-6 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[.04] p-8">
        <Link href="/" className="text-sm text-[#C4922A]">← Torna alla home</Link>
        <h1 className="mt-6 text-4xl font-black">Crea il tuo profilo</h1>
        <p className="mt-2 text-white/60">Regione, comune e ATC serviranno per personalizzare calendari, scadenze e notifiche.</p>

        <form onSubmit={handleRegister} className="mt-8 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input name="first_name" required placeholder="Nome" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
            <input name="last_name" required placeholder="Cognome" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
          </div>
          <input name="email" required type="email" placeholder="Email" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
          <input name="password" required type="password" minLength={6} placeholder="Password min. 6 caratteri" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />

          <div className="grid gap-4 md:grid-cols-2">
            <input name="region" placeholder="Regione" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
            <input name="province" placeholder="Provincia" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="municipality" placeholder="Comune" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
            <input name="atc" placeholder="ATC" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
          </div>

          <button disabled={loading} className="rounded-lg bg-[#4A5C2A] px-5 py-3 font-bold hover:bg-[#6B7C3E] disabled:opacity-60">
            {loading ? "Registrazione..." : "Registrati"}
          </button>
        </form>

        {message && <p className="mt-4 rounded-lg bg-green-500/15 p-3 text-green-200">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-red-200">{error}</p>}

        <p className="mt-6 text-sm text-white/55">
          Hai già un account? <Link className="text-[#C4922A]" href="/accedi">Accedi</Link>
        </p>
      </div>
    </main>
  );
}
