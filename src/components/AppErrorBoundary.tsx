import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    window.dispatchEvent(
      new CustomEvent("taxiya-notice", {
        detail: "Ocurrió un problema al mostrar esta pantalla. Recarga para volver a intentarlo.",
      }),
    )
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="page app-error-screen" role="alert">
          <span className="feature-icon danger" aria-hidden="true">!</span>
          <h1>No pudimos abrir esta pantalla</h1>
          <p>Vuelve a cargar la aplicación. Tus datos guardados no se borrarán.</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Recargar TaxiYa
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
