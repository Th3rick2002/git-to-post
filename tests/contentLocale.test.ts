import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { detectContentLocale } from "../convex/lib/contentLocale";

describe("detectContentLocale", () => {
  test("returns en when there is no text", () => {
    assert.equal(detectContentLocale([]), "en");
    assert.equal(detectContentLocale(["", "   "]), "en");
  });

  test("detects Spanish from commit messages", () => {
    assert.equal(
      detectContentLocale([
        "Actualización del flujo de publicación",
        "Añade corrección para el locale del post",
        "Mejora la solicitud de generación",
      ]),
      "es",
    );
  });

  test("detects English from commit messages", () => {
    assert.equal(
      detectContentLocale([
        "Fix image generation fallback",
        "Add locale detection for release notes",
        "Improve the draft writer prompt",
      ]),
      "en",
    );
  });

  test("prefers Spanish accents over English code noise", () => {
    assert.equal(
      detectContentLocale([
        "Corrección: la actualización ahora escribe el post en español",
        "src/index.ts",
      ]),
      "es",
    );
  });
});
