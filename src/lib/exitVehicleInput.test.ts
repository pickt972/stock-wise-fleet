import { expect, test } from "bun:test";
import { exitVehicleInput } from "./exitVehicleInput";

test("manual vehicle leaves fleet ID null even with a stale fleet selection", () => {
  const result = exitVehicleInput({ manual: true, fleetId: "stale-id", plate: "fw691by", brand: "kia", model: "picanto", notes: "Entretien" });
  expect(result.vehicule_id).toBeNull();
  expect(result.notes).toBe("Entretien — Véhicule : KIA — Picanto — FW-691-BY");
});
test("manual plate does not require brand or model", () => {
  expect(exitVehicleInput({ manual: true, plate: "FW-691-BY", brand: "", model: "", notes: "" })).toEqual({ vehicule_id: null, notes: "Véhicule : FW-691-BY" });
});
test("fleet selection preserves ID without manual text", () => {
  expect(exitVehicleInput({ manual: false, fleetId: "fleet-id", plate: "FW-691-BY", brand: "kia", model: "picanto", notes: " Note " })).toEqual({ vehicule_id: "fleet-id", notes: "Note" });
});