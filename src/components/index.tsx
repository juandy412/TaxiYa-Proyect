import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import type { Language, Role, Screen } from "../lib/types"

import { translate } from "../lib/i18n"

export const TaxiLauncherContext = createContext<{
  show: boolean
  open: () => void
  language: Language
}>({ show: false, open: () => undefined, language: "es" })

const iconPaths: Record<string, ReactNode> = {
  back: <path d="m15 18-6-6 6-6M9 12h10" />,

  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),

  car: (
    <>
      <path d="m5 17-2-2 2-6h14l2 6-2 2" />
      <path d="M5 17v3M19 17v3M7 14h.01M17 14h.01M7 9l2-4h6l2 4" />
    </>
  ),

  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),

  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),

  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),

  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),

  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),

  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),

  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
  ),

  shield: (
    <>
      <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5A8 8 0 1 1 21 15Z" />,

  assistant: (
    <>
      <path d="M19 14a4 4 0 0 1-4 4H8l-4 2 1.4-4A7 7 0 1 1 19 14Z" />
      <path d="m18 2 .7 1.8L21 4.5l-2.3.8L18 7l-.7-1.7-2.3-.8 2.3-.7Z" />
    </>
  ),

  rain: <path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10Z" />,

  moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,

  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),

  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),

  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7h.01" />
    </>
  ),

  phone: (
    <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-2-2 2c-3.5-1.5-6.5-4.5-8-8l2-2Z" />
  ),

  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
    </>
  ),

  check: <path d="m5 12 4 4L19 6" />,

  chevron: <path d="m9 18 6-6-6-6" />,

  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1-2-4-2.2.8a8 8 0 0 0-1.7-1L15 3h-6l-.4 2.8a8 8 0 0 0-1.7 1L4.7 6l-2 4 2.3 1a7 7 0 0 0 0 2l-2.3 1 2 4 2.2-.8a8 8 0 0 0 1.7 1L9 21h6l.4-2.8a8 8 0 0 0 1.7-1l2.2.8 2-4-2.3-1a7 7 0 0 0 .1-1Z" />
    </>
  ),

  wallet: (
    <>
      <path d="M3 6h16v14H3Z" />
      <path d="M3 6c0-2 1-3 3-3h11v3M15 11h6v5h-6Z" />
    </>
  ),

  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-1.4 1-1.8 1.4-1.8 2.8M12 18h.01" />
    </>
  ),

  plus: <path d="M12 5v14M5 12h14" />,

  minus: <path d="M5 12h14" />,

  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),

  logout: (
    <>
      <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
    </>
  ),

  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
    </>
  ),
}

