import {
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import type {
  Account,
  Complaint,
  Language,
  NotificationItem,
  Role,
  Screen,
  Stored,
  RideMessage,
  Update,
} from "../../lib/types"

import { initialChat } from "../../lib/storage"

import { translate } from "../../lib/i18n"

import { drivers } from "../../data/drivers"

import { farePlaces, pickupPoints, places } from "../../data/places"

import { fareFor, samePlace } from "../../lib/fare"
import { canonicalPlaceName } from "../../data/places"

import {
  appNotice,
  beep,
  countLabel,
  distance,
  driverAverage,
  firstName,
  greeting,
  initials,
  money,
  newNotification,
  nowLabel,
  tripRecord,
  userTerms,
} from "../../lib/format"

import {
  Button,
  Empty,
  Field,
  Header,
  Icon,
  LanguagePicker,
  Logo,
  TaxiHeaderButton,
  TaxiLauncherContext,
} from "../../components"

import { MapView, type MapViewControls } from "../../components/MapView"

import { PlaceAutocomplete } from "../../components/PlaceAutocomplete"

import { assignDriver, cancelTrip, finishTrip, startTrip } from "../../lib/trip"

import { hashPassword, verifyPassword } from "../../lib/password"

type StoredUpdateProps = { data: Stored; update: Update }

type ThanksProps = { go: (s: Screen) => void; data: Stored }

export function Welcome({
  go,
  setRole,
  appearance,
  setAppearance,
  language,
  setLanguage,
}: {
  go: (s: Screen) => void
  setRole: (r: Role) => void
  appearance: Stored["appearance"]
  setAppearance: (value: Stored["appearance"]) => void
  language: Language
  setLanguage: (value: Language) => void
}) {
  return (
    <section className="welcome">
      <div className="welcome-art">
        <Logo />
        <div className="route-art">
          <span className="art-pin one">
            <Icon name="pin" />
          </span>
          <span className="route-line" />
          <span className="art-car">
            <Icon name="car" size={32} />
          </span>
          <span className="art-pin two">
            <Icon name="pin" />
          </span>
        </div>
      </div>
      <div className="welcome-copy">
        <span className="eyebrow">
          {translate("MUÉVETE CON CONFIANZA", language)}
        </span>
        <h1>{translate("Tu taxi seguro, a un precio justo.", language)}</h1>
        <p>
          {translate(
            "Estimación orientativa y herramientas de seguridad para tus trayectos por Ocaña.",
            language,
          )}
        </p>
      </div>
      <div className="welcome-language">
        <span>{translate("Idioma", language)}</span>
        <LanguagePicker language={language} onChange={setLanguage} />
      </div>
      <div className="welcome-theme">
        <span>
          <Icon name="sun" /> {translate("Apariencia inicial", language)}
        </span>
        <div className="theme-choice">
          <button
            aria-pressed={appearance === "Claro"}
            className={appearance === "Claro" ? "active" : ""}
            onClick={() => setAppearance("Claro")}
          >
            <Icon name="sun" /> {translate("Claro", language)}
          </button>
          <button
            aria-pressed={appearance === "Oscuro"}
            className={appearance === "Oscuro" ? "active" : ""}
            onClick={() => setAppearance("Oscuro")}
          >
            <Icon name="moon" /> {translate("Oscuro", language)}
          </button>
          <button
            aria-pressed={appearance === "Automático"}
            className={appearance === "Automático" ? "active" : ""}
            onClick={() => setAppearance("Automático")}
          >
            <Icon name="monitor" /> {translate("Sistema", language)}
          </button>
        </div>
      </div>
      <div className="stack welcome-actions">
        <Button
          onClick={() => {
            setRole("passenger")
            go("login")
          }}
        >
          Iniciar sesión
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setRole("passenger")
            go("register")
          }}
        >
          Registrarse
        </Button>
        <p className="prototype-note">
          {translate(
            "Tus datos se guardan en este dispositivo. Para uso real se requiere una cuenta protegida por servidor.",
            language,
          )}
        </p>
      </div>
    </section>
  )
}

export function RoleChips({
  role,
  setRole,
}: {
  role: Role
  setRole: (r: Role) => void
}) {
  const language = useContext(TaxiLauncherContext).language

  return (
    <div
      className="segmented"
      role="group"
      aria-label={translate("Tipo de cuenta", language)}
    >
      <button
        type="button"
        aria-pressed={role === "passenger"}
        className={role === "passenger" ? "active" : ""}
        onClick={() => setRole("passenger")}
      >
        {translate("Pasajero", language)}
      </button>
      <button
        type="button"
        aria-pressed={role === "driver"}
        className={role === "driver" ? "active" : ""}
        onClick={() => setRole("driver")}
      >
        {translate("Soy conductor", language)}
      </button>
    </div>
  )
}

export function Login({
  data,
  role,
  setRole,
  go,
  update,
}: {
  data: Stored
  role: Role
  setRole: (r: Role) => void
  go: (s: Screen) => void
  update: Update
}) {
  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})

  const emailRef = useRef<HTMLInputElement>(null)

  const passwordRef = useRef<HTMLInputElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    const err: Record<string, string> = {}

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      err.email = "Ingresa un correo válido."

    if (!password) err.password = "Escribe tu contraseña."

    setErrors(err)

    if (Object.keys(err).length)
      return (err.email ? emailRef : passwordRef).current?.focus()

    if (role === "admin") {
      const account = data.adminAccount

      if (!account || account.email.toLowerCase() !== email.toLowerCase()) {
        setErrors({
          email:
            "No encontramos un administrador registrado. Crea una cuenta para continuar.",
        })

        emailRef.current?.focus()

        return
      }

      if (!(await verifyPassword(password, account.password))) {
        setErrors({ password: "Contraseña incorrecta." })
        passwordRef.current?.focus()
        return
      }

      update({ loggedIn: true, role: "admin" })

      go("admin")

      return
    }

    const account = role === "driver" ? data.driverAccount : data.account

    if (!account || account.email.toLowerCase() !== email.toLowerCase()) {
      setErrors({
        email: "No encontramos una cuenta con ese correo. ¿Quieres crearla?",
      })

      return
    }

    if (!(await verifyPassword(password, account.password))) {
      setErrors({ password: "Contraseña incorrecta" })
      passwordRef.current?.focus()
      return
    }

    update({
      loggedIn: true,
      role,
      addressPreference: account.preference,
      chat: initialChat(account.name),
    })

    go(role === "driver" ? "driver-home" : "permission")
  }

  const selectRole = (nextRole: Role) => {
    setRole(nextRole)
    setErrors({})
  }

  const registrationScreen =
    role === "driver"
      ? "driver-register"
      : role === "admin"
        ? "admin-register"
        : "register"

  return (
    <section className="login-screen">
      <Header title="Iniciar sesión" back={() => go("welcome")} />
      <div className="page auth-page login-page">
        <Logo />
        <div>
          <h1>{translate("Qué bueno verte", data.language)}</h1>
          <p className="muted">
            {translate(
              "Ingresa para continuar en TaxiYa Ocaña.",
              data.language,
            )}
          </p>
        </div>
        <div className="login-role-picker">
          <span className="field-label">
            {translate("¿Con qué tipo de cuenta vas a entrar?", data.language)}
          </span>
          <RoleChips role={role} setRole={selectRole} />
          <button
            type="button"
            className={`login-admin-option ${role === "admin" ? "active" : ""}`}
            aria-pressed={role === "admin"}
            onClick={() => selectRole("admin")}
          >
            <Icon name="settings" />
            <span>
              <b>{translate("Acceso administración", data.language)}</b>
              <small>
                {translate(
                  "Solo para quien administra la aplicación.",
                  data.language,
                )}
              </small>
            </span>
            <span className="login-admin-indicator" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={submit} className="form login-form" noValidate>
          <div className="login-fields">
            <Field
              label="Correo electrónico"
              value={email}
              onChange={(value) => {
                setEmail(value)
                setErrors((current) => ({ ...current, email: "" }))
              }}
              placeholder="nombre@correo.com"
              type="email"
              autoComplete="username"
              inputMode="email"
              error={errors.email}
              errorAction={
                errors.email?.startsWith("No encontramos")
                  ? {
                      label: "Crear cuenta",
                      onClick: () => go(registrationScreen),
                    }
                  : undefined
              }
              inputRef={emailRef}
              required
            />
            <Field
              label="Contraseña"
              value={password}
              onChange={(value) => {
                setPassword(value)
                setErrors((current) => ({ ...current, password: "" }))
              }}
              type="password"
              autoComplete="current-password"
              error={errors.password}
              inputRef={passwordRef}
              required
            />
            <button
              type="button"
              className="text-link align-right"
              onClick={() => go("forgot")}
            >
              {translate("¿Olvidaste tu contraseña?", data.language)}
            </button>
          </div>
          <div className="sticky-form-action login-submit">
            <Button type="submit">Continuar</Button>
          </div>
        </form>
        <div className="login-footer">
          <p className="center muted">
            {translate("¿Primera vez en TaxiYa?", data.language)}{" "}
            <button
              className="inline-link"
              onClick={() => go(registrationScreen)}
            >
              {translate(
                role === "driver"
                  ? "Crear cuenta de conductor"
                  : role === "admin"
                    ? "Crear acceso de administrador"
                    : "Crear cuenta de pasajero",
                data.language,
              )}
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}

