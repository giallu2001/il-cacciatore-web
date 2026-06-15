"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageShell, cardClass, inputClass, buttonClass } from "@/components/PageShell";

type Profile = {
  region: string | null;
  province: string | null;
  comune: string | null;
  atc: string | null;
  primary_atc: string | null;
};

type WeatherData = {
  location: string;
  temperature: number | null;
  windspeed: number | null;
  winddirection: number | null;
  precipitation: number | null;
  humidity: number | null;
  daily: Array<{
    date: string;
    min: number | null;
    max: number | null;
    rain: number | null;
    wind: number | null;
  }>;
};

function windLabel(deg?: number | null) {
  if (deg === null || deg === undefined) return "-";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatDate(value: string) {
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function MeteoPage() {
  const [place, setPlace] = useState("Pisa");
  const [query, setQuery] = useState("Pisa");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("region,province,comune,atc,primary_atc")
        .eq("id", user.id)
        .single();

      const p = data as Profile | null;
      setProfile(p);
      if (p?.comune) {
        setPlace(p.comune);
        setQuery(p.comune);
      }
    }

    loadProfile();
  }, []);

  useEffect(() => {
    async function loadWeather() {
      setLoadingWeather(true);
      setWeatherError("");

      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=it&format=json`);
        const geo = await geoRes.json();
        const found = geo?.results?.[0];

        if (!found) {
          setWeather(null);
          setWeatherError("Località non trovata.");
          return;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${found.latitude}&longitude=${found.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;
        const res = await fetch(url);
        const data = await res.json();

        setWeather({
          location: `${found.name}${found.admin1 ? `, ${found.admin1}` : ""}`,
          temperature: data.current?.temperature_2m ?? null,
          windspeed: data.current?.wind_speed_10m ?? null,
          winddirection: data.current?.wind_direction_10m ?? null,
          precipitation: data.current?.precipitation ?? null,
          humidity: data.current?.relative_humidity_2m ?? null,
          daily: (data.daily?.time || []).map((date: string, i: number) => ({
            date,
            min: data.daily?.temperature_2m_min?.[i] ?? null,
            max: data.daily?.temperature_2m_max?.[i] ?? null,
            rain: data.daily?.precipitation_sum?.[i] ?? null,
            wind: data.daily?.wind_speed_10m_max?.[i] ?? null,
          })),
        });
      } catch (err: any) {
        setWeather(null);
        setWeatherError(err?.message || "Errore meteo.");
      } finally {
        setLoadingWeather(false);
      }
    }

    loadWeather();
  }, [query]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    setQuery(place.trim() || "Pisa");
  }

  const atc = profile?.primary_atc || profile?.atc || "ATC selezionato";
  const meteoUrl = `https://www.3bmeteo.com/meteo/${encodeURIComponent(query)}`;
  const cartograficoUrl = "https://www.3bmeteo.com/cartografico";

  const huntingAdvice = useMemo(() => {
    if (!weather) return "Caricamento lettura venatoria del meteo.";
    const wind = weather.windspeed ?? 0;
    const rain = weather.precipitation ?? 0;
    const temp = weather.temperature ?? 0;

    if (rain > 2) return "Pioggia in corso: valuta sicurezza, visibilità, terreno e spostamenti della selvaggina verso zone più riparate.";
    if (wind >= 25) return "Vento sostenuto: attenzione a tiri difficili, rumore ambientale e possibili movimenti lungo margini e rimesse.";
    if (temp <= 5) return "Temperature basse: possibile maggiore attività nelle ore più miti e in zone riparate.";
    return "Condizioni regolari: controlla vento dominante, visibilità e variazioni locali prima dell'uscita.";
  }, [weather]);

  return (
    <PageShell
      eyebrow="Meteo live"
      title="Meteo venatorio, venti e precipitazioni"
      subtitle="Dati live gratuiti da Open-Meteo, aggiornati automaticamente quando apri la pagina. Link esterni disponibili per mappe dettagliate."
    >
      <form onSubmit={search} className={cardClass}>
        <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
          <input className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Cerca località" />
          <button className={buttonClass}>Aggiorna meteo</button>
          <a className="rounded-lg border border-[#DDD4C0] px-5 py-3 text-center font-bold text-[#2D4A22]" href={meteoUrl} target="_blank">
            Apri 3Bmeteo
          </a>
        </div>
      </form>

      {weatherError && <div className={cardClass + " mt-6 text-red-800"}>{weatherError}</div>}

      <div className="mt-6 grid gap-5 md:grid-cols-4">
        <MeteoStat title="Località" value={weather?.location || query} />
        <MeteoStat title="Temperatura" value={loadingWeather ? "..." : `${weather?.temperature ?? "-"} °C`} />
        <MeteoStat title="Vento" value={loadingWeather ? "..." : `${weather?.windspeed ?? "-"} km/h ${windLabel(weather?.winddirection)}`} />
        <MeteoStat title="Pioggia" value={loadingWeather ? "..." : `${weather?.precipitation ?? "-"} mm`} />
      </div>

      <section className={cardClass + " mt-6"}>
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#2D4A22]">Consigli per {atc}</p>
        <h2 className="mt-2 text-3xl font-black">Lettura venatoria del meteo</h2>
        <p className="mt-3 leading-7 text-[#3D3F38]">{huntingAdvice}</p>
      </section>

      <section className={cardClass + " mt-6"}>
        <h2 className="text-3xl font-black">Previsione 7 giorni</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-7">
          {weather?.daily?.map((d) => (
            <div key={d.date} className="rounded-xl bg-[#F5F0E8] p-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#6B4226]">{formatDate(d.date)}</p>
              <p className="mt-2 text-xl font-black">{d.min ?? "-"}° / {d.max ?? "-"}°</p>
              <p className="mt-2 text-xs text-[#3D3F38]">Pioggia: {d.rain ?? "-"} mm</p>
              <p className="text-xs text-[#3D3F38]">Vento max: {d.wind ?? "-"} km/h</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <MeteoCard title="Mappa venti" text="Apri il cartografico 3Bmeteo e seleziona Venti dal pannello laterale." url={cartograficoUrl} label="Mappa venti →" />
        <MeteoCard title="Mappa precipitazioni" text="Apri il cartografico 3Bmeteo e seleziona Precipitazioni o Radar." url={cartograficoUrl} label="Mappa precipitazioni →" />
      </div>
    </PageShell>
  );
}

function MeteoStat({ title, value }: { title: string; value: string }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-black uppercase tracking-[.2em] text-[#6B4226]">{title}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
  );
}

function MeteoCard({ title, text, url, label }: { title: string; text: string; url: string; label: string }) {
  return (
    <article className={cardClass}>
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-3 text-[#3D3F38]">{text}</p>
      <a className="mt-5 inline-block rounded-md bg-[#4A5C2A] px-4 py-2 text-sm font-bold text-white" href={url} target="_blank">
        {label}
      </a>
    </article>
  );
}
