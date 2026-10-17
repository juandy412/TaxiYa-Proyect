// No precargamos conductores ni solicitudes ficticias. Los conductores deben registrarse y
// aprobarse dentro del prototipo antes de aparecer como disponibles en una búsqueda local.
export type DriverPreview = {
  name: string;
  initials: string;
  rating: string;
  trips: number;
  car: string;
  plate: string;
  eta: number;
  lat: number;
  lng: number;
};
export const drivers: DriverPreview[] = [];
