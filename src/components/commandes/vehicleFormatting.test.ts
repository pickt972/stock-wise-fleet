import { describe, expect, test } from "bun:test";
import { formatFreeVehicle } from "@/components/commandes/OrderLineForm";

describe("formatFreeVehicle", () => {
  test("MARQUE en majuscules + modèle en Title Case", () => {
    expect(formatFreeVehicle("byd atto 3")).toBe("BYD Atto 3");
  });

  test("un seul mot : tout en majuscules, ne bloque pas", () => {
    expect(formatFreeVehicle("byd")).toBe("BYD");
  });

  test("plusieurs mots du modèle : première lettre de chaque mot en majuscule", () => {
    expect(formatFreeVehicle("renault clio 4")).toBe("RENAULT Clio 4");
    expect(formatFreeVehicle("FORD focus st")).toBe("FORD Focus St");
  });

  test("normalise les espaces multiples", () => {
    expect(formatFreeVehicle("  byd   atto  3 ")).toBe("BYD Atto 3");
  });
});

import { formatBrand, formatModel } from "./OrderLineForm";
test("marque en majuscules", () => { expect(formatBrand(" renault ")).toBe("RENAULT"); });
test("modèle en Title Case", () => { expect(formatModel("clio 4")).toBe("Clio 4"); expect(formatModel("ATTO 3")).toBe("Atto 3"); });
