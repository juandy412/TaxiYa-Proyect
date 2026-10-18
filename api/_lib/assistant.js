function normalizePlaceText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[.,;:!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function sanitizeAssistantMessage(
  value,
  personalData = [],
  availablePlaces = [],
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
