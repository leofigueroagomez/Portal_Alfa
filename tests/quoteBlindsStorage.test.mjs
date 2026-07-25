import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildQuoteBlindImagePath,
  isAcceptedQuoteBlindImageMimeType,
  QUOTE_BLINDS_IMAGE_MAX_BYTES,
  QUOTE_BLINDS_IMAGES_BUCKET,
} from "../lib/quoteBlindsStorage.ts";

test("construye paths privados ligados a cotización y partida", () => {
  assert.equal(
    buildQuoteBlindImagePath({
      quoteId: 88,
      quoteItemId: 144,
      mimeType: "image/webp",
      uniqueId: "fixture-123",
    }),
    "quote-blinds/88/144/fixture-123.webp"
  );

  assert.throws(() =>
    buildQuoteBlindImagePath({
      quoteId: 0,
      quoteItemId: 144,
      mimeType: "image/png",
      uniqueId: "fixture",
    })
  );
  assert.throws(() =>
    buildQuoteBlindImagePath({
      quoteId: 88,
      quoteItemId: 144,
      mimeType: "image/png",
      uniqueId: "../escape",
    })
  );
});

test("limita bucket, MIME y tamaño del contrato de imágenes", () => {
  assert.equal(QUOTE_BLINDS_IMAGES_BUCKET, "quote-blinds-private");
  assert.equal(QUOTE_BLINDS_IMAGE_MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(isAcceptedQuoteBlindImageMimeType("image/jpeg"), true);
  assert.equal(isAcceptedQuoteBlindImageMimeType("image/png"), true);
  assert.equal(isAcceptedQuoteBlindImageMimeType("image/webp"), true);
  assert.equal(isAcceptedQuoteBlindImageMimeType("image/svg+xml"), false);
});

test("la migración crea bucket privado y no agrega policies abiertas", async () => {
  const sql = await readFile(
    new URL("../sql/20260724_quote_blinds_storage_sprint4b.sql", import.meta.url),
    "utf8"
  );

  assert.match(sql, /'quote-blinds-private'/);
  assert.match(sql, /public,\s*file_size_limit/);
  assert.match(sql, /false,\s*10485760/);
  assert.match(sql, /public\.is_internal_user\(\)/);
  assert.match(
    sql,
    /public\.has_internal_role\(\s*array\['admin', 'direccion', 'comercial', 'ingenieria'\]/
  );
  assert.match(sql, /q\.quote_type = 'blinds'/);
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /with\s+check\s*\(\s*true\s*\)/i);
});

test("el rollback de Storage aborta ante objetos o referencias persistidas", async () => {
  const sql = await readFile(
    new URL(
      "../sql/20260724_quote_blinds_storage_sprint4b_rollback.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(sql, /object_count\s*>\s*0/);
  assert.match(sql, /referenced_path_count\s*>\s*0/);
  assert.match(sql, /reference_image_path\s+is\s+not\s+null/i);
  assert.doesNotMatch(sql, /delete\s+from\s+storage\.objects/i);
  assert.doesNotMatch(
    sql,
    /delete\s+from\s+public\.quote_blind_item_details/i
  );
});
