export default async function Cerca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q || "";
  return (
    <main className="min-h-screen bg-[#F5F0E8] text-[#1A1C18]">
      <nav className="bg-[#151914] px-6 py-4 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between"><a href="/" className="font-display text-2xl font-bold">🦆 Il Cacciatore</a><a href="/" className="rounded-md border border-white/20 px-4 py-2 text-sm">Home</a></div></nav>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="font-display text-5xl font-black">Risultati ricerca</h1>
        <p className="mt-4 text-lg">Hai cercato: <strong>{q || "nessuna ricerca"}</strong></p>
        <div className="mt-8 rounded-2xl border border-[#DDD4C0] bg-[#FDFAF5] p-8">
          <h2 className="font-display text-3xl font-bold">Risultato dimostrativo</h2>
          <p className="mt-3 text-[#3D3F38]">Qui mostreremo normative, calendari, ATC, specie e documenti collegati alla tua ricerca.</p>
          <p className="mt-4 text-sm text-[#7A7D72]">Fonte ufficiale e data aggiornamento saranno obbligatorie.</p>
        </div>
      </section>
    </main>
  );
}
