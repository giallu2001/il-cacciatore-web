import Link from "next/link";

export function PageShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#1A1C18]">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-7 inline-block font-bold text-[#2D4A22]">← Home</Link>
        <p className="text-xs font-black uppercase tracking-[.25em] text-[#2D4A22]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-4xl leading-7 text-[#3D3F38]">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export const cardClass = "rounded-2xl border border-[#DDD4C0] bg-white p-6 shadow-sm";
export const inputClass = "rounded-lg border border-[#DDD4C0] bg-white px-4 py-3 outline-none";
export const buttonClass = "rounded-lg bg-[#4A5C2A] px-5 py-3 font-bold text-white hover:bg-[#6B7C3E]";
