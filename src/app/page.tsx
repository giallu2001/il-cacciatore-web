const menu = [
  ["Home", "/"], ["Calendario", "/calendario"], ["Leggi", "/leggi"], ["ATC", "/atc"],
  ["Meteo", "/meteo"], ["Specie", "/specie"], ["Store", "/store"], ["News", "/news"],
];

const products = [
  ["🥾", "Scarponi impermeabili", "Stabilità e comfort su ogni terreno", "€129,00"],
  ["🎒", "Zaino tecnico 35L", "Leggero, capiente e resistente", "€89,00"],
  ["🧥", "Giacca camouflage", "Silenziosa e adatta a tutte le stagioni", "€149,00"],
  ["🔭", "Binocolo 10x42", "Alta definizione e campo visivo ampio", "€199,00"],
  ["🦆", "Richiamo per anatre", "Accessorio consentito dove previsto", "€34,90"],
  ["🧤", "Guanti tecnici", "Presa sicura e tessuto caldo", "€29,90"],
];

const cards = [
  ["📅", "Calendario Venatorio", "Aperture, chiusure e periodi per specie, regione e ATC.", "/calendario"],
  ["⚖️", "Leggi e Regolamenti", "Normativa nazionale, regionale, documenti e fonti ufficiali.", "/leggi"],
  ["📍", "ATC Italia", "Schede degli Ambiti Territoriali di Caccia con documenti e contatti.", "/atc"],
  ["🌤️", "Meteo e Orari", "Alba, tramonto, vento, pressione e fasi lunari per comune.", "/meteo"],
  ["🦆", "Passi e Migrazioni", "Schede e segnalazioni future su selvaggina migratoria.", "/specie"],
  ["📄", "Documenti e Scadenze", "Tesserino, bollettini, assicurazione e promemoria email.", "/documenti-scadenze"],
];

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#2f3b2f] bg-[#151914]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <a href="/" className="flex items-center gap-3">
          <span className="rounded-md bg-[#4A5C2A] px-2 py-1 text-2xl">🦆</span>
          <span>
            <strong className="font-display block text-xl text-white">Il Cacciatore</strong>
            <small className="block text-[10px] font-bold uppercase tracking-[.25em] text-[#C4922A]">Portale venatorio italiano</small>
          </span>
        </a>
        <div className="hidden items-center gap-6 text-sm font-semibold text-white/80 lg:flex">
          {menu.map(([label, href]) => <a key={href} className="hover:text-[#C4922A]" href={href}>{label}</a>)}
        </div>
        <div className="flex gap-2">
          <a href="/accedi" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Accedi</a>
          <a href="/registrati" className="rounded-md bg-[#4A5C2A] px-4 py-2 text-sm font-bold text-white hover:bg-[#6B7C3E]">Registrati</a>
        </div>
      </div>
    </nav>
  );
}

