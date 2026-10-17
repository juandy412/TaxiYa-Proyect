import type { Screen } from "./types"

export type AssistantAction = { type: "none" } | {
  type: "prepare_ride"
  origin: string
  destination: string
} | { type: "confirm_ride" } | { type: "cancel_ride" } | {
  type: "raise_offer"
} | { type: "safety" } | { type: "share_trip" } | {
  type: "open_screen"
  screen: Screen
} | { type: "report_problem" }

export type AssistantResponse = {
  reply: string
  action: AssistantAction
}

export function sanitizeAssistantMessage(
  value: string,
  personalData: string[] = [],
  availablePlaces: string[] = [],
) {
  let safeMessage = value

  for (const item of personalData) {
    const trimmed = item.trim()
    if (!trimmed) continue
    safeMessage = safeMessage.replace(
      new RegExp(
        `(^|[^\\p{L}\\p{N}])(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^\\p{L}\\p{N}])`,
        "giu",
      ),
      "$1[dato privado]",
    )
  }

  const knownPlaces = new Set(availablePlaces.map(normalizePlaceText))

  return safeMessage
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/giu, "[correo omitido]")
    .replace(
      /\b(?:\+?57[\s.-]?)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\d{10})\b/gu,
      "[teléfono omitido]",
    )
    .replace(
      /\b((?:mi nombre es|me llamo)\s+)[\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,2}/giu,
      "$1[nombre omitido]",
    )
    .replace(
      /\b((?:mi )?(?:contraseña|password|clave)(?:\s+(?:es|is))?\s*[:=]?\s*)\S+/giu,
      "$1[dato omitido]",
    )
    .replace(/\b[\p{Lu}][\p{L}'’-]*(?:\s+[\p{Lu}][\p{L}'’-]*)+\b/gu, (name) =>
      knownPlaces.has(normalizePlaceText(name)) ? name : "[dato privado]",
    )
}

const screens: Screen[] = [
  "welcome",
  "login",
  "register",
  "admin-register",
  "chat",
  "forgot",
  "permission",

  "home",
  "search",
  "fare",
  "searching",
  "assigned",
  "tracking",
  "rating",
  "thanks",

  "trips",
  "trip-detail",
  "profile",
  "support",
  "notifications",
  "driver-home",

  "requests",
  "request-detail",
  "enroute",
  "verify-pin",
  "driver-trip",
  "payment",

  "driver-summary",
  "driver-rating",
  "driver-trips",
  "earnings",
  "driver-profile",

  "driver-register",
  "map-picker",
  "admin",
]

export function validateAssistantResponse(
  value: unknown,
  validPlaces: string[],
): AssistantResponse | null {
  if (!value || typeof value !== "object") return null

  const candidate = value as Record<string, unknown>

  if (typeof candidate.reply !== "string") return null

  const reply = candidate.reply.trim().slice(0, 400)

  if (!reply || !candidate.action || typeof candidate.action !== "object")
    return null

  const action = candidate.action as Record<string, unknown>

  switch (action.type) {
    case "none":

    case "confirm_ride":

    case "cancel_ride":

    case "raise_offer":

    case "safety":

    case "share_trip":

    case "report_problem":
      return { reply, action: { type: action.type } }

    case "prepare_ride":
      if (
        typeof action.origin !== "string" ||
        typeof action.destination !== "string"
      )
        return null

      if (
        !validPlaces.includes(action.origin) ||
        !validPlaces.includes(action.destination)
      )
        return null

      return {
        reply,
        action: {
          type: "prepare_ride",
          origin: action.origin,
          destination: action.destination,
        },
      }

    case "open_screen":
      if (
        typeof action.screen !== "string" ||
        !screens.includes(action.screen as Screen)
      )
        return null

      return {
        reply,
        action: { type: "open_screen", screen: action.screen as Screen },
      }

    default:
      return null
  }
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