export function Icon({
  name,
  size = 21,
  filled = false,
}: {
  name: string
  size?: number
  filled?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  )
}

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled,
  type = "button",
  icon,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"

  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
  icon?: string
}) {
  const { language } = useContext(TaxiLauncherContext)

  return (
    <button
      className={`button ${variant}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} />}
      {typeof children === "string" ? translate(children, language) : children}
    </button>
  )
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  inputRef,
  maxLength,
  required = false,
  autoComplete,
  inputMode,
  errorAction,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string

  error?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  maxLength?: number
  required?: boolean
  autoComplete?: string
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
  errorAction?: { label: string; onClick: () => void }
}) {
  const [visible, setVisible] = useState(false)

  const { language } = useContext(TaxiLauncherContext)

  return (
    <label className="field">
      <span>
        {translate(label, language)}
        {required && (
          <b className="required-mark" aria-hidden="true">
            {" "}
            *
          </b>
        )}
      </span>
      <div className={`input-wrap ${error ? "has-error" : ""}`}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type === "password" && visible ? "text" : type}
          placeholder={
            placeholder ? translate(placeholder, language) : undefined
          }
          maxLength={maxLength}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
        />
        {type === "password" && (
          <button
            type="button"
            className="field-action"
            onClick={() => setVisible(!visible)}
            aria-label={translate(
              visible ? "Ocultar contraseña" : "Mostrar contraseña",
              language,
            )}
          >
            <Icon name="eye" />
          </button>
        )}
      </div>
      {error && (
        <small className="error field-error-message" role="alert">
          <span>{translate(error, language)}</span>
          {errorAction && (
            <button type="button" onClick={errorAction.onClick}>
              {translate(errorAction.label, language)}
            </button>
          )}
        </small>
      )}
    </label>
  )
}

export function TaxiHeaderButton({ dark = false }: { dark?: boolean }) {
  const taxi = useContext(TaxiLauncherContext)

  if (!taxi.show) return null

  return (
    <button
      className={`taxi-launcher ${dark ? "dark" : ""}`}
      onClick={taxi.open}
      aria-label={translate("Abrir el asistente TaxiYa", taxi.language)}
    >
      <Icon name="assistant" />
    </button>
  )
}

export function LanguagePicker({
  language,
  onChange,
}: {
  language: Language
  onChange: (language: Language) => void
}) {
  const { language: current } = useContext(TaxiLauncherContext)

  return (
    <div
      className="language-picker"
      role="group"
      aria-label={translate("Selecciona el idioma", current)}
    >
      <button
        type="button"
        aria-pressed={language === "es"}
        className={language === "es" ? "active" : ""}
        onClick={() => onChange("es")}
      >
        {translate("Español", current)}
      </button>
      <button
        type="button"
        aria-pressed={language === "en"}
        className={language === "en" ? "active" : ""}
        onClick={() => onChange("en")}
      >
        English
      </button>
    </div>
  )
}

export function ModalShell({
  children,
  close,
}: {
  children: ReactNode
  close: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  const previous = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previous.current = (document.activeElement as HTMLElement)

    const modal = ref.current

    const focusableSelector =
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])"

    const focusable = modal?.querySelectorAll<HTMLElement>(focusableSelector)
    ;(focusable?.[0] || modal)?.focus()

    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return

      const available = modal?.querySelectorAll<HTMLElement>(focusableSelector)

      if (!available?.length) {
        event.preventDefault()

        modal?.focus()

        return
      }

      const first = available[0],
        last = available[available.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    modal?.addEventListener("keydown", trap)

    return () => {
      modal?.removeEventListener("keydown", trap)
      previous.current?.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Dialog"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
        <Button variant="secondary" onClick={close}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}

export function Header({
  title,
  back,
  action,
}: {
  title: string
  back?: () => void
  action?: ReactNode
}) {
  const { language } = useContext(TaxiLauncherContext)

  return (
    <header className="header">
      {back ? (
        <button
          className="icon-button"
          onClick={back}
          aria-label={translate("Volver", language)}
        >
          <Icon name="back" />
        </button>
      ) : (
        <span className="header-space" />
      )}
      <strong>{translate(title, language)}</strong>
      <span className="header-actions">
        {action}
        <TaxiHeaderButton />
      </span>
    </header>
  )
}

export function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark">
        <Icon name="car" size={26} />
      </span>
      <span>
        TaxiYa <b>Ocaña</b>
      </span>
    </div>
  )
}

export function Empty({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  const { language } = useContext(TaxiLauncherContext)

  return (
    <div className="empty">
      <span className="feature-icon">
        <Icon name={icon} />
      </span>
      <h2>{translate(title, language)}</h2>
      <p className="muted">{translate(text, language)}</p>
    </div>
  )
}

export function BottomNav({
  role,
  screen,
  go,
}: {
  role: Role
  screen: Screen
  go: (s: Screen) => void
}) {
  const { language } = useContext(TaxiLauncherContext)

  const passenger: [string, string, Screen][] = [
    ["home", "Inicio", "home"],
    ["car", "Viajes", "trips"],
    ["help", "Ayuda", "support"],
    ["user", "Perfil", "profile"],
  ]

  const driver: [string, string, Screen][] = [
    ["home", "Inicio", "driver-home"],
    ["car", "Viajes", "driver-trips"],
    ["wallet", "Ganancias", "earnings"],
    ["help", "Ayuda", "support"],
    ["user", "Perfil", "driver-profile"],
  ]

  return (
    <nav
      className="bottom-nav"
      aria-label={translate("Navegación principal", language)}
    >
      {(role === "passenger" ? passenger : driver).map(
        ([icon, label, target]) => {
          const active =
            screen === target || (label === "Ayuda" && screen === "support")
          return (
            <button
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => go(target)}
              key={label}
            >
              <Icon name={icon} />
              <span>{translate(label, language)}</span>
            </button>
          )
        },
      )}
    </nav>
  )
}