export default function Home() {
  return (
    <main>
      <Navbar />

      <section className="camo-bg flex min-h-[78vh] flex-col items-center justify-center px-6 text-center text-white">
        <div className="rounded-full border border-[#C4922A]/50 bg-[#C4922A]/10 px-5 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">Portale venatorio italiano</div>
        <h1 className="font-display mt-8 max-w-5xl text-5xl font-black leading-tight md:text-7xl">
          Tutto ciò che serve<br />al <span className="italic text-[#C4922A]">cacciatore</span> italiano
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">Calendari venatori, normative regionali, ATC, orari di caccia, meteo, store e scadenze personali in un’unica piattaforma.</p>
        <form action="/cerca" className="mt-10 flex w-full max-w-2xl overflow-hidden rounded-xl bg-white p-1 shadow-2xl">
          <input name="q" className="flex-1 px-5 py-4 text-[#1A1C18] outline-none" placeholder="Cerca per regione, ATC, specie o normativa..." />
          <button className="rounded-lg bg-[#2D4A22] px-8 font-bold text-white hover:bg-[#4A5C2A]">Cerca</button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-white/75">
          {['Colombaccio Toscana','Calendario ATC RM1','Beccaccia Veneto','Orari caccia Lombardia','Cinghiale apertura'].map(x => <a href={`/cerca?q=${encodeURIComponent(x)}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 hover:bg-white/20" key={x}>{x}</a>)}
        </div>
      </section>

      <section className="bg-[#151914] text-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-6 md:grid-cols-4">
          {[['🗺️','20','Regioni coperte'],['📋','220+','ATC censiti'],['🦆','80+','Specie schedate'],['📄','500+','Documenti PDF']].map(([i,n,l]) => <div className="flex items-center justify-center gap-3" key={l}><span className="text-2xl">{i}</span><div><b className="font-display text-2xl">{n}</b><p className="text-xs text-white/55">{l}</p></div></div>)}
        </div>
      </section>

      <section id="store" className="bg-[#F5F0E8] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2D4A22]">Store in evidenza</p><h2 className="font-display text-4xl font-bold">Equipaggiamento scelto per <span className="italic text-[#4A5C2A]">andare sul campo</span></h2></div>
            <a href="/store" className="font-bold text-[#2D4A22] hover:underline">Vedi tutti i prodotti →</a>
          </div>
          <div className="scrollbar-thin flex gap-5 overflow-x-auto pb-5">
            {products.map(([emoji, title, desc, price]) => (
              <article key={title} className="card min-w-[260px] overflow-hidden rounded-xl transition">
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#2D4A22] to-[#6B4226] text-6xl">{emoji}</div>
                <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6B4226]">Articolo</p><h3 className="font-display mt-1 text-xl font-bold">{title}</h3><p className="mt-2 text-sm text-[#3D3F38]">{desc}</p><div className="mt-5 flex items-center justify-between"><b>{price}</b><a href="/carrello" className="rounded-md border border-[#DDD4C0] px-3 py-2 hover:bg-[#E8DCC8]">🛒</a></div></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1A1C18] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-white/10 bg-white/[.04] p-8 md:grid-cols-[1fr_320px]">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">Controllo rapido</p><h2 className="font-display mt-2 text-4xl font-bold">Posso cacciare oggi?</h2><p className="mt-3 text-white/60">Seleziona regione, ATC, specie e data. Il sistema mostrerà periodo, fonte e limitazioni.</p><div className="mt-6 grid gap-3 md:grid-cols-4"><select className="rounded-md bg-white/10 p-3"><option>Toscana</option></select><select className="rounded-md bg-white/10 p-3"><option>ATC SI2</option></select><select className="rounded-md bg-white/10 p-3"><option>Colombaccio</option></select><a href="/calendario" className="rounded-md bg-[#4A5C2A] p-3 text-center font-bold">Verifica</a></div><p className="mt-4 text-xs text-white/35">Verifica sempre le fonti ufficiali regionali e ATC.</p></div>
          <div className="rounded-2xl border border-[#6B7C3E]/40 bg-[#4A5C2A]/20 p-8 text-center"><div className="text-4xl">✅</div><h3 className="font-display mt-3 text-2xl text-[#8DC84A]">Esempio confermato</h3><p className="mt-2 text-sm text-white/60">Colombaccio — Toscana<br/>ATC SI2 · fonte ufficiale da collegare</p></div>
        </div>
      </section>

      <section className="bg-[#F5F0E8] px-6 py-16">
        <div className="mx-auto max-w-7xl"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2D4A22]">Esplora il portale</p><h2 className="font-display text-4xl font-bold">Tutto quello che ti serve, <span className="italic text-[#4A5C2A]">organizzato</span></h2></div><div className="grid gap-5 md:grid-cols-3">{cards.map(([icon,title,desc,href]) => <a key={title} href={href} className="card rounded-xl p-6 transition"><div className="text-3xl">{icon}</div><h3 className="font-display mt-4 text-2xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#3D3F38]">{desc}</p><span className="mt-6 inline-block rounded-md bg-[#F5F0E8] px-3 py-2 text-sm font-bold">Apri →</span></a>)}</div></div>
      </section>

      <section className="bg-[#2D4A22] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#C4922A]">Area personale</p><h2 className="font-display mt-2 text-4xl font-bold">Documenti, bollettini e scadenze</h2><p className="mt-4 text-white/70">Carica tesserino, licenza, assicurazione, quote ATC e ricevute. Ricevi promemoria email 30, 15, 7, 3 o 1 giorno prima.</p><a href="/documenti-scadenze" className="mt-8 inline-block rounded-md bg-[#C4922A] px-6 py-3 font-bold text-[#1A1C18]">Gestisci scadenze</a></div><div className="rounded-2xl border border-white/10 bg-white/10 p-6"><p className="font-bold uppercase tracking-[.15em] text-white/45 text-xs">Prossime scadenze</p>{[['Quota ATC SI2','Tra 12 giorni','text-yellow-300'],['Assicurazione venatoria','Da rinnovare','text-red-300'],['Porto d’armi','Valido fino al 2028','text-green-300']].map(([a,b,c]) => <div key={a} className="mt-4 flex justify-between border-b border-white/10 pb-3"><span>{a}</span><b className={c}>{b}</b></div>)}</div></div>
      </section>

      <footer className="bg-[#12140F] px-6 py-10 text-center text-sm text-white/45">© 2026 Il Cacciatore — informazioni indicative, verificare sempre fonti ufficiali.</footer>
    </main>
  );
}
