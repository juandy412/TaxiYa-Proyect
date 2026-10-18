import { type ReactNode, useEffect, useRef, useState } from "react"

import type { DriverDocument, Screen, Stored, Update } from "../../lib/types"

import { fareFor, rideRequests } from "../../lib/fare"

import {
  appNotice,
  countLabel,
  distance,
  firstName,
  greeting,
  initials,
  money,
  newNotification,
  tripRecord,
} from "../../lib/format"

import {
  Button,
  Empty,
  Field,
  Header,
  Icon,
  TaxiHeaderButton,
} from "../../components"

import { MapView } from "../../components/MapView"
import { LogoutButton } from "../../components/LogoutButton"

import { assignDriver, cancelTrip, finishTrip } from "../../lib/trip"

import { hashPassword } from "../../lib/password"
import { acceptLiveRide, liveRidesConfigured } from "../../lib/liveRides"

import {
  AppSettings,
  CallDialog,
  Chat,
  Menu,
  PersonalData,
  PrivacySettings,
  Report,
  SOS,
} from "../passenger"

function resizeDriverPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("El archivo no contiene una imagen válida."))
        return
      }
      const image = new Image()
      image.onerror = () => reject(new Error("No se pudo abrir la imagen."))
      image.onload = () => {
        const scale = Math.min(1, 400 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("No se pudo preparar la imagen."))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.8))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function DriverHome({
  data,
  update,
  go,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
}) {
  const [, setClockTick] = useState(0)

  useEffect(() => {
    if (!data.online) return
    const timer = setInterval(() => setClockTick((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [data.online])

  const requests = rideRequests(data)
  const first = requests[0]
  const unread = data.notificationItems.filter((item) => !item.read).length

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const completed = data.tripHistory.filter(
    (trip) =>
      trip.status === "Completado" && (trip.createdAt || 0) >= today.getTime(),
  )

  const onlineMs =
    data.onlineMs +
    (data.online && data.onlineStartedAt
      ? Date.now() - data.onlineStartedAt
      : 0)

  const hours = `${Math.floor(onlineMs / 3600000)}h ${Math.floor((onlineMs % 3600000) / 60000)}m`

  const toggleOnline = () => {
    if (!data.isConnected) {
      appNotice("Recupera la conexión antes de cambiar tu disponibilidad.")
      return
    }

    if (data.driverVerification !== "Aprobado") {
      appNotice(
        `Tu cuenta está ${data.driverVerification.toLowerCase()}. No puedes ponerte en línea.`,
      )
      return
    }

    update(
      data.online
        ? { online: false, onlineMs, onlineStartedAt: null }
        : { online: true, onlineStartedAt: Date.now() },
    )
  }

  return (
    <section>
      <div className="driver-hero">
        <div className="driver-top">
          <div>
            <small>{greeting()}</small>
            <h1>{firstName(data.driverAccount.name)}</h1>
          </div>
          <span className="map-actions">
            <TaxiHeaderButton dark />
            <button
              className="icon-button dark"
              onClick={() => go("notifications")}
              aria-label="Notificaciones"
            >
              <Icon name="bell" />
              {unread > 0 && <i>{unread}</i>}
            </button>
          </span>
        </div>
        {data.driverVerification !== "Aprobado" && (
          <p className="info-status">
            Estado de la cuenta: {data.driverVerification}
            {data.driverRejectionReason
              ? ` · ${data.driverRejectionReason}`
              : ""}
          </p>
        )}
        <div className="availability">
          <span>
            <i className={data.online ? "online" : ""} />
            <b>{data.online ? "Disponible" : "No disponible"}</b>
            <small>
              {data.online
                ? "Recibiendo solicitudes cercanas"
                : "No recibirás solicitudes"}
            </small>
          </span>
          <button
            className={`toggle driver-availability-toggle ${
              data.online ? "on" : "off"
            }`}
            role="switch"
            aria-label="Activar o desactivar disponibilidad"
            aria-checked={data.online}
            onClick={toggleOnline}
          >
            <i />
          </button>
        </div>
        <div className="today-stats">
          <div>
            <small>Hoy</small>
            <strong>
              {money(completed.reduce((sum, trip) => sum + trip.fare, 0))}
            </strong>
          </div>
          <div>
            <small>Viajes</small>
            <strong>{completed.length}</strong>
          </div>
          <div>
            <small>En línea</small>
            <strong>{hours}</strong>
          </div>
        </div>
      </div>
      <div className="page driver-content">
        <div className="section-title">
          <span className="title-with-badge">
            <h2>Solicitudes cercanas</h2>
          </span>
          <button onClick={() => go("requests")}>Ver todas</button>
        </div>
        {data.online && first ? (
          <button
            className="request-preview"
            onClick={() => {
              update({ activeRequestId: first.id })
              go("request-detail")
            }}
          >
            <div className="request-head">
              <span className="passenger-initial">
                {initials(first.passenger)}
              </span>
              <span>
                <b>{first.passenger}</b>
                <small>
                  {first.real
                    ? "Solicitud de la persona usuaria"
                    : "Solicitud cercana"}
                </small>
              </span>
              <strong>
                {distance(first.km)}
                <br />
                <small>{first.minutes} min</small>
              </strong>
            </div>
            <div className="request-route">
              <span>
                <i />
                <i />
              </span>
              <p>
                <b>{first.origin}</b>
                <small>{first.destination}</small>
              </p>
            </div>
            <div className="request-foot">
              <span>Oferta</span>
              <strong>{money(first.offer)}</strong>
            </div>
          </button>
        ) : (
          <>
            <Empty
              icon="car"
              title={data.online ? "Sin solicitudes" : "Estás fuera de línea"}
              text={
                data.online
                  ? "Las nuevas solicitudes aparecerán aquí."
                  : "Activa tu disponibilidad para recibir solicitudes."
              }
            />
            {!data.online && (
              <Button onClick={toggleOnline}>Activar disponibilidad</Button>
            )}
          </>
        )}
        <div className="tip-card">
          <Icon name="shield" />
          <span>
            <b>Conduce con tranquilidad</b>
            <small>El Escudo de trayecto acompaña cada viaje.</small>
          </span>
        </div>
      </div>
    </section>
  )
}

export function Requests({
  go,
  data,
  update,
}: {
  go: (s: Screen) => void
  data: Stored
  update: Update
}) {
  const requests = rideRequests(data)

  return (
    <section>
      <Header title="Solicitudes cercanas" />
      <div className="page">
        <div className="map-strip">
          <MapView origin={data.origin} />
        </div>
        <p className="section-label">
          {countLabel(requests.length, "SOLICITUD", "SOLICITUDES")}
        </p>
        {data.tripStatus !== "requested" && (
          <p className="muted">Aún no hay solicitudes de pasajeros.</p>
        )}
        {requests.map((request) => (
          <button
            className="request-list-row"
            key={request.id}
            onClick={() => {
              update({ activeRequestId: request.id })
              go("request-detail")
            }}
          >
            <span className="passenger-initial">
              {request.passenger
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span>
              <b>{request.passenger}</b>
              <small>
                {request.origin} → {request.destination}
              </small>
              <small>
                {request.needs} · {distance(request.km)} · {request.minutes} min
                estimados
              </small>
            </span>
            <strong>{money(request.offer)}</strong>
          </button>
        ))}
      </div>
    </section>
  )
}

export function RequestDetail({
  data,
  update,
  go,
  back,
  setModal,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  back: () => void
  setModal: (v: ReactNode) => void
}) {
  const request =
    rideRequests(data).find((item) => item.id === data.activeRequestId) ||
    rideRequests(data)[0]

  if (!request)
    return (
      <section>
        <Header title="Solicitud" back={back} />
        <div className="page">
          <Empty
            icon="car"
            title="Solicitud no disponible"
            text="Vuelve a la lista para ver las solicitudes actuales."
          />
        </div>
      </section>
    )

  const level =
    request.offer / request.km >= 2500
      ? "Conviene"
      : request.offer / request.km >= 1800
        ? "Justa"
        : "Baja"

  const reject = () => {
    update({ rejectedRequestIds: [...data.rejectedRequestIds, request.id] })
    appNotice("Solicitud rechazada. Mostraremos otra opción.")
    go("requests")
  }

  const accept = async () => {
    if (
      !data.isConnected ||
      !data.online ||
      data.driverVerification !== "Aprobado"
    ) {
      appNotice(
        "Necesitas conexión y una cuenta aprobada en línea para aceptar solicitudes.",
      )

      return
    }

    if (request.real && liveRidesConfigured()) {
      try {
        await acceptLiveRide(
          request.id,
          data.driverAccount.name || "Conductor TaxiYa",
          data.vehicle.plate,
        )
      } catch (error) {
        appNotice(
          error instanceof Error
            ? error.message
            : "No se pudo aceptar el viaje. Inténtalo otra vez.",
        )
        go("requests")
        return
      }
    }

    assignDriver(update, data.driverAccount.name, {
      activePassengerName: request.passenger,

      activePassengerNeeds: request.needs,

      activeRideReal: request.real,

      origin: request.origin,

      destination: request.destination,

      offer: request.offer,

      paymentMethod: request.paymentMethod || "Efectivo",

      tripStatus: request.real ? "assigned" : "enroute",

      rejectedRequestIds: [...data.rejectedRequestIds, request.id],

      rideMessages: [],
    })

    go("enroute")
  }

  return (
    <section>
      <Header title="Detalle de solicitud" back={back} />
      <div className="request-map">
        <MapView origin={request.origin} destination={request.destination} />
      </div>
      <div className="page request-detail">
        <div className="request-passenger">
          <span className="passenger-initial">
            {request.passenger
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>
          <span>
            <b>{request.passenger}</b>
            <small>
              {request.real
                ? "Solicitud registrada"
                : "Solicitud sin verificar"}
            </small>
          </span>
        </div>
        <div className="route-card">
          <div className="route-points">
            <i />
            <span />
          </div>
          <div>
            <small>RECOGER EN</small>
            <b>{request.origin}</b>
            <small>DESTINO</small>
            <b>{request.destination}</b>
            <p className="muted">
              {distance(request.km)} · {request.minutes} min orientativos
            </p>
          </div>
        </div>
        <div className="info-card">
          <Icon name="wallet" />
          <p>
            <b>Pago: {request.paymentMethod || "Efectivo"}</b>
            <br />
            <span className="muted">Método registrado en el prototipo</span>
          </p>
        </div>
        <div className="needs-note">
          <Icon name="help" />
          <span>
            <b>Ficha de necesidades</b>
            <small>{request.needs}</small>
          </span>
        </div>
        <button
          className="offer-detail"
          onClick={() =>
            setModal(
              <>
                <h2>Detalle de la oferta</h2>
                <p>
                  {money(request.offer)} para una distancia orientativa de{" "}
                  {distance(request.km)}. No es una tarifa oficial.
                </p>
              </>,
            )
          }
        >
          <span>Oferta · {level}</span>
          <strong>{money(request.offer)}</strong>
          <small>
            Ver detalle <Icon name="chevron" size={14} />
          </small>
        </button>
        <div className="bottom-action row">
          <Button variant="secondary" onClick={reject}>
            Rechazar
          </Button>
          <Button onClick={accept}>Aceptar viaje</Button>
        </div>
      </div>
    </section>
  )
}

export function Enroute({
  data,
  update,
  go,
  setModal,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  setModal: (v: ReactNode) => void
}) {
  const passenger =
    data.activePassengerName || data.account?.name || "la persona usuaria"

  const arrived = () => {
    const notification = newNotification(
      "Tu conductor llegó",
      `${data.driverAccount.name} te espera en ${data.origin}.`,
      "assigned",
    )
    update((current) => ({
      driverArrived: true,
      tripStatus: "enroute",
      notificationItems: [notification, ...current.notificationItems],
    }))
    go("verify-pin")
  }

  const cancel = () =>
    setModal(
      <DriverCancel
        data={data}
        update={update}
        go={go}
        close={() => setModal(null)}
      />,
    )

  return (
    <section className="map-screen">
      <div className="map-bg">
        <MapView origin={data.origin} destination={data.destination} />
      </div>
      <div className="navigation-chip">
        Ruta orientativa sobre calles · sin GPS en tiempo real
      </div>
      <div className="map-assistant">
        <TaxiHeaderButton dark />
      </div>
      <div className="driver-sheet">
        <div className="trip-progress">
          <span>Camino a recoger a {firstName(passenger)}</span>
          <strong>Tiempo por confirmar</strong>
          <small>{data.origin}</small>
        </div>
        <div className="action-row two">
          <button onClick={() => go("chat")}>
            <Icon name="message" />
            <span>Chat</span>
          </button>
          <button onClick={() => setModal(<CallDialog name={passenger} />)}>
            <Icon name="phone" />
            <span>Llamar</span>
          </button>
        </div>
        <Button onClick={arrived}>Llegué al punto</Button>
        <Button variant="secondary" onClick={cancel}>
          Cancelar viaje
        </Button>
      </div>
    </section>
  )
}

export function DriverCancel({
  data,
  update,
  go,
  close,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  close: () => void
}) {
  const [reason, setReason] = useState("")

  const cancel = () => {
    cancelTrip(update, "driver", reason)

    close()
    go("driver-home")
  }

  return (
    <>
      <h2>Cancelar viaje</h2>
      <p className="muted">Registra el motivo para informar a la persona.</p>
      <div className="choice-list">
        {[
          "El pasajero no responde",
          "Problema del vehículo",
          "Emergencia personal",
          "Ruta bloqueada",
        ].map((item) => (
          <button
            className={reason === item ? "selected" : ""}
            onClick={() => setReason(item)}
            key={item}
          >
            {item}
            <span>{reason === item ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      <Button variant="danger" disabled={!reason} onClick={cancel}>
        Cancelar y notificar
      </Button>
    </>
  )
}

export function VerifyPin({
  data,
  update,
  go,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
}) {
  const [pin, setPin] = useState("")

  const [error, setError] = useState("")

  const [attempts, setAttempts] = useState(data.pinErrors)

  const add = (n: string) => {
    if (pin.length < 4) setPin(pin + n)
    setError("")
  }

  const verify = () => {
    if (pin === data.pin) {
      update({
        pinVerified: true,
        pinErrors: 0,
        tripStatus: "active",
        shieldDueAt: data.automaticShield ? Date.now() + 25000 : null,
        shieldEventHandled: false,
      })
      go("driver-trip")
      return
    }

    const next = attempts + 1
    setAttempts(next)
    update({ pinErrors: next })
    setPin("")

    const remaining = 3 - next

    setError(
      next >= 3
        ? "Bloqueado por seguridad. Puedes cancelar o pedir otro PIN."
        : `PIN incorrecto. Te ${
            remaining === 1 ? "queda 1 intento" : `quedan ${remaining} intentos`
          }.`,
    )
  }

  const newPin = () => {
    const generated = String(Math.floor(1000 + Math.random() * 9000))
    setAttempts(0)
    setPin("")
    setError("")
    update({ pin: generated, pinErrors: 0 })
    appNotice("Generamos un PIN nuevo.")
  }

  const cancel = () => {
    cancelTrip(update, "driver", "PIN no verificado")
    update({ pinErrors: 0 })
    go("driver-home")
  }

  return (
    <section>
      <Header title="Verificar identidad" back={() => go("enroute")} />
      <div className="page pin-page">
        <span className="feature-icon">
          <Icon name="shield" />
        </span>
        <h1>Ingresa el PIN del viaje</h1>
        <p className="muted">Pide el código de 4 dígitos antes de comenzar.</p>
        <div className={`pin-digits ${error ? "has-error" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i}>{pin[i] ? "●" : ""}</span>
          ))}
        </div>
        {error && <small className="error">{error}</small>}
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map(
            (n, i) =>
              n ? (
                <button
                  key={i}
                  disabled={attempts >= 3}
                  onClick={() =>
                    n === "←" ? setPin(pin.slice(0, -1)) : add(n)
                  }
                >
                  {n}
                </button>
              ) : (
                <span key={i} />
              ),
          )}
        </div>
        {attempts >= 3 ? (
          <div className="pin-blocked-actions">
            <Button variant="danger" onClick={cancel}>
              Cancelar viaje
            </Button>
            <Button variant="secondary" onClick={newPin}>
              Pedir otro PIN
            </Button>
          </div>
        ) : (
          <Button disabled={pin.length !== 4} onClick={verify}>
            Verificar y comenzar
          </Button>
        )}
      </div>
    </section>
  )
}

export function DriverTrip({
  data,
  update,
  go,
  setModal,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  setModal: (v: ReactNode) => void
}) {
  const route = fareFor(data)

  const passenger =
    data.activePassengerName || data.account?.name || "Persona usuaria"

  const needs =
    data.activePassengerNeeds ||
    [...(data.account?.needs || []), data.account?.needsNote || ""]
      .filter(Boolean)
      .join(" · ") ||
    "Sin necesidades registradas"

  return (
    <section className="map-screen">
      <div className="map-bg tracking-map">
        <MapView origin={data.origin} destination={data.destination} />
      </div>
      <div
        className={`trip-top driver ${data.sosActive ? "shield-alert" : ""}`}
      >
        <span>
          <Icon name="shield" />{" "}
          {data.sosActive ? "Alerta del usuario" : "Todo en orden"}
        </span>
        <span className="map-actions">
          <button onClick={() => setModal(<SOS data={data} update={update} />)}>
            SOS
          </button>
          <TaxiHeaderButton />
        </span>
      </div>
      <div className="driver-sheet">
        <div className="trip-progress">
          <span>Viaje en curso</span>
          <strong>{route.minutes} min estimados</strong>
          <small>
            {data.origin} → {data.destination} · sin tráfico en vivo
          </small>
        </div>
        <div className="passenger-mini">
          <span className="passenger-initial">{initials(passenger)}</span>
          <span>
            <b>{passenger}</b>
            <small>PIN verificado · {needs}</small>
          </span>
        </div>
        <div className="action-row two">
          <button onClick={() => go("chat")}>
            <Icon name="message" />
            <span>Chat</span>
          </button>
          <button onClick={() => setModal(<CallDialog name={passenger} />)}>
            <Icon name="phone" />
            <span>Llamar</span>
          </button>
        </div>
        <Button onClick={() => go("payment")}>Finalizar viaje</Button>
      </div>
    </section>
  )
}

export function Payment({
  go,
  data,
  update,
}: {
  go: (s: Screen) => void
  data: Stored
  update: Update
}) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <section>
      <Header title="Finalizar viaje" />
      <div className="page payment-page">
        <span className="feature-icon">
          <Icon name="wallet" />
        </span>
        <h1>Confirma el pago</h1>
        <p className="muted">
          La persona usuaria indicó que pagará con {data.paymentMethod}.
        </p>
        <p className="simulation-notice">
          El prototipo registra la confirmación, pero no procesa dinero real.
        </p>
        <div className="payment-amount">
          <small>TOTAL A RECIBIR</small>
          <strong>{money(data.offer)}</strong>
          <span>{data.paymentMethod}</span>
        </div>
        <label className="check-row card">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            <b>Confirmo que recibí el pago</b>
            <small>Marca esta casilla solo después de recibir el dinero.</small>
          </span>
        </label>
        <div className="bottom-action">
          <Button
            disabled={!confirmed}
            onClick={() => {
              finishTrip(update)
              go("driver-summary")
            }}
          >
            Confirmar y continuar
          </Button>
        </div>
      </div>
    </section>
  )
}

export function DriverSummary({
  go,
  data,
}: {
  go: (s: Screen) => void
  data: Stored
}) {
  const fare = fareFor(data)

  return (
    <section className="page success-page">
      <span className="success-icon">
        <Icon name="check" size={42} />
      </span>
      <span className="eyebrow">VIAJE FINALIZADO</span>
      <h1>¡Buen trabajo, {firstName(data.driverAccount.name)}!</h1>
      <p className="muted">Completaste el viaje de forma segura.</p>
      <div className="summary-grid">
        <div>
          <small>GANANCIA</small>
          <strong>{money(data.offer)}</strong>
        </div>
        <div>
          <small>DURACIÓN</small>
          <strong>{fare.minutes} min</strong>
        </div>
        <div>
          <small>DISTANCIA</small>
          <strong>{distance(fare.km)}</strong>
        </div>
        <div>
          <small>PAGO</small>
          <strong>{data.paymentMethod}</strong>
        </div>
      </div>
      <Button onClick={() => go("driver-rating")}>Calificar viaje</Button>
    </section>
  )
}

export function DriverTrips({
  data,
  update,
  go,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
}) {
  const [tab, setTab] = useState("Todos")

  const visible = data.tripHistory.filter(
    (trip) =>
      tab === "Todos" ||
      trip.status === (tab === "Completados" ? "Completado" : "Cancelado"),
  )

  return (
    <section>
      <Header title="Historial de viajes" />
      <div className="page">
        <div className="tabs">
          {["Todos", "Completados", "Cancelados"].map((item) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        {visible.length ? (
          visible.map((trip) => (
            <button
              className="request-list-row"
              onClick={() => {
                update({ selectedTripId: trip.id })
                go("trip-detail")
              }}
              key={trip.id}
            >
              <span className="place-icon">
                <Icon name="car" />
              </span>
              <span>
                <b>{trip.passenger}</b>
                <small>{trip.date}</small>
                <small>
                  {trip.origin} → {trip.destination} · Escudo:{" "}
                  {trip.shieldChecks}
                </small>
              </span>
              <strong>
                {trip.status === "Cancelado" ? "Cancelado" : money(trip.fare)}
              </strong>
            </button>
          ))
        ) : (
          <>
            <Empty
              icon="car"
              title="No hay viajes"
              text="Los viajes de este estado aparecerán aquí."
            />
            <Button onClick={() => go("driver-home")}>Volver al inicio</Button>
          </>
        )}
      </div>
    </section>
  )
}

export function Earnings({ data }: { data: Stored }) {
  const [period, setPeriod] = useState("Hoy")
  const now = Date.now()

  const cutoffs: Record<string, number> = {
    Hoy: new Date().setHours(0, 0, 0, 0),
    Semana: now - 7 * 86400000,
    Mes: now - 30 * 86400000,
  }

  const completed = data.tripHistory.filter(
    (trip) =>
      trip.status === "Completado" && (trip.createdAt || 0) >= cutoffs[period],
  )

  const total = completed.reduce((sum, trip) => sum + trip.fare, 0)
  const online =
    data.onlineMs +
    (data.online && data.onlineStartedAt ? now - data.onlineStartedAt : 0)

  const bucketCount = period === "Mes" ? 5 : 7

  const bucketMs = period === "Mes" ? 7 * 86400000 : 86400000

  const amounts = Array.from({ length: bucketCount }, (_, index) =>
    completed
      .filter((trip) => {
        const age = now - trip.createdAt
        return (
          age >= (bucketCount - index - 1) * bucketMs &&
          age < (bucketCount - index) * bucketMs
        )
      })
      .reduce((sum, trip) => sum + trip.fare, 0),
  )

  const highest = Math.max(...amounts, 1)

  const bars = amounts.map((amount) => Math.round((amount / highest) * 100))

  return (
    <section>
      <Header title="Ganancias" />
      <div className="page">
        <div className="tabs">
          {Object.keys(cutoffs).map((item) => (
            <button
              className={period === item ? "active" : ""}
              key={item}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="earnings-card">
          <small>TOTAL · {period.toUpperCase()}</small>
          <strong>{money(total)}</strong>
          <span>
            {countLabel(
              completed.length,
              "viaje completado",
              "viajes completados",
            )}
          </span>
        </div>
        {completed.length ? (
          <div className="bar-chart">
            {bars.map((height, index) => (
              <span key={index}>
                <i style={{ height: `${height}%` }} />
                <small>{index + 1}</small>
              </span>
            ))}
          </div>
        ) : (
          <Empty
            icon="wallet"
            title="Sin ganancias"
            text="Tus viajes completados aparecerán aquí."
          />
        )}
        <div className="receipt-lines">
          <span>
            <small>
              {countLabel(
                completed.length,
                "Viaje completado",
                "Viajes completados",
              )}
            </small>
            <b>{completed.length}</b>
          </span>
          <span>
            <small>Ganancias</small>
            <b>{money(total)}</b>
          </span>
          <span>
            <small>Horas en línea</small>
            <b>
              {Math.floor(online / 3600000)} h{" "}
              {Math.floor((online % 3600000) / 60000)} min
            </b>
          </span>
        </div>
      </div>
    </section>
  )
}

export function DriverProfile({
  data,
  update,
  go,
  setModal,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  setModal: (v: ReactNode) => void
}) {
  return (
    <section>
      <Header title="Perfil de conductor" />
      <div className="page profile-page">
        <div className="profile-head">
          <div className="profile-photo">
            {initials(data.driverAccount.name)}
          </div>
          <h2>{data.driverAccount.name}</h2>
          <p>
            {data.driverVerification === "Aprobado"
              ? "Conductor verificado"
              : `Verificación ${data.driverVerification.toLowerCase()}`}
          </p>
        </div>
        <div className="menu-list">
          <Menu
            icon="user"
            label="Editar perfil"
            onClick={() =>
              setModal(<PersonalData data={data} update={update} driver />)
            }
          />
          <Menu
            icon="car"
            label="Mi vehículo"
            detail={`${data.vehicle.make} · ${data.vehicle.plate}`}
            onClick={() => setModal(<Vehicle data={data} update={update} />)}
          />
          <Menu
            icon="shield"
            label="Seguridad y privacidad"
            onClick={() =>
              setModal(<PrivacySettings data={data} update={update} />)
            }
          />
          <Menu
            icon="help"
            label="Ayuda y soporte"
            onClick={() => go("support")}
          />
          <LogoutButton
            update={update}
            setModal={setModal}
            go={() => go("welcome")}
          />
        </div>
        <p className="section-label">AJUSTES</p>
        <div className="menu-list">
          <div className="toggle-row">
            <span>
              <Icon name="settings" />
              <b>Lectura grande</b>
            </span>
            <button
              className={`toggle ${data.largeText ? "on" : ""}`}
              role="switch"
              aria-label="Activar o desactivar lectura grande"
              aria-checked={data.largeText}
              onClick={() => update({ largeText: !data.largeText })}
            >
              <i />
            </button>
          </div>
          <Menu
            icon="settings"
            label="Notificaciones y sonido"
            onClick={() =>
              setModal(<AppSettings data={data} update={update} />)
            }
          />
        </div>
        <p className="prototype-note">
          Tu perfil y vehículo se guardan en este dispositivo.
        </p>
      </div>
    </section>
  )
}

export function Vehicle({ data, update }: { data: Stored; update: Update }) {
  const [make, setMake] = useState(data.vehicle.make)
  const [color, setColor] = useState(data.vehicle.color)
  const [plate, setPlate] = useState(data.vehicle.plate)

  const valid =
    /^[A-Z]{3}-\d{3}$/.test(plate) &&
    make.trim().length >= 2 &&
    color.trim().length >= 2

  return (
    <>
      <h2>Mi vehículo</h2>
      <Field
        label="Marca y modelo"
        value={make}
        onChange={setMake}
        error={
          make && make.trim().length < 2
            ? "Escribe la marca y el modelo."
            : undefined
        }
        required
      />
      <Field
        label="Color"
        value={color}
        onChange={setColor}
        error={
          color && color.trim().length < 2 ? "Escribe el color." : undefined
        }
        required
      />
      <Field
        label="Placa"
        value={plate}
        onChange={(value) => setPlate(value.toUpperCase())}
        error={
          plate && !/^[A-Z]{3}-\d{3}$/.test(plate)
            ? "Usa el formato ABC-123."
            : undefined
        }
        maxLength={7}
        required
      />
      <Button
        disabled={!valid}
        onClick={() => {
          update({ vehicle: { make: make.trim(), color: color.trim(), plate } })
          appNotice("Vehículo guardado.")
        }}
      >
        Guardar cambios
      </Button>
    </>
  )
}

export function DriverRegister({
  data,
  go,
  update,
}: {
  data: Stored
  go: (screen: Screen) => void
  update: Update
}) {
  const [step, setStep] = useState(1)

  const [personal, setPersonal] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  })

  const [vehicle, setVehicle] = useState({ make: "", color: "", plate: "" })

  const [documents, setDocuments] = useState<DriverDocument[]>(
    data.driverDocuments.length
      ? data.driverDocuments.some((document) => document.name === "Foto del conductor")
        ? data.driverDocuments
        : [
            { name: "Foto del conductor", uploaded: false },
            ...data.driverDocuments,
          ]
      : ["Foto del conductor", "Licencia", "SOAT", "Tarjeta de propiedad", "Foto del vehículo"].map(
          (name) => ({ name, uploaded: false }),
        ),
  )

  const [previews, setPreviews] = useState<
    Record<string, { url: string; type: string; fileName: string }>
  >(() =>
    Object.fromEntries(
      data.driverDocuments
        .filter((document) => document.dataUrl)
        .map((document) => [
          document.name,
          {
            url: document.dataUrl || "",
            type: "image/jpeg",
            fileName: document.fileName || document.name,
          },
        ]),
    ),
  )

  const [registrationError, setRegistrationError] = useState("")

  const personalValid =
    personal.name.trim().length >= 3 &&
    /^\d{10}$/.test(personal.phone) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email) &&
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(personal.password)

  const personalErrors = {
    name:
      personal.name && personal.name.trim().length < 3
        ? "Escribe al menos 3 caracteres."
        : undefined,

    phone:
      personal.phone && !/^\d{10}$/.test(personal.phone)
        ? "El celular debe tener 10 dígitos."
        : undefined,

    email:
      personal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)
        ? "Ingresa un correo válido."
        : undefined,

    password:
      personal.password &&
      !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(personal.password)
        ? "Usa mínimo 8 caracteres, con una letra y un número."
        : undefined,
  }

  const vehicleValid =
    vehicle.make.trim().length >= 2 &&
    vehicle.color.trim().length >= 2 &&
    /^[A-Z]{3}-\d{3}$/.test(vehicle.plate)

  const vehicleErrors = {
    make:
      vehicle.make && vehicle.make.trim().length < 2
        ? "Escribe la marca y el modelo."
        : undefined,

    color:
      vehicle.color && vehicle.color.trim().length < 2
        ? "Escribe un color válido."
        : undefined,

    plate:
      vehicle.plate && !/^[A-Z]{3}-\d{3}$/.test(vehicle.plate)
        ? "Usa el formato ABC-123."
        : undefined,
  }

  const finish = async () => {
    const currentEmail = personal.email.trim().toLowerCase()

    if (
      [
        data.account?.email,
        data.driverAccount.email,
        data.adminAccount?.email,
      ].some(
        (registered) =>
          Boolean(registered) && registered!.toLowerCase() === currentEmail,
      )
    ) {
      setRegistrationError(
        "Ese correo ya está registrado en este dispositivo. Inicia sesión con la cuenta existente.",
      )

      setStep(1)

      return
    }

    setRegistrationError("")

    update({
      driverAccount: {
        name: personal.name.trim(),
        phone: personal.phone,
        email: personal.email.toLowerCase(),
        password: await hashPassword(personal.password),
        contactName: "",
        contactPhone: "",
        relationship: "",
        needs: [],
        needsNote: "",
        preference: "Pasajero",
      },
      vehicle,
      driverDocuments: documents,
      driverVerification: "Pendiente",
      driverRejectionReason: "",
      online: false,
      role: "driver",
    })

    appNotice("Registro enviado. Tu cuenta está pendiente de aprobación.")
    go("login")
  }

  return (
    <section>
      <Header
        title={`Crear cuenta de conductor · ${step} de 3`}
        back={() => (step > 1 ? setStep(step - 1) : go("welcome"))}
      />
      <div className="page">
        <div className="progress">
          <span style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        {registrationError && (
          <p className="error" role="alert">
            {registrationError}
          </p>
        )}
        {step === 1 && (
          <>
            <h1>Datos personales</h1>
            <Field
              label="Nombre completo"
              value={personal.name}
              onChange={(name) => setPersonal({ ...personal, name })}
              error={personalErrors.name}
              required
            />
            <Field
              label="Celular"
              value={personal.phone}
              onChange={(phone) =>
                setPersonal({ ...personal, phone: phone.replace(/\D/g, "") })
              }
              error={personalErrors.phone}
              maxLength={10}
              required
            />
            <Field
              label="Correo electrónico"
              value={personal.email}
              onChange={(email) => setPersonal({ ...personal, email })}
              error={personalErrors.email}
              required
            />
            <Field
              label="Contraseña"
              type="password"
              value={personal.password}
              onChange={(password) => setPersonal({ ...personal, password })}
              error={personalErrors.password}
              required
            />
            {!personalValid && (
              <p className="muted form-hint">
                Completa los cuatro campos. El botón se activa cuando los datos
                cumplen los requisitos.
              </p>
            )}
            <Button disabled={!personalValid} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Vehículo</h1>
            <Field
              label="Marca y modelo"
              value={vehicle.make}
              onChange={(make) => setVehicle({ ...vehicle, make })}
              error={vehicleErrors.make}
              required
            />
            <Field
              label="Color"
              value={vehicle.color}
              onChange={(color) => setVehicle({ ...vehicle, color })}
              error={vehicleErrors.color}
              required
            />
            <Field
              label="Placa"
              value={vehicle.plate}
              onChange={(plate) =>
                setVehicle({ ...vehicle, plate: plate.toUpperCase() })
              }
              error={vehicleErrors.plate}
              maxLength={7}
              required
            />
            {!vehicleValid && (
              <p className="muted form-hint">
                Completa la marca, el color y la placa en formato ABC-123.
              </p>
            )}
            <Button disabled={!vehicleValid} onClick={() => setStep(3)}>
              Continuar
            </Button>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Documentos</h1>
            <p className="muted">
              Elige una imagen o PDF. La vista previa solo se conserva en este dispositivo y no se envía a un servidor.
            </p>
            <div className="choice-list">
              {documents.map((document, index) => (
                <div className="driver-document" key={document.name}>
                  <label className="driver-document-picker" htmlFor={`driver-doc-${index}`}>
                    <span>{document.name}</span>
                    <span>{document.uploaded ? "✓ Cambiar archivo" : "Elegir archivo"}</span>
                  </label>
                  <input
                    id={`driver-doc-${index}`}
                    className="visually-hidden"
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    aria-label={`Seleccionar ${document.name}`}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (!file) return
                      const input = event.currentTarget
                      void (async () => {
                        try {
                          setRegistrationError("")
                          if (file.type.startsWith("image/")) {
                            const dataUrl = await resizeDriverPhoto(file)
                            const preview = {
                              url: dataUrl,
                              type: "image/jpeg",
                              fileName: file.name,
                            }
                            setPreviews((current) => ({
                              ...current,
                              [document.name]: preview,
                            }))
                            setDocuments((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      uploaded: true,
                                      fileName: file.name,
                                      fileType: "image/jpeg",
                                      dataUrl,
                                    }
                                  : item,
                              ),
                            )
                          } else if (file.type === "application/pdf") {
                            setPreviews((current) => ({
                              ...current,
                              [document.name]: {
                                url: "",
                                type: file.type,
                                fileName: file.name,
                              },
                            }))
                            setDocuments((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      uploaded: true,
                                      fileName: file.name,
                                      fileType: file.type,
                                      dataUrl: undefined,
                                    }
                                  : item,
                              ),
                            )
                          } else {
                            setRegistrationError("Elige una imagen o un archivo PDF.")
                          }
                        } catch {
                          setRegistrationError("No se pudo procesar el archivo. Prueba con otra imagen.")
                        } finally {
                          input.value = ""
                        }
                      })()
                    }}
                  />
                  <small>{previews[document.name]?.fileName || document.fileName || "Aún no seleccionado"}</small>
                  {previews[document.name]?.type.startsWith("image/") && (
                    <img
                      className="driver-document-preview"
                      src={previews[document.name].url}
                      alt={`Vista previa: ${document.name}`}
                    />
                  )}
                  {previews[document.name]?.type === "application/pdf" && (
                    <small>PDF seleccionado; se conserva su nombre para la revisión de demostración.</small>
                  )}
                </div>
              ))}
            </div>
            <Button
              disabled={!documents.every((document) => document.uploaded)}
              onClick={finish}
            >
              Enviar para aprobación
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
