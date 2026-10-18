import { spawn } from "node:child_process"

import { pbkdf2Sync } from "node:crypto"

import { setTimeout as delay } from "node:timers/promises"

import { chromium } from "playwright"

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4179"

const sizes = [
  { width: 360, height: 640 },

  { width: 375, height: 667 },

  { width: 393, height: 852 },

  { width: 412, height: 915 },

  { width: 430, height: 932 },
]

const modes = [
  { name: "claro", appearance: "Claro", largeText: false },

  { name: "oscuro", appearance: "Oscuro", largeText: false },

  { name: "texto grande", appearance: "Claro", largeText: true },
]

const shared = ["chat", "support", "notifications"]

const publicScreens = [
  "welcome",

  "login",

  "register",

  "admin-register",

  "driver-register",

  "forgot",
]

const screensByRole = {
  passenger: [
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

    ...shared,
  ],

  driver: [
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

    ...shared,
  ],

  admin: ["admin"],
}

const registrationSteps = [
  { role: "passenger", screen: "register-step1" },

  { role: "passenger", screen: "register-step2" },
]

const allCases = Object.entries(screensByRole)
  .flatMap(([role, screens]) => [
    ...publicScreens.map((screen) => ({ role, screen, public: true })),

    ...screens.map((screen) => ({ role, screen, public: false })),
  ])
  .concat(registrationSteps)

const auditSalt = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex")

const auditPassword = "audit-password"

const auditPasswordHash = `pbkdf2-sha256$310000$${auditSalt.toString("hex")}$${pbkdf2Sync(auditPassword, auditSalt, 310000, 32, "sha256").toString("hex")}`

function account(name, email) {
  return {
    name,

    phone: "",

    email,

    password: auditPasswordHash,

    contactName: "",

    contactPhone: "",

    relationship: "",

    needs: [],

    needsNote: "",

    preference: "Prefiero no decirlo",
  }
}

function makeState(role, screen, mode) {
  const passenger = account("Persona de prueba", "passenger@taxiya.test")

  const driver = account("Conductor de prueba", "driver@taxiya.test")

  const admin = account("Admin de prueba", "admin@taxiya.test")

  const tripStatus =
    role === "driver"
      ? screen === "verify-pin"
        ? "enroute"
        : ["driver-trip", "payment"].includes(screen)
          ? "active"
          : ["driver-summary", "driver-rating"].includes(screen)
            ? "completed"
            : screen === "request-detail"
              ? "requested"
              : screen === "enroute"
                ? "assigned"
                : "idle"
      : role === "passenger"
        ? screen === "searching"
          ? "requested"
          : ["assigned", "tracking"].includes(screen)
            ? "assigned"
            : ["rating", "thanks"].includes(screen)
              ? "completed"
              : "idle"
        : "idle"

  return {
    version: 10,

    loggedIn: !publicScreens.includes(screen),

    role,

    largeText: mode.largeText,

    notifications: 0,

    trips: 0,

    offer: 10000,

    destination: "Terminal de Transporte",

    online: role === "driver",

    rain: false,

    peak: false,

    night: false,

    tripStatus,

    pin: "1234",

    pinVerified: ["driver-trip", "payment"].includes(screen),

    pinErrors: 0,

    selectedDriver: "Conductor de prueba",

    shieldChecks: 0,

    sosActive: false,

    shared: false,

    chat: [],

    completedTrips: 0,

    cancelledTrips: 0,

    fareZoneMin: 7500,

    fareZoneMax: 16000,

    origin: "Parque 29 de Mayo",

    notificationItems: [],

    tripHistory: [],

    complaints: [],

    darkMode: mode.appearance === "Oscuro",

    sound: true,

    rejectedRequestIds: [],

    activeRequestId: "audit-request",

    shieldDueAt: null,

    shieldEventHandled: false,

    addressPreference: "Prefiero no decirlo",

    account: passenger,

    driverAccount: driver,

    adminAccount: admin,

    vehicle: { make: "Vehículo", color: "Gris", plate: "ABC-123" },

    shareLocation: false,

    automaticShield: false,

    notifyTrusted: false,

    appearance: mode.appearance,

    selectedTripId: "",

    arrivalDueAt: null,

    driverArrived: screen === "verify-pin",

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

    activePassengerName: "Persona de prueba",

    activePassengerNeeds: "",

    activeRideReal: false,

    paymentMethod: "Efectivo",

    fareManuallyAdjusted: false,

    tripArrivalAt: null,

    driverVerification: "Aprobado",

    driverRejectionReason: "",

    driverDocuments: [],

    savedPlaces: [],

    tip: 0,

    simulateNoDrivers: false,

    language: "es",
  }
}

