import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canCancelInvoices,
  isAdminLike,
  isInternalRole,
  parseInternalRole,
} from "../lib/permissions";
import {
  getPortalProfileKind,
  isPlausibleEmail,
  isProtectedInternalProfile,
  normalizeEmail,
  parsePositiveId,
} from "../lib/authzPortal";

test("isInternalRole niega null, vacio, desconocido y roles de portal", () => {
  for (const role of [null, undefined, "", "client", "contractor", "superuser", "ADMIN"]) {
    assert.equal(isInternalRole(role), false, String(role));
  }
});

test("isInternalRole acepta roles internos reales y alias legacy", () => {
  for (const role of ["admin", "direccion", "comercial", "instalador", "finanzas", "sales", "engineering"]) {
    assert.equal(isInternalRole(role), true, role);
  }
});

test("parseInternalRole es estricto y no cae a comercial", () => {
  assert.equal(parseInternalRole("sales"), "comercial");
  assert.equal(parseInternalRole("engineering"), "ingenieria");
  assert.equal(parseInternalRole("direccion"), "direccion");
  assert.equal(parseInternalRole("hacker"), null);
  assert.equal(parseInternalRole(null), null);
  assert.equal(parseInternalRole(42), null);
  assert.equal(parseInternalRole("client"), null);
});

test("admin y direccion tienen privilegios identicos", () => {
  assert.equal(isAdminLike("admin"), true);
  assert.equal(isAdminLike("direccion"), true);
  assert.equal(isAdminLike("finanzas"), false);
  assert.equal(canCancelInvoices("direccion"), canCancelInvoices("admin"));
});

test("getPortalProfileKind: empleados y perfiles ambiguos no son de portal", () => {
  assert.equal(getPortalProfileKind(null), null);
  assert.equal(getPortalProfileKind({ role: null, is_internal: null, user_type: null }), null);
  assert.equal(getPortalProfileKind({ role: "instalador", is_internal: false, user_type: "internal" }), null);
  assert.equal(getPortalProfileKind({ role: "instalador", is_internal: false, user_type: null }), null);
  assert.equal(getPortalProfileKind({ role: "client", is_internal: true, user_type: "client_portal" }), null);
  assert.equal(getPortalProfileKind({ role: "contractor", is_internal: false, user_type: "internal" }), null);
});

test("getPortalProfileKind reconoce perfiles de portal validos", () => {
  assert.equal(getPortalProfileKind({ role: "client", is_internal: false, user_type: "client_portal" }), "client");
  assert.equal(getPortalProfileKind({ role: "client", is_internal: false, user_type: null }), "client");
  assert.equal(
    getPortalProfileKind({ role: "contractor", is_internal: false, user_type: "contractor_portal" }),
    "contractor"
  );
});

test("isProtectedInternalProfile bloquea convertir empleados, no perfiles inexistentes", () => {
  assert.equal(isProtectedInternalProfile(null), false);
  assert.equal(isProtectedInternalProfile({ role: "admin", is_internal: true, user_type: "internal" }), true);
  assert.equal(isProtectedInternalProfile({ role: "instalador", is_internal: true, user_type: "internal" }), true);
  assert.equal(isProtectedInternalProfile({ role: null, is_internal: null, user_type: null }), true);
  assert.equal(
    isProtectedInternalProfile({ role: "contractor", is_internal: false, user_type: "contractor_portal" }),
    false
  );
});

test("validaciones de entrada para acciones de portal", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
  assert.equal(isPlausibleEmail("tecnico@example.com"), true);
  assert.equal(isPlausibleEmail("sin-arroba"), false);
  assert.equal(isPlausibleEmail("a b@example.com"), false);
  assert.equal(parsePositiveId("12"), 12);
  assert.equal(parsePositiveId("0"), null);
  assert.equal(parsePositiveId("-3"), null);
  assert.equal(parsePositiveId("1.5"), null);
  assert.equal(parsePositiveId(null), null);
});
