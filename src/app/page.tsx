export default function Home() {
  return (
    <main className="min-h-screen bg-[#0f1a12] text-white">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="mb-6 rounded-full border border-[#b38b2d] px-4 py-2 text-sm text-[#d4a63a]">
          PORTALE VENATORIO ITALIANO
        </span>

        <h1 className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl">
          Tutto ciò che serve
          <br />
          al{" "}
          <span className="text-[#d4a63a]">
            cacciatore
          </span>{" "}
          italiano
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          Calendari venatori, normative regionali, ATC, meteo,
          specie, store e scadenze personali in un'unica piattaforma.
        </p>

        <div className="mt-10 flex w-full max-w-2xl">
          <input
            type="text"
            placeholder="Cerca per regione, ATC, specie o normativa..."
            className="flex-1 rounded-l-xl border border-[#2d3b31] bg-white px-4 py-4 text-black outline-none"
          />
          <button className="rounded-r-xl bg-[#3f5f2d] px-8 font-semibold hover:bg-[#4c7336]">
            Cerca
          </button>
        </div>
      </section>
    </main>
  );
}