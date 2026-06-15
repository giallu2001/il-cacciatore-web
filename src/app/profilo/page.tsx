"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  atc: string | null;
  primary_atc: string | null;
  secondary_atcs: string[] | null;
};

export default function ProfiloPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    region: "",
    province: "",
    municipality: "",
    primary_atc: "",
    secondary_atcs_text: "",
  });

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/accedi");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name,phone,region,province,municipality,atc,primary_atc,secondary_atcs")
        .eq("id", user.id)
        .single<Profile>();

      if (data) {
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          phone: data.phone ?? "",
          region: data.region ?? "",
          province: data.province ?? "",
          municipality: data.municipality ?? "",
          primary_atc: data.primary_atc || data.atc || "",
          secondary_atcs_text: (data.secondary_atcs ?? []).join(", "),
        });
      }
    }

    loadProfile();
  }, [router]);

  const secondaryAtcs = useMemo(() => {
    return form.secondary_atcs_text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [form.secondary_atcs_text]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!userId) return;

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      region: form.region,
      province: form.province,
      municipality: form.municipality,
      atc: form.primary_atc,
      primary_atc: form.primary_atc,
      secondary_atcs: secondaryAtcs,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profilo salvato correttamente.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F5F0E8] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="font-bold text-[#2D4A22]">
            ← Home
          </Link>
          <button
            onClick={logout}
            className="rounded-md bg-[#12140F] px-5 py-3 font-bold text-white"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-[#DDD4C0] bg-white p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-[#2D4A22]">
              Area personale
            </p>
            <h1 className="mt-2 text-4xl font-black">Profilo cacciatore</h1>
            <p className="mt-2 text-[#3D3F38]">{email}</p>

            <form onSubmit={saveProfile} className="mt-8 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  placeholder="Nome"
                  className="rounded-lg border border-[#DDD4C0] px-4 py-4"
                />
                <input
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  placeholder="Cognome"
                  className="rounded-lg border border-[#DDD4C0] px-4 py-4"
                />
              </div>

              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Telefono"
                className="rounded-lg border border-[#DDD4C0] px-4 py-4"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.region}
                  onChange={(e) => updateField("region", e.target.value)}
                  placeholder="Regione"
                  className="rounded-lg border border-[#DDD4C0] px-4 py-4"
                />
                <input
                  value={form.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  placeholder="Provincia"
                  className="rounded-lg border border-[#DDD4C0] px-4 py-4"
                />
              </div>

              <input
                value={form.municipality}
                onChange={(e) => updateField("municipality", e.target.value)}
                placeholder="Comune"
                className="rounded-lg border border-[#DDD4C0] px-4 py-4"
              />

              <div className="rounded-2xl border border-[#DDD4C0] bg-[#F5F0E8] p-5">
                <h2 className="text-xl font-black">ATC</h2>
                <p className="mt-1 text-sm text-[#3D3F38]">
                  Imposta un ATC principale e, se vuoi, più ATC secondari separati da virgola.
                </p>

                <input
                  value={form.primary_atc}
                  onChange={(e) => updateField("primary_atc", e.target.value)}
                  placeholder="ATC principale, esempio: PI 14"
                  className="mt-4 w-full rounded-lg border border-[#DDD4C0] px-4 py-4"
                />

                <input
                  value={form.secondary_atcs_text}
                  onChange={(e) => updateField("secondary_atcs_text", e.target.value)}
                  placeholder="ATC secondari, esempio: PI 15, LU 12, SI 2"
                  className="mt-4 w-full rounded-lg border border-[#DDD4C0] px-4 py-4"
                />

                {secondaryAtcs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {secondaryAtcs.map((atc) => (
                      <span
                        key={atc}
                        className="rounded-full bg-[#2D4A22] px-3 py-1 text-sm font-bold text-white"
                      >
                        {atc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button className="rounded-lg bg-[#4A5C2A] px-6 py-4 font-bold text-white">
                Salva profilo
              </button>

              {message && (
                <div className="rounded-lg bg-[#E8DCC8] px-4 py-4 text-[#1A1C18]">
                  {message}
                </div>
              )}
            </form>
          </section>

          <aside className="rounded-2xl bg-[#2D4A22] p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C4922A] text-xl font-black text-[#1A1C18]">
                {(form.first_name?.[0] ?? "U").toUpperCase()}
                {(form.last_name?.[0] ?? "").toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black">
                  {form.first_name || "Il tuo"} {form.last_name || "profilo"}
                </h2>
                <p className="text-sm text-white/60">{email}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <p>
                <b>Regione:</b> {form.region || "Non impostata"}
              </p>
              <p>
                <b>Provincia:</b> {form.province || "Non impostata"}
              </p>
              <p>
                <b>Comune:</b> {form.municipality || "Non impostato"}
              </p>
              <p>
                <b>ATC principale:</b> {form.primary_atc || "Non impostato"}
              </p>
              <div>
                <b>ATC secondari:</b>
                {secondaryAtcs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {secondaryAtcs.map((atc) => (
                      <span
                        key={atc}
                        className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold"
                      >
                        {atc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-white/60">Nessun ATC secondario.</p>
                )}
              </div>
            </div>

            <Link
              href="/documenti-scadenze"
              className="mt-8 inline-block rounded-md bg-[#C4922A] px-6 py-3 font-bold text-[#1A1C18]"
            >
              Gestisci scadenze
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
