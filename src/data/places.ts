export type Place = {
  name: string
  address: string
  lat: number
  lng: number
  approximate?: boolean
}

export const placesData: Place[] = [
  {
    name: "Parque 29 de Mayo",
    address: "Centro, Ocaña",
    lat: 8.2374,
    lng: -73.3561,
    approximate: true,
  },

  {
    name: "Terminal de Transporte",
    address: "Av. Circunvalar, Ocaña",
    lat: 8.2298,
    lng: -73.3507,
    approximate: true,
  },

  {
    name: "Hospital Emiro Quintero",
    address: "Barrio El Llano, Ocaña",
    lat: 8.2442,
    lng: -73.3528,
    approximate: true,
  },

  {
    name: "UFPS Ocaña",
    address: "Vía Acolsure, Ocaña",
    lat: 8.233,
    lng: -73.3206,
    approximate: true,
  },

  {
    name: "Centro",
    address: "Ocaña, Norte de Santander",
    lat: 8.2377,
    lng: -73.3558,
    approximate: true,
  },

  {
    name: "Clínica Ocaña",
    address: "Av. Francisco Fernández, Ocaña",
    lat: 8.2415,
    lng: -73.3486,
    approximate: true,
  },

  {
    name: "Plaza del Mercado",
    address: "Centro, Ocaña",
    lat: 8.2352,
    lng: -73.3542,
    approximate: true,
  },

  {
    name: "Barrio El Llano",
    address: "Ocaña, Norte de Santander",
    lat: 8.2432,
    lng: -73.354,
    approximate: true,
  },

  {
    name: "Parque San Francisco",
    address: "Carretero, Ocaña",
    lat: 8.2325134,
    lng: -73.3546712,
  },

  {
    name: "Columna de la Libertad de los Esclavos",
    address: "Carrera 13, Dulce Nombre, Ocaña",
    lat: 8.235427,
    lng: -73.3538554,
  },

  {
    name: "Museo Antón García de Bonilla",
    address: "Calle 11, San Agustín, Ocaña",
    lat: 8.2383632,
    lng: -73.3533164,
  },

  {
    name: "Iglesia San Agustín",
    address: "Calle 11, San Agustín, Ocaña",
    lat: 8.2389865,
    lng: -73.353137,
  },

  {
    name: "Barrio San Agustín",
    address: "Ocaña, Norte de Santander",
    lat: 8.2386,
    lng: -73.3532,
    approximate: true,
  },
]

export const farePlaces = Object.fromEntries(placesData.map((p) => [p.name, p]))

export const places = placesData.map((p) => [
  p.name,
  `${p.address}${p.approximate ? " · Ubicación aproximada" : ""}`,
])

export const pickupPoints = placesData.map((p) => p.name)

export const OCAÑA_CENTER: [number, number] = [8.2374, -73.3561]

const placeAliases: Record<string, string> = {
  hospital: "Hospital Emiro Quintero",

  "el hospital": "Hospital Emiro Quintero",

  "la terminal": "Terminal de Transporte",

  terminal: "Terminal de Transporte",

  universidad: "UFPS Ocaña",

  ufps: "UFPS Ocaña",

  mercado: "Plaza del Mercado",

  "el mercado": "Plaza del Mercado",

  "la clinica": "Clínica Ocaña",

  clinica: "Clínica Ocaña",

  "el centro": "Centro",

  centro: "Centro",

  "el parque": "Parque 29 de Mayo",
}

export function normalizePlaceText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[.,;:!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function canonicalPlaceName(value: string) {
  const normalized = normalizePlaceText(value).replace(
    /^(?:al?|hacia|hasta|el|la|del)\s+/u,
    "",
  )

  const exact = placesData.find(
    (place) => normalizePlaceText(place.name) === normalized,
  )

  if (exact) return exact.name

  const alias = Object.entries(placeAliases).find(
    ([name]) => normalized === name || normalized.endsWith(` ${name}`),
  )

  if (alias) return alias[1]

  return (
    placesData

      .filter(
        (place) =>
          normalized.includes(normalizePlaceText(place.name)) ||
          normalizePlaceText(place.name).includes(normalized),
      )

      .sort((left, right) => right.name.length - left.name.length)[0]?.name ||
    ""
  )
}