async function ensureServer() {
  const probe = await fetch(baseUrl).catch(() => null)

  if (probe?.ok) return null

  const server = spawn(
    process.execPath,

    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4179",
      "--strictPort",
    ],

    { stdio: "ignore", windowsHide: true },
  )

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null)
      throw new Error(`Vite terminó al iniciar con código ${server.exitCode}`)

    const response = await fetch(baseUrl).catch(() => null)

    if (response?.ok) return server

    await delay(200)
  }

  server.kill()

  throw new Error(`No se pudo iniciar Vite en ${baseUrl}`)
}

const server = await ensureServer()

const browser = await chromium.launch({ headless: true })

const page = await browser.newPage({
  viewport: sizes[0],

  reducedMotion: "reduce",
})

await page.route("**/*", (route) =>
  new URL(route.request().url()).origin === new URL(baseUrl).origin
    ? route.continue()
    : route.abort(),
)

const findings = []

try {
  await page.goto(`${baseUrl}/#/welcome`, { waitUntil: "domcontentloaded" })

  for (const size of sizes) {
    await page.setViewportSize(size)

    for (const mode of modes) {
      for (const testCase of allCases) {
        const initialScreen = testCase.screen.startsWith("register-step")
          ? "register"
          : testCase.screen === "permission"
            ? "login"
            : testCase.screen
        const expectedRoute = testCase.screen.startsWith("register-step")
          ? "register"
          : testCase.screen

        const state = makeState(testCase.role, initialScreen, mode)

        if (testCase.screen === "permission") state.loggedIn = false

        await page.evaluate(
          ({ state, screen }) => {
            localStorage.setItem("taxiya", JSON.stringify(state))

            history.replaceState(null, "", `/#/${screen}`)
          },

          { state, screen: initialScreen },
        )

        await page.reload({ waitUntil: "domcontentloaded" })

        await page.waitForSelector(".phone .screen-content", { timeout: 5000 })

        if (testCase.screen === "permission") {
          await page
            .locator('input[autocomplete="username"]')
            .fill("passenger@taxiya.test")

          await page
            .locator('input[autocomplete="current-password"]')
            .fill(auditPassword)

          await page.locator(".login-form button[type=submit]").click()

          await page.waitForFunction(() => location.hash === "#/permission")
        } else if (testCase.screen.startsWith("register-step")) {
          await page
            .locator(".registration-role")
            .filter({ hasText: "Pasajero" })
            .click()

          await page.locator(".registration-choice .button").click()

          if (testCase.screen === "register-step2") {
            await page
              .locator('.register-form input[autocomplete="name"]')
              .fill("Persona de auditoría")

            await page
              .locator('.register-form input[autocomplete="tel"]')
              .fill("3001234567")

            await page
              .locator('.register-form input[autocomplete="email"]')
              .fill("new-user@taxiya.test")

            await page
              .locator('.register-form input[autocomplete="new-password"]')
              .nth(0)
              .fill("AuditPass1")

            await page
              .locator('.register-form input[autocomplete="new-password"]')
              .nth(1)
              .fill("AuditPass1")

            await page.getByRole("button", { name: "Continuar" }).click()

            await page.waitForFunction(() =>
              document
                .querySelector(".registration-step")
                ?.textContent?.includes("2 de 2"),
            )
          }
        }

        await page.waitForTimeout(35)

        const result = await page.evaluate(() => {
          const clippedRect = (element) => {
            const rect = element.getBoundingClientRect()

            let left = Math.max(0, rect.left)

            let top = Math.max(0, rect.top)

            let right = Math.min(innerWidth, rect.right)

            let bottom = Math.min(innerHeight, rect.bottom)

            for (
              let ancestor = element.parentElement;
              ancestor;
              ancestor = ancestor.parentElement
            ) {
              const style = getComputedStyle(ancestor)

              const clipX = ["auto", "scroll", "hidden", "clip"].includes(
                style.overflowX,
              )

              const clipY = ["auto", "scroll", "hidden", "clip"].includes(
                style.overflowY,
              )

              if (!clipX && !clipY) continue

              const parent = ancestor.getBoundingClientRect()

              if (clipX) {
                left = Math.max(left, parent.left)

                right = Math.min(right, parent.right)
              }

              if (clipY) {
                top = Math.max(top, parent.top)

                bottom = Math.min(bottom, parent.bottom)
              }
            }

            return {
              left,
              top,
              right,
              bottom,
              width: right - left,
              height: bottom - top,
            }
          }

          const isInteractive = (element) =>
            element.matches(
              'button, a, input, select, textarea, [role="button"]',
            )

          const visible = (element) => {
            const rect = clippedRect(element)

            const style = getComputedStyle(element)

            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              Number(style.opacity) > 0
            )
          }

          const nameOf = (element) =>
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.innerText?.replace(/\s+/g, " ").trim().slice(0, 50) ||
            element.getAttribute("placeholder") ||
            element.tagName.toLowerCase()

          const describe = (element) => {
            const className =
              typeof element.className === "string"
                ? element.className.trim().replace(/\s+/g, ".")
                : ""

            return `${nameOf(element)} [${element.tagName.toLowerCase()}${
              className ? `.${className}` : ""
            }]`
          }

          const elements = [
            ...document.querySelectorAll(
              'button, a, input, select, textarea, [role="button"]',
            ),
          ].filter(visible)

          const overlaps = []

          for (let index = 0; index < elements.length; index += 1) {
            const first = elements[index]

            const a = clippedRect(first)

            for (const second of elements.slice(index + 1)) {
              if (first.contains(second) || second.contains(first)) continue

              const b = clippedRect(second)

              const width =
                Math.min(a.right, b.right) - Math.max(a.left, b.left)

              const height =
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

              if (width > 1 && height > 1)
                overlaps.push(`${describe(first)} <> ${describe(second)}`)
            }
          }

          const covered = []

          const smallButtons = []

          const clippedButtons = []

          for (const element of elements) {
            const rect = element.getBoundingClientRect()

            const label = nameOf(element)

            if (
              element.matches("button") &&
              (rect.width < 44 || rect.height < 44)
            )
              smallButtons.push(
                `${label} (${Math.round(rect.width)}x${Math.round(rect.height)})`,
              )

            if (
              element.matches("button") &&
              element.scrollWidth > element.clientWidth + 1
            )
              clippedButtons.push(label)

            const x = Math.round(rect.left + rect.width / 2)

            const y = Math.round(rect.top + rect.height / 2)

            const visibleRect = clippedRect(element)

            if (
              visibleRect.width <= 0 ||
              visibleRect.height <= 0 ||
              x < visibleRect.left ||
              x > visibleRect.right ||
              y < visibleRect.top ||
              y > visibleRect.bottom
            )
              continue

            const hit = document.elementFromPoint(x, y)

            if (hit && hit !== element && !element.contains(hit))
              covered.push(`${describe(element)} by ${describe(hit)}`)
          }

          const root = document.documentElement

          const loginAction = document.querySelector(
            ".login-screen form button[type=submit]",
          )

          const loginFooter = document.querySelector(".login-footer")

          const loginIsCompact =
            document.querySelector(".login-screen") !== null &&
            !document.querySelector("main")?.classList.contains("large-text")

          const loginNeedsScroll =
            loginIsCompact &&
            (document.querySelector(".screen-content")?.scrollHeight || 0) >
              (document.querySelector(".screen-content")?.clientHeight || 0) + 1

          return {
            route: location.hash.replace(/^#\//, ""),

            overlaps,

            covered,

            smallButtons,

            clippedButtons,

            horizontalOverflow: root.scrollWidth > root.clientWidth,

            scrollWidth: root.scrollWidth,

            clientWidth: root.clientWidth,

            scrollableLogin: loginNeedsScroll,

            loginActionVisible:
              !loginIsCompact ||
              Boolean(
                loginAction &&
                  loginFooter &&
                  loginAction.getBoundingClientRect().top >= 0 &&
                  loginFooter.getBoundingClientRect().bottom <= innerHeight,
              ),
          }
        })

        const issueCount =
          result.overlaps.length +
          result.covered.length +
          result.smallButtons.length +
          result.clippedButtons.length +
          Number(result.scrollableLogin) +
          Number(!result.loginActionVisible) +
          Number(result.horizontalOverflow)

        if (result.route !== expectedRoute || issueCount > 0)
          findings.push({
            role: testCase.role,

            expectedRoute,

            ...size,

            mode: mode.name,

            ...result,
          })
      }
    }
  }
} finally {
  await browser.close()

  if (server) server.kill()
}

console.log(
  JSON.stringify(
    {
      routesTested: allCases.length,

      viewports: sizes.length,

      modes: modes.map((mode) => mode.name),

      statesMeasured: allCases.length * sizes.length * modes.length,

      findingCount: findings.length,

      findings,
    },

    null,

    2,
  ),
)

if (findings.length) process.exitCode = 1
