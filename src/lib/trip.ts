import type { Stored, Update } from "./types";
import { newNotification, tripRecord } from "./format";

const passengerDetails = (data: Stored) => ({
  activePassengerName: data.account?.name || "Persona usuaria",
  activePassengerNeeds: [
    ...(data.account?.needs || []),
    data.account?.needsNote || "",
  ]
    .filter(Boolean)
    .join(" · "),
});

export function startTrip(
  update: Update,
  overrides: Partial<Stored> = {},
) {
  update((current) => ({
    ...passengerDetails(current),
    tripStatus: "requested",
    activeRequestId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    pin: String(Math.floor(1000 + Math.random() * 9000)),
    activeRideReal: true,
    rideMessages: [],
    rejectedRequestIds: [],
    shieldDueAt: null,
    shieldEventHandled: false,
    shieldPromptCount: 0,
    shieldPromptActive: false,
    shieldChecks: 0,
    sosActive: false,
    driverArrived: false,
    driverDelayed: false,
    arrivalDueAt: null,
    tripArrivalAt: null,
    ...overrides,
  }));
}

export function assignDriver(
  update: Update,
  driverName: string,
  overrides: Partial<Stored> = {},
) {
  update((current) => {
    const notification = newNotification(
      "Conductor asignado",
      `${driverName} aceptó tu viaje. Confirma por el chat el punto de encuentro.`,
      "assigned",
    );
    return {
      selectedDriver: driverName,
      tripStatus: "assigned",
      arrivalDueAt: Date.now() + 6000,
      driverArrived: false,
      driverDelayed: false,
      notificationItems: [notification, ...current.notificationItems],
      ...overrides,
    };
  });
}

export function cancelTrip(
  update: Update,
  by: "passenger" | "driver",
  reason: string,
) {
  update((current) => {
    if (by === "driver") {
      const notification = newNotification(
        "El conductor canceló",
        `${current.driverAccount.name} canceló por: ${reason}. Volvimos a buscarte otro taxi.`,
        "searching",
      );
      return {
        tripStatus: "requested",
        selectedDriver: "",
        driverArrived: false,
        notificationItems: [notification, ...current.notificationItems],
      };
    }
    const record = tripRecord(current, "Cancelado");
    return {
      tripStatus: "cancelled",
      cancelledTrips: current.cancelledTrips + 1,
      tripHistory: [record, ...current.tripHistory],
      activeRideReal: false,
      selectedDriver: "",
      pin: "",
      pinVerified: false,
      driverArrived: false,
      shieldDueAt: null,
    };
  });
}

export function finishTrip(update: Update) {
  update((current) => {
    const record = tripRecord(current, "Completado");
    const notification = newNotification(
      "Tu recibo está listo",
      `Consulta el viaje de ${current.origin} a ${current.destination}.`,
      "trip-detail",
    );
    return {
      tripStatus: "completed",
      trips: current.trips + 1,
      completedTrips: current.completedTrips + 1,
      tripHistory: [record, ...current.tripHistory],
      notificationItems: [notification, ...current.notificationItems],
      shieldDueAt: null,
    };
  });
}
