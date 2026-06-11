export default function Page() {
  return (
    <main className="min-h-screen bg-[#F5F0E8] text-[#1A1C18]">
      <nav className="bg-[#151914] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="font-display text-2xl font-bold">🦆 Il Cacciatore</a>
          <a href="/" className="rounded-md border border-white/20 px-4 py-2 text-sm">Torna alla Home</a>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl border border-[#DDD4C0] bg-[#FDFAF5] p-10 shadow-xl">
          <div className="text-5xl">👤</div>
          <h1 className="font-display mt-6 text-5xl font-black">Profilo Cacciatore</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#3D3F38]">Imposta regione, comune, ATC, specie preferite e preferenze notifiche.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <input className="rounded-xl border border-[#DDD4C0] px-4 py-3" placeholder="Regione / Comune" />
            <input className="rounded-xl border border-[#DDD4C0] px-4 py-3" placeholder="ATC / Specie / Documento" />
            <button className="rounded-xl bg-[#2D4A22] px-5 py-3 font-bold text-white">Modifica profilo</button>
          </div>
          <p className="mt-6 text-sm text-[#7A7D72]">Pagina MVP funzionante: nel prossimo step colleghiamo Supabase, database e dati reali.</p>
        </div>
      </section>
    </main>
  );
}
