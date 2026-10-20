import { displayPlate, vehicleBrand, vehicleModel } from "./vehicleFormatting";

/** Manual vehicle information stays in the exit's existing text column. No fleet lookup. */
export function exitVehicleInput(input: {
  manual: boolean;
  fleetId?: string | null;
  plate: string;
  brand: string;
  model: string;
  notes: string;
}) {
  const freeVehicle = input.manual && input.plate.trim()
    ? [vehicleBrand(input.brand), vehicleModel(input.model), displayPlate(input.plate)].filter(Boolean).join(" — ")
    : "";
  return {
    vehicule_id: input.manual ? null : input.fleetId || null,
    notes: [input.notes.trim(), freeVehicle ? `Véhicule : ${freeVehicle}` : ""].filter(Boolean).join(" — ") || null,
  };
}