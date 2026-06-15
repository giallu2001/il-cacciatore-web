"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  region: string | null;
  atc: string | null;
  role?: string | null;
  is_banned?: boolean | null;
};

type UserState = {
  email: string;
  profile: Profile | null;
};

export default function UserMenu() {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        if (mounted) setUserState(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name,region,atc,role,is_banned")
        .eq("id", user.id)
        .single();

      if ((profile as Profile | null)?.is_banned) {
        await supabase.auth.signOut();
        alert("Account bannato. Contatta l'amministratore.");
        window.location.href = "/";
        return;
      }

      if (mounted) {
        setUserState({
          email: user.email ?? "utente",
          profile: (profile as Profile) ?? null,
        });
      }
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const displayName = useMemo(() => {
    if (!userState) return "";
    const first = userState.profile?.first_name?.trim();
    const last = userState.profile?.last_name?.trim();
    const full = [first, last].filter(Boolean).join(" ");
    return full || userState.email;
  }, [userState]);

  const initials = useMemo(() => {
    if (!displayName) return "U";
    const parts = displayName.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!userState) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/accedi" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
          Accedi
        </Link>
        <Link href="/registrati" className="rounded-md bg-[#4A5C2A] px-4 py-2 text-sm font-bold text-white hover:bg-[#6B7C3E]">
          Registrati
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3">
      <div className="hidden text-right md:block">
        <div className="text-sm font-bold text-white">Ciao, {displayName}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#C4922A]">
          {userState.profile?.region || "Profilo"}{userState.profile?.atc ? ` · ATC ${userState.profile.atc}` : ""}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-[#C4922A]/40 bg-[#2D4A22] py-1 pl-1 pr-3 text-white shadow-md hover:bg-[#3f642f]"
        aria-label="Menu utente"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C4922A] text-sm font-black text-[#1A1C18]">
          {initials}
        </span>
        <span className="hidden text-sm font-bold md:inline">Account</span>
        <span className="text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-[#DDD4C0] bg-[#FDFAF5] text-[#1A1C18] shadow-2xl">
          <div className="border-b border-[#E8DCC8] p-4">
            <div className="font-bold">{displayName}</div>
            <div className="text-sm text-[#3D3F38]">{userState.email}</div>
            <div className="mt-2 inline-flex rounded-full bg-[#E8DCC8] px-3 py-1 text-xs font-bold text-[#2D4A22]">
              Loggato
            </div>
          </div>

          <div className="grid p-2 text-sm font-semibold">
            <Link className="rounded-lg px-3 py-2 hover:bg-[#E8DCC8]" href="/profilo">👤 Profilo cacciatore</Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-[#E8DCC8]" href="/documenti-scadenze">📄 Documenti e scadenze</Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-[#E8DCC8]" href="/store">🛒 Store</Link>
            {(userState.email === "giallu2001@gmail.com" || userState.profile?.role === "admin") && (
              <Link className="rounded-lg px-3 py-2 bg-[#2D4A22] text-white hover:bg-[#3f642f]" href="/admin">🛠️ Admin Panel</Link>
            )}
            <button onClick={logout} className="mt-2 rounded-lg bg-[#1A1C18] px-3 py-2 text-left font-bold text-white hover:bg-[#3D3F38]">
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
