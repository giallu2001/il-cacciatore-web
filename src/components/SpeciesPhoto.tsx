"use client";

const PHOTO: Record<string, string> = {
  "Alzavola": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Anas_crecca_male_female.jpg",
  "Beccaccia": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Scolopax_rusticola_-_Doi_Inthanon.jpg",
  "Beccaccino": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Common_Snipe_(Gallinago_gallinago).jpg",
  "Canapiglia": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mareca_strepera_male.jpg",
  "Capriolo": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Capreolus_capreolus_Male.jpg",
  "Cervo": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Red_Deer_Stag.jpg",
  "Cesena": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Turdus_pilaris_2.jpg",
  "Cinghiale": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Sus_scrofa_2.jpg",
  "Codone": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Northern_Pintail_Anas_acuta.jpg",
  "Colombaccio": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Columba_palumbus_1.jpg",
  "Fagiano": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Common_Pheasant.jpg",
  "Fischione": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Eurasian_Wigeon_(Mareca_penelope).jpg",
  "Folaga": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fulica_atra_EUR.jpg",
  "Frullino": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lymnocryptes_minimus_-_Pärnu_County.jpg",
  "Gallinella d’acqua": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Gallinula_chloropus_1.jpg",
  "Gazza": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pica_pica_-_Compans_Caffarelli_-_2012-03-16.jpg",
  "Germano reale": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mallard_drake_2.jpg",
  "Ghiandaia": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Garrulus_glandarius_1_Luc_Viatour.jpg",
  "Lepre europea": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lepus_europaeus_(Causse_Méjean,_Lozère).jpg",
  "Marzaiola": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Anas_querquedula_male.jpg",
  "Merlo": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Common_Blackbird.jpg",
  "Mestolone": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Northern_Shoveler_Anas_clypeata.jpg",
  "Moriglione": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Aythya_ferina_male.jpg",
  "Pavoncella": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Northern_Lapwing_Vanellus_vanellus.jpg",
  "Pernice rossa": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Alectoris_rufa.jpg",
  "Piccione domestico": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Columba_livia_domestica.jpg",
  "Quaglia": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Coturnix_coturnix_1_(Marek_Szczepanek).jpg",
  "Starna": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Perdix_perdix_2.jpg",
  "Storno": "https://commons.wikimedia.org/wiki/Special:Redirect/file/European_Starling_2006.jpg",
  "Tordo bottaccio": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Turdus_philomelos_2.jpg",
  "Tordo sassello": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Redwing_Turdus_iliacus.jpg",
  "Tortora dal collare": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Streptopelia_decaocto_2.jpg",
  "Tortora selvatica": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Streptopelia_turtur_2.jpg",
  "Volpe": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vulpes_vulpes_ssp_fulvus.jpg"
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "");
}

export default function SpeciesPhoto({
  name,
  imageUrl,
  className = "h-full w-full object-cover object-center",
}: {
  name: string;
  scientificName?: string | null;
  imageUrl?: string | null;
  className?: string;
}) {
  const direct = imageUrl && imageUrl.startsWith("http") ? imageUrl : null;
  const localKey = Object.keys(PHOTO).find((key) => normalize(key) === normalize(name));
  const src = direct || (localKey ? PHOTO[localKey] : null);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#2D4A22] p-4 text-center text-sm font-bold text-white">
        Foto da caricare
      </div>
    );
  }

  return <img src={src} alt={name} className={className} loading="lazy" />;
}
