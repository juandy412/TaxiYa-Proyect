const PREFIX = "pbkdf2-sha256"

const ITERATIONS = 310_000

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const fromHex = (value: string) => {
  if (!/^(?:[a-f0-9]{2})+$/i.test(value))
    throw new Error("Hash de contraseña no válido.")

  const bytes = Uint8Array.from(value.match(/.{2}/g)!, (byte) =>
    Number.parseInt(byte, 16),
  )

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

async function derive(password: string, salt: ArrayBuffer, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )

  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      material,
      256,
    ),
  )
}

export async function hashPassword(password: string) {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new Error(
      "Este navegador no permite guardar contraseñas de forma segura.",
    )

  const salt = new ArrayBuffer(16)

  crypto.getRandomValues(new Uint8Array(salt))

  const hash = await derive(password, salt, ITERATIONS)

  return `${PREFIX}$${ITERATIONS}$${toHex(new Uint8Array(salt))}$${toHex(hash)}`
}

export async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith(`${PREFIX}$`)) return stored === password

  const [, iterationText, saltHex, hashHex] = stored.split("$")

  const iterations = Number(iterationText)

  if (
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 1_000_000
  )
    return false

  const expected = new Uint8Array(fromHex(hashHex))

  const actual = await derive(password, fromHex(saltHex), iterations)

  if (actual.length !== expected.length) return false

  let difference = 0
  for (let index = 0; index < actual.length; index++) {
    difference |= actual[index] ^ expected[index]
  }
  return difference === 0
}

export async function migrateStoredPasswords() {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new Error(
      "Este navegador no permite proteger las contraseñas guardadas.",
    )

  const raw = localStorage.getItem("taxiya")

  if (!raw) return

  let data: unknown

  try {
    data = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) return

    throw error
  }

  if (!data || typeof data !== "object") return

  const stored = data as Record<string, unknown>

  let changed = false

  for (const key of ["account", "driverAccount", "adminAccount"]) {
    const account = stored[key]

    if (!account || typeof account !== "object") continue

    const credentials = account as Record<string, unknown>

    if (
      typeof credentials.password !== "string" ||
      credentials.password.startsWith(`${PREFIX}$`)
    )
      continue

    credentials.password = await hashPassword(credentials.password)

    changed = true
  }

  if (changed) localStorage.setItem("taxiya", JSON.stringify(stored))
}
