"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AccediPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push("/profilo");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#0f1a12] px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[.04] p-8">
        <Link href="/" className="text-sm text-[#C4922A]">← Torna alla home</Link>
        <h1 className="mt-6 text-4xl font-black">Accedi</h1>
        <p className="mt-2 text-white/60">Entra nella tua area personale.</p>

        <form onSubmit={handleLogin} className="mt-8 grid gap-4">
          <input name="email" required type="email" placeholder="Email" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
          <input name="password" required type="password" placeholder="Password" className="rounded-lg bg-white px-4 py-3 text-black outline-none" />
          <button disabled={loading} className="rounded-lg bg-[#4A5C2A] px-5 py-3 font-bold hover:bg-[#6B7C3E] disabled:opacity-60">
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>

        {error && <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-red-200">{error}</p>}

        <p className="mt-6 text-sm text-white/55">
          Non hai un account? <Link className="text-[#C4922A]" href="/registrati">Registrati</Link>
        </p>
      </div>
    </main>
  );
}
