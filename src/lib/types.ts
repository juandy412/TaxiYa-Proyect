export type Role = "passenger" | "driver" | "admin";
export type Language = "es" | "en";
export type Screen =
  | "welcome" | "login" | "register" | "admin-register" | "chat" | "forgot" | "permission"
  | "home" | "search" | "fare" | "searching" | "assigned" | "tracking" | "rating" | "thanks"
  | "trips" | "trip-detail" | "profile" | "support" | "notifications"
  | "driver-home" | "requests" | "request-detail" | "enroute" | "verify-pin"
  | "driver-trip" | "payment" | "driver-summary" | "driver-rating"
  | "driver-trips" | "earnings" | "driver-profile" | "driver-register" | "map-picker" | "admin";
export type TripStatus = "idle" | "requested" | "assigned" | "enroute" | "active" | "completed" | "cancelled";
export type ChatMessage = { from: "user" | "taxi"; text: string };
export type RideMessage = { id: string; from: "passenger" | "driver"; text: string; createdAt: number };
export type NotificationItem = { id: string; title: string; text: string; time: string; read: boolean; target: Screen };
export type RatingData = { stars: number; tags: string[]; comment: string };
export type PaymentMethod = "Efectivo" | "Nequi" | "Daviplata";
export type TripRecord = { id: string; createdAt: number; date: string; origin: string; destination: string; fare: number; driver: string; passenger: string; plate: string; shieldChecks: number; status: "Completado" | "Cancelado"; paymentMethod?: PaymentMethod; tip?: number; passengerRating?: RatingData; driverRating?: RatingData };
export type Complaint = { id: string; reason: string; description: string; status: "Abierta" | "Cerrada"; response?: string };
export type RideRequest = { id: string; passenger: string; origin: string; destination: string; offer: number; needs: string; km: number; minutes: number; real: boolean; paymentMethod?: PaymentMethod };
export type SavedPlace = { label: "Casa" | "Trabajo"; place: string };
export type Account = { name: string; phone: string; email: string; password: string; contactName: string; contactPhone: string; relationship: string; needs: string[]; needsNote: string; preference: "Pasajera" | "Pasajero" | "Prefiero no decirlo"; demo?: boolean };
export type VehicleData = { make: string; color: string; plate: string };
export type DriverDocument = { name: string; uploaded: boolean };
export type DriverVerification = "Pendiente" | "Aprobado" | "Rechazado";
export type Stored = {
 version:number; loggedIn:boolean; role:Role; largeText:boolean; notifications:number; trips:number; offer:number; destination:string; online:boolean; rain:boolean; peak:boolean; night:boolean; tripStatus:TripStatus; pin:string; pinVerified:boolean; pinErrors:number; selectedDriver:string; shieldChecks:number; sosActive:boolean; shared:boolean; chat:ChatMessage[]; completedTrips:number; cancelledTrips:number; fareZoneMin:number; fareZoneMax:number; origin:string; notificationItems:NotificationItem[]; tripHistory:TripRecord[]; complaints:Complaint[]; darkMode:boolean; sound:boolean; rejectedRequestIds:string[]; activeRequestId:string; shieldDueAt:number|null; shieldEventHandled:boolean; addressPreference:Account["preference"]; account:Account|null; driverAccount:Account; adminAccount:Account|null; vehicle:VehicleData; shareLocation:boolean; automaticShield:boolean; notifyTrusted:boolean; appearance:"Automático"|"Claro"|"Oscuro"; selectedTripId:string; arrivalDueAt:number|null; driverArrived:boolean; onlineStartedAt:number|null; onlineMs:number; chatTopic:string; chatPending:"destination"|"confirmation"|""; chatOrigin:string; chatDestination:string; demoMode:boolean; shieldPromptCount:number; shieldPromptActive:boolean; driverDelayed:boolean; isConnected:boolean; rideMessages:RideMessage[]; activePassengerName:string; activePassengerNeeds:string; activeRideReal:boolean;
 paymentMethod:PaymentMethod; fareManuallyAdjusted:boolean; tripArrivalAt:number|null; driverVerification:DriverVerification; driverRejectionReason:string; driverDocuments:DriverDocument[]; savedPlaces:SavedPlace[]; tip:number; simulateNoDrivers:boolean;
 language:Language;
};
export type Update = (patch: Partial<Stored> | ((current: Stored) => Partial<Stored>)) => void;
