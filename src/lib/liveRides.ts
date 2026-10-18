import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js"

import type { LiveRide, LiveRideStatus, Stored } from "./types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export const liveRidesConfigured = () => Boolean(supabase)

const fromRow = (value: unknown): LiveRide | null => {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const statuses: LiveRideStatus[] = [
    "requested",
    "accepted",
    "enroute",
    "arrived",
    "in_trip",
    "finished",
    "cancelled",
  ]
  if (
    typeof row.id !== "string" ||
    typeof row.origin !== "string" ||
    typeof row.destination !== "string" ||
    typeof row.offer !== "number" ||
    !statuses.includes(row.status as LiveRideStatus)
  )
    return null

  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    offer: row.offer,
    status: row.status as LiveRideStatus,
    driverName: typeof row.driver_name === "string" ? row.driver_name : "",
    plate: typeof row.plate === "string" ? row.plate : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
  }
}

const requireClient = () => {
  if (!supabase)
    throw new Error("Falta configurar Supabase para sincronizar viajes.")
  return supabase
}

export async function fetchOpenRides() {
  const client = requireClient()
  const { data, error } = await client
    .from("rides")
    .select("id, origin, destination, offer, status, driver_name, plate, updated_at")
    .eq("status", "requested")
    .order("created_at", { ascending: true })
    .limit(30)
  if (error) throw error
  return (data || []).map(fromRow).filter((ride): ride is LiveRide => ride !== null)
}

export async function fetchRide(id: string) {
  const { data, error } = await requireClient()
    .from("rides")
    .select("id, origin, destination, offer, status, driver_name, plate, updated_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return fromRow(data)
}

export async function publishRide(data: Stored) {
  if (!data.activeRequestId) return
  const status: LiveRideStatus =
    data.tripStatus === "assigned"
      ? "accepted"
      : data.tripStatus === "enroute"
        ? data.driverArrived
          ? "arrived"
          : "enroute"
        : data.tripStatus === "active"
          ? "in_trip"
          : data.tripStatus === "completed"
            ? "finished"
            : data.tripStatus === "cancelled"
              ? "cancelled"
              : "requested"

  const client = requireClient()
  if (data.role === "passenger" && status === "requested") {
    const { error } = await client.from("rides").upsert(
      {
        id: data.activeRequestId,
        origin: data.origin,
        destination: data.destination,
        offer: data.offer,
        status,
        driver_name: "",
        plate: "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    if (error) throw error
    const { error: offerError } = await client
      .from("rides")
      .update({ offer: data.offer, updated_at: new Date().toISOString() })
      .eq("id", data.activeRequestId)
      .eq("status", "requested")
    if (offerError) throw offerError
    return
  }

  if (data.role === "driver" && status === "requested") {
    const { error } = await client
      .from("rides")
      .update({
        status: "requested",
        driver_name: "",
        plate: "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.activeRequestId)
    if (error) throw error
    return
  }

  const { error } = await client
    .from("rides")
    .update({
      origin: data.origin,
      destination: data.destination,
      offer: data.offer,
      status,
      driver_name: data.driverAccount.name || "Conductor TaxiYa",
      plate: data.vehicle.plate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.activeRequestId)
  if (error) throw error
}

export async function acceptLiveRide(
  id: string,
  driverName = "",
  plate = "",
) {
  const { data, error } = await requireClient()
    .from("rides")
    .update({
      status: "accepted",
      driver_name: driverName,
      plate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "requested")
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Otro conductor ya tomó esta solicitud.")
}

export async function updateLiveRideStatus(
  id: string,
  status: LiveRideStatus,
) {
  const { error } = await requireClient()
    .from("rides")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export function subscribeToRides(
  onChange: (ride: LiveRide) => void,
  onError: (error: Error) => void,
) {
  const client = requireClient()
  const channel: RealtimeChannel = client
    .channel(`taxiya-rides-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rides" },
      (payload) => {
        const ride = fromRow(payload.new)
        if (ride) onChange(ride)
      },
    )
    .subscribe((state, error) => {
      if (state === "CHANNEL_ERROR" || state === "TIMED_OUT")
        onError(error instanceof Error ? error : new Error("Canal en tiempo real no disponible."))
    })

  return () => {
    void client.removeChannel(channel)
  }
}
