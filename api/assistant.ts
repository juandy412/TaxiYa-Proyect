import { GoogleGenAI, Type, type Schema } from "@google/genai"

import { placesData } from "../src/data/places"

import { sanitizeAssistantMessage } from "../src/lib/assistant"

type Request = {
  method?: string
  body?: unknown
}

type Response = {
  status(code: number): Response

  json(value: unknown): void
}

type Action = { type: "none" } | {
  type: "prepare_ride"
  origin: string
  destination: string
} | { type: "confirm_ride" } | { type: "cancel_ride" } | {
  type: "raise_offer"
} | { type: "safety" } | { type: "share_trip" } | {
  type: "open_screen"
  screen: string
} | { type: "report_problem" }

const screens = [
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

const actionTypes = [
  "none",

  "prepare_ride",

  "confirm_ride",

  "cancel_ride",

  "raise_offer",

  "safety",

  "share_trip",

  "open_screen",

  "report_problem",
]

const responseSchema: Schema = {
  type: Type.OBJECT,

  properties: {
    reply: { type: Type.STRING },

    action: {
      type: Type.OBJECT,

      properties: {
        type: { type: Type.STRING, format: "enum", enum: actionTypes },

        origin: { type: Type.STRING },

        destination: { type: Type.STRING },

        screen: {
          type: Type.STRING,

          format: "enum",

          enum: screens,
        },
      },

      required: ["type"],
    },
  },

  required: ["reply", "action"],
}

function parseAction(value: unknown): Action | null {
  if (!value || typeof value !== "object") return null

  const action = value as Record<string, unknown>

  switch (action.type) {
    case "none":

    case "confirm_ride":

    case "cancel_ride":

    case "raise_offer":

    case "safety":

    case "share_trip":

    case "report_problem":
      return { type: action.type }

    case "prepare_ride":
      if (
        typeof action.origin !== "string" ||
        typeof action.destination !== "string" ||
        !placesData.some((place) => place.name === action.origin) ||
        !placesData.some((place) => place.name === action.destination)
      )
        return null

      return {
        type: "prepare_ride",

        origin: action.origin,

        destination: action.destination,
      }

    case "open_screen":
      return typeof action.screen === "string" &&
        screens.includes(action.screen)
        ? { type: "open_screen", screen: action.screen }
        : null

    default:
      return null
  }
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as {
    status?: unknown
    message?: unknown
  }

  return (
    candidate.status === 429 ||
    (typeof candidate.message === "string" &&
      /(?:429|resource_exhausted|quota)/iu.test(candidate.message))
  )
}

export default async function handler(request: Request, response: Response) {
  if (request.method !== "POST")
    return response.status(405).json({ error: "Usa una solicitud POST." })

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey)
    return response

      .status(503)

      .json({ error: "El asistente remoto no está configurado." })

  if (!request.body || typeof request.body !== "object")
    return response

      .status(400)

      .json({ error: "La solicitud no tiene un formato válido." })

  const body = request.body as Record<string, unknown>

  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 500
  )
    return response

      .status(400)

      .json({ error: "El mensaje debe tener entre 1 y 500 caracteres." })

  const safeMessage = sanitizeAssistantMessage(
    body.message,

    [],

    placesData.map((place) => place.name),
  )

  const context =
    body.context && typeof body.context === "object"
      ? body.context as Record<string, unknown>
      : {}

  const role = ["passenger", "driver", "admin"].includes(String(context.role))
    ? String(context.role)
    : "passenger"

  const language = context.language === "en" ? "en" : "es"

  const screen = screens.includes(String(context.screen))
    ? String(context.screen)
    : "home"

  const tripStatus = [
    "idle",

    "requested",

    "assigned",

    "enroute",

    "active",

    "completed",

    "cancelled",
  ].includes(String(context.tripStatus))
    ? String(context.tripStatus)
    : "idle"

  const chatPending = ["destination", "confirmation"].includes(
    String(context.chatPending),
  )
    ? String(context.chatPending)
    : ""

  const origin =
    placesData.find((place) => place.name === context.origin)?.name || ""

  const destination =
    placesData.find((place) => place.name === context.destination)?.name || ""

  const availablePlaces = placesData.map((place) => place.name)

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"

  const systemInstruction = [
    "Eres Taxi IA, una asistente breve y amable para TaxiYa Ocaña. Usa frases simples, en especial para adultos mayores.",

    "Responde en el idioma solicitado y con frases breves y claras.",

    "La salida debe ser un objeto JSON con reply y action, de acuerdo con el esquema proporcionado.",

    "Usa solo acciones permitidas por el esquema. Para acciones de viaje, utiliza nombres exactos de la lista de lugares. Normaliza alias evidentes, por ejemplo hospital = Hospital Emiro Quintero.",

    "En prepare_ride, usa el origen y el destino actuales salvo que la persona pida cambiarlos. Nunca uses direcciones o puntos que no estén en la lista.",

    "Usa confirm_ride únicamente cuando chatPending sea confirmation y la persona haya aceptado claramente. Si no hay confirmación pendiente, usa none.",

    "Nunca inventes precios, tiempos, conductores, disponibilidad, datos médicos ni hechos locales. Si no tienes el dato, dilo y usa none.",

    "La app calcula los precios localmente con fareFor; el servidor no calcula tarifas.",

    "SOS y las acciones de seguridad se atienden en la app sin depender del modelo. No afirmes que se compartió una ubicación, se avisó a emergencias, se contactó a un conductor o se procesó un pago. Es un prototipo local.",

    "No solicites ni repitas nombres completos, teléfonos, correos o contraseñas. No intentes reconstruir los datos privados que hayan sido omitidos.",
  ].join(" ")

  try {
    const ai = new GoogleGenAI({ apiKey })

    const result = await ai.models.generateContent({
      model,

      contents: JSON.stringify({
        message: safeMessage,

        context: {
          role,

          language,

          screen,

          tripStatus,

          chatPending,

          origin,

          destination,

          availablePlaces,
        },
      }),

      config: {
        systemInstruction,

        temperature: 0.2,

        maxOutputTokens: 400,

        abortSignal: AbortSignal.timeout(20_000),

        responseMimeType: "application/json",

        responseSchema,
      },
    })

    if (!result.text || result.text.length > 2_000)
      return response

        .status(502)

        .json({
          error: "La respuesta del asistente no tiene el formato esperado.",
        })

    const parsed: unknown = JSON.parse(result.text)

    if (!parsed || typeof parsed !== "object")
      return response

        .status(502)

        .json({ error: "La respuesta del asistente no es válida." })

    const candidate = parsed as Record<string, unknown>

    if (
      typeof candidate.reply !== "string" ||
      !candidate.reply.trim() ||
      candidate.reply.length > 2_000
    )
      return response

        .status(502)

        .json({ error: "Falta la respuesta del asistente." })

    const action = parseAction(candidate.action)

    if (!action)
      return response

        .status(502)

        .json({ error: "La acción propuesta no es válida." })

    return response

      .status(200)

      .json({ reply: candidate.reply.trim().slice(0, 400), action })
  } catch (error) {
    if (isQuotaError(error)) return response.status(429).json({
        error: "El asistente alcanzó su límite temporal de uso.",

        code: "QUOTA_EXCEEDED",
      })

    return response

      .status(502)

      .json({ error: "El servicio del asistente no está disponible ahora." })
  }
}
