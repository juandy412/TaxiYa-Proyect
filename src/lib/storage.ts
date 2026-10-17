import type { Account, ChatMessage, Stored, TripStatus } from "./types"

// Incrementar esta versión limpia sesiones antiguas y descarta datos de demostración migrados.

export const STATE_VERSION = 10

export const emptyAccount: Account = {
  name: "",
  phone: "",
  email: "",
  password: "",
  contactName: "",
  contactPhone: "",

  relationship: "",
  needs: [],
  needsNote: "",
  preference: "Prefiero no decirlo",
}

export const initialChat = (_name = ""): ChatMessage[] => []

export const initialData: Stored = {
  version: STATE_VERSION,

  language: "es",

  loggedIn: false,

  role: "passenger",

  largeText: false,

  notifications: 0,

  trips: 0,

  offer: 10000,

  destination: "Terminal de Transporte",

  online: false,

  rain: false,

  peak: false,

  night: false,

  tripStatus: "idle",

  pin: "",

  pinVerified: false,

  pinErrors: 0,

  selectedDriver: "",

  shieldChecks: 0,

  sosActive: false,

  shared: false,

  chat: initialChat(),

  completedTrips: 0,

  cancelledTrips: 0,

  fareZoneMin: 7500,

  fareZoneMax: 16000,

  origin: "Parque 29 de Mayo",

  notificationItems: [],

  tripHistory: [],

  complaints: [],

  darkMode: false,

  sound: true,

  rejectedRequestIds: [],

  activeRequestId: "",

  shieldDueAt: null,

  shieldEventHandled: false,

  addressPreference: "Pasajera",

  account: null,

  driverAccount: emptyAccount,

  adminAccount: null,

  vehicle: { make: "", color: "", plate: "" },

  shareLocation: true,

  automaticShield: true,

  notifyTrusted: true,

  appearance: "Claro",

  selectedTripId: "",

  arrivalDueAt: null,

  driverArrived: false,

  onlineStartedAt: null,

  onlineMs: 0,

  chatTopic: "",

  chatPending: "",

  chatOrigin: "",

  chatDestination: "",

  demoMode: false,

  shieldPromptCount: 0,

  shieldPromptActive: false,

  driverDelayed: false,

  isConnected: true,

  rideMessages: [],

  activePassengerName: "",

  activePassengerNeeds: "",

  activeRideReal: false,

  paymentMethod: "Efectivo",

  fareManuallyAdjusted: false,

  tripArrivalAt: null,

  driverVerification: "Pendiente",

  driverRejectionReason: "",

  driverDocuments: [],

  savedPlaces: [],

  tip: 0,

  simulateNoDrivers: false,
}

export function isValidChat(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (message) =>
        message &&
        typeof message === "object" &&
        ((message as ChatMessage).from === "user" ||
          (message as ChatMessage).from === "taxi") &&
        typeof (message as ChatMessage).text === "string",
    )
  )
}

function isValidAccount(value: unknown): value is Account {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Account).name === "string" &&
    typeof (value as Account).email === "string" &&
    Array.isArray((value as Account).needs)
  )
}

