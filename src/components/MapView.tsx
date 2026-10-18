import { useContext, useEffect, useRef, useState } from "react"

import L from "leaflet"

import "leaflet/dist/leaflet.css"

import { drivers } from "../data/drivers"

import { farePlaces, OCAÑA_CENTER, placesData } from "../data/places"

import { translate } from "../lib/i18n"

import { TaxiLauncherContext } from "./index"

type MapViewProps = {
  origin?: string

  destination?: string

  showDrivers?: boolean

  showPlaces?: boolean

  interactive?: boolean

  attributionAbovePanel?: boolean

  onPick?: (place: string) => void

  onDriverPick?: (driver: typeof drivers[number]) => void

  onControlsReady?: (controls: MapViewControls | null) => void

  originCoordinates?: { lat: number; lng: number } | null

  animateTaxi?: boolean

  taxiEtaMinutes?: number

  onTaxiEtaChange?: (minutes: number) => void

  className?: string
}

export type MapViewControls = {
  zoomIn: () => void
  zoomOut: () => void
  showLocation: (latitude: number, longitude: number) => void
}

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const markerIcon = (kind: "origin" | "destination" | "taxi" | "place") =>
  L.divIcon({
    className: "leaflet-custom-marker",

    html: `<span class="leaflet-marker-dot ${kind}" aria-hidden="true"></span>`,

    iconSize: [34, 34],

    iconAnchor: [17, 17],
  })

