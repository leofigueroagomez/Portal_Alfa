export const alfaRoles = [
  "admin",
  "direccion",
  "comercial",
  "ingenieria",
  "project_manager",
  "instalador",
  "compras",
  "finanzas",
] as const;

export type AlfaRole = (typeof alfaRoles)[number];

export function normalizeRole(role: string | null | undefined): AlfaRole {
  if (role === "sales") return "comercial";
  if (role === "engineering") return "ingenieria";
  if (alfaRoles.includes(role as AlfaRole)) return role as AlfaRole;
  return "comercial";
}

function isAdminLike(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "direccion";
}

export function canManageUsers(role: string | null | undefined) {
  return isAdminLike(role);
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
