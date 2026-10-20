/** Shared presentation and input formatting; never writes existing fleet data. */
export const SIV_PATTERN = /^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$/;

export function maskSivPlate(value: string): string {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  return [raw.slice(0, 2), raw.slice(2, 5), raw.slice(5, 7)].filter(Boolean).join("-");
}

export function isValidSivPlate(value: string): boolean {
  return SIV_PATTERN.test(value);
}

export function displayPlate(value?: string | null): string {
  if (!value?.trim()) return "—";
  const masked = maskSivPlate(value);
  // Do not invent a SIV registration for legacy/malformed data.
  return isValidSivPlate(masked) && value.replace(/[^A-Z0-9]/gi, "").length === 7
    ? masked : value.trim().toUpperCase();
}

export function vehicleBrand(value?: string | null): string {
  return value?.trim().toUpperCase() || "";
}

export function vehicleModel(value?: string | null): string {
  return value?.trim().toLocaleLowerCase("fr").replace(/(^|[\s-])(\p{L})/gu, (_, separator, letter) => separator + letter.toLocaleUpperCase("fr")) || "";
}

export function vehicleLabel(vehicle: { marque?: string | null; modele?: string | null; immatriculation?: string | null }): string {
  const name = [vehicleBrand(vehicle.marque), vehicleModel(vehicle.modele)].filter(Boolean).join(" ");
  return `${name || "Véhicule"} — ${displayPlate(vehicle.immatriculation)}`;
}
/** Search key: uppercase, without dashes/spaces/punctuation, so "fw-690" matches "FW690BY". */
export function vehicleSearchKey(value?: string | null): string {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function matchesVehicleSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = vehicleSearchKey(query);
  if (!q) return true;
  return fields.some((f) => vehicleSearchKey(f).includes(q)) || vehicleSearchKey(fields.join("")).includes(q);
}
