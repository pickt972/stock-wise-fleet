/// <reference path="../bun-test.d.ts" />
import { expect, test } from "bun:test";
import { maskSivPlate, isValidSivPlate, displayPlate, vehicleLabel } from "./vehicleFormatting";

test("masque SIV automatique df876hh → DF-876-HH", () => {
  expect(maskSivPlate("df876hh")).toBe("DF-876-HH");
  expect(maskSivPlate("FM908TV")).toBe("FM-908-TV");
  expect(maskSivPlate("gl007nl")).toBe("GL-007-NL");
  expect(maskSivPlate("df8")).toBe("DF-8");
});
test("validation stricte deux lettres trois chiffres deux lettres", () => {
  expect(isValidSivPlate("DF-876-HH")).toBe(true);
  for (const value of ["df-876-hh", "DF876HH", "D-876-HH", "DF-87-HH", "12-ABC-34", "", "DF-876-HHH"])
    expect(isValidSivPlate(value)).toBe(false);
});
test("plaques existantes normalisées sans mutation ni invention", () => {
  const vehicle = { marque: "renault", modele: "clio estate", immatriculation: "df876hh" };
  expect(vehicleLabel(vehicle)).toBe("RENAULT Clio Estate — DF-876-HH");
  expect(vehicle.immatriculation).toBe("df876hh");
  expect(displayPlate("1234 ab 972")).toBe("1234 AB 972");
  expect(displayPlate(null)).toBe("—");
});