export function loadStoredData(): Stored {
  try {
    const saved = JSON.parse(
      localStorage.getItem("taxiya") || "{}",
    ) as Partial<Stored>

    const sameVersion = saved.version === STATE_VERSION

    const statuses: TripStatus[] = [
      "idle",
      "requested",
      "assigned",
      "enroute",
      "active",
      "completed",
      "cancelled",
    ]

    const passenger =
      isValidAccount(saved.account) &&
      !(saved.account as Account).demo &&
      !/@(?:ejemplo|example)\.com$/i.test(saved.account.email)
        ? saved.account
        : null

    const driver =
      isValidAccount(saved.driverAccount) &&
      !(saved.driverAccount as Account).demo &&
      !/@(?:ejemplo|example)\.com$/i.test(saved.driverAccount.email)
        ? saved.driverAccount
        : emptyAccount

    const admin =
      isValidAccount(saved.adminAccount) &&
      !(saved.adminAccount as Account).demo &&
      !/@(?:ejemplo|example)\.com$/i.test(saved.adminAccount.email)
        ? saved.adminAccount
        : null

    // Los datos antiguos podían conservar loggedIn=true aunque la cuenta de demostración

    // ya hubiese sido filtrada. Solo restauramos una sesión si existe una cuenta válida del rol.

    const roleHasAccount =
      saved.role === "passenger"
        ? Boolean(passenger?.email && passenger.password)
        : saved.role === "driver"
          ? Boolean(driver.email && driver.password)
          : saved.role === "admin"
            ? Boolean(admin?.email && admin.password)
            : false

    const tripHistory = Array.isArray(saved.tripHistory)
      ? saved.tripHistory.filter(
          (trip) =>
            trip &&
            typeof trip === "object" &&
            !("demo" in trip && (trip as { demo?: unknown }).demo === true),
        )
      : []

    const notificationItems = Array.isArray(saved.notificationItems)
      ? saved.notificationItems.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !/demostraci[oó]n|cuenta de ejemplo|conductor de ejemplo/i.test(
              `${item.title || ""} ${item.text || ""}`,
            ),
        )
      : []

    return {
      ...initialData,

      ...saved,

      version: STATE_VERSION,

      loggedIn: sameVersion && Boolean(saved.loggedIn) && roleHasAccount,

      role:
        sameVersion &&
        ["passenger", "driver", "admin"].includes(saved.role || "")
          ? saved.role!
          : driver.email
            ? "driver"
            : admin
              ? "admin"
              : "passenger",

      notifications: sameVersion ? Number(saved.notifications) || 0 : 0,

      trips: sameVersion ? Number(saved.trips) || 0 : 0,

      completedTrips: sameVersion ? Number(saved.completedTrips) || 0 : 0,

      cancelledTrips: sameVersion ? Number(saved.cancelledTrips) || 0 : 0,

      darkMode: sameVersion ? Boolean(saved.darkMode) : false,

      account: passenger,

      driverAccount: driver,

      adminAccount: admin,

      online: Boolean(sameVersion && driver.email && saved.online),

      onlineStartedAt:
        sameVersion && driver.email && saved.online
          ? saved.onlineStartedAt || Date.now()
          : null,

      appearance:
        sameVersion &&
        ["Oscuro", "Automático", "Claro"].includes(saved.appearance || "")
          ? saved.appearance!
          : "Claro",

      tripStatus:
        sameVersion && statuses.includes(saved.tripStatus as TripStatus)
          ? saved.tripStatus!
          : "idle",

      selectedDriver: sameVersion ? saved.selectedDriver || "" : "",

      activePassengerName: sameVersion ? saved.activePassengerName || "" : "",

      activeRequestId: sameVersion ? saved.activeRequestId || "" : "",

      activeRideReal: sameVersion ? Boolean(saved.activeRideReal) : false,

      driverArrived: sameVersion ? Boolean(saved.driverArrived) : false,

      driverDelayed: sameVersion ? Boolean(saved.driverDelayed) : false,

      activePassengerNeeds: sameVersion ? saved.activePassengerNeeds || "" : "",

      chatPending: sameVersion ? saved.chatPending || "" : "",

      chatOrigin: sameVersion ? saved.chatOrigin || "" : "",

      chatDestination: sameVersion ? saved.chatDestination || "" : "",

      chat: sameVersion && isValidChat(saved.chat) ? saved.chat : initialChat(),

      rideMessages:
        sameVersion && Array.isArray(saved.rideMessages)
          ? saved.rideMessages
          : [],

      tripHistory: sameVersion ? tripHistory : [],

      notificationItems: sameVersion ? notificationItems : [],

      complaints:
        sameVersion && Array.isArray(saved.complaints) ? saved.complaints : [],

      rejectedRequestIds: Array.isArray(saved.rejectedRequestIds)
        ? saved.rejectedRequestIds
        : [],

      savedPlaces: Array.isArray(saved.savedPlaces) ? saved.savedPlaces : [],

      driverVerification: driver.email
        ? saved.driverVerification || "Pendiente"
        : "Pendiente",

      paymentMethod:
        sameVersion &&
        ["Efectivo", "Nequi", "Daviplata"].includes(saved.paymentMethod || "")
          ? saved.paymentMethod!
          : "Efectivo",

      language: saved.language === "en" ? "en" : "es",

      demoMode: false,

      simulateNoDrivers: false,
    }
  } catch {
    return { ...initialData, chat: initialChat() }
  }
}

export function saveStoredData(data: Stored) {
  localStorage.setItem("taxiya", JSON.stringify(data))
}
