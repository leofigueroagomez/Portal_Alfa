import type { Metadata } from "next";
import SecuritySettingsClient from "./SecuritySettingsClient";

export const metadata: Metadata = {
  title: "Seguridad de la cuenta",
};

// El layout de (admin) ya exige perfil interno activo (y AAL2 si el usuario
// tiene un factor verificado). Cada usuario solo administra sus propios factores
// con su sesion; no se usa service role.
export default function SecuritySettingsPage() {
  return <SecuritySettingsClient />;
}