export function Register({
  data,
  go,
  update,
}: {
  data: Stored
  go: (s: Screen) => void
  update: Update
}) {
  const [selectedRole, setSelectedRole] = useState<Role>("passenger")

  const [choosingRole, setChoosingRole] = useState(true)

  const [step, setStep] = useState(1)

  const [fields, setFields] = useState({
    name: "",
    phone: "",
    email: "",
    pass: "",
    confirm: "",
    contact: "",
    contactPhone: "",
    relationship: "",
    needs: [] as string[],
    note: "",
    preference: "Pasajera",
    consent: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const first = useRef<HTMLInputElement>(null)

  const change = (key: string, value: string | boolean | string[]) =>
    setFields((f) => ({ ...f, [key]: value }))

  const continueWithRole = () => {
    if (selectedRole === "driver") {
      update({ role: "driver" })
      go("driver-register")
      return
    }

    if (selectedRole === "passenger") {
      update({ role: "passenger" })
      setChoosingRole(false)
      return
    }
  }

  const next = async (e: FormEvent) => {
    e.preventDefault()

    const err: Record<string, string> = {}

    if (step === 1) {
      if (fields.name.trim().length < 3)
        err.name = "Escribe tu nombre completo."

      if (!/^\d{10}$/.test(fields.phone))
        err.phone = "El celular debe tener 10 dígitos."

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
        err.email = "Ingresa un correo válido."

      const currentEmail = fields.email.trim().toLowerCase()

      if (
        [
          data.account?.email,
          data.driverAccount.email,
          data.adminAccount?.email,
        ].some(
          (registered) =>
            Boolean(registered) && registered!.toLowerCase() === currentEmail,
        )
      )
        err.email =
          "Este correo ya está registrado en este dispositivo. Inicia sesión."

      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(fields.pass))
        err.pass = "Usa mínimo 8 caracteres, una letra y un número."

      if (fields.confirm !== fields.pass)
        err.confirm = "Las contraseñas no coinciden."
    } else {
      if (fields.contact.trim().length < 3)
        err.contact = "Escribe el nombre de tu contacto."

      if (!/^\d{10}$/.test(fields.contactPhone))
        err.contactPhone = "El celular debe tener 10 dígitos."

      if (!fields.relationship) err.relationship = "Elige el parentesco."

      if (!fields.consent)
        err.consent = "Debes autorizar el tratamiento de tus datos."
    }

    setErrors(err)

    if (Object.keys(err).length) return first.current?.focus()

    if (step === 1) setStep(2)
    else {
      const account: Account = {
        name: fields.name.trim(),
        phone: fields.phone,
        email: fields.email.trim().toLowerCase(),
        password: await hashPassword(fields.pass),
        contactName: fields.contact.trim(),
        contactPhone: fields.contactPhone,
        relationship: fields.relationship,
        needs: fields.needs,
        needsNote: fields.note.trim(),
        preference: fields.preference as Account["preference"],
      }

      update({
        account,
        role: "passenger",
        addressPreference: account.preference,
        chat: initialChat(account.name),
      })

      appNotice("Cuenta creada. Ya puedes iniciar sesión.")

      go("login")
    }
  }

  return (
    <section className="register-screen">
      <Header
        title={choosingRole ? "Crear cuenta" : `Crear cuenta · ${step} de 2`}
        back={() =>
          !choosingRole
            ? step === 2
              ? setStep(1)
              : setChoosingRole(true)
            : go("welcome")
        }
      />
      <div className="page register-page">
        {choosingRole ? (
          <div className="registration-choice">
            <span className="feature-icon">
              <Icon name="user" />
            </span>
            <h1>{translate("¿Cómo quieres usar TaxiYa?", data.language)}</h1>
            <p className="muted">
              {translate(
                "Elige qué cuenta quieres crear. Te guiaremos paso a paso.",
                data.language,
              )}
            </p>
            <div
              className="registration-roles"
              role="group"
              aria-label={translate(
                "Tipo de cuenta para registrarse",
                data.language,
              )}
            >
              <button
                type="button"
                aria-pressed={selectedRole === "passenger"}
                className={
                  selectedRole === "passenger"
                    ? "registration-role active"
                    : "registration-role"
                }
                onClick={() => setSelectedRole("passenger")}
              >
                <Icon name="user" />
                <span>
                  <b>{translate("Pasajero", data.language)}</b>
                  <small>
                    {translate(
                      "Pide taxis y consulta tus viajes. El registro tiene 2 pasos.",
                      data.language,
                    )}
                  </small>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={selectedRole === "driver"}
                className={
                  selectedRole === "driver"
                    ? "registration-role active"
                    : "registration-role"
                }
                onClick={() => setSelectedRole("driver")}
              >
                <Icon name="car" />
                <span>
                  <b>{translate("Conductor", data.language)}</b>
                  <small>
                    {translate(
                      "Registra tus datos y vehículo. El proceso tiene 3 pasos.",
                      data.language,
                    )}
                  </small>
                </span>
              </button>
            </div>
            <div className="sticky-form-action">
              <Button onClick={continueWithRole}>
                {translate(
                  selectedRole === "passenger"
                    ? "Continuar como pasajero"
                    : "Continuar como conductor",
                  data.language,
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="progress">
              <span style={{ width: `${step * 50}%` }} />
            </div>
            <p className="registration-step">
              {translate(
                step === 1 ? "Paso 1 de 2" : "Paso 2 de 2",
                data.language,
              )}
            </p>
            <h1>
              {translate(
                step === 1 ? "Tus datos" : "Viaja con más tranquilidad",
                data.language,
              )}
            </h1>
            <p className="muted">
              {translate(
                step === 1
                  ? "Usaremos estos datos para identificarte."
                  : "Añade un contacto y cuéntanos cómo ayudarte mejor.",
                data.language,
              )}
            </p>
            <form onSubmit={next} className="form register-form" noValidate>
              <div className="register-fields">
                {step === 1 ? (
                  <>
                    <Field
                      label="Nombre completo"
                      value={fields.name}
                      onChange={(v) => change("name", v)}
                      error={errors.name}
                      autoComplete="name"
                      inputRef={first}
                      required
                    />
                    <Field
                      label="Celular"
                      value={fields.phone}
                      onChange={(v) => change("phone", v.replace(/\D/g, ""))}
                      placeholder="3000000000"
                      error={errors.phone}
                      type="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                    />
                    <Field
                      label="Correo electrónico"
                      value={fields.email}
                      onChange={(v) => change("email", v)}
                      error={errors.email}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                    />
                    <Field
                      label="Contraseña"
                      value={fields.pass}
                      onChange={(v) => change("pass", v)}
                      type="password"
                      error={errors.pass}
                      autoComplete="new-password"
                      required
                    />
                    <Field
                      label="Confirmar contraseña"
                      value={fields.confirm}
                      onChange={(v) => change("confirm", v)}
                      type="password"
                      error={errors.confirm}
                      autoComplete="new-password"
                      required
                    />
                    <label className="field">
                      <span>
                        {translate(
                          "¿Cómo prefieres que te llamemos? (opcional)",
                          data.language,
                        )}
                      </span>
                      <select
                        value={fields.preference}
                        onChange={(e) => change("preference", e.target.value)}
                      >
                        <option value="Pasajera">
                          {data.language === "en" ? "She/her" : "Pasajera"}
                        </option>
                        <option value="Pasajero">
                          {data.language === "en" ? "He/him" : "Pasajero"}
                        </option>
                        <option value="Prefiero no decirlo">
                          {translate("Prefiero no decirlo", data.language)}
                        </option>
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <div className="info-card">
                      <Icon name="shield" />
                      <p>
                        <b>
                          {translate("Contacto de confianza", data.language)}
                        </b>
                        <br />
                        <span className="muted">
                          {translate(
                            "Guardamos el contacto en este dispositivo. No enviamos alertas externas.",
                            data.language,
                          )}
                        </span>
                      </p>
                    </div>
                    <Field
                      label="Nombre del contacto"
                      value={fields.contact}
                      onChange={(v) => change("contact", v)}
                      error={errors.contact}
                      autoComplete="name"
                      inputRef={first}
                      required
                    />
                    <Field
                      label="Celular del contacto"
                      value={fields.contactPhone}
                      onChange={(v) =>
                        change("contactPhone", v.replace(/\D/g, ""))
                      }
                      error={errors.contactPhone}
                      type="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                    />
                    <label className="field">
                      <span>
                        {translate("Parentesco", data.language)}{" "}
                        <b className="required-mark">*</b>
                      </span>
                      <select
                        value={fields.relationship}
                        onChange={(e) => change("relationship", e.target.value)}
                        required
                      >
                        <option value="">
                          {translate("Selecciona", data.language)}
                        </option>
                        <option value="Familiar">
                          {translate("Familiar", data.language)}
                        </option>
                        <option value="Amistad">
                          {translate("Amistad", data.language)}
                        </option>
                        <option value="Pareja">
                          {translate("Pareja", data.language)}
                        </option>
                      </select>
                      {errors.relationship && (
                        <small className="error">{errors.relationship}</small>
                      )}
                    </label>
                    <p className="section-label">
                      {translate("FICHA DE NECESIDADES", data.language)}
                    </p>
                    <div className="needs-grid">
                      {[
                        "Movilidad reducida",
                        "Acompañante",
                        "Silla para niños",
                        "Equipaje grande",
                        "Mascota",
                        "Ayuda con bolsas",
                      ].map((need) => (
                        <label className="check-row" key={need}>
                          <input
                            type="checkbox"
                            checked={fields.needs.includes(need)}
                            onChange={() =>
                              change(
                                "needs",
                                fields.needs.includes(need)
                                  ? fields.needs.filter((n) => n !== need)
                                  : [...fields.needs, need],
                              )
                            }
                          />
                          <span>{translate(need, data.language)}</span>
                        </label>
                      ))}
                    </div>
                    <label className="field">
                      <span>
                        {translate(
                          "Nota para el conductor (opcional)",
                          data.language,
                        )}
                      </span>
                      <textarea
                        value={fields.note}
                        maxLength={150}
                        onChange={(e) => change("note", e.target.value)}
                      />
                    </label>
                    <small className="counter">{fields.note.length}/150</small>
                    <label
                      className={`check-row ${
                        errors.consent ? "check-error" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={fields.consent}
                        onChange={(e) => change("consent", e.target.checked)}
                      />
                      <span>
                        {translate(
                          "Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012. Los usamos solo para tu seguridad y tu viaje.",
                          data.language,
                        )}
                      </span>
                    </label>
                    {errors.consent && (
                      <small className="error">{errors.consent}</small>
                    )}
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        appNotice(
                          "Este prototipo guarda datos y contraseña localmente en este navegador. No debe usarse como sistema de producción.",
                        )
                      }
                    >
                      {translate("Política de privacidad", data.language)}
                    </button>
                  </>
                )}
              </div>
              <div className="sticky-form-action register-submit">
                <Button type="submit">
                  {step === 1 ? "Continuar" : "Crear mi cuenta"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}

export function AdminRegister({
  data,
  go,
  update,
}: {
  data: Stored
  go: (s: Screen) => void
  update: Update
}) {
  const [name, setName] = useState("")

  const [phone, setPhone] = useState("")

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [confirm, setConfirm] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const next: Record<string, string> = {}

    if (name.trim().length < 3) next.name = "Escribe el nombre completo."

    if (!/^\d{10}$/.test(phone))
      next.phone = "El celular debe tener 10 dígitos."

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Ingresa un correo válido."

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password))
      next.password = "Usa mínimo 8 caracteres, una letra y un número."

    if (confirm !== password) next.confirm = "Las contraseñas no coinciden."

    if (data.adminAccount)
      next.email =
        "Ya existe una cuenta administrativa en este dispositivo. Inicia sesión como administrador."

    if (
      [data.account?.email, data.driverAccount.email].some(
        (registered) =>
          Boolean(registered) &&
          registered!.toLowerCase() === email.trim().toLowerCase(),
      )
    )
      next.email =
        "Ese correo ya pertenece a otra cuenta registrada en este dispositivo."

    setErrors(next)

    if (Object.keys(next).length) return

    const adminAccount: Account = {
      name: name.trim(),
      phone,
      email: email.trim().toLowerCase(),
      password: await hashPassword(password),
      contactName: "",
      contactPhone: "",
      relationship: "",
      needs: [],
      needsNote: "",
      preference: "Prefiero no decirlo",
    }

    update({ adminAccount, role: "admin", loggedIn: false })

    appNotice(
      "Cuenta administrativa creada en este dispositivo. Inicia sesión para continuar.",
    )

    go("login")
  }

  return (
    <section>
      <Header title="Registro de administrador" back={() => go("login")} />
      <div className="page auth-page">
        <Logo />
        <div>
          <h1>Crear cuenta de administrador</h1>
          <p className="muted">
            Registra tus datos para abrir el panel. Este prototipo guarda la
            cuenta localmente; una versión real debe restringir el alta
            administrativa.
          </p>
        </div>
        <form className="form" onSubmit={submit} noValidate>
          <Field
            label="Nombre completo"
            value={name}
            onChange={setName}
            error={errors.name}
            required
          />
          <Field
            label="Celular"
            value={phone}
            onChange={(v) => setPhone(v.replace(/\D/g, ""))}
            error={errors.phone}
            maxLength={10}
            required
          />
          <Field
            label="Correo electrónico"
            value={email}
            onChange={setEmail}
            error={errors.email}
            required
          />
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            required
          />
          <Field
            label="Confirmar contraseña"
            type="password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
            required
          />
          <Button type="submit">Crear cuenta administrativa</Button>
        </form>
        <p className="center muted">
          ¿Ya tienes una cuenta?{" "}
          <button className="inline-link" onClick={() => go("login")}>
            Inicia sesión
          </button>
        </p>
      </div>
    </section>
  )
}

export function Forgot({
  data,
  role,
  go,
}: {
  data: Stored
  update: Update
  role: Role
  go: (s: Screen) => void
}) {
  const [email, setEmail] = useState("")

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa un correo electrónico válido.")

      return
    }

    const account =
      role === "driver"
        ? data.driverAccount
        : role === "admin"
          ? data.adminAccount
          : data.account

    if (!account || account.email.toLowerCase() !== normalizedEmail) {
      const roleName =
        role === "driver"
          ? "conductor"
          : role === "admin"
            ? "administrador"
            : "pasajero"

      setError(`No encontramos una cuenta de ${roleName} con ese correo.`)

      return
    }

    setError("")

    setNotice(
      "Encontramos la cuenta. Para protegerla, la recuperación requiere un servidor de autenticación; no enviaremos códigos ficticios ni cambiaremos la contraseña en este dispositivo.",
    )
  }

  return (
    <section className="forgot-screen">
      <Header title="Recuperar acceso" back={() => go("login")} />
      <div className="page auth-page forgot-page">
        <span className="feature-icon">
          <Icon name="shield" size={28} />
        </span>
        <div>
          <h1>Recupera tu cuenta</h1>
          <p className="muted">
            Verificaremos si el correo pertenece a una cuenta registrada.
          </p>
        </div>
        <form className="form forgot-form" onSubmit={submit} noValidate>
          <Field
            label="Correo electrónico"
            value={email}
            onChange={(value) => {
              setEmail(value)
              setError("")
              setNotice("")
            }}
            type="email"
            autoComplete="email"
            inputMode="email"
            error={error}
            required
          />
          <div className="sticky-form-action">
            <Button type="submit">Verificar correo</Button>
          </div>
        </form>
        {notice && (
          <div className="notice-card" role="status">
            <Icon name="info" />
            <p>{notice}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export function Permission({
  go,
  update,
}: {
  go: (s: Screen) => void
  update: Update
}) {
  return (
    <section className="permission page">
      <div className="permission-map">
        <MapView origin="Parque 29 de Mayo" />
      </div>
      <span className="feature-icon">
        <Icon name="pin" size={30} />
      </span>
      <h1>Activa tu ubicación</h1>
      <p className="muted">
        La usamos para encontrar taxis cercanos y mantener seguro tu trayecto.
        Tú tienes el control.
      </p>
      <div className="stack">
        <Button
          onClick={() => {
            update({ loggedIn: true, role: "passenger" })
            go("home")
          }}
        >
          Permitir ubicación
        </Button>
        <Button variant="ghost" onClick={() => go("home")}>
          Ahora no
        </Button>
      </div>
    </section>
  )
}

export function PassengerHome({
  go,
  data,
  update,
}: {
  go: (s: Screen) => void
  data: Stored
  update: Update
}) {
  const terms = userTerms(data.addressPreference)

  const [taxi, setTaxi] = useState<typeof drivers[number] | null>(null)

  const [sheetMinimized, setSheetMinimized] = useState(false)

  const dragStart = useRef<number | null>(null)

  const last = data.tripHistory.find((trip) => trip.status === "Completado")

  const destinationCounts = data.tripHistory
    .filter((trip) => trip.status === "Completado")
    .reduce<Record<string, number>>(
      (counts, trip) => ({
        ...counts,
        [trip.destination]: (counts[trip.destination] || 0) + 1,
      }),
      {},
    )

  const frequent = Object.entries(destinationCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0]

  const useFallbacks = !last || !frequent || last.destination === frequent

  const quickDestinations = useFallbacks
    ? [
        {
          destination: "Terminal de Transporte",
          title: "Ir a la Terminal",
          detail: "Destino sugerido",
        },
        {
          destination: "Hospital Emiro Quintero",
          title: "Ir al Hospital",
          detail: "Destino sugerido",
        },
      ]
    : [
        {
          destination: last.destination,
          title: last.destination,
          detail: "Último destino",
        },
        { destination: frequent, title: frequent, detail: "Destino frecuente" },
      ]

  const chooseQuick = (destination?: string) => {
    if (!destination) {
      appNotice("Aún no tienes destinos recientes")
      return
    }

    if (samePlace(data.origin, destination)) {
      appNotice("El destino debe ser diferente del punto de recogida.")
      return
    }

    update({ destination, selectedDriver: "" })
    go("fare")
  }

  const activeTarget: Screen =
    data.tripStatus === "requested"
      ? "searching"
      : data.tripStatus === "assigned" || data.tripStatus === "enroute"
        ? "assigned"
        : "tracking"

  return (
    <section className="map-screen">
      <div className="map-bg">
        <MapView
          origin={data.origin}
          showDrivers
          onDriverPick={setTaxi}
          attributionAbovePanel
        />
      </div>
      <div className="map-top">
        <button
          className="avatar"
          aria-label="Mi perfil"
          onClick={() => go("profile")}
        >
          {initials(data.account?.name || "")}
        </button>
        <div className="mini-logo">
          <Icon name="car" /> TaxiYa
        </div>
        <span className="map-actions">
          <TaxiHeaderButton />
          <button
            className="icon-button paper"
            onClick={() => go("notifications")}
            aria-label="Notificaciones"
          >
            <Icon name="bell" />
            {data.notificationItems.filter((item) => !item.read).length > 0 && (
              <i>
                {data.notificationItems.filter((item) => !item.read).length}
              </i>
            )}
          </button>
        </span>
      </div>
      {taxi && (
        <div className="map-taxi-card">
          <button
            className="icon-button"
            onClick={() => setTaxi(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
          <div className="driver-photo">{taxi.initials}</div>
          <span>
            <b>{taxi.name}</b>
            <small>
              {taxi.car} · {taxi.plate}
            </small>
            <small>
              <Icon name="star" size={14} filled /> {taxi.rating} · {taxi.eta}{" "}
              min
            </small>
          </span>
          <Button
            onClick={() => {
              update({ selectedDriver: taxi.name })
              setTaxi(null)
              go("search")
            }}
          >
            Pedir a este conductor
          </Button>
        </div>
      )}
      <div className={`home-sheet ${sheetMinimized ? "minimized" : ""}`}>
        <button
          className="sheet-handle"
          aria-label={sheetMinimized ? "Expandir panel" : "Minimizar panel"}
          onClick={() => setSheetMinimized(!sheetMinimized)}
          onPointerDown={(event) => {
            dragStart.current = event.clientY
          }}
          onPointerUp={(event) => {
            if (
              dragStart.current !== null &&
              Math.abs(event.clientY - dragStart.current) > 24
            )
              setSheetMinimized(event.clientY > dragStart.current)
            dragStart.current = null
          }}
        >
          <span className="handle" />
        </button>
        <div className="home-sheet-content">
          <p className="greeting">
            {greeting()}, {firstName(data.account?.name || terms.welcome)}
          </p>
          <h1>¿A dónde vamos?</h1>
          {["requested", "assigned", "enroute", "active"].includes(
            data.tripStatus,
          ) && (
            <Button onClick={() => go(activeTarget)}>
              Tu viaje en curso · Ver
            </Button>
          )}
          <PlaceAutocomplete
            label="Recogida"
            value={data.origin}
            onChange={(origin) =>
              update({
                origin,
                fareManuallyAdjusted: false,
                selectedDriver: "",
              })
            }
          />
          <button
            className="destination-box"
            onClick={() => {
              update({ selectedDriver: "" })
              go("search")
            }}
          >
            <Icon name="search" />
            <span>Busca tu destino</span>
            <Icon name="chevron" />
          </button>
          <div className="quick-grid">
            {[
              ...data.savedPlaces.map((saved) => ({
                destination: saved.place,
                title: saved.label,
                detail: "Lugar guardado",
              })),
              ...quickDestinations,
            ]
              .slice(0, 4)
              .map((item, index) => (
                <button
                  key={`${item.title}-${item.destination}`}
                  onClick={() => chooseQuick(item.destination)}
                >
                  <Icon name={index === 0 ? "clock" : "pin"} />
                  <span>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
          </div>
          <div className="trust-note">
            <Icon name="shield" />
            <span>
              <b>{terms.accompanied}</b>
              <small>Escudo de trayecto activo en cada viaje</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Search({
  go,
  back,
  update,
  origin,
}: {
  go: (s: Screen) => void
  back: () => void
  update: Update
  origin: string
}) {
  const language = useContext(TaxiLauncherContext).language

  const [query, setQuery] = useState("")

  const results = places.filter((p) =>
    p.join(" ").toLowerCase().includes(query.toLowerCase()),
  )

  const choose = (name: string) => {
    if (samePlace(origin, name)) {
      appNotice("El destino debe ser diferente del punto de recogida.")
      return
    }
    update({ destination: name })
    go("fare")
  }

  return (
    <section>
      <Header title="Elige tu destino" back={back} />
      <div className="page">
        <label className="search-box">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translate("¿A dónde quieres ir?", language)}
          />
        </label>
        <button className="map-choice" onClick={() => go("map-picker")}>
          <span className="feature-icon small">
            <Icon name="map" />
          </span>
          <span>
            <b>{translate("Elegir en el mapa", language)}</b>
            <small>{translate("Marca una zona de Ocaña", language)}</small>
          </span>
          <Icon name="chevron" />
        </button>
        <div className="section-title">
          <span>
            {translate(query ? "Resultados" : "Lugares sugeridos", language)}
          </span>
        </div>
        {results.length ? (
          <div className="list">
            {results.map(([name, address]) => (
              <button
                className="place-row"
                key={name}
                onClick={() => choose(name)}
              >
                <span className="place-icon">
                  <Icon name="pin" />
                </span>
                <span>
                  <b>{name}</b>
                  <small>{address}</small>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="free-destination">
            <p className="muted">
              {translate(
                "No tenemos coordenadas confiables para este lugar. Elige un punto de referencia guardado para calcular la tarifa.",
                language,
              )}
            </p>
          </div>
        ) : (
          <Empty
            icon="search"
            title="Sin resultados"
            text="Escribe un lugar o elígelo en el mapa."
          />
        )}
      </div>
    </section>
  )
}

export function MapPicker({
  go,
  back,
  update,
  origin,
}: {
  go: (s: Screen) => void
  back: () => void
  update: Update
  origin: string
}) {
  const language = useContext(TaxiLauncherContext).language

  const zones: Record<string, string> = {
    Centro: "Centro",
    "El Llano": "Barrio El Llano",
    Terminal: "Terminal de Transporte",
    UFPS: "UFPS Ocaña",
    Hospital: "Hospital Emiro Quintero",
    Mercado: "Plaza del Mercado",
    Clínica: "Clínica Ocaña",
  }

  const [selected, setSelected] = useState(origin)

  const [mapControls, setMapControls] = useState<MapViewControls | null>(null)

  const [mapLocationError, setMapLocationError] = useState("")

  const showMyLocation = () => {
    if (!navigator.geolocation) {
      setMapLocationError(
        translate("Este navegador no puede compartir tu ubicación.", language),
      )
      return
    }

    setMapLocationError("")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapControls?.showLocation(coords.latitude, coords.longitude)
      },
      () =>
        setMapLocationError(
          translate(
            "No pudimos obtener tu ubicación. Revisa el permiso del navegador.",
            language,
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <section>
      <Header title="Elegir en el mapa" back={back} />
      <div className="page map-picker-page">
        <p className="muted map-picker-instructions">
          {translate(
            "Mueve y acerca el mapa. Toca un punto marcado o elige un lugar de la lista.",
            language,
          )}
        </p>
        <div className="oca-map">
          <MapView
            origin={selected}
            interactive
            showPlaces
            onPick={setSelected}
            onControlsReady={setMapControls}
          />
        </div>
        <div
          className="map-picker-controls"
          role="group"
          aria-label={translate("Controles del mapa", language)}
        >
          <button
            type="button"
            className="map-picker-control"
            aria-label={translate("Acercar mapa", language)}
            disabled={!mapControls}
            onClick={() => mapControls?.zoomIn()}
          >
            <span aria-hidden="true">+</span>
            {translate("Acercar", language)}
          </button>
          <button
            type="button"
            className="map-picker-control"
            aria-label={translate("Alejar mapa", language)}
            disabled={!mapControls}
            onClick={() => mapControls?.zoomOut()}
          >
            <span aria-hidden="true">−</span>
            {translate("Alejar", language)}
          </button>
          <button
            type="button"
            className="map-picker-control"
            aria-label={translate("Mostrar mi ubicación", language)}
            disabled={!mapControls}
            onClick={showMyLocation}
          >
            <span aria-hidden="true">◎</span>
            {translate("Ubicación", language)}
          </button>
        </div>
        {mapLocationError && (
          <p className="map-location-message" role="status">
            {mapLocationError}
          </p>
        )}
        <div
          className="zone-options"
          role="group"
          aria-label={translate("Puntos de referencia", language)}
        >
          <p className="section-label">
            {translate("O ELIGE UN PUNTO DE REFERENCIA", language)}
          </p>
          {Object.entries(zones).map(([label, place]) => (
            <button
              type="button"
              className={
                selected === place ? "zone-choice active" : "zone-choice"
              }
              aria-pressed={selected === place}
              key={label}
              onClick={() => setSelected(place)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="route-card" aria-live="polite">
          <Icon name="pin" />
          <span>
            <small>{translate("PUNTO ELEGIDO", language)}</small>
            <b>{selected}</b>
          </span>
        </div>
        <Button
          disabled={samePlace(origin, selected)}
          onClick={() => {
            update({ destination: selected, fareManuallyAdjusted: false })
            go("fare")
          }}
        >
          {translate("Confirmar este punto", language)}
        </Button>
      </div>
    </section>
  )
}

export function Fare({
  data,
  update,
  back,
  go,
  setModal,
}: {
  data: Stored
  update: Update
  back: () => void
  go: (s: Screen) => void
  setModal: (v: ReactNode) => void
}) {
  const fare = fareFor(data)

  const sameRoute = !fare.routeValid || samePlace(data.origin, data.destination)

  const setFare = (value: number) =>
    update({
      offer: Math.max(fare.min, Math.min(fare.max, value)),
      fareManuallyAdjusted: true,
    })

  useEffect(() => {
    if (fare.routeValid && !data.fareManuallyAdjusted)
      update({ offer: fare.recommended })
  }, [
    data.destination,
    data.origin,
    data.rain,
    data.peak,
    data.night,
    data.fareZoneMin,
    data.fareZoneMax,
  ])

  const level =
    data.offer < fare.min
      ? "Puede tardar más en aceptarse"
      : data.offer > fare.max
        ? "Más alto de lo habitual"
        : "Precio justo"

  const chip = [
    ["min", fare.min],
    ["recommended", fare.recommended],
    ["max", fare.max],
  ].sort(
    (a, b) =>
      Math.abs(data.offer - Number(a[1])) - Math.abs(data.offer - Number(b[1])),
  )[0][0]

  const explain = () => setModal(<FareBreakdown data={data} />)

  const requestRide = () => {
    if (sameRoute) {
      appNotice("El destino debe ser diferente del punto de recogida.")
      return
    }

    if (!data.isConnected) {
      appNotice("No tienes conexión. Reintenta antes de solicitar el taxi.")
      return
    }

    startTrip(update, { fareManuallyAdjusted: data.fareManuallyAdjusted })

    if (data.selectedDriver) {
      assignDriver(update, data.selectedDriver)
      go("assigned")
      return
    }

    go("searching")
  }

  const choosePayment = (method: Stored["paymentMethod"]) =>
    setModal(
      <PaymentMethodDialog
        method={method}
        amount={data.offer}
        language={data.language}
        onConfirm={() => {
          update({ paymentMethod: method })

          setModal(null)

          appNotice(
            `${translate("Método elegido:", data.language)} ${translate(method, data.language)}. ${translate("No se realizó ningún cobro.", data.language)}`,
          )
        }}
      />,
    )

  if (!fare.routeValid) {
    return (
      <section>
        <Header title="Tarifa sugerida" back={back} />
        <div className="page fare-page">
          <PlaceAutocomplete
            label="Recogida"
            value={data.origin}
            onChange={(origin) =>
              update({
                origin,
                fareManuallyAdjusted: false,
                selectedDriver: "",
              })
            }
          />
          <div className="route-card destination-only">
            <div className="route-points">
              <span />
            </div>
            <div>
              <small>{translate("DESTINO", data.language)}</small>
              <b>{canonicalPlaceName(data.destination) || data.destination}</b>
            </div>
          </div>
          <p className="error" role="alert">
            No hay coordenadas confiables para uno de estos lugares. No
            calcularemos ni mostraremos una tarifa hasta elegir un punto
            guardado.
          </p>
          <Button variant="secondary" onClick={() => go("search")}>
            Elegir un destino guardado
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section>
      <Header title="Tarifa sugerida" back={back} />
      <div className="page fare-page">
        <PlaceAutocomplete
          label="Recogida"
          value={data.origin}
          onChange={(origin) =>
            update({ origin, fareManuallyAdjusted: false, selectedDriver: "" })
          }
        />
        <div className="route-card destination-only">
          <div className="route-points">
            <span />
          </div>
          <div>
            <small>{translate("DESTINO", data.language)}</small>
            <b>{canonicalPlaceName(data.destination) || data.destination}</b>
          </div>
        </div>
        {sameRoute && (
          <p className="error" role="alert">
            {translate(
              "El destino debe ser diferente del punto de recogida. Cambia el origen o elige otro destino.",
              data.language,
            )}
          </p>
        )}
        {!farePlaces[canonicalPlaceName(data.destination)] && (
          <p className="free-note">
            {translate("Tarifa estimada sin dirección exacta", data.language)}
          </p>
        )}
        <div className="center">
          <span className="ai-badge">
            {translate("Tarifa orientativa", data.language)}
          </span>
          <p className="muted compact">
            {distance(fare.km)} · {fare.minutes} min ·{" "}
            {translate("datos orientativos", data.language)}
          </p>
          <div className="fare-control">
            <button
              onClick={() => setFare(data.offer - 500)}
              aria-label="Disminuir tarifa"
            >
              <Icon name="minus" />
            </button>
            <strong>{money(data.offer)}</strong>
            <button
              onClick={() => setFare(data.offer + 500)}
              aria-label="Aumentar tarifa"
            >
              <Icon name="plus" />
            </button>
          </div>
          <span className={`fairness ${level !== "Precio justo" ? "low" : ""}`}>
            <Icon
              name={level === "Precio justo" ? "check" : "help"}
              size={16}
            />{" "}
            {translate(level, data.language)}
          </span>
          <p className="fairness-rule">
            {translate(
              "Precio justo cuando tu oferta está dentro del rango sugerido.",
              data.language,
            )}
          </p>
        </div>
        <label className="fare-slider">
          <span>
            {translate("Elige también un valor intermedio", data.language)}
          </span>
          <input
            type="range"
            min={fare.min}
            max={fare.max}
            step={500}
            value={data.offer}
            aria-label={translate(
              "Ajustar oferta entre el mínimo y el máximo",
              data.language,
            )}
            aria-valuetext={money(data.offer)}
            onChange={(event) => setFare(Number(event.target.value))}
          />
          <span className="fare-slider-labels">
            <small>
              {translate("Mínimo", data.language)} {money(fare.min)}
            </small>
            <small>
              {translate("Máximo", data.language)} {money(fare.max)}
            </small>
          </span>
        </label>
        <div className="fare-chips">
          <button
            aria-pressed={chip === "min"}
            onClick={() => setFare(fare.min)}
            className={chip === "min" ? "active" : ""}
          >
            {translate("Mínimo", data.language)}
          </button>
          <button
            aria-pressed={chip === "recommended"}
            onClick={() => setFare(fare.recommended)}
            className={chip === "recommended" ? "active" : ""}
          >
            {translate("Recomendado", data.language)}
          </button>
          <button
            aria-pressed={chip === "max"}
            onClick={() => setFare(fare.max)}
            className={chip === "max" ? "active" : ""}
          >
            {translate("Máximo", data.language)}
          </button>
        </div>
        {data.fareManuallyAdjusted && (
          <Button
            variant="ghost"
            onClick={() =>
              update({ offer: fare.recommended, fareManuallyAdjusted: false })
            }
          >
            Volver al precio sugerido
          </Button>
        )}
        <div className="condition-row three">
          <button
            aria-pressed={data.peak}
            className={data.peak ? "active" : ""}
            onClick={() => update({ peak: !data.peak })}
          >
            <Icon name="clock" size={17} />{" "}
            {translate("Hora pico", data.language)}{" "}
            {data.peak && <Icon name="check" size={15} />}
          </button>
          <button
            aria-pressed={data.rain}
            className={data.rain ? "active" : ""}
            onClick={() => update({ rain: !data.rain })}
          >
            <Icon name="rain" size={17} /> {translate("Lluvia", data.language)}{" "}
            {data.rain && <Icon name="check" size={15} />}
          </button>
          <button
            aria-pressed={data.night}
            className={data.night ? "active" : ""}
            onClick={() => update({ night: !data.night })}
          >
            <Icon name="moon" size={17} />{" "}
            {translate("Nocturno", data.language)}{" "}
            {data.night && <Icon name="check" size={15} />}
          </button>
        </div>
        <label className="field">
          <span>{translate("Método de pago", data.language)}</span>
          <select
            value={data.paymentMethod}
            onChange={(event) =>
              choosePayment(event.target.value as Stored["paymentMethod"])
            }
          >
            <option value="Efectivo">
              {translate("Efectivo", data.language)}
            </option>
            <option value="Nequi">Nequi</option>
            <option value="Daviplata">Daviplata</option>
          </select>
          <small className="muted">
            {translate(
              "Elige el método; confirmar el pago ocurre al finalizar el viaje.",
              data.language,
            )}
          </small>
        </label>
        <button className="why-card" onClick={explain}>
          <span className="feature-icon small">
            <Icon name="star" />
          </span>
          <span>
            <b>{translate("¿Por qué este precio?", data.language)}</b>
            <small>
              {translate(
                "Ve el cálculo completo y transparente",
                data.language,
              )}
            </small>
          </span>
          <Icon name="chevron" />
        </button>
        <div className="bottom-action">
          <Button disabled={sameRoute} onClick={requestRide}>
            {data.selectedDriver
              ? `Pedir a ${firstName(data.selectedDriver)} por ${money(data.offer)}`
              : `${translate("Buscar taxi por", data.language)} ${money(data.offer)}`}
          </Button>
          <p className="secure-caption">
            <Icon name="shield" size={16} />{" "}
            {translate(
              "Estimación no oficial. Tú eliges tu oferta.",
              data.language,
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

export function FareBreakdown({ data }: { data: Stored }) {
  const fare = fareFor(data)

  if (!fare.routeValid) {
    return (
      <>
        <h2>No se puede estimar esta ruta</h2>
        <p className="error">
          Elige puntos con coordenadas guardadas para calcular una tarifa
          orientativa.
        </p>
      </>
    )
  }

  return (
    <>
      <span className="ai-badge">Tarifa orientativa</span>
      <h2>¿Por qué esta tarifa?</h2>
      <div className="receipt-lines">
        <span>
          <small>Distancia orientativa</small>
          <b>{distance(fare.km)}</b>
        </span>
        <span>
          <small>Tiempo orientativo</small>
          <b>{fare.minutes} min</b>
        </span>
        <span>
          <small>Condición aplicada manualmente</small>
          <b>{fare.traffic}</b>
        </span>
        <span>
          <small>Ajuste elegido</small>
          <b>{data.peak ? "Hora pico" : "Horario normal"}</b>
        </span>
        <span>
          <small>Lluvia indicada</small>
          <b>{data.rain ? "Sí" : "No"}</b>
        </span>
      </div>
      <p>
        <b>Tarifa sugerida: {money(fare.recommended)}</b>
      </p>
      <p className="muted">
        Cálculo orientativo local; no es una tarifa oficial ni consulta tráfico
        o demanda en tiempo real.
      </p>
      <small className="ai-note">Tú decides siempre</small>
    </>
  )
}

export function PaymentMethodDialog({
  method,
  amount,
  language,
  onConfirm,
}: {
  method: Stored["paymentMethod"]
  amount: number
  language: Language
  onConfirm: () => void
}) {
  const [phone, setPhone] = useState("")

  const [reference, setReference] = useState("")

  const [error, setError] = useState("")

  const submit = (event: FormEvent) => {
    event.preventDefault()

    if (method !== "Efectivo" && !/^\d{10}$/.test(phone)) {
      setError("Ingresa un número de celular de 10 dígitos.")
      return
    }

    if (method !== "Efectivo" && reference.trim().length < 4) {
      setError("Ingresa una referencia de prueba de al menos 4 caracteres.")
      return
    }

    onConfirm()
  }

  return (
    <form className="payment-method-dialog" onSubmit={submit}>
      <span className="feature-icon small">
        <Icon name="wallet" />
      </span>
      <h2>
        {method === "Efectivo"
          ? translate("Pago en efectivo", language)
          : `${translate("Pago con", language)} ${translate(method, language)}`}
      </h2>
      <p className="muted">
        {translate("Total del viaje:", language)} <b>{money(amount)}</b>
      </p>
      {method === "Efectivo" ? (
        <p>
          {translate(
            "Entrega el valor acordado al conductor al terminar el trayecto.",
            language,
          )}
        </p>
      ) : (
        <>
          <Field
            label="Celular asociado al pago"
            value={phone}
            onChange={setPhone}
            type="tel"
            placeholder="3001234567"
            maxLength={10}
            required
          />
          <Field
            label="Referencia de prueba"
            value={reference}
            onChange={setReference}
            placeholder="Ej.: DEMO-1234"
            maxLength={40}
            required
          />
        </>
      )}
      <p className="simulation-notice">
        {translate(
          "Prototipo de demostración: no se realiza un cobro, no se envían estos datos y no debes ingresar claves, códigos de seguridad ni credenciales reales.",
          language,
        )}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit">Confirmar método de pago</Button>
    </form>
  )
}

export function Searching({
  data,
  update,
  go,
  back,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  back: () => void
}) {
  const currentDriverAvailable = Boolean(
    data.driverAccount.name &&
      data.driverAccount.email &&
      data.online &&
      data.driverVerification === "Aprobado",
  )

  const currentDriver = currentDriverAvailable
    ? {
        name: data.driverAccount.name,
        initials: initials(data.driverAccount.name),
        rating: "—",
        trips: 0,
        car:
          `${data.vehicle.make} ${data.vehicle.color}`.trim() ||
          "Vehículo registrado",
        plate: data.vehicle.plate || "Por confirmar",
        eta: 0,
        lat: 8.237,
        lng: -73.356,
      }
    : null

  const cancelSearch = () => {
    cancelTrip(update, "passenger", "Búsqueda cancelada")
    go("home")
  }

  return (
    <section>
      <Header title="Conductores cercanos" back={back} />
      <div className="page nearby-page">
        <div className="search-status">
          <div className="spinner">
            <Icon name="car" size={25} />
          </div>
          <span>
            <b>
              {currentDriverAvailable
                ? "Hay un conductor disponible"
                : "Solicitud publicada"}
            </b>
            <small>
              {money(data.offer)} · {data.origin} → {data.destination}
            </small>
          </span>
        </div>
        {currentDriver ? (
          <button
            className="nearby-driver recommended"
            onClick={() => {
              assignDriver(update, currentDriver.name)
              go("assigned")
            }}
          >
            <span className="recommend-badge">Disponible</span>
            <div className="driver-photo">{currentDriver.initials}</div>
            <span>
              <b>{currentDriver.name}</b>
              <small>
                {currentDriver.car} · {currentDriver.plate}
              </small>
              <small>Conductor registrado en este dispositivo</small>
            </span>
            <strong>Elegir</strong>
          </button>
        ) : (
          <div className="availability-empty">
            <span className="feature-icon">
              <Icon name="car" />
            </span>
            <h2>Esperando conductores conectados</h2>
            <p className="muted">
              No hay conductores disponibles confirmados en este momento. No
              asignaremos una persona ficticia ni mostraremos ubicaciones
              inventadas.
            </p>
            <p className="note">
              La búsqueda compartida en tiempo real requiere que pasajeros y
              conductores estén conectados a un servidor.
            </p>
          </div>
        )}
        <Button variant="secondary" onClick={cancelSearch}>
          Cancelar solicitud
        </Button>
      </div>
    </section>
  )
}

export function Assigned({
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
  const driver = {
    name: data.selectedDriver || data.driverAccount.name || "Conductor",
    initials: initials(
      data.selectedDriver || data.driverAccount.name || "Conductor",
    ),
    rating: "—",
    trips: 0,
    car:
      [data.vehicle.make, data.vehicle.color].filter(Boolean).join(" ") ||
      "Vehículo por confirmar",
    plate: data.vehicle.plate || "Placa pendiente",
  }

  const cancel = () =>
    setModal(
      <Cancel
        warning={data.driverArrived}
        onConfirm={(reason) => {
          cancelTrip(update, "passenger", reason)
          setModal(null)
          go("home")
        }}
      />,
    )

  return (
    <section className="map-screen assigned">
      <div className="map-bg">
        <MapView
          origin={data.origin}
          destination={data.destination}
          attributionAbovePanel
        />
      </div>
      <Header title="Conductor asignado" back={back} />
      <div className="driver-sheet">
        {data.driverDelayed && !data.driverArrived && (
          <div className="taxi-inline-card">
            <Icon name="message" />
            <span>
              <b>Taxi</b>
              <small>
                Tu conductor se demora. ¿Llamas, escribes o cancelas?
              </small>
            </span>
            <button
              onClick={() => {
                update({ chatTopic: "delay" })
                window.dispatchEvent(new CustomEvent("taxiya-open-assistant"))
              }}
            >
              Ver opciones
            </button>
          </div>
        )}
        <div className="arrival">
          <span>
            {data.driverArrived
              ? "Tu conductor llegó"
              : "Asignación confirmada"}
          </span>
          <strong>
            {data.driverArrived ? "Está en el punto" : "Llegada por confirmar"}
          </strong>
          <small>
            {data.driverArrived
              ? "Acércate al vehículo y verifica la placa"
              : "No mostramos un tiempo de llegada inventado. Coordina el encuentro con el conductor."}
          </small>
        </div>
        <div className="driver-card">
          <div className="driver-photo">{driver.initials}</div>
          <div>
            <b>{driver.name}</b>
            <span className="rating-line">
              <Icon name="star" size={15} filled />{" "}
              {driverAverage(data, driver.name, driver.rating)} · {driver.trips}{" "}
              viajes
            </span>
            <small>
              {driver.car} · <b>{driver.plate}</b>
            </small>
          </div>
          <button
            className="icon-button"
            onClick={() => setModal(<CallDialog name={driver.name} />)}
            aria-label="Llamar al conductor"
          >
            <Icon name="phone" />
          </button>
        </div>
        <div className="pin-card">
          <span>
            <Icon name="shield" />
            <b>PIN de verificación</b>
          </span>
          <strong>{data.pin.split("").join(" ")}</strong>
          <small>Díselo al conductor solo cuando estés dentro del taxi.</small>
        </div>
        <div className="action-row">
          <button onClick={() => go("chat")}>
            <Icon name="message" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setModal(<SOS data={data} update={update} />)}
            className="sos-action"
          >
            <Icon name="shield" />
            <span>SOS</span>
          </button>
          <button onClick={cancel}>
            <Icon name="minus" />
            <span>Cancelar</span>
          </button>
        </div>
        {data.driverArrived && (
          <Button onClick={() => go("tracking")}>Ver trayecto</Button>
        )}
      </div>
    </section>
  )
}

export function Chat({
  driver = false,
  data,
  update,
  onClose,
}: {
  driver?: boolean
  data: Stored
  update: Update
  onClose?: () => void
}) {
  const [message, setMessage] = useState("")

  const [messages, setMessages] = useState(data.rideMessages)

  const [error, setError] = useState("")

  const messagesRef = useRef<HTMLDivElement>(null)

  const sender = driver ? "driver" : "passenger"

  const serviceActive =
    ["assigned", "enroute", "active"].includes(data.tripStatus) &&
    Boolean(data.selectedDriver?.trim() || data.activePassengerName?.trim())

  useEffect(() => {
    setMessages(data.rideMessages)
  }, [data.rideMessages])

  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const send = () => {
    const text = message.trim()

    if (!serviceActive) {
      setError(
        "No hay un servicio activo ni una persona asignada. El chat está deshabilitado.",
      )
      return
    }

    if (!text) {
      setError("Escribe un mensaje antes de enviarlo.")
      return
    }

    const next = [
      ...messages,
      {
        id: `${Date.now()}-${sender}`,
        from: sender,
        text,
        createdAt: Date.now(),
      } as RideMessage,
    ]

    setMessages(next)
    update({ rideMessages: next })
    setMessage("")
    setError("")
  }

  return (
    <div className="ride-chat">
      <div className="ride-chat-head">
        <span className="chat-avatar">
          <Icon name="message" />
        </span>
        <span>
          <h2>
            {driver
              ? `Chat con ${data.activePassengerName || data.account?.name || "pasajero"}`
              : `Chat con ${data.selectedDriver || "tu conductor"}`}
          </h2>
          <small>
            {serviceActive
              ? "Servicio activo · conversación del viaje"
              : "Sin servicio asignado"}
          </small>
        </span>
        {onClose && (
          <button
            className="chat-exit"
            onClick={onClose}
            aria-label="Salir del chat"
          >
            <Icon name="back" /> Volver
          </button>
        )}
      </div>
      {!serviceActive && (
        <div className="chat-unavailable" role="status">
          <Icon name="info" />
          <span>
            <b>Chat no disponible</b>
            <small>
              Solo puedes enviar mensajes cuando exista un viaje y una persona
              asignada.
            </small>
          </span>
        </div>
      )}
      <div
        className="messages ride-messages"
        ref={messagesRef}
        role="log"
        aria-live="polite"
      >
        {messages.length ? (
          messages.map((item) => (
            <span className={item.from === sender ? "own" : ""} key={item.id}>
              <b>
                {item.from === "driver"
                  ? data.driverAccount.name
                  : data.activePassengerName ||
                    data.account?.name ||
                    "Pasajero"}
              </b>
              {item.text}
              <small>
                {new Date(item.createdAt).toLocaleTimeString("es-CO", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </small>
            </span>
          ))
        ) : (
          <p className="muted">
            {serviceActive
              ? "Todavía no hay mensajes. Coordina el punto de encuentro con respeto y sin distraerte al conducir."
              : "Cuando exista un viaje asignado y un conductor o pasajero identificado, podrás coordinar el encuentro."}
          </p>
        )}
      </div>
      <label className="field">
        <span>Tu mensaje</span>
        <textarea
          disabled={!serviceActive}
          value={message}
          maxLength={200}
          onChange={(e) => {
            setMessage(e.target.value)
            setError("")
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={
            serviceActive
              ? "Escribe aquí… (Enter para enviar)"
              : "Chat bloqueado sin servicio"
          }
        />
      </label>
      <div className="chat-compose-foot">
        <small className="counter">
          {message.length}/200 · Enter envía · Shift+Enter nueva línea
        </small>
        <Button disabled={!serviceActive || !message.trim()} onClick={send}>
          <Icon name="message" /> Enviar
        </Button>
      </div>
      {error && (
        <p className="chat-error" role="alert">
          <Icon name="info" /> {error}
        </p>
      )}
    </div>
  )
}

export function CallDialog({ name }: { name: string }) {
  const [calling, setCalling] = useState(true)

  return (
    <div className="sos-modal">
      <span className="feature-icon">
        <Icon name="phone" />
      </span>
      <h2>{calling ? `Llamando a ${name}…` : "Llamada finalizada"}</h2>
      <p className="muted">Llamada simulada dentro del prototipo.</p>
      {calling && (
        <Button variant="danger" onClick={() => setCalling(false)}>
          Colgar
        </Button>
      )}
    </div>
  )
}

export function SOS({ data, update }: StoredUpdateProps) {
  const [holding, setHolding] = useState(false)

  const [sent, setSent] = useState(data.sosActive)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const activate = () => {
    timer.current = null
    setHolding(false)
    const notification = newNotification(
      "Alerta SOS local activada",
      `Registro local creado desde ${data.origin}. No se envió a servicios externos.`,
      "tracking",
    )
    beep(data.sound)
    setSent(true)
    update((current) => ({
      sosActive: true,
      notificationItems: [notification, ...current.notificationItems],
    }))
  }

  const start = () => {
    if (sent || timer.current) return
    setHolding(true)
    timer.current = setTimeout(activate, 2000)
  }

  const stop = () => {
    setHolding(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const call123 = () => {
    appNotice("Si estás en peligro, llama ya")
    window.location.href = "tel:123"
  }

  if (sent)
    return (
      <div className="sos-modal">
        <span className="sos-circle">
          <Icon name="shield" size={30} />
        </span>
        <h2>Alerta registrada localmente</h2>
        <p>
          Registramos localmente la ubicación {data.origin} a las {nowLabel()}.
          No se envió información a tu contacto ni a una central.
        </p>
        <Button variant="danger" onClick={call123}>
          Llamar al 123
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setSent(false)
            update({ sosActive: false, shieldChecks: data.shieldChecks + 1 })
            appNotice(
              "Alerta local cancelada. Nos alegra saber que estás a salvo.",
            )
          }}
        >
          Estoy a salvo, cancelar alerta
        </Button>
      </div>
    )

  return (
    <div className="sos-modal">
      <span className="sos-circle">
        <Icon name="shield" size={30} />
      </span>
      <h2>Ayuda de emergencia</h2>
      <p id="sos-hold-help">
        Mantén presionado 2 segundos. Con teclado, mantén Espacio o Enter. Para
        ayuda real, llama al 123.
      </p>
      <button
        className={`hold-sos ${holding ? "holding" : ""}`}
        aria-describedby="sos-hold-help"
        aria-pressed={holding}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault()
            start()
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") stop()
        }}
        onBlur={stop}
      >
        {holding
          ? "Mantén presionado para activar SOS…"
          : "Mantener para activar SOS"}
      </button>
      <Button variant="secondary" onClick={call123}>
        Llamar al 123
      </Button>
    </div>
  )
}

export function Cancel({
  onConfirm,
  warning = false,
  driver = false,
}: {
  onConfirm: (reason: string) => void
  warning?: boolean
  driver?: boolean
}) {
  const [reason, setReason] = useState("")

  const reasons = driver
    ? [
        "El pasajero no responde",
        "Problema del vehículo",
        "Emergencia personal",
        "Ruta bloqueada",
      ]
    : [
        "El conductor está lejos",
        "Cambié de planes",
        "No me siento a salvo",
        "Otro motivo",
      ]

  return (
    <>
      <h2>{driver ? "Cancelar el viaje" : "¿Cancelar el viaje?"}</h2>
      <p className={warning ? "warning-text" : "muted"}>
        {driver
          ? "Al cancelar, el viaje volverá a la búsqueda de otro conductor."
          : warning
            ? "El conductor ya está cerca. ¿Seguro que quieres cancelar?"
            : "Antes de que llegue el conductor, cancelar es gratis."}
      </p>
      <div className="choice-list">
        {reasons.map((r) => (
          <button
            type="button"
            className={reason === r ? "selected" : ""}
            aria-pressed={reason === r}
            onClick={() => setReason(r)}
            key={r}
          >
            {r}
            <span>{reason === r ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      <Button
        variant="danger"
        disabled={!reason}
        onClick={() => onConfirm(reason)}
      >
        Confirmar cancelación
      </Button>
    </>
  )
}

export function Tracking({
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

  const selectedDriver = drivers.find(
    (driver) => driver.name === data.selectedDriver,
  ) || {
    name: data.selectedDriver || data.driverAccount.name || "Sin asignar",
    initials: initials(
      data.selectedDriver || data.driverAccount.name || "Conductor",
    ),
    rating: "—",
    trips: 0,
    car: `${data.vehicle.make} ${data.vehicle.color}`.trim(),
    plate: data.vehicle.plate || "Sin placa",
    eta: 0,
    lat: 8.237,
    lng: -73.356,
  }

  const [arrivalAt] = useState(
    () => data.tripArrivalAt || Date.now() + route.minutes * 60000,
  )

  useEffect(() => {
    update({
      tripStatus: "active",
      shieldDueAt: data.automaticShield
        ? data.shieldDueAt || Date.now() + 25000
        : null,
      tripArrivalAt: arrivalAt,
    })
    if (data.notifyTrusted && data.shareLocation && !data.shared)
      setModal(
        <>
          <h2>Compartir viaje automáticamente</h2>
          <p>
            Comparte con {data.account?.contactName || "tu contacto"} estos
            datos de este dispositivo:
          </p>
          <div className="receipt-lines">
            <span>
              <small>Conductor</small>
              <b>{selectedDriver.name}</b>
            </span>
            <span>
              <small>Placa</small>
              <b>{selectedDriver.plate}</b>
            </span>
            <span>
              <small>Ubicación</small>
              <b>
                {data.origin} → {data.destination}
              </b>
            </span>
          </div>
          <Button
            onClick={() => {
              update({ shared: true })
              setModal(null)
            }}
          >
            Compartir ahora
          </Button>
        </>,
      )
  }, [])

  const share = () => {
    if (!data.shareLocation) {
      appNotice("Activa “Compartir ubicación” en Seguridad y privacidad.")
      return
    }

    update({ shared: true })
    setModal(<ContactView data={data} />)
  }

  const shield = data.sosActive
    ? "alert"
    : data.shieldEventHandled && data.shieldChecks === 0
      ? "review"
      : "ok"

  const status =
    shield === "ok"
      ? "Todo en orden"
      : shield === "review"
        ? "Revisando"
        : "Alerta"

  const finish = () => {
    finishTrip(update)
    go("rating")
  }

  const eta = new Date(arrivalAt).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <section className="map-screen">
      <div className="map-bg tracking-map">
        <MapView origin={data.origin} destination={data.destination} />
      </div>
      <div className={`trip-top shield-${shield}`}>
        <span>
          <Icon name={shield === "ok" ? "check" : "shield"} /> {status}
        </span>
        <span className="map-actions">
          <button onClick={() => setModal(<SOS data={data} update={update} />)}>
            SOS
          </button>
          <TaxiHeaderButton />
        </span>
      </div>
      <div className="tracking-sheet">
        <div className="handle" />
        <div className="trip-progress">
          <span>En camino</span>
          <strong>{route.minutes} min estimados</strong>
          <small>Llegada estimada · {eta}</small>
        </div>
        <div className="route-mini">
          <i />
          <span>
            <b>{data.origin}</b>
            <small>{data.destination}</small>
          </span>
        </div>
        <div className="shield-card">
          <Icon name="shield" />
          <span>
            <b>
              Escudo de trayecto {data.automaticShield ? "activo" : "manual"}
            </b>
            <small>
              {data.shared
                ? `${data.account?.contactName || "Tu contacto"} está viendo tu viaje`
                : data.automaticShield
                  ? "Revisa pausas y cambios de ruta"
                  : "La alerta automática está apagada"}
            </small>
          </span>
          <button onClick={share}>Compartir mi viaje</button>
        </div>
        <div className="action-row two">
          <button onClick={() => go("chat")}>
            <Icon name="message" />
            <span>Chat</span>
          </button>
          <button
            onClick={() =>
              setModal(
                <CallDialog name={data.selectedDriver || "el conductor"} />,
              )
            }
          >
            <Icon name="phone" />
            <span>Llamar</span>
          </button>
        </div>
        <Button onClick={finish}>Simular llegada</Button>
      </div>
    </section>
  )
}

export function ShieldCheck({
  data,
  update,
  close,
  escalate,
}: {
  data: Stored
  update: Update
  close: () => void
  escalate: () => void
}) {
  const [seconds, setSeconds] = useState(15)

  useEffect(() => {
    const t = setInterval(
      () =>
        setSeconds((value) => {
          if (value <= 1) {
            clearInterval(t)
            escalate()
            return 0
          }
          return value - 1
        }),
      1000,
    )
    return () => clearInterval(t)
  }, [])

  return (
    <div className="shield-check">
      <span className="sos-circle">
        <Icon name="shield" size={30} />
      </span>
      <span className="eyebrow">ESCUDO DE TRAYECTO · SIMULACIÓN</span>
      <h2>¿Todo bien?</h2>
      <p>
        Esta pausa la genera un temporizador de demostración. No se detectó una
        ubicación ni una ruta real.
      </p>
      <strong className="countdown">{seconds} s</strong>
      <Button
        onClick={() => {
          update({ shieldChecks: data.shieldChecks + 1, sosActive: false })
          close()
          appNotice(
            "Verificación registrada. El Escudo vuelve a Todo en orden.",
          )
        }}
      >
        ESTOY BIEN
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          update({ shared: true })
          close()
          appNotice(
            "Preparamos la vista para tu contacto. No se envió un enlace externo.",
          )
        }}
      >
        Necesito ayuda
      </Button>
      <Button variant="danger" onClick={escalate}>
        SOS
      </Button>
    </div>
  )
}

export function ShieldEscalated({
  data,
  update,
  close,
}: {
  data: Stored
  update: Update
  close: () => void
}) {
  useEffect(() => {
    beep(data.sound)
    const notification = newNotification(
      "Alerta local del Escudo",
      `Registro local creado desde ${data.origin}.`,
      "tracking",
    )
    update((current) => ({
      sosActive: true,
      notificationItems: [notification, ...current.notificationItems],
    }))
  }, [])

  return (
    <div className="shield-check">
      <span className="sos-circle">
        <Icon name="shield" size={30} />
      </span>
      <h2>Alerta registrada localmente</h2>
      <p>
        {nowLabel()} · {data.origin}. No se envió a contactos ni autoridades.
      </p>
      <a
        className="button danger"
        href="tel:123"
        onClick={() => appNotice("Si estás en peligro, llama ya")}
      >
        Llamar al 123
      </a>
      <Button
        onClick={() => {
          update({ sosActive: false, shieldChecks: data.shieldChecks + 1 })
          close()
          appNotice("Alerta local cerrada. El Escudo vuelve a Todo en orden.")
        }}
      >
        Estoy a salvo
      </Button>
    </div>
  )
}

export function ContactView({ data }: { data: Stored }) {
  const registered = Boolean(
    data.driverAccount.email && data.driverAccount.name,
  )

  const driverName =
    data.selectedDriver ||
    (registered ? data.driverAccount.name : "Sin conductor asignado")

  const vehicle =
    [data.vehicle.make, data.vehicle.color].filter(Boolean).join(" · ") ||
    "Vehículo sin registrar"

  return (
    <>
      <span className="ai-badge">Vista local del trayecto</span>
      <h2>Trayecto de {data.account?.name || "la persona usuaria"}</h2>
      <p className="muted">
        Esta vista no genera un enlace público ni envía la ubicación fuera del
        dispositivo.
      </p>
      <div className="contact-map">
        <MapView origin={data.origin} destination={data.destination} />
      </div>
      <div className="driver-card simple">
        <div className="driver-photo">{initials(driverName)}</div>
        <div>
          <b>{driverName}</b>
          <small>
            {registered
              ? `${vehicle} · ${data.vehicle.plate || "Placa pendiente"}`
              : "Los datos del conductor aparecerán cuando exista una asignación real."}
          </small>
          <small>Destino: {data.destination}</small>
        </div>
      </div>
      {data.account?.phone && (
        <a className="button secondary" href={`tel:${data.account.phone}`}>
          Llamar a {firstName(data.account.name || "la persona")}
        </a>
      )}
    </>
  )
}

export function Rating({
  go,
  driver,
  data,
  update,
}: {
  go: (s: Screen) => void
  driver: boolean
  data: Stored
  update: Update
}) {
  const [stars, setStars] = useState(0)

  const [comment, setComment] = useState("")

  const [tags, setTags] = useState<string[]>([])

  const [tip, setTip] = useState(0)

  const [customTip, setCustomTip] = useState("")

  const options = driver
    ? ["Puntual", "Trato amable"]
    : ["Conducción segura", "Amable", "Vehículo limpio", "Puntual"]

  const save = () => {
    const index = data.tripHistory.findIndex(
      (trip) => trip.status === "Completado",
    )

    if (index >= 0) {
      const next = [...data.tripHistory]

      next[index] = {
        ...next[index],
        tip: driver
          ? next[index].tip
          : tip === -1
            ? Number(customTip) || 0
            : tip,
        [driver ? "driverRating" : "passengerRating"]: {
          stars,
          tags,
          comment: comment.trim(),
        },
      }

      update({ tripHistory: next, selectedTripId: next[index].id })
    }

    go(driver ? "driver-home" : "thanks")
  }

  const person = driver
    ? data.account?.name || "la persona usuaria"
    : data.selectedDriver || "tu conductor"

  return (
    <section>
      <Header title="Califica tu experiencia" />
      <div className="page rating-page">
        <div className="driver-photo large">{initials(person)}</div>
        <h1>
          {driver
            ? `¿Cómo fue el viaje con ${firstName(person)}?`
            : `¿Cómo estuvo tu viaje con ${firstName(person)}?`}
        </h1>
        <p className="muted">Tu opinión mejora la comunidad TaxiYa.</p>
        <div className="stars" role="group" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              aria-label={`${n} estrellas`}
              aria-pressed={stars === n}
              className={stars >= n ? "active" : ""}
              onClick={() => setStars(n)}
              key={n}
            >
              <Icon name="star" size={34} filled />
            </button>
          ))}
        </div>
        <div className="tag-list">
          {options.map((t) => (
            <button
              type="button"
              aria-pressed={tags.includes(t)}
              className={tags.includes(t) ? "active" : ""}
              onClick={() =>
                setTags(
                  tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t],
                )
              }
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
        {!driver && (
          <>
            <label className="field">
              <span>Propina opcional</span>
              <select
                value={tip}
                onChange={(event) => setTip(Number(event.target.value))}
              >
                <option value={0}>Sin propina</option>
                <option value={1000}>{money(1000)}</option>
                <option value={2000}>{money(2000)}</option>
                <option value={-1}>Otro</option>
              </select>
            </label>
            {tip === -1 && (
              <Field
                label="Otro valor"
                type="number"
                value={customTip}
                onChange={(value) => setCustomTip(value.replace(/\D/g, ""))}
                placeholder="Valor en pesos"
              />
            )}
          </>
        )}
        <label className="field">
          <span>Comentario (opcional)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={200}
            placeholder="Cuéntanos un poco más..."
          />
        </label>
        <small className="counter">{comment.length}/200</small>
        <div className="bottom-action">
          <Button disabled={!stars} onClick={save}>
            Enviar calificación
          </Button>
        </div>
      </div>
    </section>
  )
}

export function Thanks({ go, data }: ThanksProps) {
  return (
    <section className="page success-page">
      <span className="success-icon">
        <Icon name="check" size={42} />
      </span>
      <span className="eyebrow">VIAJE COMPLETADO</span>
      <h1>¡Gracias por calificar!</h1>
      <p className="muted">
        Tu opinión nos ayuda a que cada viaje en Ocaña sea mejor.
      </p>
      <div className="receipt-mini">
        <span>Total del viaje</span>
        <strong>{money(data.offer)}</strong>
        <small>Pago con {data.paymentMethod} · registro local</small>
      </div>
      <Button onClick={() => go("home")}>Volver al inicio</Button>
      <button className="text-link" onClick={() => go("trip-detail")}>
        Ver recibo
      </button>
    </section>
  )
}

export function Trips({
  go,
  data,
  update,
}: {
  go: (s: Screen) => void
  data: Stored
  update: Update
}) {
  const [tab, setTab] = useState("Todos")

  const visible = data.tripHistory.filter(
    (trip) =>
      tab === "Todos" ||
      trip.status === (tab === "Completados" ? "Completado" : "Cancelado"),
  )

  return (
    <section>
      <Header title="Mis viajes" />
      <div className="page">
        <div className="tabs">
          {["Todos", "Completados", "Cancelados"].map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <>
            <Empty
              icon="car"
              title="No hay viajes"
              text="Los viajes de este estado aparecerán aquí."
            />
            <Button onClick={() => go("home")}>Pedir un taxi</Button>
          </>
        ) : (
          <>
            <p className="section-label">
              {countLabel(visible.length, "VIAJE", "VIAJES")}
            </p>
            {visible.map((trip) => (
              <button
                className="trip-row"
                onClick={() => {
                  update({ selectedTripId: trip.id })
                  go("trip-detail")
                }}
                key={trip.id}
              >
                <span className="trip-line">
                  <i />
                  <i />
                </span>
                <span>
                  <small>{trip.date}</small>
                  <b>{trip.origin}</b>
                  <small>
                    {trip.destination} · {trip.driver}
                  </small>
                </span>
                <strong>
                  {trip.status === "Cancelado" ? "Cancelado" : money(trip.fare)}
                </strong>
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  )
}

export function TripDetail({
  data,
  update,
  back,
  setModal,
}: {
  data: Stored
  update: Update
  back: () => void
  setModal: (v: ReactNode) => void
}) {
  const trip =
    data.tripHistory.find((item) => item.id === data.selectedTripId) ||
    data.tripHistory[0]

  if (!trip)
    return (
      <section>
        <Header title="Detalle del viaje" back={back} />
        <div className="page">
          <Empty
            icon="car"
            title="Viaje no disponible"
            text="Vuelve al historial y elige un viaje."
          />
        </div>
      </section>
    )

  const driver = drivers.find((d) => d.name === trip.driver)

  return (
    <section>
      <Header title="Detalle del viaje" back={back} />
      <div className="page">
        <div
          className={`receipt-head ${
            trip.status === "Cancelado" ? "cancelled" : ""
          }`}
        >
          <span className="success-icon small">
            <Icon name={trip.status === "Cancelado" ? "minus" : "check"} />
          </span>
          <span>
            <small>VIAJE {trip.status.toUpperCase()}</small>
            <h2>{money(trip.fare)}</h2>
            <p>{trip.date}</p>
          </span>
        </div>
        <div className="route-card detailed">
          <div className="route-points">
            <i />
            <span />
          </div>
          <div>
            <small>ORIGEN</small>
            <b>{trip.origin}</b>
            <small>DESTINO</small>
            <b>{trip.destination}</b>
          </div>
        </div>
        <div className="driver-card simple">
          <div className="driver-photo">{initials(trip.driver)}</div>
          <div>
            <b>{trip.driver}</b>
            <small>
              {driver?.car || data.vehicle.make} · {trip.plate}
            </small>
          </div>
          <span className="rating-line">
            <Icon name="star" size={14} filled /> Promedio{" "}
            {driverAverage(data, trip.driver, driver?.rating || "—")}
          </span>
        </div>
        <div className="receipt-lines">
          <span>
            <small>Tarifa del viaje</small>
            <b>{money(trip.fare)}</b>
          </span>
          <span>
            <small>Método de pago</small>
            <b>{trip.paymentMethod || "Efectivo"}</b>
          </span>
          <span>
            <small>Escudo de trayecto</small>
            <b>{trip.shieldChecks} verificaciones</b>
          </span>
          {trip.tip ? (
            <span>
              <small>Propina</small>
              <b>{money(trip.tip)}</b>
            </span>
          ) : null}
          {trip.passengerRating && (
            <span>
              <small>Tu calificación: {trip.passengerRating.stars}/5</small>
              <b>{trip.passengerRating.tags.join(", ") || "Sin etiquetas"}</b>
            </span>
          )}
        </div>
        {trip.passengerRating?.comment && (
          <p className="muted">“{trip.passengerRating.comment}”</p>
        )}
        <Button
          variant="secondary"
          onClick={() => setModal(<Report data={data} update={update} />)}
        >
          Reportar un problema
        </Button>
      </div>
    </section>
  )
}

export function Report({ data, update }: StoredUpdateProps) {
  const [step, setStep] = useState(1)
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")

  const send = () => {
    const complaint: Complaint = {
      id: `${Date.now()}`,
      reason,
      description: description.trim(),
      status: "Abierta",
    }
    update({ complaints: [complaint, ...data.complaints] })
    setStep(3)
    appNotice("Reporte enviado. Te responderemos desde Notificaciones.")
  }

  return (
    <>
      <span className="section-label">PASO {step} DE 3</span>
      <h2>Reportar un problema</h2>
      {step === 1 && (
        <>
          <p className="muted">Elige el tipo de problema.</p>
          <div className="choice-list">
            {[
              "Cobro incorrecto",
              "Conducción insegura",
              "Objeto perdido",
              "Otro",
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
          <Button disabled={!reason} onClick={() => setStep(2)}>
            Continuar
          </Button>
        </>
      )}
      {step === 2 && (
        <>
          <label className="field">
            <span>
              ¿Qué pasó? <b className="required-mark">*</b>
            </span>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe lo ocurrido (mínimo 10 caracteres)"
              aria-invalid={
                description.length > 0 && description.trim().length < 10
              }
            />
          </label>
          {description.length > 0 && description.trim().length < 10 && (
            <small className="error">Escribe al menos 10 caracteres.</small>
          )}
          <Button disabled={description.trim().length < 10} onClick={send}>
            Enviar reporte
          </Button>
          <Button variant="ghost" onClick={() => setStep(1)}>
            Volver
          </Button>
        </>
      )}
      {step === 3 && (
        <>
          <span className="success-icon small">
            <Icon name="check" />
          </span>
          <p>
            <b>Reporte enviado</b>
          </p>
          <p className="muted">
            Lo guardamos en Reportes. Te responderemos desde Notificaciones.
          </p>
        </>
      )}
    </>
  )
}

export function Profile({
  data,
  update,
  go,
  setModal,
  reset,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
  setModal: (v: ReactNode) => void
  reset: () => void
}) {
  const account = data.account

  const editPayment = (method: Stored["paymentMethod"]) =>
    setModal(
      <PaymentMethodDialog
        method={method}
        amount={data.offer}
        language={data.language}
        onConfirm={() => {
          update({ paymentMethod: method })
          setModal(null)
          appNotice(
            `${translate("Método elegido:", data.language)} ${translate(method, data.language)}. ${translate("No se realizó ningún cobro.", data.language)}`,
          )
        }}
      />,
    )

  return (
    <section>
      <Header title="Mi perfil" />
      <div className="page profile-page">
        <div className="profile-head">
          <div className="profile-photo">{initials(account?.name || "")}</div>
          <h2>{account?.name || "Completa tu perfil"}</h2>
          <p>{account?.phone ? `+57 ${account.phone}` : "Sin celular"}</p>
          <button
            className="text-link"
            onClick={() =>
              setModal(<PersonalData data={data} update={update} />)
            }
          >
            Editar perfil
          </button>
        </div>
        <p className="section-label">TU CUENTA</p>
        <div className="menu-list">
          <Menu
            icon="user"
            label="Datos personales"
            onClick={() =>
              setModal(<PersonalData data={data} update={update} />)
            }
          />
          <Menu
            icon="pin"
            label="Lugares guardados"
            detail="Casa y Trabajo"
            onClick={() =>
              setModal(<SavedPlaces data={data} update={update} />)
            }
          />
          <Menu
            icon="user"
            label="Contacto de confianza"
            onClick={() =>
              setModal(<TrustedContact data={data} update={update} />)
            }
          />
          <Menu
            icon="help"
            label="Ficha de necesidades"
            onClick={() => setModal(<NeedsForm data={data} update={update} />)}
          />
          <Menu
            icon="shield"
            label="Seguridad y privacidad"
            onClick={() =>
              setModal(<PrivacySettings data={data} update={update} />)
            }
          />
          <Menu
            icon="settings"
            label="Cambiar contraseña"
            onClick={() =>
              setModal(<PasswordChange data={data} update={update} />)
            }
          />
          <Menu
            icon="wallet"
            label="Métodos de pago"
            detail={data.paymentMethod}
            onClick={() => editPayment(data.paymentMethod)}
          />
          <Menu
            icon="help"
            label="Ayuda y soporte"
            onClick={() => go("support")}
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
            label="Idioma, apariencia y sonido"
            onClick={() =>
              setModal(<AppSettings data={data} update={update} />)
            }
          />
          <Menu
            icon="help"
            label="Términos y privacidad"
            onClick={() => setModal(<Terms />)}
          />
        </div>
        <div className="menu-list danger-zone">
          <Menu
            icon="logout"
            label="Cerrar sesión"
            onClick={() =>
              setModal(
                <Confirm
                  title="¿Cerrar sesión?"
                  text="Tendrás que ingresar de nuevo para usar TaxiYa."
                  action="Cerrar sesión"
                  onConfirm={() => {
                    update({ loggedIn: false })
                    setModal(null)
                    go("welcome")
                  }}
                />,
              )
            }
          />
          <Menu
            icon="trash"
            label="Eliminar cuenta"
            onClick={() =>
              setModal(<DeleteAccount data={data} reset={reset} />)
            }
          />
        </div>
        <p className="prototype-note">
          La información de esta versión se guarda en este navegador.
        </p>
      </div>
    </section>
  )
}

export function SavedPlaces({ data, update }: StoredUpdateProps) {
  const [home, setHome] = useState(
    data.savedPlaces.find((item) => item.label === "Casa")?.place || "",
  )

  const [work, setWork] = useState(
    data.savedPlaces.find((item) => item.label === "Trabajo")?.place || "",
  )

  return (
    <>
      <h2>Lugares guardados</h2>
      <PlaceAutocomplete label="Casa" value={home} onChange={setHome} />
      <PlaceAutocomplete label="Trabajo" value={work} onChange={setWork} />
      <Button
        onClick={() => {
          update({
            savedPlaces: [
              { label: "Casa", place: home },
              { label: "Trabajo", place: work },
            ].filter((item) => item.place) as Stored["savedPlaces"],
          })
          appNotice("Lugares guardados.")
        }}
      >
        Guardar lugares
      </Button>
    </>
  )
}

export function PersonalData({
  data,
  update,
  driver = false,
}: {
  data: Stored
  update: Update
  driver?: boolean
}) {
  const source = driver ? data.driverAccount : data.account

  const [name, setName] = useState(source?.name || "")
  const [phone, setPhone] = useState(source?.phone || "")
  const [email, setEmail] = useState(source?.email || "")

  const save = () => {
    if (!source) return
    const account = {
      ...source,
      name: name.trim(),
      phone,
      email: email.trim().toLowerCase(),
    }
    update(
      driver
        ? { driverAccount: account }
        : { account, addressPreference: account.preference },
    )
    appNotice("Datos personales guardados.")
  }

  return (
    <>
      <h2>Datos personales</h2>
      <p className="muted">
        Revisa que tus datos estén completos antes de guardar.
      </p>
      <Field
        label="Nombre completo"
        value={name}
        onChange={setName}
        error={
          name.trim().length < 3 ? "Escribe tu nombre completo." : undefined
        }
        required
      />
      <Field
        label="Celular"
        value={phone}
        onChange={(v) => setPhone(v.replace(/\D/g, ""))}
        maxLength={10}
        error={
          !/^\d{10}$/.test(phone)
            ? "El celular debe tener 10 dígitos."
            : undefined
        }
        required
      />
      <Field
        label="Correo electrónico"
        value={email}
        onChange={setEmail}
        error={
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? "Ingresa un correo válido."
            : undefined
        }
        required
      />
      <Button
        disabled={
          !source ||
          name.trim().length < 3 ||
          !/^\d{10}$/.test(phone) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        }
        onClick={save}
      >
        Guardar cambios
      </Button>
    </>
  )
}

export function TrustedContact({
  data,
  update,
}: {
  data: Stored
  update: Update
}) {
  const [name, setName] = useState(data.account?.contactName || "")
  const [phone, setPhone] = useState(data.account?.contactPhone || "")
  const [relationship, setRelationship] = useState(
    data.account?.relationship || "",
  )

  const nameError =
    name && name.trim().length < 3
      ? "Escribe al menos 3 caracteres."
      : undefined

  const phoneError =
    phone && !/^\d{10}$/.test(phone)
      ? "El celular debe tener 10 dígitos."
      : undefined

  return (
    <>
      <h2>Contacto de confianza</h2>
      <p className="muted">
        Guardamos este contacto localmente en el navegador. No le enviamos
        mensajes ni ubicación.
      </p>
      <Field
        label="Nombre"
        value={name}
        onChange={setName}
        error={nameError}
        required
      />
      <Field
        label="Celular"
        value={phone}
        onChange={(v) => setPhone(v.replace(/\D/g, ""))}
        maxLength={10}
        error={phoneError}
        required
      />
      <label className="field">
        <span>
          Parentesco <b className="required-mark">*</b>
        </span>
        <select
          value={relationship}
          onChange={(event) => setRelationship(event.target.value)}
          required
        >
          <option value="">Selecciona</option>
          <option>Familiar</option>
          <option>Amistad</option>
          <option>Pareja</option>
        </select>
      </label>
      <Button
        disabled={
          !data.account ||
          name.trim().length < 3 ||
          !/^\d{10}$/.test(phone) ||
          !relationship
        }
        onClick={() => {
          if (data.account)
            update({
              account: {
                ...data.account,
                contactName: name.trim(),
                contactPhone: phone,
                relationship,
              },
            })
          appNotice("Contacto de confianza guardado.")
        }}
      >
        Guardar contacto
      </Button>
    </>
  )
}

export function NeedsForm({ data, update }: StoredUpdateProps) {
  const [needs, setNeeds] = useState(data.account?.needs || [])
  const [note, setNote] = useState(data.account?.needsNote || "")

  return (
    <>
      <h2>Ficha de necesidades</h2>
      <div className="needs-grid">
        {[
          "Movilidad reducida",
          "Acompañante",
          "Silla para niños",
          "Equipaje grande",
          "Mascota",
          "Ayuda con bolsas",
        ].map((n) => (
          <label className="check-row" key={n}>
            <input
              type="checkbox"
              checked={needs.includes(n)}
              onChange={() =>
                setNeeds(
                  needs.includes(n)
                    ? needs.filter((x) => x !== n)
                    : [...needs, n],
                )
              }
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <label className="field">
        <span>Nota para el conductor</span>
        <textarea
          value={note}
          maxLength={150}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <small className="counter">{note.length}/150</small>
      <Button
        disabled={!data.account}
        onClick={() => {
          if (data.account)
            update({
              account: { ...data.account, needs, needsNote: note.trim() },
            })
          appNotice("Ficha de necesidades guardada.")
        }}
      >
        Guardar ficha
      </Button>
    </>
  )
}

export function PasswordChange({
  data,
  update,
}: {
  data: Stored
  update: Update
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")

  const [error, setError] = useState("")

  const validNext = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(next)

  const save = async () => {
    if (!data.account || !validNext || next !== confirm || next === current)
      return

    if (!(await verifyPassword(current, data.account.password))) {
      setError("Contraseña incorrecta.")
      return
    }

    update({ account: { ...data.account, password: await hashPassword(next) } })

    appNotice("Contraseña actualizada.")
  }

  return (
    <>
      <h2>Cambiar contraseña</h2>
      <p className="muted">Usa mínimo 8 caracteres, una letra y un número.</p>
      <Field
        label="Contraseña actual"
        value={current}
        onChange={(value) => {
          setCurrent(value)
          setError("")
        }}
        type="password"
        error={error || undefined}
        required
      />
      <Field
        label="Nueva contraseña"
        value={next}
        onChange={setNext}
        type="password"
        error={
          next && !validNext
            ? "Usa mínimo 8 caracteres, una letra y un número."
            : undefined
        }
        required
      />
      <Field
        label="Confirmar nueva contraseña"
        value={confirm}
        onChange={setConfirm}
        type="password"
        error={
          confirm && next !== confirm
            ? "Las contraseñas no coinciden."
            : undefined
        }
        required
      />
      <Button
        disabled={
          !data.account ||
          !current ||
          !validNext ||
          next !== confirm ||
          next === current
        }
        onClick={() => void save()}
      >
        Actualizar contraseña
      </Button>
    </>
  )
}

export function PrivacySettings({
  data,
  update,
}: {
  data: Stored
  update: Update
}) {
  const [values, setValues] = useState([
    data.shareLocation,
    data.automaticShield,
    data.notifyTrusted,
  ])

  return (
    <>
      <h2>Seguridad y privacidad</h2>
      {[
        "Compartir ubicación durante el viaje",
        "Alerta automática del Escudo",
        "Avisar al contacto de confianza",
      ].map((label, i) => (
        <div className="toggle-row" key={label}>
          <span>
            <Icon name="shield" />
            <b>{label}</b>
          </span>
          <button
            className={`toggle ${values[i] ? "on" : ""}`}
            role="switch"
            aria-label={`Activar o desactivar: ${label}`}
            aria-checked={values[i]}
            onClick={() => setValues(values.map((v, j) => (j === i ? !v : v)))}
          >
            <i />
          </button>
        </div>
      ))}
      <Button
        onClick={() => {
          update({
            shareLocation: values[0],
            automaticShield: values[1],
            notifyTrusted: values[2],
          })
          appNotice("Preferencias de seguridad guardadas.")
        }}
      >
        Guardar preferencias
      </Button>
    </>
  )
}

export function AppSettings({ data, update }: StoredUpdateProps) {
  const [appearance, setAppearance] = useState(data.appearance)

  const [sound, setSound] = useState(data.sound)

  const [largeText, setLargeText] = useState(data.largeText)

  const [language, setLanguage] = useState(data.language)

  return (
    <>
      <h2>{translate("Ajustes", data.language)}</h2>
      <div className="field">
        <span>{translate("Idioma", data.language)}</span>
        <LanguagePicker language={language} onChange={setLanguage} />
      </div>
      <label className="field">
        <span>{translate("Apariencia", data.language)}</span>
        <select
          value={appearance}
          onChange={(event) =>
            setAppearance(event.target.value as Stored["appearance"])
          }
        >
          <option value="Automático">
            {translate("Automático", data.language)}
          </option>
          <option value="Claro">{translate("Claro", data.language)}</option>
          <option value="Oscuro">{translate("Oscuro", data.language)}</option>
        </select>
      </label>
      <div className="toggle-row">
        <span>
          <Icon name="bell" />
          <b>{translate("Sonido", data.language)}</b>
        </span>
        <button
          className={`toggle ${sound ? "on" : ""}`}
          role="switch"
          aria-label={translate("Activar o desactivar sonido", data.language)}
          aria-checked={sound}
          onClick={() => setSound(!sound)}
        >
          <i />
        </button>
      </div>
      <div className="toggle-row">
        <span>
          <Icon name="settings" />
          <b>{translate("Lectura grande", data.language)}</b>
        </span>
        <button
          className={`toggle ${largeText ? "on" : ""}`}
          role="switch"
          aria-label={translate(
            "Activar o desactivar lectura grande",
            data.language,
          )}
          aria-checked={largeText}
          onClick={() => setLargeText(!largeText)}
        >
          <i />
        </button>
      </div>
      <Button
        onClick={() => {
          update({
            appearance,
            darkMode: appearance === "Oscuro",
            sound,
            largeText,
            language,
          })
          if (sound && !data.sound) beep(true)
          appNotice("Ajustes guardados.")
        }}
      >
        Guardar ajustes
      </Button>
    </>
  )
}

export function Terms() {
  return (
    <>
      <h2>Términos y privacidad</h2>
      <p>
        TaxiYa conecta pasajeros y conductores en Ocaña. La tarifa es una
        estimación orientativa y siempre puedes cambiarla.
      </p>
      <h2>Qué datos guardamos</h2>
      <p className="muted">
        Este prototipo guarda cuenta, contraseña, contacto, conversación,
        ubicación, alertas y recibos en el almacenamiento local del navegador.
      </p>
      <div className="warning">
        <Icon name="help" />
        <span>
          <b>Limitación de seguridad</b>
          <small>
            Las contraseñas locales no tienen la protección de un servidor. No
            reutilices aquí una contraseña real.
          </small>
        </span>
      </div>
      <p className="muted">
        Puedes borrar estos datos con “Eliminar cuenta” o desde los ajustes de
        almacenamiento de este navegador.
      </p>
    </>
  )
}

export function Menu({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: string
  label: string
  detail?: string
  onClick: () => void
}) {
  const language = useContext(TaxiLauncherContext).language

  return (
    <button className="menu-row" onClick={onClick}>
      <Icon name={icon} />
      <span>
        <b>{translate(label, language)}</b>
        {detail && <small>{translate(detail, language)}</small>}
      </span>
      <Icon name="chevron" />
    </button>
  )
}

export function Confirm({
  title,
  text,
  action,
  onConfirm,
}: {
  title: string
  text: string
  action: string
  onConfirm: () => void
}) {
  return (
    <>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <Button variant="danger" onClick={onConfirm}>
        {action}
      </Button>
    </>
  )
}

export function DeleteAccount({
  data,
  reset,
}: {
  data: Stored
  reset: () => void
}) {
  const [pass, setPass] = useState("")

  const [verified, setVerified] = useState(false)

  const [error, setError] = useState("")
  const verificationRun = useRef(0)

  const verify = async (value: string) => {
    const run = ++verificationRun.current
    setPass(value)

    setVerified(false)

    setError("")

    if (!value || !data.account) return

    const matches = await verifyPassword(value, data.account.password)

    if (run !== verificationRun.current) return

    setVerified(matches)

    if (!matches) setError("Contraseña incorrecta.")
  }

  return (
    <>
      <h2>Eliminar cuenta</h2>
      <p className="muted">
        Esta acción eliminará tu cuenta, formularios, viajes y mensajes. Ingresa
        tu contraseña para continuar.
      </p>
      <Field
        label="Contraseña"
        value={pass}
        onChange={(value) => void verify(value)}
        type="password"
        error={error || undefined}
        required
      />
      <Button variant="danger" disabled={!verified} onClick={reset}>
        Eliminar definitivamente
      </Button>
    </>
  )
}

export function Support({
  data,
  update,
  setModal,
  openTaxi,
}: {
  data: Stored
  update: Update
  setModal: (v: ReactNode) => void
  openTaxi: () => void
}) {
  const [query, setQuery] = useState("")

  const passengerFaqs = [
    [
      "¿Cómo se calcula la tarifa?",
      "La tarifa es una estimación local basada en la distancia aproximada y los ajustes que ofrece el prototipo. No consulta el tráfico ni la disponibilidad de taxis en tiempo real. Confirma siempre el precio antes de viajar.",
    ],
    [
      "¿Para qué sirve el PIN?",
      "Confirma que subiste al taxi correcto. Dáselo al conductor solo cuando estés junto al vehículo y listo para iniciar el viaje.",
    ],
    [
      "¿Qué es el Escudo de trayecto?",
      "En este prototipo registra revisiones locales durante el trayecto. No es un centro de monitoreo ni sustituye los servicios de emergencia.",
    ],
    [
      "¿Cómo uso el SOS?",
      "Mantén presionado el botón para crear una alerta local. No envía automáticamente tu ubicación a terceros. Ante una emergencia real, llama al 123.",
    ],
    [
      "¿Cómo cancelo?",
      "Puedes cancelar desde el viaje y seleccionar un motivo. Revisa las condiciones que aparecen en pantalla antes de confirmar.",
    ],
    [
      "¿Cómo pago?",
      "Por ahora, el pago disponible en este prototipo es en efectivo. No hay una pasarela de pagos conectada.",
    ],
    [
      "¿Cómo reporto un objeto perdido?",
      "Abre el viaje en Mis viajes y selecciona Reportar un problema. El reporte queda guardado en este dispositivo y no se envía a un equipo de soporte real.",
    ],
    [
      "¿Cómo protegen mi privacidad?",
      "Los datos de este prototipo se guardan en el navegador de este dispositivo. No uses contraseñas reales ni información sensible: se necesita un servidor seguro para un uso real.",
    ],
  ]

  const driverFaqs = [
    [
      "¿Cómo recibo los cobros?",
      "Confirma el efectivo solo después de recibirlo. Los pagos electrónicos todavía no están conectados.",
    ],
    [
      "¿Cómo verifico el PIN?",
      "Pide los cuatro dígitos antes de iniciar el viaje y no lo marques como verificado si no coincide.",
    ],
    [
      "¿Cómo cancelo una solicitud?",
      "Abre el viaje, elige cancelar y registra el motivo.",
    ],
    [
      "¿Cómo funcionan las calificaciones?",
      "El prototipo guarda la calificación localmente; no se publica en un sistema compartido.",
    ],
    [
      "¿Qué hago si la persona no aparece?",
      "Espera en el punto, intenta comunicarte y cancela con ese motivo si corresponde.",
    ],
    [
      "¿Dónde veo mis ganancias?",
      "La sección Ganancias resume los viajes registrados en este dispositivo.",
    ],
    [
      "¿Cómo reporto un problema?",
      "Usa Enviar un reporte al final de esta pantalla. El envío no llega a un equipo de soporte real en esta versión.",
    ],
    [
      "¿Qué hace el Escudo de trayecto?",
      "Registra comprobaciones y alertas locales durante el viaje. No es un servicio de seguridad conectado.",
    ],
  ]

  const faqs = data.role === "driver" ? driverFaqs : passengerFaqs

  const filtered = faqs.filter(([question, answer]) =>
    `${question} ${answer}`
      .toLocaleLowerCase("es")
      .includes(query.toLocaleLowerCase("es")),
  )

  const showAnswer = () => {
    const normalized = query.trim().toLocaleLowerCase("es")

    const match =
      filtered[0] ||
      faqs.find(([question, answer]) =>
        `${question} ${answer}`.toLocaleLowerCase("es").includes(normalized),
      )

    const direct: [string, string] | undefined = /mapa|ubicaci[oó]n|ruta/.test(
      normalized,
    )
      ? [
          "¿Cómo funciona el mapa?",
          "El mapa carga calles reales desde proveedores externos cuando hay conexión. La ruta depende de un servicio de rutas externo; si no responde, se muestra un aviso y no se inventa una ruta. Solo se reconocen los puntos que están configurados en el prototipo.",
        ]
      : /chat|mensaje|conductor|pasajero/.test(normalized)
        ? [
            "¿Cuándo puedo usar el chat?",
            "El chat se habilita únicamente cuando el prototipo registra un viaje asignado y una persona identificada. Pulsa Enter para enviar y usa Shift + Enter para escribir otra línea. Los mensajes se guardan en este dispositivo; aún no llegan en tiempo real a otro teléfono.",
          ]
        : /cuenta|registro|contrase/.test(normalized)
          ? [
              "¿Cómo gestiono mi cuenta?",
              "Crea una cuenta para el rol que necesitas y usa el correo y la contraseña creados para iniciar sesión. Las cuentas se guardan solo en este navegador y no usan autenticación de servidor; evita contraseñas reales.",
            ]
          : /seguridad|sos|escudo|emergencia/.test(normalized)
            ? [
                "¿Qué hace el Escudo?",
                "El Escudo registra comprobaciones locales durante el trayecto. El SOS no avisa automáticamente a terceros ni a una central; ante una emergencia real llama al 123.",
              ]
            : /pago|nequi|efectivo/.test(normalized)
              ? [
                  "¿Cómo puedo pagar?",
                  "En esta versión el método disponible es efectivo. Los pagos digitales todavía no están conectados.",
                ]
              : undefined

    const result = direct || match

    setModal(
      result ? (
        <>
          <span className="feature-icon small">
            <Icon name="help" />
          </span>
          <p className="section-label">RESPUESTA DE AYUDA</p>
          <h2>{result[0]}</h2>
          <p className="help-answer">{result[1]}</p>
        </>
      ) : (
        <>
          <span className="feature-icon small">
            <Icon name="search" />
          </span>
          <h2>No encontramos esa respuesta</h2>
          <p>
            Prueba con “tarifa”, “PIN”, “chat”, “mapa”, “pago” o “seguridad”, o
            utiliza Pregúntale a Taxi.
          </p>
        </>
      ),
    )
  }

  return (
    <section className="support-screen">
      <Header title="Ayuda y soporte" />
      <div className="page">
        <div className="support-current" aria-current="page">
          <Icon name="help" />
          <span>
            <b>Estás en Ayuda y soporte</b>
            <small>Respuestas rápidas y atención al usuario</small>
          </span>
        </div>
        <button className="taxi-support" onClick={openTaxi}>
          <span className="feature-icon small">
            <Icon name="message" />
          </span>
          <span>
            <b>Pregúntale a Taxi</b>
            <small>Consulta dudas sobre viajes, cuentas y seguridad</small>
          </span>
          <Icon name="chevron" />
        </button>
        <label className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                showAnswer()
              }
            }}
            placeholder="Busca o pregunta algo y pulsa Enter"
          />
        </label>
        <Button
          variant="secondary"
          onClick={showAnswer}
          disabled={!query.trim()}
        >
          Consultar respuesta
        </Button>
        <p className="section-label">PREGUNTAS FRECUENTES</p>
        {filtered.length ? (
          <div className="faq-list">
            {filtered.map(([question, answer]) => (
              <button
                key={question}
                onClick={() =>
                  setModal(
                    <>
                      <span className="feature-icon small">
                        <Icon name="help" />
                      </span>
                      <p className="section-label">RESPUESTA DE AYUDA</p>
                      <h2>{question}</h2>
                      <p className="help-answer">{answer}</p>
                    </>,
                  )
                }
              >
                <span>
                  {question}
                  <i>↗</i>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <Empty
              icon="search"
              title="Sin resultados"
              text="No encontramos preguntas con ese término."
            />
            <Button variant="secondary" onClick={() => setQuery("")}>
              Ver todas las preguntas
            </Button>
          </>
        )}
        <div className="support-card">
          <span className="feature-icon small">
            <Icon name="phone" />
          </span>
          <span>
            <b>¿Necesitas ayuda urgente?</b>
            <small>Si estás en peligro, llama ya.</small>
          </span>
          <a
            className="button secondary"
            href="tel:123"
            onClick={() => appNotice("Si estás en peligro, llama ya")}
          >
            Llamar al 123
          </a>
        </div>
        <Button
          variant="secondary"
          onClick={() => setModal(<Report data={data} update={update} />)}
        >
          Enviar un reporte
        </Button>
      </div>
    </section>
  )
}

export function Notifications({
  data,
  update,
  go,
}: {
  data: Stored
  update: Update
  go: (s: Screen) => void
}) {
  const unread = data.notificationItems.filter((item) => !item.read).length

  const open = (item: NotificationItem) => {
    update({
      notificationItems: data.notificationItems.map((entry) =>
        entry.id === item.id ? { ...entry, read: true } : entry,
      ),
    })
    go(item.target)
  }

  return (
    <section>
      <Header
        title="Notificaciones"
        action={
          unread ? (
            <button
              className="demo-link"
              onClick={() =>
                update({
                  notificationItems: data.notificationItems.map((item) => ({
                    ...item,
                    read: true,
                  })),
                })
              }
            >
              Leer todas
            </button>
          ) : undefined
        }
      />
      <div className="page">
        {data.notificationItems.length === 0 ? (
          <Empty
            icon="bell"
            title="Todo al día"
            text="Tus nuevas notificaciones aparecerán aquí."
          />
        ) : (
          <div className="notification-list">
            {data.notificationItems.map((item) => (
              <button
                className={item.read ? "read" : ""}
                onClick={() => open(item)}
                key={item.id}
              >
                {!item.read && <i />}
                <span>
                  <b>{item.title}</b>
                  <p>{item.text}</p>
                  <small>{item.time}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
