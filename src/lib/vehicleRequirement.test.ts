import { describe, expect, test } from "bun:test";
import { categoryRequiresVehicle, needsVehicleForExit } from "./vehicleRequirement";

const cats = [
  { id: "1", nom: "Batteries", parent_id: null, requires_vehicle: true },
  { id: "2", nom: "Accessoires", parent_id: null, requires_vehicle: false },
  { id: "3", nom: "Sièges", parent_id: "2", requires_vehicle: null },
  { id: "4", nom: "Filtres", parent_id: null, requires_vehicle: true },
  { id: "5", nom: "Filtres à huile", parent_id: "4", requires_vehicle: null },
];

describe("needsVehicleForExit", () => {
  test("catégorie requires_vehicle=true → véhicule obligatoire", () => {
    expect(needsVehicleForExit({ categorie: "Batteries" }, cats)).toBe(true);
  });

  test("sous-catégorie hérite du parent requires_vehicle=true", () => {
    expect(needsVehicleForExit({ categorie: "Filtres", sous_categorie: "Filtres à huile" }, cats)).toBe(true);
  });

  test("catégorie requires_vehicle=false → véhicule optionnel", () => {
    expect(needsVehicleForExit({ categorie: "Accessoires", sous_categorie: "Sièges" }, cats)).toBe(false);
  });

  test("article.vehicule_required seul suffit", () => {
    expect(needsVehicleForExit({ vehicule_required: true, categorie: "Accessoires" }, cats)).toBe(true);
  });

  test("article sans catégorie connue → optionnel", () => {
    expect(needsVehicleForExit({ categorie: "Inconnue" }, cats)).toBe(false);
    expect(needsVehicleForExit(null, cats)).toBe(false);
  });
});
