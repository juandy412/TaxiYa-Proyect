import { useEffect, useState } from "react"

import { fetchRide, liveRidesConfigured, subscribeToRides } from "../lib/liveRides"
import type { LiveRide } from "../lib/types"
import { MapView } from "./MapView"

const statusText: Record<LiveRide["status"], string> = {
  requested: "Buscando conductor",
  accepted: "Conductor asignado",
  enroute: "Conductor en camino",
  arrived: "Conductor llegó al punto",
  in_trip: "Viaje en curso",
  finished: "Viaje finalizado",
  cancelled: "Viaje cancelado",
}

export function SharedTrip() {
  const [ride, setRide] = useState<LiveRide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const readRideId = () =>
    new URLSearchParams(window.location.hash.split("?")[1] || "").get("id")
  const [rideId, setRideId] = useState(readRideId)

  useEffect(() => {
    const onHashChange = () => setRideId(readRideId())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    setError("")
    setRide(null)
    setLoading(true)
    if (!rideId) {
      setLoading(false)
      setError("El enlace no incluye un viaje válido.")
      return
    }
    if (!liveRidesConfigured()) {
      setLoading(false)
      setError("El seguimiento compartido necesita que TaxiYa configure Supabase.")
      return
    }

    let active = true
    void fetchRide(rideId)
      .then((result) => {
        if (!active) return
        setRide(result)
        if (!result) setError("No encontramos este viaje. Pide un enlace nuevo.")
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            `No se pudo cargar el viaje. ${reason instanceof Error ? reason.message : ""}`,
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const unsubscribe = subscribeToRides(
      (next) => {
        if (active && next.id === rideId) setRide(next)
      },
      (reason) => {
        if (active) setError(`Se perdió la conexión en tiempo real: ${reason.message}`)
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [rideId])

  return (
    <section className="shared-trip-page">
      <div className="shared-trip-brand">TaxiYa · Ocaña</div>
      <h1>Seguimiento compartido</h1>
      {loading && <p className="loading-skeleton" role="status">Cargando viaje…</p>}
      {error && <p className="notice-card" role="alert">{error}</p>}
      {ride && (
        <>
          <p className="shared-trip-status" role="status">{statusText[ride.status]}</p>
          <div className="contact-map">
            <MapView origin={ride.origin} destination={ride.destination} />
          </div>
          <div className="route-card">
            <span><small>ORIGEN</small><b>{ride.origin}</b></span>
            <span><small>DESTINO</small><b>{ride.destination}</b></span>
            <span><small>CONDUCTOR</small><b>{ride.driverName || "Aún sin asignar"}</b></span>
            <span><small>PLACA</small><b>{ride.plate || "Aún sin asignar"}</b></span>
          </div>
          <small className="muted">
            Actualizado {ride.updatedAt ? new Date(ride.updatedAt).toLocaleTimeString("es-CO") : "recientemente"}.
            El enlace muestra el estado del viaje, no la ubicación GPS en tiempo real.
          </small>
        </>
      )}
      {!loading && !error && !ride && <p className="empty-state">No hay información del viaje.</p>}
    </section>
  )
}
