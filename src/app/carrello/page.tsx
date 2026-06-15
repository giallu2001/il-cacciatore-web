
const shellClass = "min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#1A1C18]";
const cardClass = "rounded-2xl border border-[#DDD4C0] bg-white p-6 shadow-sm";
const btnClass = "inline-flex rounded-md bg-[#4A5C2A] px-4 py-2 text-sm font-bold text-white hover:bg-[#6B7C3E]";

function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <a href="/" className="mb-6 inline-block font-bold text-[#2D4A22]">← Home</a>
        <p className="text-xs font-black uppercase tracking-[.25em] text-[#2D4A22]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-[#3D3F38]">{subtitle}</p>
      </div>
    </div>
  );
}

export default function CarrelloPage() {
  return (
    <main className={shellClass}>
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Carrello" title="Carrello store" subtitle="Quando collegheremo Shopify, il checkout passerà direttamente dal tuo store." />
        <div className={cardClass}>
          <p>Il carrello locale è dimostrativo. Shopify verrà collegato nella fase store.</p>
          <a className="mt-5 inline-block rounded-md bg-[#4A5C2A] px-4 py-2 font-bold text-white" href="/store">Torna allo store</a>
        </div>
      </div>
    </main>
  );
}
