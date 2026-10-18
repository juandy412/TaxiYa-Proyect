import type { Stored } from "./types"

export function tripShareContent(data: Stored) {
  const link = `${window.location.origin}${window.location.pathname}#/shared-trip?id=${encodeURIComponent(data.activeRequestId)}`
  const driverName = data.selectedDriver || data.driverAccount.name || "Sin asignar"
  const plate = data.vehicle.plate || "Aún sin asignar"
  return {
    title: "Seguimiento de viaje TaxiYa",
    link,
    text: [
      "Comparto mi viaje de TaxiYa Ocaña.",
      `Conductor: ${driverName}.`,
      `Placa: ${plate}.`,
      `Origen: ${data.origin}.`,
      `Destino: ${data.destination}.`,
      `Seguimiento: ${link}`,
    ].join(" "),
  }
}

export async function shareTrip(data: Stored) {
  const content = tripShareContent(data)

  if (navigator.share) {
    try {
      await navigator.share(content)
      return "shared" as const
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(content.text)}`
  const opened = window.open(whatsapp, "_blank", "noopener,noreferrer")
  if (!opened) {
    window.location.assign(whatsapp)
    return "opened" as const
  }
  return "opened" as const
}
