import { type ReactNode, useEffect, useRef, useState } from "react"

import type { Screen, Stored, Update } from "../lib/types"

import { translate } from "../lib/i18n"

import { drivers } from "../data/drivers"

import { canonicalPlaceName, placesData } from "../data/places"

import {
  sanitizeAssistantMessage,
  validateAssistantResponse,
  type AssistantAction,
} from "../lib/assistant"

import { fareFor, rideRequests, samePlace } from "../lib/fare"

import { appNotice, distance, firstName, greeting, money } from "../lib/format"

import { cancelTrip, startTrip } from "../lib/trip"

import { Button, Icon } from "./index"

import {
  CallDialog,
  Cancel,
  ContactView,
  Report,
  TrustedContact,
} from "../screens/passenger"

type VoiceRecognition = {
  lang: string

  continuous: boolean

  interimResults: boolean

  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>
  }) => void) | null

  onerror: (() => void) | null

  onend: (() => void) | null

  start(): void

  stop(): void
}

type VoiceRecognitionConstructor = new () => VoiceRecognition

export function TaxiAssistant({
  data,
  update,
  screen,
  go,
  close,
  setModal,
}: {
  data: Stored
  update: Update
  screen: Screen
  go: (s: Screen) => void
  close: () => void
  setModal: (v: ReactNode) => void
}) {
  const [text, setText] = useState("")
  const [pending, setPending] = useState(data.chatDestination)
  const [serviceHelp, setServiceHelp] = useState(
    data.chatTopic === "delay" && data.role === "driver",
  )
  const [loading, setLoading] = useState(false)
  const [assistantError, setAssistantError] = useState<"quota" | "">("")
  const [lastMessage, setLastMessage] = useState("")
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState("")
  const [readAloud, setReadAloud] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const recognitionRef = useRef<VoiceRecognition | null>(null)

  const browserWindow = window as Window & {
    SpeechRecognition?: VoiceRecognitionConstructor
    webkitSpeechRecognition?: VoiceRecognitionConstructor
  }

  const voiceSupported = Boolean(
    browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition,
  )

  const suggestions =
    data.role === "driver"
      ? screen === "driver-home"
        ? [
            "¿Qué solicitud me conviene?",
            "¿Cuánto llevo hoy?",
            "Ayuda con el viaje",
          ]
        : ["Ayuda con el PIN", "¿Cómo cancelo?", "Ver mis ganancias"]
      : ["assigned", "tracking"].includes(screen) ||
          ["assigned", "enroute", "active"].includes(data.tripStatus)
        ? [
            "El taxi no llega",
            "Compartir mi viaje",
            "Tengo un problema con mi viaje",
          ]
        : screen === "searching"
          ? ["Subir la oferta", "Volver a buscar", "Cancelar solicitud"]
          : screen === "fare"
            ? ["¿Por qué este precio?", "Tarifa de noche", "¿Cuánto demora?"]
            : screen === "profile"
              ? ["Ayuda con mi cuenta", "Editar mi contacto", "Privacidad"]
              : ["Pedir taxi", "¿Cuánto cuesta?", "Ver mis viajes"]

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()

      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight
    })

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return

      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex='-1'])",
      )

      if (!focusable?.length) return

      const first = focusable[0],
        last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", trapFocus)

    return () => {
      cancelAnimationFrame(frame)

      document.removeEventListener("keydown", trapFocus)

      previous?.focus()
    }
  }, [])

  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [data.chat, pending])

  const speak = (answer: string) => {
    if (!readAloud || !("speechSynthesis" in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(answer)

    utterance.lang = data.language === "en" ? "en-US" : "es-CO"

    window.speechSynthesis.speak(utterance)
  }

  const reply = (user: string, answer: string, patch: Partial<Stored> = {}) => {
    update((current) => ({
      ...patch,
      chat: [
        ...current.chat,
        { from: "user", text: user },
        { from: "taxi", text: answer },
      ],
    }))

    speak(answer)
  }

  const placeIn = (value: string) => canonicalPlaceName(value)

  const prepare = (origin: string, destination: string, user: string) => {
    const canonicalOrigin = placeIn(origin)

    const canonicalDestination = placeIn(destination)

    if (!canonicalOrigin || !canonicalDestination) {
      reply(
        user,
        "No reconocí el punto de recogida o el destino. Elige un lugar de la lista para calcular una tarifa correcta.",
      )

      return
    }

    if (samePlace(canonicalOrigin, canonicalDestination)) {
      appNotice("El destino debe ser diferente del punto de recogida.")

      return
    }

    const estimate = fareFor({
      ...data,
      origin: canonicalOrigin,
      destination: canonicalDestination,
    })

    const answer = `Ruta lista: ${canonicalOrigin} → ${canonicalDestination}. ¿Lo pido por ${money(estimate.recommended)}?`

    update({
      origin: canonicalOrigin,
      destination: canonicalDestination,
      offer: estimate.recommended,
      chatOrigin: canonicalOrigin,
      chatDestination: canonicalDestination,
      chatPending: "confirmation",
      chatTopic: "pedir viaje",
      chat: [
        ...data.chat,
        { from: "user", text: user },
        { from: "taxi", text: answer },
      ],
    })

    speak(answer)

    setPending(canonicalDestination)
  }

  const startRide = () => {
    if (data.role !== "passenger") {
      appNotice("Solo las cuentas de pasajero pueden solicitar un taxi.")

      return
    }

    if (!data.isConnected) {
      appNotice("No tienes conexión. Reintenta antes de solicitar el taxi.")

      return
    }

    const destination = pending || data.chatDestination

    if (samePlace(data.origin, destination)) {
      appNotice("El destino debe ser diferente del punto de recogida.")

      return
    }

    const estimate = fareFor({ ...data, destination })

    startTrip(update, {
      destination,
      offer: estimate.recommended,
      chatPending: "",
      chatDestination: "",
    })

    setPending("")

    close()

    go("searching")
  }

  const cancelCurrentTrip = (reason: string) => {
    const by = data.role === "driver" ? "driver" : "passenger"

    cancelTrip(update, by, reason)

    setModal(null)

    close()

    go(by === "driver" ? "driver-home" : "home")
  }

  const hasActiveTrip = ["assigned", "enroute", "active"].includes(
    data.tripStatus,
  )

  const hasAssignedDriver =
    data.role === "passenger" && hasActiveTrip && Boolean(data.selectedDriver)

  const hasPassengerForDriver =
    data.role === "driver" &&
    hasActiveTrip &&
    Boolean(data.activePassengerName || data.account?.name)

  const handleLocal = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    const q = value.toLocaleLowerCase("es")
    setText("")

    if (
      data.role === "driver" &&
      /pedir (un )?taxi|necesito (un )?taxi|quiero (un )?taxi/u.test(q)
    ) {
      reply(
        value,
        "La solicitud de taxi está disponible para pasajeros. Desde el perfil de conductor puedes revisar solicitudes, viajes y ganancias.",
      )

      return
    }

    if (
      data.chatPending === "confirmation" &&
      /^(?:sí|si|ok|dale|claro|de una|listo)(?:[\s,!.]+(?:por favor|gracias|hazlo|pídelo|pidelo))*[.!]?$/u.test(
        q,
      )
    ) {
      reply(value, "Listo. Busco un conductor para tu viaje.")
      startRide()
      return
    }

    if (
      data.chatPending === "confirmation" &&
      /^(no|cancelar|mejor no)[.!]?$/u.test(q)
    ) {
      setPending("")
      reply(value, "Listo, no lo pediré. Puedes cambiar el destino.", {
        chatPending: "",
        chatDestination: "",
      })
      return
    }

    if (
      /^(hola|buenas|buenos días|buenas tardes|buenas noches)[!.]?$/u.test(q)
    ) {
      reply(
        value,
        `${greeting()}, ${firstName(data.account?.name || "qué gusto saludarte")}. Puedo ayudarte a pedir un taxi, revisar tu viaje o resolver dudas.`,
      )
      return
    }

    if (
      /\b(?:insegur[oa]s?|peligro|amenazad[oa]s?|ayuda urgente|me quieren hacer daño|no me siento a salvo|tengo miedo)\b/u.test(
        q,
      )
    ) {
      reply(
        value,
        "Estoy contigo. Elige una acción de seguridad ahora. Si hay peligro inmediato, llama al 123.",
        { chatTopic: "seguridad" },
      )
      setModal(<SafetyActions data={data} update={update} />)
      return
    }

    if (
      /tengo un problema con mi viaje|reportar (un )?problema|perdí (mi )?(celular|objeto)|perdi (mi )?(celular|objeto)/u.test(
        q,
      )
    ) {
      reply(
        value,
        "Vamos a registrar lo que perdiste. Primero elige el tipo de problema.",
        { chatTopic: "reporte" },
      )
      setModal(<Report data={data} update={update} />)
      return
    }

    if (
      /el taxi no llega|el conductor no llega|se está demorando|se esta demorando|el pasajero no llega|el pasajero no responde/u.test(
        q,
      )
    ) {
      if (data.role === "driver" && hasPassengerForDriver) {
        reply(
          value,
          "La persona pasajera no aparece. Puedes llamarla o cancelar el viaje desde estas opciones.",
        )

        setServiceHelp(true)
      } else if (data.role === "driver") {
        reply(
          value,
          "No tienes un viaje activo. Revisa las solicitudes disponibles antes de contactar a una persona pasajera.",
        )
      } else if (hasAssignedDriver) {
        reply(
          value,
          "Tu conductor ya está asignado. En la pantalla del viaje puedes llamarlo o cancelar la solicitud.",
        )
      } else if (data.tripStatus === "requested") {
        reply(
          value,
          "Todavía no hay un conductor asignado. Puedes ajustar tu oferta, volver a buscar o cancelar desde la pantalla de búsqueda.",
        )
      } else {
        reply(
          value,
          "Aún no hay una solicitud activa. Primero elige tu destino y publica una búsqueda.",
        )
      }

      return
    }

    if (/tarifa nocturna|tarifa de noche|de noche/u.test(q)) {
      reply(
        value,
        "De noche puede haber recargo por demanda o disponibilidad. La tarifa mostrada es una estimación general y tú decides la oferta.",
      )
      return
    }

    if (/qué empresas hay|que empresas hay|empresas de taxi/u.test(q)) {
      reply(
        value,
        "No tengo una lista confirmada. Te sugiero consultarla con la Alcaldía de Ocaña.",
      )
      return
    }

    if (/cuánto demora|cuanto demora|cuánto tarda|cuanto tarda/u.test(q)) {
      const estimate = fareFor(data)
      reply(
        value,
        data.selectedDriver
          ? `${data.selectedDriver} está asignado a tu viaje. La hora de llegada requiere ubicación compartida en tiempo real.`
          : `El recorrido se estima en ${estimate.minutes} min. Puede variar por tráfico.`,
      )
      return
    }

    if (/^subir (la )?oferta$/u.test(q)) {
      const offer = Math.min(data.fareZoneMax, data.offer + 1000)
      update({ offer })
      reply(value, `Subí la oferta a ${money(offer)}.`)
      return
    }

    if (/^volver a buscar$/u.test(q)) {
      reply(value, "Volvemos a buscar con tu oferta actual.")
      close()
      update({ tripStatus: "requested", selectedDriver: "" })
      go("searching")
      return
    }

    if (/\bpin\b/u.test(q)) {
      if (
        data.role === "driver" &&
        data.tripStatus === "enroute" &&
        data.driverArrived
      ) {
        reply(
          value,
          "Verifica el PIN con la persona pasajera antes de iniciar el trayecto.",
        )

        close()

        go("verify-pin")
      } else if (data.role === "driver") {
        reply(
          value,
          "El PIN solo se solicita cuando llegas al punto de recogida. No inicies el viaje sin verificarlo.",
        )
      } else {
        reply(
          value,
          "Comparte el PIN con el conductor solo cuando estés dentro del taxi. Nunca lo envíes por chat.",
        )
      }

      return
    }

    if (/privacidad/u.test(q)) {
      reply(
        value,
        "En Perfil puedes decidir si compartes ubicación y activar o apagar las alertas del Escudo de trayecto.",
      )
      return
    }

    const route = q.match(
      /(?:(?:quiero\s+ir|llévame|llevame|viajar)\s+)?(?:en\s+)?(?:taxi\s+)?(?:desde|del?|de la)\s+(.+?)\s+(?:hasta|al?|a la)\s+(.+)$/u,
    )

    if (route) {
      const origin = placeIn(route[1]) || route[1].trim().replace(/^el /, "El ")
      const destination = placeIn(route[2]) || route[2].trim()
      prepare(origin, destination, value)
      return
    }

    const known = placeIn(q)

    if (data.chatPending === "destination") {
      if (/^(no sé|no se|ni idea)$/u.test(q)) {
        const recent = [
          ...new Set(data.tripHistory.map((trip) => trip.destination)),
        ].slice(0, 3)
        reply(
          value,
          recent.length
            ? `Puedes elegir: ${recent.join(", ")}.`
            : "Puedes ir al Centro, al Hospital o a la Terminal.",
        )
        return
      }

      prepare(
        data.origin,
        known || value.replace(/^(al?|hacia)\s+/u, ""),
        value,
      )
      return
    }

    if (
      /pedir (un )?taxi|necesito (un )?taxi|quiero (un )?taxi/u.test(q) &&
      !known
    ) {
      reply(value, "¿A dónde vamos?", {
        chatPending: "destination",
        chatTopic: "pedir viaje",
      })
      return
    }

    const freeRide = q.match(
      /(?:un taxi|taxi)\s+(?:al?|hacia)\s+(?:barrio\s+)?(.+)$/u,
    )

    if (freeRide && known) {
      prepare(data.origin, known, value)
      return
    }

    if (freeRide) {
      reply(
        value,
        "No encuentro ese destino en los lugares registrados. Elige un punto conocido para evitar una tarifa incorrecta.",
      )
      return
    }

    if (known) {
      prepare(data.origin, known, value)
      return
    }

    if (
      /contacto de confianza/u.test(q) &&
      /cambiar|editar|actualizar/u.test(q)
    ) {
      reply(value, "Abrí tu contacto de confianza.")
      setModal(<TrustedContact data={data} update={update} />)
      return
    }

    if (/mis viajes|historial/u.test(q)) {
      reply(value, "Te llevo a tu historial.")
      close()
      go(data.role === "driver" ? "driver-trips" : "trips")
      return
    }

    if (/ayuda.+cuenta|cuenta|contraseña|registro/u.test(q)) {
      reply(
        value,
        "En Perfil puedes editar tus datos. Para recuperar acceso usa “¿Olvidaste tu contraseña?”.",
      )
      return
    }

    if (/cancel/u.test(q)) {
      if (
        !["requested", "assigned", "enroute", "active"].includes(
          data.tripStatus,
        )
      ) {
        reply(value, "No hay un viaje en curso para cancelar.")

        return
      }

      reply(value, "Te pediré un motivo para dejar el registro.")

      setModal(
        <Cancel
          warning={data.driverArrived}
          driver={data.role === "driver"}
          onConfirm={cancelCurrentTrip}
        />,
      )

      return
    }

    if (/cómo funciona|como funciona|qué es taxiya|que es taxiya/u.test(q)) {
      reply(
        value,
        "Eliges una ruta, revisas la tarifa, publicas tu oferta y confirmas con PIN.",
      )
      return
    }

    if (/tarifa|precio|cuesta|justo/u.test(q)) {
      const estimate = fareFor(data)
      reply(
        value,
        `Orientación general, no dato oficial: este tramo se estima en ${money(estimate.recommended)}.`,
      )
      return
    }

    if (
      /lugares|ocaña|referencia|noche|objeto perdido|taxi no llega/u.test(q)
    ) {
      reply(
        value,
        "Orientación general, no dato oficial: usa puntos conocidos, comparte placa y ubicación, y de noche espera en un lugar iluminado. Si olvidas algo, repórtalo desde Mis viajes.",
      )
      return
    }

    if (/escudo|sos|seguridad|emergencia/u.test(q)) {
      reply(
        value,
        "El Escudo de trayecto simula revisiones de pausas. SOS registra una alerta local y da acceso para llamar al 123; no avisa automáticamente a terceros.",
      )
      return
    }

    if (/compart/u.test(q)) {
      if (!data.shareLocation)
        reply(value, "Activa Compartir ubicación en Seguridad y privacidad.")
      else {
        update({ shared: true })
        reply(value, "Preparé el enlace para tu contacto.")
        setModal(<ContactView data={data} />)
      }
      return
    }

    if (/cuánto llevo|ganancia/u.test(q)) {
      const today = new Date().toDateString()

      const completedToday = data.tripHistory.filter(
        (trip) =>
          trip.status === "Completado" &&
          trip.driver === data.driverAccount.name &&
          new Date(trip.createdAt).toDateString() === today,
      )

      const total = completedToday.reduce((sum, trip) => sum + trip.fare, 0)

      reply(
        value,
        `Hoy llevas ${money(total)} en ${completedToday.length} viajes completados registrados en este dispositivo.`,
      )

      return
    }

    if (/conviene|solicitud/u.test(q)) {
      const best = [...rideRequests(data)].sort(
        (a, b) => b.offer / b.km - a.offer / a.km,
      )[0]
      reply(
        value,
        best
          ? `Conviene la de ${best.passenger}: ${money(Math.round(best.offer / best.km))} por km.`
          : "No hay solicitudes para comparar.",
      )
      return
    }

    reply(
      value,
      `No tengo ese dato confirmado. Te sugiero consultarlo con la empresa de taxis o con la Alcaldía de Ocaña. También puedo ayudarte con: ${suggestions.slice(0, 3).join(", ")}.`,
    )
  }

  const applyAction = (
    user: string,
    answer: string,
    action: AssistantAction,
  ) => {
    switch (action.type) {
      case "prepare_ride":
        prepare(action.origin, action.destination, user)

        return

      case "confirm_ride":
        if (data.chatPending === "confirmation" && pending) {
          reply(user, answer)

          startRide()
        } else reply(user, answer)

        return

      case "cancel_ride":
        if (
          ["requested", "assigned", "enroute", "active"].includes(
            data.tripStatus,
          )
        ) {
          reply(user, answer)

          setModal(
            <Cancel
              warning={data.driverArrived}
              driver={data.role === "driver"}
              onConfirm={cancelCurrentTrip}
            />,
          )
        } else reply(user, "No hay un viaje activo para cancelar.")

        return

      case "raise_offer": {
        if (data.tripStatus !== "requested" && screen !== "fare") {
          reply(
            user,
            "Solo puedes cambiar la oferta antes de que se asigne un conductor.",
          )

          return
        }

        const offer = Math.min(data.fareZoneMax, data.offer + 1000)

        update({ offer })

        reply(user, `Aumenté tu oferta a ${money(offer)}.`)

        return
      }

      case "safety":
        reply(
          user,
          "Tu seguridad es lo primero. Elige una acción ahora. Si hay peligro inmediato, llama al 123.",
          { chatTopic: "seguridad" },
        )

        setModal(<SafetyActions data={data} update={update} />)

        return

      case "share_trip":
        if (
          !data.shareLocation ||
          !["assigned", "enroute", "active"].includes(data.tripStatus)
        ) {
          reply(
            user,
            "Compartir la vista solo está disponible durante un viaje y si activaste la opción en privacidad.",
          )

          return
        }

        update({ shared: true })

        reply(
          user,
          "Preparé la vista de este dispositivo. No se envió un enlace externo.",
        )

        setModal(<ContactView data={data} />)

        return

      case "open_screen":
        reply(user, answer)

        close()

        go(action.screen)

        return

      case "report_problem":
        reply(user, "Abrí el formulario local para registrar el problema.")

        setModal(<Report data={data} update={update} />)

        return

      case "none":
        reply(user, answer)
    }
  }

  const handle = async (raw: string) => {
    const value = raw.trim()

    if (!value || loading) return

    if (value.length > 500) {
      appNotice("El mensaje es demasiado largo. Usa hasta 500 caracteres.")

      return
    }

    setText("")

    setLastMessage(value)

    setAssistantError("")

    const normalized = value.toLocaleLowerCase("es")

    if (
      /\b(?:insegur[oa]s?|peligro|amenazad[oa]s?|ayuda urgente|me quieren hacer daño|no me siento a salvo|tengo miedo|sos|emergencia)\b/u.test(
        normalized,
      )
    ) {
      handleLocal(value)

      return
    }

    if (
      /tarifa|precio|cu[aá]nto (?:vale|cuesta|demora|tarda)|oferta/u.test(
        normalized,
      )
    ) {
      handleLocal(value)

      return
    }

    setLoading(true)

    let quotaExceeded = false
    const requestBody = JSON.stringify({
          message: sanitizeAssistantMessage(
            value,
            [
              data.account?.name || "",
              data.account?.phone || "",
              data.account?.email || "",
              data.account?.contactName || "",
              data.account?.contactPhone || "",
            ],
            placesData.map((place) => place.name),
          ),

          context: {
            role: data.role,
            language: data.language,
            screen,
            tripStatus: data.tripStatus,
            chatPending: data.chatPending,
            origin: data.origin,
            destination: data.destination,
          },
        })
    const request = async () => {
      let lastError: unknown
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch("/api/assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
            signal: AbortSignal.timeout(25_000),
          })
          if (attempt === 0 && response.status >= 500) {
            await response.body?.cancel()
            await new Promise((resolve) => setTimeout(resolve, 450))
            continue
          }
          return response
        } catch (error) {
          lastError = error
          if (attempt === 1) throw error
          await new Promise((resolve) => setTimeout(resolve, 450))
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("El asistente remoto no está disponible.")
    }

    try {
      const response = await request()

      if (!response.ok) {
        const failure: unknown = await response.json().catch(() => null)
        if (
          response.status === 429 &&
          failure &&
          typeof failure === "object" &&
          "error" in failure &&
          failure.error &&
          typeof failure.error === "object" &&
          "code" in failure.error
        )
          quotaExceeded = failure.error.code === "QUOTA_EXCEEDED"
        throw new Error("El asistente remoto no está disponible.")
      }

      const result: unknown = await response.json()

      const validated = validateAssistantResponse(
        result,
        placesData.map((place) => place.name),
      )

      if (!validated)
        throw new Error("La respuesta del asistente no pasó la validación.")

      applyAction(value, validated.reply, validated.action)
    } catch {
      setAssistantError(quotaExceeded ? "quota" : "")
      handleLocal(value)
    } finally {
      setLoading(false)
    }
  }

  const startVoiceInput = () => {
    const Constructor =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition

    if (!Constructor || listening) return

    const recognition = new Constructor()

    recognition.lang = data.language === "en" ? "en-US" : "es-CO"

    recognition.continuous = false

    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()

      setListening(false)

      if (transcript) {
        setText(transcript.slice(0, 500))

        void handle(transcript)
      }
    }

    recognition.onerror = () => {
      setListening(false)
      setVoiceError("No se pudo usar el micrófono. Revisa el permiso del navegador.")
    }

    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition

    setVoiceError("")
    setListening(true)
    try {
      recognition.start()
    } catch {
      setListening(false)
      setVoiceError("No se pudo iniciar el micrófono. Inténtalo de nuevo.")
    }
  }

  useEffect(
    () => () => {
      recognitionRef.current?.stop()

      if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    },
    [],
  )

  const fare = fareFor({ ...data, destination: pending || data.destination })

  return (
    <div className="taxi-backdrop">
      <section
        ref={sheetRef}
        className="taxi-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={translate("Asistente Taxi", data.language)}
      >
        <div className="taxi-head">
          <span className="taxi-avatar">
            <Icon name="assistant" />
          </span>
          <span>
            <b>{translate("Taxi IA", data.language)}</b>
            <small>
              {translate("Asistente local de TaxiYa", data.language)}
            </small>
          </span>
          <button
            className="icon-button"
            onClick={close}
            aria-label={translate("Cerrar asistente", data.language)}
          >
            ×
          </button>
        </div>
        <div
          className="taxi-messages"
          ref={chatRef}
          role="log"
          aria-live="polite"
        >
          {data.chat.map((message, index) => (
            <div className={message.from} key={index}>
              <p>{translate(message.text, data.language)}</p>
            </div>
          ))}
          {serviceHelp && (
            <div className="assistant-actions">
              <Button
                onClick={() =>
                  setModal(
                    <CallDialog
                      name={
                        data.role === "driver"
                          ? data.activePassengerName ||
                            data.account?.name ||
                            "el pasajero"
                          : data.selectedDriver || "el conductor"
                      }
                    />,
                  )
                }
              >
                {data.role === "driver"
                  ? "Llamar al pasajero"
                  : "Llamar al conductor"}
              </Button>
              {data.role === "driver" ? (
                <Button
                  variant="danger"
                  onClick={() =>
                    setModal(
                      <Cancel
                        warning={data.driverArrived}
                        driver
                        onConfirm={cancelCurrentTrip}
                      />,
                    )
                  }
                >
                  Cancelar viaje
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const offer = Math.min(
                        data.fareZoneMax,
                        data.offer + 1000,
                      )
                      update({ offer })
                      setServiceHelp(false)
                      reply(
                        "Subir la oferta",
                        `Subí la oferta a ${money(offer)}.`,
                      )
                    }}
                  >
                    Subir la oferta
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setServiceHelp(false)
                      close()
                      update({ tripStatus: "requested", selectedDriver: "" })
                      go("searching")
                    }}
                  >
                    Volver a buscar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setModal(
                        <Cancel
                          warning={data.driverArrived}
                          onConfirm={cancelCurrentTrip}
                        />,
                      )
                    }
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          )}
          {pending && data.role === "passenger" && (
            <div className="confirm-trip">
              <span className="ai-label">
                {translate("Tarifa estimada", data.language)}
              </span>
              <b>
                {data.chatOrigin || data.origin} → {pending}
              </b>
              <span>
                {distance(fare.km)} · {fare.minutes} min
              </span>
              <strong>{money(fare.recommended)}</strong>
              <Button onClick={startRide}>Pedir taxi</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPending("")
                  update({ chatPending: "destination", chatDestination: "" })
                }}
              >
                Cambiar destino
              </Button>
            </div>
          )}
          {loading && (
            <p className="assistant-status" role="status" aria-live="polite">
              {translate("Taxi IA está escribiendo…", data.language)}
            </p>
          )}
          {assistantError === "quota" && (
            <div className="assistant-error" role="status">
              <span>
                {data.language === "en"
                  ? "Gemini reached its usage limit. I will keep helping you with local options."
                  : "Gemini alcanzó su límite de uso. Seguiré ayudándote con opciones locales."}
              </span>
              <button
                type="button"
                onClick={() => void handle(lastMessage)}
                disabled={loading}
              >
                {translate("Reintentar", data.language)}
              </button>
            </div>
          )}
        </div>
        <div
          className="quick-replies"
          aria-label={translate("Preguntas sugeridas", data.language)}
        >
          {suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => handle(suggestion)}>
              {translate(suggestion, data.language)}
            </button>
          ))}
        </div>
        <div className={`taxi-input ${voiceSupported ? "has-voice" : ""}`}>
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void handle(text)}
            maxLength={500}
            disabled={loading}
            placeholder={translate("Escribe tu pregunta", data.language)}
            aria-label={translate(
              "Escribe tu pregunta para Taxi",
              data.language,
            )}
          />
          <button
            type="button"
            className={`voice-button ${listening ? "listening" : ""}`}
            onClick={startVoiceInput}
            disabled={!voiceSupported || listening || loading}
            aria-pressed={listening}
            aria-label={translate(
              !voiceSupported
                ? "Micrófono no disponible"
                : listening
                  ? "Escuchando"
                  : "Dictar mensaje",
              data.language,
            )}
            title={translate(
              !voiceSupported
                ? "Micrófono no disponible"
                : listening
                  ? "Escuchando"
                  : "Dictar mensaje",
              data.language,
            )}
          >
            <Icon name="mic" />
            <span>
              {!voiceSupported
                ? translate("No disponible", data.language)
                : listening
                  ? translate("Escuchando…", data.language)
                  : translate("Hablar", data.language)}
            </span>
          </button>
          <button
            onClick={() => void handle(text)}
            disabled={!text.trim() || loading}
            aria-label={translate("Enviar mensaje", data.language)}
          >
            <Icon name="chevron" />
          </button>
        </div>
        {voiceError && <p className="assistant-voice-status" role="status">{voiceError}</p>}
        {"speechSynthesis" in window && (
          <button
            type="button"
            className="assistant-voice-toggle"
            aria-pressed={readAloud}
            onClick={() => {
              setReadAloud((enabled) => !enabled)
              if (readAloud) window.speechSynthesis.cancel()
            }}
          >
            {translate(
              readAloud
                ? "Desactivar lectura en voz alta"
                : "Leer respuestas en voz alta",
              data.language,
            )}
          </button>
        )}
        <p className="privacy-note">
          {translate("Escape cierra · Enter envía", data.language)}
        </p>
      </section>
    </div>
  )
}

export function SafetyActions({
  data,
  update,
}: {
  data: Stored
  update: Update
}) {
  const [status, setStatus] = useState("")

  return (
    <>
      <span className="feature-icon danger">
        <Icon name="shield" />
      </span>
      <h2>Tu seguridad es lo primero</h2>
      <p>
        Estas acciones se registran localmente en este prototipo. Para una
        emergencia real, llama al 123.
      </p>
      {status && (
        <p className="info-status" role="status">
          {status}
        </p>
      )}
      <Button
        onClick={() => {
          update({ shieldChecks: data.shieldChecks + 1 })
          setStatus("Escudo de trayecto activado localmente.")
        }}
      >
        Activar Escudo
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          update({ shared: true })
          setStatus("Vista preparada. No se envió un enlace externo.")
        }}
      >
        Preparar vista para mi contacto
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          update({ sosActive: true })
          setStatus("SOS registrado localmente. No se avisó a emergencias.")
        }}
      >
        SOS local
      </Button>
    </>
  )
}
