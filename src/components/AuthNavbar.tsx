"use client";

import Link from "next/link";
import UserMenu from "./UserMenu";

const menu = [
  ["Home", "/"],
  ["Carniere", "/carniere"],
  ["Calendario", "/calendario"],
  ["Leggi", "/leggi"],
  ["ATC", "/atc"],
  ["Meteo", "/meteo"],
  ["Specie", "/specie"],
  ["Store", "/store"],
  ["News", "/news"],
];

export default function AuthNavbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#2f3b2f] bg-[#151914]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Info Cacciatori"
            className="h-16 w-16 object-contain"
          />
          <span className="leading-none">
            <strong className="font-display block text-xl leading-5 text-white">
              Il<br />Cacciatore
            </strong>
            <small className="mt-1 block text-[10px] font-bold uppercase tracking-[.25em] text-[#C4922A]">
              Portale venatorio italiano
            </small>
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-semibold text-white/80 lg:flex">
          {menu.map(([label, href]) => (
            <Link key={href} className="hover:text-[#C4922A]" href={href}>
              {label}
            </Link>
          ))}
        </div>

        <UserMenu />
      </div>
    </nav>
  );
}
