import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const baseUrl = process.env.DEMO_BASE_URL || "http://127.0.0.1:5173"
const output = "docs/capturas"
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
  })

  await page.goto(`${baseUrl}/#/welcome`, { waitUntil: "networkidle" })
  await page.screenshot({ path: `${output}/bienvenida.png`, fullPage: true })
  await page.getByRole("button", { name: "Iniciar sesión" }).click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${output}/inicio-sesion.png`, fullPage: true })

  await page.addInitScript(() => {
    localStorage.setItem(
      "taxiya",
      JSON.stringify({
        version: 10,
        loggedIn: true,
        role: "passenger",
        account: {
          name: "Pasajera de demostración",
          phone: "",
          email: "demo@taxiya.local",
          password: "pbkdf2-sha256$310000$00$00",
          needs: [],
        },
      }),
    )
  })
  await page.goto(`${baseUrl}/?capture=map#/map-picker`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${output}/mapa-y-destino.png`, fullPage: true })
} finally {
  await browser.close()
}

process.stdout.write(`Capturas guardadas en ${output}\n`)
