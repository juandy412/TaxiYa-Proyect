import { canonicalPlaceName, farePlaces } from "../data/places"

import type { RideRequest, Stored } from "./types"

export const samePlace = (a: string, b: string) =>
  a
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es") ===
  b
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")

export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const r = 6371,
    toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng)
  const q =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(q))
}

export function fareFor(data: Stored) {
  const originName = canonicalPlaceName(data.origin)
  const destinationName = canonicalPlaceName(data.destination)
  const origin = data.originCoordinates || farePlaces[originName]
  const destination = farePlaces[destinationName]
  if (!origin || !destination) {
    return {
      address: "",
      km: 0,
      minutes: 0,
      traffic: data.peak ? "Ajuste por hora pico" : "Sin ajuste por hora pico",
      base: 4500,
      recommended: 0,
      min: 0,
      max: 0,
      perKm: 1450,
      perMinute: 170,
      surcharges: 0,
      routeValid: false,
    }
  }
  const direct = haversine(origin, destination)
  const km = Math.max(0.8, Number((direct * 1.28).toFixed(1)))
  const minutes = Math.max(4, Math.round((km / 18) * 60))
  const base = 4500,
    perKm = 1450,
    perMinute = 170
  const surcharges =
    (data.peak ? 1500 : 0) + (data.rain ? 1000 : 0) + (data.night ? 1200 : 0)
  const raw =
    Math.round((base + km * perKm + minutes * perMinute + surcharges) / 500) *
    500
  const recommended = Math.min(
    data.fareZoneMax,
    Math.max(data.fareZoneMin, raw),
  )
  return {
    address: destination.address,
    km,
    minutes,
    traffic: data.peak ? "Ajuste por hora pico" : "Sin ajuste por hora pico",
    base,
    recommended,
    min: Math.max(0, recommended - 2000),
    max: recommended + 2000,
    perKm,
    perMinute,
    surcharges,
    routeValid: true,
  }
}

export function rideRequests(data: Stored) {
  const needs =
    [...(data.account?.needs || []), data.account?.needsNote || ""]
      .filter(Boolean)
      .join(" · ") || "Sin necesidades registradas"
  const estimate = fareFor(data)
  if (!estimate.routeValid) return []
  const real: RideRequest[] =
    data.tripStatus === "requested"
      ? [
          {
            id: data.activeRequestId || "passenger-real",
            passenger: data.account?.name || "Persona usuaria",
            origin: data.origin,
            destination: data.destination,
            offer: data.offer,
            needs,
            km: estimate.km,
            minutes: estimate.minutes,
            real: true,
            paymentMethod: data.paymentMethod,
          },
        ]
      : []
  return real.filter((r) => !data.rejectedRequestIds.includes(r.id))
}
