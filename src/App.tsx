import {
  type ComponentType,
  type ReactNode,
  type UIEvent,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react"

import type { Role, Screen, Stored, Update } from "./lib/types"

import {
  initialData,
  initialChat,
  isValidChat,
  loadStoredData,
} from "./lib/storage"

import { beep, newNotification } from "./lib/format"

import { BottomNav, ModalShell, TaxiLauncherContext } from "./components"

import { TaxiAssistant } from "./components/TaxiAssistant"

import {
  AdminRegister,
  Assigned,
  Chat,
  Fare,
  Forgot,
  Login,
  MapPicker,
  Notifications,
  PassengerHome,
  Permission,
  Profile,
  Rating,
  Register,
  Search,
  Searching,
  ShieldCheck,
  ShieldEscalated,
  Support,
  Thanks,
  Tracking,
  TripDetail,
  Trips,
  Welcome,
} from "./screens/passenger"

// Las pantallas de conductor y administrador se cargan solo cuando se usan (bundle más liviano).

const lazyNamed = (
  load: () => Promise<Record<string, unknown>>,
  name: string,
) =>
  lazy(() => load().then((m) => ({ default: m[name] as ComponentType<any> })))

const loadDriver = () => import("./screens/driver")

const Admin = lazyNamed(() => import("./screens/admin"), "Admin")

const DriverHome = lazyNamed(loadDriver, "DriverHome")

const DriverRegister = lazyNamed(loadDriver, "DriverRegister")

const DriverSummary = lazyNamed(loadDriver, "DriverSummary")

const DriverTrip = lazyNamed(loadDriver, "DriverTrip")

const DriverTrips = lazyNamed(loadDriver, "DriverTrips")

const DriverProfile = lazyNamed(loadDriver, "DriverProfile")

const Earnings = lazyNamed(loadDriver, "Earnings")

const Enroute = lazyNamed(loadDriver, "Enroute")

const Payment = lazyNamed(loadDriver, "Payment")

const RequestDetail = lazyNamed(loadDriver, "RequestDetail")

const Requests = lazyNamed(loadDriver, "Requests")

const VerifyPin = lazyNamed(loadDriver, "VerifyPin")

// Rutas con # para que el botón "atrás" del navegador y recargar la página mantengan la pantalla.

const ALL_SCREENS: Screen[] = [
  "welcome",
  "login",
  "register",
  "admin-register",
  "chat",
  "driver-register",
  "forgot",
  "permission",
  "home",
  "search",
  "map-picker",
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
  "admin",
]

const PUBLIC_SCREENS: Screen[] = [
  "welcome",
  "login",
  "register",
  "admin-register",
  "driver-register",
  "forgot",
]

const DRIVER_SCREENS: Screen[] = [
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
]

const SHARED_USER_SCREENS: Screen[] = ["chat", "support", "notifications"]

const TRIP_SCREENS: Screen[] = ["searching", "assigned", "tracking"]

const homeFor = (role: Role): Screen =>
  role === "driver" ? "driver-home" : role === "admin" ? "admin" : "home"

const screenFromHash = (): Screen | null => {
  const name = window.location.hash.replace(/^#\//, "") as Screen

  return ALL_SCREENS.includes(name) ? name : null
}

// Devuelve la pantalla pedida si el estado actual la permite; si no, la pantalla de inicio que corresponde.

const guardScreen = (wanted: Screen, data: Stored): Screen => {
  if (!data.loggedIn)
    return PUBLIC_SCREENS.includes(wanted) ? wanted : "welcome"

  if (PUBLIC_SCREENS.includes(wanted) || wanted === "permission")
    return homeFor(data.role)

  if (wanted === "admin")
    return data.role === "admin" ? wanted : homeFor(data.role)

  if (DRIVER_SCREENS.includes(wanted) && data.role !== "driver")
    return homeFor(data.role)

  if (data.role === "driver") {
    if (
      wanted === "verify-pin" &&
      (data.tripStatus !== "enroute" || !data.driverArrived)
    )
      return data.tripStatus === "assigned" ? "enroute" : homeFor(data.role)

    if (
      wanted === "driver-trip" &&
      (data.tripStatus !== "active" || !data.pinVerified)
    )
      return homeFor(data.role)

    if (
      wanted === "payment" &&
      (data.tripStatus !== "active" || !data.pinVerified)
    )
      return homeFor(data.role)

    if (
      (wanted === "driver-summary" || wanted === "driver-rating") &&
      data.tripStatus !== "completed"
    )
      return homeFor(data.role)

    if (
      wanted === "enroute" &&
      !["assigned", "enroute"].includes(data.tripStatus)
    )
      return homeFor(data.role)

    if (
      wanted === "request-detail" &&
      (!data.isConnected ||
        !data.online ||
        data.driverVerification !== "Aprobado")
    )
      return homeFor(data.role)

    if (DRIVER_SCREENS.includes(wanted)) return wanted
  }

  // Ayuda, notificaciones y chat son pantallas compartidas por pasajero y conductor.

  // Antes, estas rutas se interpretaban como exclusivas del pasajero y sacaban al conductor.

  if (SHARED_USER_SCREENS.includes(wanted))
    return data.role === "admin" ? homeFor(data.role) : wanted

  if (data.role !== "passenger") return homeFor(data.role)

  if (wanted === "searching" && data.tripStatus !== "requested")
    return homeFor(data.role)

  if (
    wanted === "assigned" &&
    !["assigned", "enroute"].includes(data.tripStatus)
  )
    return homeFor(data.role)

  if (
    wanted === "tracking" &&
    !["assigned", "enroute", "active"].includes(data.tripStatus)
  )
    return homeFor(data.role)

  if (
    TRIP_SCREENS.includes(wanted) &&
    ["idle", "completed", "cancelled"].includes(data.tripStatus)
  )
    return homeFor(data.role)

  return wanted
}

function App() {
  const [data, setData] = useState<Stored>(loadStoredData)

  const initialScreen: Screen = data.loggedIn
    ? data.role === "driver"
      ? "driver-home"
      : data.role === "admin"
        ? "admin"
        : "home"
    : "welcome"

  const [screen, setScreen] = useState<Screen>(() => {
    const wanted = screenFromHash()
    return wanted ? guardScreen(wanted, data) : initialScreen
  })

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  )

  const [history, setHistory] = useState<Screen[]>([])

  const [toast, setToast] = useState("")

  const [modal, setModal] = useState<ReactNode>(null)

  const [taxiOpen, setTaxiOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollTimer = useRef<number>(0)

  // Indicador de scroll que aparece solo mientras te desplazas, y sombra bajo el encabezado cuando hay contenido arriba.

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget

    el.dataset.scrolling = "true"

    el.parentElement?.setAttribute(
      "data-scrolled",
      el.scrollTop > 4 ? "true" : "false",
    )

    window.clearTimeout(scrollTimer.current)

    scrollTimer.current = window.setTimeout(() => {
      delete el.dataset.scrolling
    }, 900)
  }

  const update: Update = (patch) =>
    setData((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }))

  const closeModal = () => {
    if (data.shieldPromptActive && data.shieldChecks === 0 && !data.sosActive) {
      if (data.shieldPromptCount >= 2) {
        update({ shieldPromptActive: false })

        setModal(
          <ShieldEscalated
            data={data}
            update={update}
            close={() => setModal(null)}
          />,
        )

        return
      }

      update({
        shieldPromptActive: false,
        shieldEventHandled: false,
        shieldDueAt: Date.now() + 20000,
      })
    }

    setModal(null)
  }

  useEffect(() => {
    try {
      localStorage.setItem("taxiya", JSON.stringify(data))
    } catch {
      setToast("No se pudieron guardar los cambios en este dispositivo.")
    }
  }, [data])

  useEffect(() => {
    // Reflejar la conectividad del navegador para evitar que acciones dependientes de red

    // sigan apareciendo disponibles cuando el dispositivo está sin conexión.

    const syncConnection = () => update({ isConnected: navigator.onLine })

    syncConnection()

    window.addEventListener("online", syncConnection)

    window.addEventListener("offline", syncConnection)

    return () => {
      window.removeEventListener("online", syncConnection)

      window.removeEventListener("offline", syncConnection)
    }
  }, [])

  useEffect(() => {
    if (!isValidChat(data.chat)) update({ chat: initialChat() })
  }, [data.chat])

  useEffect(() => {
    const listener = (event: Event) =>
      setToast((event as CustomEvent<string>).detail)

    const openAssistant = () => setTaxiOpen(true)

    window.addEventListener("taxiya-notice", listener)

    window.addEventListener("taxiya-open-assistant", openAssistant)

    return () => {
      window.removeEventListener("taxiya-notice", listener)
      window.removeEventListener("taxiya-open-assistant", openAssistant)
    }
  }, [])

  useEffect(() => {
    if (!toast) return

    const t = setTimeout(() => setToast(""), 2600)

    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (modal) setToast("")
  }, [modal])

  useEffect(() => {
    if (
      data.tripStatus !== "active" ||
      data.shieldEventHandled ||
      !data.automaticShield
    )
      return

    if (!data.shieldDueAt) {
      update({ shieldDueAt: Date.now() + 25000 })

      return
    }

    const remaining = Math.max(0, data.shieldDueAt - Date.now())

    const timer = setTimeout(() => {
      beep(data.sound)

      const notification = newNotification(
        "Simulación de pausa del Escudo",
        "Evento de demostración; no se detectó un cambio real de ruta.",
        "tracking",
      )

      const promptCount = data.shieldPromptCount + 1

      setData((current) => ({
        ...current,
        shieldEventHandled: true,
        shieldPromptCount: promptCount,
        shieldPromptActive: true,
        notificationItems: [notification, ...current.notificationItems],
      }))

      setModal(
        <ShieldCheck
          data={{
            ...data,
            shieldEventHandled: true,
            shieldPromptCount: promptCount,
            shieldPromptActive: true,
          }}
          update={update}
          close={() => {
            update({ shieldPromptActive: false })
            setModal(null)
          }}
          escalate={() => {
            update({ shieldPromptActive: false })
            setModal(
              <ShieldEscalated
                data={data}
                update={update}
                close={() => setModal(null)}
              />,
            )
          }}
        />,
      )
    }, remaining)

    return () => clearTimeout(timer)
  }, [
    data.tripStatus,
    data.shieldDueAt,
    data.shieldEventHandled,
    data.automaticShield,
  ])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (taxiOpen) setTaxiOpen(false)
        else if (modal) closeModal()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    const viewport = window.visualViewport

    const reveal = () =>
      (document.activeElement as HTMLElement | null)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      })

    viewport?.addEventListener("resize", reveal)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      viewport?.removeEventListener("resize", reveal)
    }
  }, [modal, taxiOpen])

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)")

    if (!media) return

    const listener = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches)

    media.addEventListener("change", listener)

    return () => media.removeEventListener("change", listener)
  }, [])

  useEffect(() => {
    // Cada pantalla nueva empieza arriba (antes heredaba la posición de la pantalla anterior).

    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" })

    scrollRef.current?.parentElement?.setAttribute("data-scrolled", "false")
  }, [screen])

  useEffect(() => {
    const target = `#/${screen}`

    if (window.location.hash !== target) window.location.hash = target
  }, [screen])

  useEffect(() => {
    const onHashChange = () => {
      const wanted = screenFromHash()

      if (!wanted) return

      const allowed = guardScreen(wanted, data)

      setScreen((current) => {
        if (current === allowed) return current

        setHistory((h) => (h.at(-1) === allowed ? h.slice(0, -1) : h))

        setModal(null)

        return allowed
      })

      if (allowed !== wanted) window.location.replace(`#/${allowed}`)
    }

    window.addEventListener("hashchange", onHashChange)

    return () => window.removeEventListener("hashchange", onHashChange)
  }, [data])

  const go = (next: Screen) => {
    setHistory((h) => [...h, screen])
    setScreen(next)
  }

  const back = () => {
    const previous = history.at(-1)

    if (previous) {
      setScreen(previous)
      setHistory((h) => h.slice(0, -1))
    } else setScreen(homeFor(data.role))
  }

  const reset = () => {
    localStorage.removeItem("taxiya")

    setData({ ...initialData, chat: initialChat() })
    setHistory([])
    setScreen("welcome")
    setModal(null)
    setTaxiOpen(false)
    setToast("Datos locales eliminados")
  }

  const content = (() => {
    switch (screen) {
      case "welcome":
        return (
          <Welcome
            go={go}
            setRole={(role) => update({ role })}
            appearance={data.appearance}
            setAppearance={(appearance) =>
              update({ appearance, darkMode: appearance === "Oscuro" })
            }
            language={data.language}
            setLanguage={(language) => update({ language })}
          />
        )

      case "login":
        return (
          <Login
            data={data}
            role={data.role}
            setRole={(role) => update({ role })}
            go={go}
            update={update}
          />
        )

      case "register":
        return <Register data={data} go={go} update={update} />

      case "admin-register":
        return <AdminRegister data={data} go={go} update={update} />

      case "chat":
        return (
          <section className="chat-screen">
            <Chat
              driver={data.role === "driver"}
              data={data}
              update={update}
              onClose={() => {
                if (history.length) back()
                else go(homeFor(data.role))
              }}
            />
          </section>
        )

      case "driver-register":
        return <DriverRegister data={data} go={go} update={update} />

      case "forgot":
        return <Forgot data={data} update={update} role={data.role} go={go} />

      case "permission":
        return <Permission go={go} update={update} />

      case "home":
        return <PassengerHome go={go} data={data} update={update} />

      case "search":
        return (
          <Search go={go} back={back} update={update} origin={data.origin} />
        )

      case "map-picker":
        return (
          <MapPicker go={go} back={back} update={update} origin={data.origin} />
        )

      case "fare":
        return (
          <Fare
            data={data}
            update={update}
            back={back}
            go={go}
            setModal={setModal}
          />
        )

      case "searching":
        return <Searching data={data} update={update} go={go} back={back} />

      case "assigned":
        return (
          <Assigned
            data={data}
            update={update}
            go={go}
            back={back}
            setModal={setModal}
          />
        )

      case "tracking":
        return (
          <Tracking data={data} update={update} go={go} setModal={setModal} />
        )

      case "rating":
        return <Rating go={go} driver={false} data={data} update={update} />

      case "thanks":
        return <Thanks go={go} data={data} />

      case "trips":
        return <Trips go={go} data={data} update={update} />

      case "trip-detail":
        return (
          <TripDetail
            data={data}
            update={update}
            back={back}
            setModal={setModal}
          />
        )

      case "profile":
        return (
          <Profile
            data={data}
            update={update}
            go={go}
            setModal={setModal}
            reset={reset}
          />
        )

      case "support":
        return (
          <Support
            data={data}
            update={update}
            setModal={setModal}
            openTaxi={() => setTaxiOpen(true)}
          />
        )

      case "notifications":
        return <Notifications data={data} update={update} go={go} />

      case "driver-home":
        return <DriverHome data={data} update={update} go={go} />

      case "requests":
        return <Requests go={go} data={data} update={update} />

      case "request-detail":
        return (
          <RequestDetail
            data={data}
            update={update}
            go={go}
            back={back}
            setModal={setModal}
          />
        )

      case "enroute":
        return (
          <Enroute data={data} update={update} go={go} setModal={setModal} />
        )

      case "verify-pin":
        return <VerifyPin data={data} update={update} go={go} />

      case "driver-trip":
        return (
          <DriverTrip data={data} update={update} go={go} setModal={setModal} />
        )

      case "payment":
        return <Payment go={go} data={data} update={update} />

      case "driver-summary":
        return <DriverSummary go={go} data={data} />

      case "driver-rating":
        return <Rating go={go} driver data={data} update={update} />

      case "driver-trips":
        return <DriverTrips data={data} update={update} go={go} />

      case "earnings":
        return <Earnings data={data} />

      case "driver-profile":
        return (
          <DriverProfile
            data={data}
            update={update}
            go={go}
            setModal={setModal}
          />
        )

      case "admin":
        return <Admin data={data} update={update} go={go} />

      default:
        return null
    }
  })()

  const noNav = [
    "welcome",
    "login",
    "register",
    "admin-register",
    "chat",
    "driver-register",
    "forgot",
    "permission",
    "search",
    "map-picker",
    "fare",
    "searching",
    "assigned",
    "tracking",
    "rating",
    "thanks",
    "request-detail",
    "enroute",
    "verify-pin",
    "driver-trip",
    "payment",
    "driver-summary",
    "driver-rating",
    "admin",
  ].includes(screen)

  const showTaxi =
    data.loggedIn &&
    data.role !== "admin" &&
    ![
      "welcome",
      "login",
      "register",
      "admin-register",
      "chat",
      "forgot",
      "permission",
    ].includes(screen)

  const automaticDark = data.appearance === "Automático" && systemDark

  const isDark = data.appearance === "Oscuro" || automaticDark

  useEffect(() => {
    // El modo oscuro también debe pintar el fondo detrás del teléfono, el rebote del scroll y los controles nativos.

    document.documentElement.classList.toggle("dark-mode", isDark)

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )

    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }

    meta.content = isDark ? "#10241d" : "#fffdf8"
  }, [isDark])

  return (
    <main
      className={`${data.largeText ? "large-text" : ""} ${
        isDark ? "dark-mode" : ""
      }`}
    >
      <div className="phone-shell">
        <div className="phone">
          {data.loggedIn && !data.isConnected && (
            <div className="connection-banner" role="alert">
              <span>Sin conexión. Algunas acciones no están disponibles.</span>
              <button
                onClick={() => {
                  const connected = navigator.onLine
                  update({ isConnected: connected })
                  if (!connected) setToast("Aún no hay conexión a Internet.")
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          <TaxiLauncherContext.Provider
            value={{
              show: showTaxi && !taxiOpen,
              open: () => setTaxiOpen(true),
              language: data.language,
            }}
          >
            <div className="screen-content" ref={scrollRef} onScroll={onScroll}>
              <Suspense
                fallback={
                  <div
                    className="page state-page"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="muted center">Cargando…</p>
                  </div>
                }
              >
                {content}
              </Suspense>
            </div>
          </TaxiLauncherContext.Provider>
          {!noNav && data.loggedIn && (
            <BottomNav role={data.role} screen={screen} go={go} />
          )}
          {taxiOpen && (
            <TaxiAssistant
              data={data}
              update={update}
              screen={screen}
              go={go}
              close={() => setTaxiOpen(false)}
              setModal={setModal}
            />
          )}
          {toast && !modal && (
            <div className="toast" role="status">
              {toast}
            </div>
          )}
          {modal && <ModalShell close={closeModal}>{modal}</ModalShell>}
        </div>
      </div>
    </main>
  )
}

export default App
