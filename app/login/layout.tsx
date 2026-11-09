import type { Metadata } from "next";

// La pagina de login es un componente cliente y no puede exportar metadata.
// `/login` no va bloqueado en robots.ts: Google necesita rastrearlo para ver
// este noindex; bloqueado, puede indexar la URL sin haberlo leido.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
