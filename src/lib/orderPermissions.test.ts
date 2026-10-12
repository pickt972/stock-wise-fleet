import { describe, expect, test } from "bun:test";
import { orderPermissions as p } from "./orderPermissions";

describe("matrice permissions commandes", () => {
  test("magasinier modifie/supprime uniquement son brouillon", () => {
    expect(p('magasinier', 'brouillon', true).canEdit).toBe(true);
    expect(p('magasinier', 'brouillon', false).canEdit).toBe(false);
    expect(p('magasinier', 'brouillon', false).canDelete).toBe(false);
  });
  test("magasinier ne valide ni n'annule", () => {
    expect(p('magasinier', 'brouillon', true).canValidate).toBe(false);
    expect(p('magasinier', 'confirme', true).canCancel).toBe(false);
  });
  test("chef annule une validée mais ne la modifie/supprime pas", () => {
    expect(p('chef_agence', 'confirme', false).canCancel).toBe(true);
    expect(p('chef_agence', 'confirme', false).canEdit).toBe(false);
    expect(p('chef_agence', 'confirme', false).canDelete).toBe(false);
  });
  test("admin modifie et supprime une validée", () => {
    expect(p('admin', 'confirme', false).canEdit).toBe(true);
    expect(p('admin', 'confirme', false).canDelete).toBe(true);
  });
  test("commande annulée non modifiable ni réceptionnable", () => {
    expect(p('admin', 'annule', true).canEdit).toBe(false);
    expect(p('admin', 'annule', true).canReceive).toBe(false);
  });
  test("tout le personnel réceptionne une validée", () => {
    expect(p('magasinier', 'confirme', false).canReceive).toBe(true);
  });
});
