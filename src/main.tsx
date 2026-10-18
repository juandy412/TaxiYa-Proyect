import React from "react"

import ReactDOM from "react-dom/client"

import App from "./App"

import "./index.css"

import { migrateStoredPasswords } from "./lib/password"

const rootElement = document.getElementById("root")

if (!rootElement)
  throw new Error("No se encontró el contenedor de la aplicación.")

const root = ReactDOM.createRoot(rootElement)

const renderApp = () =>
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )

void migrateStoredPasswords()
  .then(renderApp)
  .catch(() => {
    root.render(
      <main role="alert">
        <p>
          No se pudo proteger la información guardada. Abre TaxiYa desde su
          enlace seguro que empieza por https:// y vuelve a intentarlo.
        </p>
      </main>,
    )
  })
