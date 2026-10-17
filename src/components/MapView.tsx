import { useContext, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { drivers } from "../data/drivers";
import { farePlaces, OCAÑA_CENTER } from "../data/places";
import { translate } from "../lib/i18n";
import { TaxiLauncherContext } from "./index";

type MapViewProps = {
  origin?: string;
  destination?: string;
  showDrivers?: boolean;
  interactive?: boolean;
  onPick?: (place: string) => void;
  onDriverPick?: (driver: (typeof drivers)[number]) => void;
  className?: string;
};

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const CARTO_TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  options: {
    subdomains: "abcd",
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors © CARTO",
  },
} as const;

const markerIcon = (kind: "origin" | "destination" | "taxi") =>
  L.divIcon({
    className: "leaflet-custom-marker",
    html: `<span class="leaflet-marker-dot ${kind}" aria-hidden="true"></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

export function MapView({
  origin = "Parque 29 de Mayo",
  destination,
  showDrivers = false,
  interactive = false,
  onPick,
  onDriverPick,
  className = "",
}: MapViewProps) {
  const language = useContext(TaxiLauncherContext).language;
  const elementRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  const onDriverPickRef = useRef(onDriverPick);
  // Los callbacks suelen crearse inline en las pantallas. Mantenerlos en refs evita destruir y
  // reconstruir el mapa en cada render, lo que provocaba destellos y mosaicos que parecían vacíos.
  onPickRef.current = onPick;
  onDriverPickRef.current = onDriverPick;

  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [dark, setDark] = useState(() => document.querySelector("main")?.classList.contains("dark-mode") ?? false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    setDark(main.classList.contains("dark-mode"));
    const observer = new MutationObserver(() => setDark(main.classList.contains("dark-mode")));
    observer.observe(main, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;
    const routeControllers: AbortController[] = [];
    const map = L.map(elementRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView(OCAÑA_CENTER, 14);

    setTilesLoaded(false);
    setTilesUnavailable(false);
    setRouteUnavailable(false);
    setLocationUnavailable(false);

    const osmOptions = { maxZoom: 19, attribution: "© OpenStreetMap contributors" };
    let activeTiles: L.TileLayer = L.tileLayer(dark ? CARTO_TILES.dark : CARTO_TILES.light, CARTO_TILES.options);
    let cartoTileErrors = 0;
    let osmTileErrors = 0;
    let switchedToOsm = false;

    const onTilesLoaded = () => {
      if (navigator.onLine !== false) {
        setTilesLoaded(true);
        setOffline(false);
        setTilesUnavailable(false);
      }
    };
    const onOsmTileError = () => {
      osmTileErrors += 1;
      // Si los proveedores no responden, se informa al usuario; nunca se dibuja un mapa ficticio.
      if (osmTileErrors >= 3) {
        setTilesLoaded(false);
        setTilesUnavailable(true);
      }
    };
    const onCartoTileError = () => {
      cartoTileErrors += 1;
      if (cartoTileErrors < 3 || switchedToOsm) return;
      switchedToOsm = true;
      setTilesLoaded(false);
      map.removeLayer(activeTiles);
      activeTiles = L.tileLayer(OSM_TILES, osmOptions);
      activeTiles.on("load", onTilesLoaded);
      activeTiles.on("tileerror", onOsmTileError);
      activeTiles.addTo(map);
    };

    activeTiles.on("load", onTilesLoaded);
    activeTiles.on("tileerror", onCartoTileError);
    activeTiles.addTo(map);

    const onOffline = () => { setOffline(true); setTilesLoaded(false); };
    const onOnline = () => {
      setOffline(false);
      setTilesLoaded(false);
      setTilesUnavailable(false);
      activeTiles.redraw();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const start = farePlaces[origin];
    const end = destination ? farePlaces[destination] : undefined;
    setLocationUnavailable(!start || Boolean(destination && !end));

    if (start) {
      L.marker([start.lat, start.lng], {
        icon: markerIcon("origin"),
        title: `Origen: ${origin}`,
        keyboard: true,
      }).addTo(map).getElement()?.setAttribute("aria-label", `Origen: ${origin}`);
    }

    if (end && start) {
      L.marker([end.lat, end.lng], {
        icon: markerIcon("destination"),
        title: `Destino: ${destination}`,
        keyboard: true,
      }).addTo(map).getElement()?.setAttribute("aria-label", `Destino: ${destination}`);

      const routeController = new AbortController();
      routeControllers.push(routeController);
      fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`, { signal: routeController.signal })
        .then((response) => {
          if (!response.ok) throw new Error("route unavailable");
          return response.json();
        })
        .then((result) => {
          if (routeController.signal.aborted) return;
          const coordinates = result.routes?.[0]?.geometry?.coordinates;
          if (!Array.isArray(coordinates) || coordinates.length < 2) {
            setRouteUnavailable(true);
            return;
          }
          const points: [number, number][] = coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          L.polyline(points, {
            color: dark ? "#f0bd79" : "#c16c4d",
            weight: 5,
            opacity: .94,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
          map.fitBounds(L.latLngBounds(points), { padding: [34, 34], animate: false });
        })
        .catch(() => {
          if (!routeController.signal.aborted) setRouteUnavailable(true);
        });
      map.fitBounds([[start.lat, start.lng], [end.lat, end.lng]], { padding: [34, 34], animate: false });
    } else if (start) {
      map.setView([start.lat, start.lng], 15);
    }

    if (showDrivers) {
      drivers.forEach((driver) => {
        const marker = L.marker([driver.lat, driver.lng], {
          icon: markerIcon("taxi"),
          title: `Taxi de ${driver.name}`,
          keyboard: true,
        }).addTo(map);
        marker.getElement()?.setAttribute("aria-label", `Taxi de ${driver.name}`);
        if (onDriverPickRef.current) marker.on("click", () => onDriverPickRef.current?.(driver));
      });
    }

    if (interactive) {
      map.on("click", (event) => {
        const nearest = Object.values(farePlaces).sort(
          (a, b) => event.latlng.distanceTo([a.lat, a.lng]) - event.latlng.distanceTo([b.lat, b.lng]),
        )[0];
        onPickRef.current?.(nearest.name);
      });
    }

    const resize = window.setTimeout(() => map.invalidateSize(), 80);
    return () => {
      window.clearTimeout(resize);
      routeControllers.forEach((controller) => controller.abort());
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      map.remove();
    };
  }, [dark, destination, interactive, origin, showDrivers]);

  const mapUnavailable = offline || tilesUnavailable || !tilesLoaded;
  const mapMessage = offline
    ? translate("El mapa de calles necesita conexión a Internet.", language)
    : tilesUnavailable
    ? translate("El proveedor de calles no respondió.", language)
    : translate("Cargando las calles reales de la zona…", language);
  const mapWarning = locationUnavailable
    ? translate("No encontramos uno de los puntos seleccionados en el mapa.", language)
    : routeUnavailable && destination
    ? translate("No se pudo calcular la ruta por calles. Puedes volver a intentarlo más tarde.", language)
      : "";

  return <div className={`map-view ${mapUnavailable ? "tiles-offline map-pending" : ""}`} aria-label={translate("Mapa de calles de Ocaña", language)}>
    <div ref={elementRef} className={`leaflet-map ${className}`} aria-hidden={mapUnavailable} />
    {mapUnavailable && <div className="map-view-fallback" role="status" aria-live="polite">
      <span className="map-fallback-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></svg></span>
      <b>{translate(offline || tilesUnavailable ? "Vista de calles no disponible" : "Preparando mapa de calles", language)}</b>
      <span>{mapMessage}</span>
      <small>{origin}{destination ? ` → ${destination}` : ""}</small>
    </div>}
    {mapWarning && <span className="map-offline-note" role="status">{mapWarning}</span>}
  </div>;
}
