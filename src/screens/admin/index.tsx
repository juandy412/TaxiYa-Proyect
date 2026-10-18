import { type ReactNode, useState } from "react";
import type { DriverDocument, Stored, Update } from "../../lib/types";
import { appNotice, initials, newNotification } from "../../lib/format";
import { Button, Empty, Field, Header, Icon } from "../../components";
import { LogoutButton } from "../../components/LogoutButton";

type AdminSection = "Resumen" | "Conductores" | "Tarifas" | "Reportes" | "Viajes" | "Seguridad";

export function Admin({ data, update, go, setModal }: { data: Stored; update: Update; go: (screen: "welcome") => void; setModal: (content: ReactNode) => void }) {
  const [section, setSection] = useState<AdminSection>("Resumen");
  const [selected, setSelected] = useState("");
  const [response, setResponse] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const complaint = data.complaints.find((item) => item.id === selected);
  const openComplaints = data.complaints.filter((item) => item.status === "Abierta");
  const activeTrips = ["assigned", "enroute", "active"].includes(data.tripStatus) ? 1 : 0;
  const driverRegistered = Boolean(data.driverAccount.email && data.driverAccount.name);
  const driverPhoto = data.driverDocuments.find(
    (document) => document.name === "Foto del conductor",
  )?.dataUrl;
  const previewDocument = (document: DriverDocument) => {
    if (document.dataUrl) openDocumentPreview(document.name, document.dataUrl);
  };
  const openDocumentPreview = (title: string, dataUrl: string) =>
    setModal(
      <div className="admin-image-preview">
        <h2>{title}</h2>
        <img src={dataUrl} alt={title} />
        <Button variant="secondary" onClick={() => setModal(null)}>
          Cerrar vista previa
        </Button>
      </div>,
    );

  const changeFare = (patch: Partial<Stored>) => {
    if (patch.fareZoneMin !== undefined && patch.fareZoneMin <= 0) { appNotice("El mínimo debe ser mayor que cero."); return; }
    if (patch.fareZoneMax !== undefined && patch.fareZoneMax < data.fareZoneMin) { appNotice("El máximo no puede ser menor que el mínimo."); return; }
    const notification = newNotification("Rango de tarifa actualizado", "El administrador modificó el rango de tarifa local.", "fare");
    update((current) => ({ ...patch, notificationItems: [notification, ...current.notificationItems] }));
  };

  const closeComplaint = () => {
    if (!complaint || !response.trim()) { appNotice("Escribe una respuesta antes de cerrar el reporte."); return; }
    const notification = newNotification("Respuesta a tu reporte", response.trim(), "support");
    update((current) => ({ complaints: current.complaints.map((item) => item.id === complaint.id ? { ...item, status: "Cerrada", response: response.trim() } : item), notificationItems: [notification, ...current.notificationItems] }));
    setSelected(""); setResponse(""); appNotice("Reporte cerrado y respuesta guardada.");
  };

  const verify = (status: "Aprobado" | "Rechazado") => {
    const reason = status === "Rechazado" ? rejectionReason.trim() : "Documentación revisada";
    if (!driverRegistered) { appNotice("Todavía no hay un conductor registrado."); return; }
    if (status === "Rechazado" && !reason) { appNotice("Indica el motivo del rechazo."); return; }
    const notification = newNotification(`Registro de conductor ${status.toLowerCase()}`, status === "Aprobado" ? "Tu cuenta puede ponerse en línea y recibir solicitudes." : `Motivo: ${reason}`, "driver-home");
    update((current) => ({ driverVerification: status, driverRejectionReason: status === "Rechazado" ? reason : "", online: false, notificationItems: [notification, ...current.notificationItems] }));
    setRejectionReason(""); appNotice(`Conductor ${status.toLowerCase()}.`);
  };

  const sections: { label: AdminSection; icon: string; detail: string }[] = [
    { label: "Resumen", icon: "home", detail: "Indicadores generales" },
    { label: "Conductores", icon: "car", detail: "Registro y documentos" },
    { label: "Tarifas", icon: "wallet", detail: "Rangos de referencia" },
    { label: "Reportes", icon: "message", detail: "Atención de incidencias" },
    { label: "Viajes", icon: "map", detail: "Historial de trayectos" },
    { label: "Seguridad", icon: "shield", detail: "Alertas y controles" },
  ];

  return <section className="admin-shell">
    <Header title="Administración" action={<LogoutButton appearance="header" update={update} setModal={setModal} go={() => go("welcome")} />} />
    <div className="page admin-page">
      <div className="admin-welcome"><span className="admin-mark"><Icon name="shield" size={25} /></span><div><p className="eyebrow">TAXIYA OCAÑA</p><h1>Centro de control</h1><p className="muted">Gestiona las operaciones desde secciones independientes.</p></div></div>
      <nav className="admin-tabs" aria-label="Secciones de administración">{sections.map((item) => <button key={item.label} className={section === item.label ? "active" : ""} aria-current={section === item.label ? "page" : undefined} onClick={() => setSection(item.label)}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}</nav>

      {section === "Resumen" && <div className="admin-section">
        <div className="admin-section-heading"><div><p className="section-label">RESUMEN OPERATIVO</p><h2>Estado del servicio</h2></div><span className="admin-status"><i className={data.isConnected ? "ok" : "alert"} />{data.isConnected ? "Sistema disponible" : "Sin conexión"}</span></div>
        <div className="admin-hero">
          <span><small>VIAJES ACTIVOS</small><strong>{activeTrips}</strong><small>En esta sesión local</small></span>
          <span><small>CONDUCTOR EN LÍNEA</small><strong>{driverRegistered && data.online && data.driverVerification === "Aprobado" ? 1 : 0}</strong><small>{driverRegistered ? data.driverVerification : "Sin registro"}</small></span>
          <span className={data.sosActive ? "danger" : ""}><small>ALERTAS ACTIVAS</small><strong>{data.sosActive ? 1 : 0}</strong><small>Requieren revisión</small></span>
          <span><small>REPORTES ABIERTOS</small><strong>{openComplaints.length}</strong><small>Por atender</small></span>
        </div>
        <div className="admin-shortcuts"><h2>Accesos rápidos</h2>{sections.slice(1).map((item) => <button key={item.label} onClick={() => setSection(item.label)}><span className="admin-shortcut-icon"><Icon name={item.icon} /></span><span><b>{item.label}</b><small>{item.detail}</small></span><Icon name="chevron" /></button>)}</div>
        {!driverRegistered && <div className="admin-note"><Icon name="info" /><span><b>No hay conductores registrados</b><small>Cuando una persona complete su registro, podrás revisar sus documentos en Conductores.</small></span></div>}
      </div>}

      {section === "Conductores" && <div className="admin-section">
        <p className="section-label">VALIDACIÓN DE CUENTAS</p><h2>Registro de conductores</h2>
        {!driverRegistered ? <Empty icon="car" title="Sin solicitudes de registro" text="Los registros de conductores aparecerán aquí cuando se envíen desde la app." /> : <div className="admin-card">
          <div className="admin-driver-card">
            {driverPhoto ? (
              <button
                type="button"
                className="admin-driver-photo-thumb"
                aria-label="Ampliar foto del conductor"
                onClick={() => {
                  openDocumentPreview("Foto del conductor", driverPhoto)
                }}
              >
                <img src={driverPhoto} alt="" />
              </button>
            ) : <span className="driver-photo">{initials(data.driverAccount.name)}</span>}
            <span><b>{data.driverAccount.name}</b><small>{data.driverAccount.email}</small><small>{data.vehicle.make || "Vehículo sin completar"} {data.vehicle.plate ? `· ${data.vehicle.plate}` : ""}</small></span><span className={`status-pill ${data.driverVerification === "Aprobado" ? "approved" : data.driverVerification === "Rechazado" ? "rejected" : "pending"}`}>{data.driverVerification}</span></div>
          <div className="document-list">{(data.driverDocuments.length ? data.driverDocuments : [{ name: "Documentos no enviados", uploaded: false }]).map((document) => <span key={document.name}><Icon name={document.uploaded ? "check" : "help"} /><b>{document.name}</b><small>{document.uploaded ? "Recibido" : "Pendiente"}</small>{document.dataUrl && <button type="button" className="admin-document-thumb" aria-label={`Ampliar ${document.name}`} onClick={() => previewDocument(document)}><img src={document.dataUrl} alt="" /></button>}</span>)}</div>
          {data.driverVerification === "Pendiente" || data.driverVerification === "Rechazado" ? <><Field label="Motivo del rechazo (si corresponde)" value={rejectionReason} onChange={setRejectionReason} placeholder="Explica qué debe corregirse" /><div className="action-row two"><Button variant="secondary" onClick={() => verify("Rechazado")} disabled={!rejectionReason.trim()}>Solicitar correcciones</Button><Button onClick={() => verify("Aprobado")}>Aprobar conductor</Button></div></> : <p className="info-status">Cuenta revisada. Puedes cambiar el estado si se actualizan los documentos.</p>}
        </div>}
        <div className="admin-note"><Icon name="shield" /><span><b>Revisión responsable</b><small>Comprueba la vigencia de licencia, SOAT y tarjeta de propiedad antes de aprobar.</small></span></div>
      </div>}

      {section === "Tarifas" && <div className="admin-section">
        <p className="section-label">CONFIGURACIÓN DE PRECIOS</p><h2>Rangos de tarifa de referencia</h2><p className="muted">Estos rangos se usan para orientar la oferta, no reemplazan la tarifa oficial ni consultan tráfico en tiempo real.</p>
        <div className="admin-card tariff-card"><div className="tariff-header"><span className="admin-shortcut-icon"><Icon name="map" /></span><span><b>Centro de Ocaña</b><small>Zona de referencia</small></span></div><Field label="Tarifa mínima (COP)" value={String(data.fareZoneMin)} onChange={(value) => update({ fareZoneMin: Number(value) })} type="number" /><Field label="Tarifa máxima (COP)" value={String(data.fareZoneMax)} onChange={(value) => update({ fareZoneMax: Number(value) })} type="number" /><Button onClick={() => { if (data.fareZoneMin <= 0 || data.fareZoneMax < data.fareZoneMin) { appNotice("Revisa los valores: el mínimo debe ser positivo y no superar el máximo."); return; } changeFare({ fareZoneMin: data.fareZoneMin, fareZoneMax: data.fareZoneMax }); }}>Guardar rangos</Button><p className="note">Valores en pesos colombianos. Para producción se deben validar con fuentes oficiales locales.</p></div>
      </div>}

      {section === "Reportes" && <div className="admin-section">
        <p className="section-label">ATENCIÓN A USUARIOS</p><h2>Reportes e incidencias</h2>
        {!openComplaints.length ? <Empty icon="message" title="No hay reportes abiertos" text="Los reportes enviados por usuarios aparecerán en esta sección." /> : openComplaints.map((item) => <button className={`admin-card complaint-card ${selected === item.id ? "selected" : ""}`} key={item.id} onClick={() => { setSelected(item.id); setResponse(""); }}><b>{item.reason}</b><small>{item.description}</small><small>Estado: {item.status}</small></button>)}
        {complaint && <div className="admin-card report-response"><h2>Responder reporte</h2><p>{complaint.description}</p><label className="field"><span>Respuesta para la persona usuaria</span><textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Describe la revisión o solución aplicada" /></label><Button disabled={!response.trim()} onClick={closeComplaint}>Guardar respuesta y cerrar</Button></div>}
        {data.complaints.some((item) => item.status === "Cerrada") && <div><h2>Reportes cerrados</h2>{data.complaints.filter((item) => item.status === "Cerrada").map((item) => <div className="admin-card" key={item.id}><b>{item.reason}</b><small>{item.response || "Sin respuesta registrada"}</small><span className="status-pill approved">Cerrado</span></div>)}</div>}
      </div>}

      {section === "Viajes" && <div className="admin-section">
        <p className="section-label">HISTORIAL DE TRAYECTOS</p><h2>Trazabilidad de viajes</h2>
        {data.tripHistory.length ? data.tripHistory.map((trip) => <div className="admin-card trace" key={trip.id}><span className="trace-top"><b>{trip.origin} → {trip.destination}</b><span className={`status-pill ${trip.status === "Completado" ? "approved" : "pending"}`}>{trip.status}</span></span><small>{trip.date} · {trip.plate || "Placa no registrada"}</small><small>Conductor: {trip.driver || "Sin asignar"} · Pasajero: {trip.passenger}</small><small>Escudo: {trip.shieldChecks} verificaciones</small></div>) : <Empty icon="map" title="Sin viajes registrados" text="Los trayectos completados o cancelados aparecerán aquí." />}
      </div>}

      {section === "Seguridad" && <div className="admin-section">
        <p className="section-label">MONITOREO DE SEGURIDAD</p><h2>Alertas y controles</h2>
        <div className={`security-status-card ${data.sosActive ? "is-alert" : ""}`}><span className="admin-shortcut-icon"><Icon name="shield" /></span><div><b>{data.sosActive ? "Alerta SOS activa" : "No hay alertas activas"}</b><small>{data.sosActive ? `Última ubicación registrada: ${data.origin}. Es una alerta local del prototipo.` : "El sistema no registra una alerta SOS activa en este dispositivo."}</small></div></div>
        {data.sosActive && <Button variant="danger" onClick={() => { update({ sosActive: false, shieldChecks: data.shieldChecks + 1 }); appNotice("Alerta local marcada como atendida."); }}>Marcar alerta como atendida</Button>}
        <div className="admin-card"><h2>Controles de la aplicación</h2><div className="admin-control-row"><span><b>Protección de trayecto</b><small>{data.automaticShield ? "Activada para esta sesión" : "Desactivada"}</small></span><span className={`status-pill ${data.automaticShield ? "approved" : "pending"}`}>{data.automaticShield ? "Activa" : "Inactiva"}</span></div><div className="admin-control-row"><span><b>Compartir ubicación</b><small>{data.shareLocation ? "Disponible en el dispositivo" : "Desactivado por el usuario"}</small></span><span className={`status-pill ${data.shareLocation ? "approved" : "pending"}`}>{data.shareLocation ? "Activado" : "Desactivado"}</span></div></div>
        <p className="prototype-note">Esta vista muestra únicamente la información local del prototipo. No sustituye un centro de monitoreo conectado a un servidor.</p>
      </div>}
    </div>
  </section>;
}
