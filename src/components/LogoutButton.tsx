import type { ReactNode } from "react"

import type { Update } from "../lib/types"
import { Button, Icon } from "./index"

export function LogoutButton({
  update,
  setModal,
  go,
  appearance = "menu",
}: {
  update: Update
  setModal: (content: ReactNode) => void
  go: () => void
  appearance?: "menu" | "header"
}) {
  const logout = () => {
    update({ loggedIn: false, online: false, onlineStartedAt: null })
    setModal(null)
    go()
  }

  return (
    <>
      <button
        className={appearance === "header" ? "demo-link" : "menu-row logout-menu-row"}
        type="button"
        onClick={() =>
          setModal(
            <div className="logout-confirm">
              <span className="feature-icon small">
                <Icon name="logout" />
              </span>
              <h2>¿Cerrar sesión?</h2>
              <p className="muted">
                Tendrás que ingresar de nuevo para usar TaxiYa.
              </p>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Seguir en TaxiYa
              </Button>
              <Button variant="danger" onClick={logout}>
                Cerrar sesión
              </Button>
            </div>,
          )
        }
      >
        {appearance === "menu" && <Icon name="logout" />}
        {appearance === "header" ? (
          "Cerrar sesión"
        ) : (
          <>
            <span><b>Cerrar sesión</b></span>
            <Icon name="chevron" />
          </>
        )}
      </button>
    </>
  )
}