export function MapView({
  origin = "Parque 29 de Mayo",

  destination,

  showDrivers = false,

  showPlaces = false,

  interactive = false,

  attributionAbovePanel = false,

  onPick,

  onDriverPick,

  onControlsReady,

  originCoordinates,

  animateTaxi = false,

  taxiEtaMinutes = 1,

  onTaxiEtaChange,

  className = "",
}: MapViewProps) {
  const language = useContext(TaxiLauncherContext).language

  const elementRef = useRef<HTMLDivElement>(null)

  const mapRef = useRef<L.Map | null>(null)

  const locationMarkerRef = useRef<L.CircleMarker | null>(null)

  const savedViewRef = useRef<{
    center: L.LatLngExpression

    zoom: number
  } | null>(null)

  const onPickRef = useRef(onPick)

  const onDriverPickRef = useRef(onDriverPick)

  const onControlsReadyRef = useRef(onControlsReady)

  const onTaxiEtaChangeRef = useRef(onTaxiEtaChange)

  // Los callbacks suelen crearse inline en las pantallas. Mantenerlos en refs evita destruir y

  // reconstruir el mapa en cada render, lo que provocaba destellos y mosaicos que parecían vacíos.

  onPickRef.current = onPick

  onDriverPickRef.current = onDriverPick

  onControlsReadyRef.current = onControlsReady

  onTaxiEtaChangeRef.current = onTaxiEtaChange

  const [offline, setOffline] = useState(() => navigator.onLine === false)

  const [tilesLoaded, setTilesLoaded] = useState(false)

  const [tilesUnavailable, setTilesUnavailable] = useState(false)

  const [routeUnavailable, setRouteUnavailable] = useState(false)

  const [locationUnavailable, setLocationUnavailable] = useState(false)

  const [dark, setDark] = useState(
    () =>
      document.querySelector("main")?.classList.contains("dark-mode") ?? false,
  )

  useEffect(() => {
    const main = document.querySelector("main")

    if (!main) return

    setDark(main.classList.contains("dark-mode"))

    const observer = new MutationObserver(() =>
      setDark(main.classList.contains("dark-mode")),
    )

    observer.observe(main, { attributes: true, attributeFilter: ["class"] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!elementRef.current) return

    const routeControllers: AbortController[] = []
    let taxiAnimationTimer = 0

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
    }).setView(
      savedViewRef.current?.center ?? OCAÑA_CENTER,

      savedViewRef.current?.zoom ?? 14,
    )

    mapRef.current = map

    onControlsReadyRef.current?.({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      showLocation: (latitude, longitude) => {
        const point: L.LatLngExpression = [latitude, longitude]
        map.setView(point, 16)

        if (locationMarkerRef.current) {
          locationMarkerRef.current.setLatLng(point)
        } else {
          locationMarkerRef.current = L.circleMarker(point, {
            radius: 9,
            color: "#ffffff",
            weight: 3,
            fillColor: "#2768d8",
            fillOpacity: 1,
          }).addTo(map)
        }

        locationMarkerRef.current
          .bindPopup(translate("Tu ubicación en este dispositivo.", language))
          .openPopup()
      },
    })

    setTilesLoaded(false)

    setTilesUnavailable(false)

    setRouteUnavailable(false)

    setLocationUnavailable(false)

    const tileOptions = {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    };
    const activeTiles = L.tileLayer(OSM_TILES, tileOptions);
    let tileErrors = 0;

    const onTilesLoaded = () => {
      if (navigator.onLine !== false) {
        setTilesLoaded(true)

        setOffline(false)

        setTilesUnavailable(false)
      }
    }

    const onTileError = () => {
      tileErrors += 1;
      if (tileErrors >= 3) {
        setTilesLoaded(false);
        setTilesUnavailable(true);
      }
    };

    activeTiles.on("load", onTilesLoaded);
    activeTiles.on("tileerror", onTileError);

    activeTiles.addTo(map)

    const onOffline = () => {
      setOffline(true)
      setTilesLoaded(false)
    }

    const onOnline = () => {
      setOffline(false)

      setTilesLoaded(false)

      setTilesUnavailable(false)

      activeTiles.redraw()
    }

    window.addEventListener("offline", onOffline)

    window.addEventListener("online", onOnline)

    const start = originCoordinates || farePlaces[origin]

    const end = destination ? farePlaces[destination] : undefined

    setLocationUnavailable(!start || Boolean(destination && !end))

    if (start && !showPlaces) {
      L.marker([start.lat, start.lng], {
        icon: markerIcon("origin"),

        title: `Origen: ${origin}`,

        interactive: false,

        keyboard: false,
      })
        .addTo(map)
        .getElement()
        ?.setAttribute("aria-label", `Origen: ${origin}`)
    }

    if (end && start) {
      L.marker([end.lat, end.lng], {
        icon: markerIcon("destination"),

        title: `Destino: ${destination}`,

        interactive: false,

        keyboard: false,
      })
        .addTo(map)
        .getElement()
        ?.setAttribute("aria-label", `Destino: ${destination}`)

      const routeController = new AbortController()

      routeControllers.push(routeController)

      fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
        { signal: routeController.signal },
      )

        .then((response) => {
          if (!response.ok) throw new Error("route unavailable")

          return response.json()
        })

        .then((result) => {
          if (routeController.signal.aborted) return

          const coordinates = result.routes?.[0]?.geometry?.coordinates

          if (!Array.isArray(coordinates) || coordinates.length < 2) {
            setRouteUnavailable(true)

            return
          }

          const points: [number, number][] = coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng],
          )

          L.polyline(points, {
            color: dark ? "#f0bd79" : "#c16c4d",

            weight: 5,

            opacity: 0.94,

            lineCap: "round",

            lineJoin: "round",
          }).addTo(map)

          map.fitBounds(L.latLngBounds(points), {
            padding: [34, 34],
            animate: false,
          })

          if (animateTaxi) {
            const taxi = L.marker(points[0], {
              icon: markerIcon("taxi"),
              title: "Marcador de taxi animado para demostración",
              interactive: false,
              keyboard: false,
            }).addTo(map)
            let progress = 0
            onTaxiEtaChangeRef.current?.(Math.max(1, taxiEtaMinutes))
            taxiAnimationTimer = window.setInterval(() => {
              progress = Math.min(1, progress + 1 / 30)
              const pointIndex = Math.min(
                points.length - 1,
                Math.floor(progress * (points.length - 1)),
              )
              taxi.setLatLng(points[pointIndex])
              onTaxiEtaChangeRef.current?.(
                Math.max(0, Math.ceil(taxiEtaMinutes * (1 - progress))),
              )
              if (progress >= 1) window.clearInterval(taxiAnimationTimer)
            }, 2_500)
          }
        })
        .catch(() => {
          if (routeController.signal.aborted) return
          setRouteUnavailable(true)
          if (animateTaxi && start && end) {
            const taxi = L.marker([start.lat, start.lng], {
              icon: markerIcon("taxi"),
              title: "Marcador de taxi animado para demostración",
              interactive: false,
              keyboard: false,
            }).addTo(map)
            let progress = 0
            taxiAnimationTimer = window.setInterval(() => {
              progress = Math.min(1, progress + 1 / 30)
              taxi.setLatLng([
                start.lat + (end.lat - start.lat) * progress,
                start.lng + (end.lng - start.lng) * progress,
              ])
              onTaxiEtaChangeRef.current?.(
                Math.max(0, Math.ceil(taxiEtaMinutes * (1 - progress))),
              )
              if (progress >= 1) window.clearInterval(taxiAnimationTimer)
            }, 2_500)
          }
        })

      map.fitBounds(
        [
          [start.lat, start.lng],
          [end.lat, end.lng],
        ],
        { padding: [34, 34], animate: false },
      )
    } else if (start && !savedViewRef.current) {
      map.setView([start.lat, start.lng], 15)
    }

    if (showDrivers) {
      drivers.forEach((driver) => {
        const marker = L.marker([driver.lat, driver.lng], {
          icon: markerIcon("taxi"),

          title: `Taxi de ${driver.name}`,

          interactive: Boolean(onDriverPickRef.current),

          keyboard: Boolean(onDriverPickRef.current),
        }).addTo(map)

        marker
          .getElement()
          ?.setAttribute("aria-label", `Taxi de ${driver.name}`)

        if (onDriverPickRef.current)
          marker.on("click", () => onDriverPickRef.current?.(driver))
      })
    }

    if (showPlaces) {
      if (!savedViewRef.current) {
        map.fitBounds(
          L.latLngBounds(
            placesData.map((place) => L.latLng(place.lat, place.lng)),
          ),
          { padding: [36, 36], maxZoom: 14, animate: false },
        )
      }

      const placeLayer = L.layerGroup().addTo(map)
      const renderPlaces = () => {
        placeLayer.clearLayers()
        const mapSize = map.getSize()
        const entries = placesData.map((place) => ({
          place,
          point: map.latLngToContainerPoint([place.lat, place.lng]),
        })).filter(
          ({ point }) =>
            point.x >= 22 &&
            point.y >= 22 &&
            point.x <= mapSize.x - 22 &&
            point.y <= mapSize.y - 22,
        )
        const groups: (typeof entries)[] = []

        entries.forEach((entry) => {
          const group = groups.find((items) =>
            items.some((item) => item.point.distanceTo(entry.point) < 42),
          )
          if (group) group.push(entry)
          else groups.push([entry])
        })

        const centerOf = (items: typeof entries) => {
          const latitude =
            items.reduce((sum, item) => sum + item.place.lat, 0) / items.length
          const longitude =
            items.reduce((sum, item) => sum + item.place.lng, 0) / items.length
          return L.latLng(latitude, longitude)
        }

        let merged = true
        while (merged) {
          merged = false
          for (let first = 0; first < groups.length && !merged; first += 1) {
            for (let second = first + 1; second < groups.length; second += 1) {
              const firstCenter = map.latLngToContainerPoint(
                centerOf(groups[first]),
              )
              const secondCenter = map.latLngToContainerPoint(
                centerOf(groups[second]),
              )
              if (firstCenter.distanceTo(secondCenter) < 42) {
                groups[first].push(...groups[second])
                groups.splice(second, 1)
                merged = true
                break
              }
            }
          }
        }

        groups.forEach((group) => {
          const center = centerOf(group)
          if (group.length > 1) {
            const marker = L.marker(center, {
              icon: L.divIcon({
                className: "leaflet-custom-cluster",
                html: `<span class="leaflet-place-cluster" aria-hidden="true">${group.length}</span>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22],
              }),
              title: translate(
                "Acerca el mapa para elegir entre estos lugares.",
                language,
              ),
              keyboard: true,
            }).addTo(placeLayer)
            marker.on("click", () =>
              map.setView(center, Math.min(map.getZoom() + 2, 19)),
            )
            return
          }

          const place = group[0].place
          const marker = L.marker(center, {
            icon: markerIcon(place.name === origin ? "origin" : "place"),
            title: place.name,
            keyboard: true,
          }).addTo(placeLayer)
          marker.bindTooltip(place.name, { direction: "top", offset: [0, -12] })
          marker.on("click", () => onPickRef.current?.(place.name))
        })
      }

      map.on("zoomend moveend", renderPlaces)
      renderPlaces()
    }

    if (interactive) {
      map.on("click", (event) => {
        const nearest = Object.values(farePlaces).sort(
          (a, b) =>
            event.latlng.distanceTo([a.lat, a.lng]) -
            event.latlng.distanceTo([b.lat, b.lng]),
        )[0]

        onPickRef.current?.(nearest.name)
      })
    }

    const resize = window.setTimeout(() => map.invalidateSize(), 80)

    return () => {
      savedViewRef.current = { center: map.getCenter(), zoom: map.getZoom() }

      window.clearTimeout(resize)

      window.clearInterval(taxiAnimationTimer)

      routeControllers.forEach((controller) => controller.abort())

      window.removeEventListener("offline", onOffline)

      window.removeEventListener("online", onOnline)

      onControlsReadyRef.current?.(null)

      map.remove()

      if (mapRef.current === map) mapRef.current = null

      locationMarkerRef.current = null
    }
  }, [animateTaxi, dark, destination, interactive, origin, originCoordinates?.lat, originCoordinates?.lng, showDrivers, showPlaces, taxiEtaMinutes])

  const mapUnavailable = offline || tilesUnavailable || !tilesLoaded

  const mapMessage = offline
    ? translate("El mapa de calles necesita conexión a Internet.", language)
    : tilesUnavailable
      ? translate("El proveedor de calles no respondió.", language)
      : translate("Cargando las calles reales de la zona…", language)

  const mapWarning = locationUnavailable
    ? translate(
        "No encontramos uno de los puntos seleccionados en el mapa.",
        language,
      )
    : routeUnavailable && destination
      ? translate(
          "No se pudo calcular la ruta por calles. Puedes volver a intentarlo más tarde.",
          language,
        )
      : ""

  return (
    <div
      className={`map-view ${interactive ? "map-view-interactive" : ""} ${
        attributionAbovePanel ? "map-view-above-panel" : ""
      } ${
        mapUnavailable ? "tiles-offline map-pending" : ""
      }`}
      aria-label={translate("Mapa de calles de Ocaña", language)}
    >
      <div
        ref={elementRef}
        className={`leaflet-map ${className}`}
        aria-hidden={mapUnavailable}
      />
      {mapUnavailable && (
        <div className="map-view-fallback" role="status" aria-live="polite">
          <span className="map-fallback-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
              <path d="M9 3v15M15 6v15" />
            </svg>
          </span>
          <b>
            {translate(
              offline || tilesUnavailable
                ? "Vista de calles no disponible"
                : "Preparando mapa de calles",
              language,
            )}
          </b>
          <span>{mapMessage}</span>
          <small>
            {origin}
            {destination ? ` → ${destination}` : ""}
          </small>
        </div>
      )}
      {mapWarning && (
        <span className="map-offline-note" role="status">
          {mapWarning}
        </span>
      )}
    </div>
  )
}
