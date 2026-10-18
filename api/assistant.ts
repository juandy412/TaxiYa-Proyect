import { GoogleGenAI, Type, type Schema } from "@google/genai"
import { createHash } from "node:crypto"

import { placesData } from "../src/data/places"

import { sanitizeAssistantMessage } from "../src/lib/assistant"

type Request = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
  body?: unknown
}

type Response = {
  status(code: number): Response
  setHeader?(name: string, value: string): void
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

const rateWindowMs = 60_000
const rateLimit = 20
const requestsByIp = new Map<string, number[]>()

function clientIp(request: Request) {
  const forwarded =
    request.headers?.["x-vercel-forwarded-for"] ||
    request.headers?.["x-forwarded-for"]
  const firstForwarded = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]
  return firstForwarded?.trim() || request.socket?.remoteAddress || "unknown"
}

async function isRateLimited(request: Request) {
  const now = Date.now()
  const ipHash = createHash("sha256").update(clientIp(request)).digest("hex")
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/u, "")
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    const script =
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return count"
    const result = await fetch(`${redisUrl}/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, "1", `taxiya:assistant:${ipHash}`, String(rateWindowMs)]),
      signal: AbortSignal.timeout(3000),
    })
    if (!result.ok) throw new Error("Rate-limit storage unavailable.")
    const payload: unknown = await result.json()
    if (!payload || typeof payload !== "object" || !("result" in payload))
      throw new Error("Invalid rate-limit response.")
    return Number((payload as { result: unknown }).result) > rateLimit
  }

  const recentRequests = (requestsByIp.get(ipHash) || []).filter(
    (timestamp) => now - timestamp < rateWindowMs,
  )
  if (recentRequests.length >= rateLimit) return true
  recentRequests.push(now)
  requestsByIp.set(ipHash, recentRequests)
  if (requestsByIp.size > 2_000) {
    for (const [key, timestamps] of requestsByIp)
      if (!timestamps.some((timestamp) => now - timestamp < rateWindowMs))
        requestsByIp.delete(key)
  }
  return false
}

function jsonError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  response.setHeader?.("Cache-Control", "no-store")
  return response.status(status).json({ error: { code, message } })
}

export default async function handler(request: Request, response: Response) {
  if (request.method !== "POST")
    return jsonError(response, 405, "METHOD_NOT_ALLOWED", "Usa una solicitud POST.")

  const contentType = request.headers?.["content-type"]
  const normalizedContentType = Array.isArray(contentType)
    ? contentType[0]
    : contentType
  if (
    normalizedContentType
      ?.split(";")[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    return jsonError(
      response,
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Envía el contenido como application/json.",
    )

  try {
    if (await isRateLimited(request)) {
    response.setHeader?.("Retry-After", "60")
    return jsonError(
      response,
      429,
      "RATE_LIMITED",
      "Has enviado muchas solicitudes. Espera un minuto e inténtalo de nuevo.",
    )
    }
  } catch {
    return jsonError(
      response,
      503,
      "RATE_LIMIT_UNAVAILABLE",
      "No pudimos validar el límite de solicitudes. Inténtalo de nuevo.",
    )
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey)
    return jsonError(
      response,
      503,
      "ASSISTANT_NOT_CONFIGURED",
      "El asistente remoto no está configurado.",
    )

  if (!request.body || typeof request.body !== "object")
    return jsonError(response, 400, "INVALID_BODY", "La solicitud no tiene un formato válido.")

  const body = request.body as Record<string, unknown>

  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 500
  )
    return jsonError(
      response,
      400,
      "INVALID_MESSAGE",
      "El mensaje debe tener entre 1 y 500 caracteres.",
    )

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
      return jsonError(
        response,
        502,
        "INVALID_MODEL_RESPONSE",
        "La respuesta del asistente no tiene el formato esperado.",
      )

    const parsed: unknown = JSON.parse(result.text)

    if (!parsed || typeof parsed !== "object")
      return jsonError(
        response,
        502,
        "INVALID_MODEL_RESPONSE",
        "La respuesta del asistente no es válida.",
      )

    const candidate = parsed as Record<string, unknown>

    if (
      typeof candidate.reply !== "string" ||
      !candidate.reply.trim() ||
      candidate.reply.length > 2_000
    )
      return jsonError(
        response,
        502,
        "INVALID_MODEL_RESPONSE",
        "Falta la respuesta del asistente.",
      )

    const action = parseAction(candidate.action)

    if (!action)
      return jsonError(
        response,
        502,
        "INVALID_ASSISTANT_ACTION",
        "La acción propuesta no es válida.",
      )

    response.setHeader?.("Cache-Control", "no-store")
    return response

      .status(200)

      .json({ reply: candidate.reply.trim().slice(0, 400), action })
  } catch (error) {
    if (isQuotaError(error))
      return jsonError(
        response,
        429,
        "QUOTA_EXCEEDED",
        "El asistente alcanzó su límite temporal de uso.",
      )

    return jsonError(
      response,
      502,
      "ASSISTANT_UNAVAILABLE",
      "El servicio del asistente no está disponible ahora.",
    )
  }
}
