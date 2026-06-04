export const internalAlfaRoles = [
  "admin",
  "direccion",
  "comercial",
  "ingenieria",
  "project_manager",
  "instalador",
  "compras",
  "finanzas",
] as const;

export const alfaRoles = internalAlfaRoles;

export type InternalAlfaRole = (typeof internalAlfaRoles)[number];
export type AlfaRole = InternalAlfaRole | "client";

export function normalizeRole(role: string | null | undefined): AlfaRole {
  if (role === "sales") return "comercial";
  if (role === "engineering") return "ingenieria";
  if (role === "client") return "client";
  if (internalAlfaRoles.includes(role as InternalAlfaRole)) {
    return role as InternalAlfaRole;
  }
  return "comercial";
}

export function isInternalRole(role: string | null | undefined) {
  return internalAlfaRoles.includes(normalizeRole(role) as InternalAlfaRole);
}

function isAdminLike(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "direccion";
}

export function canManageUsers(role: string | null | undefined) {
  return normalizeRole(role) === "admin";
}

export function canApproveQuotes(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "comercial"].includes(normalized);
}

export function canDeleteQuotes(role: string | null | undefined) {
  return isAdminLike(role);
}

export function canManageProducts(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "ingenieria", "compras"].includes(normalized);
}

export function canManageProductTaxonomy(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "ingenieria", "compras"].includes(normalized);
}

export function canManagePurchases(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "project_manager", "compras"].includes(normalized);
}

export function canManageContractors(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "project_manager", "finanzas"].includes(normalized);
}

export function canViewFinancials(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "finanzas"].includes(normalized);
}

export function canManageAccountStatements(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "finanzas"].includes(normalized);
}

export function canManageFiscalPayments(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "finanzas"].includes(normalized);
}

export function canManageWorkOrders(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return [
    "admin",
    "direccion",
    "ingenieria",
    "project_manager",
    "instalador",
  ].includes(normalized);
}

export function canManageServices(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return ["admin", "direccion", "comercial", "project_manager"].includes(normalized);
}
