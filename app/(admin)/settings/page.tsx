import Link from "next/link";
import { Bell, Boxes, Handshake, SlidersHorizontal, Tags, UserCog, Wrench } from "lucide-react";

const settingsLinks = [
  {
    href: "/users",
    title: "Usuarios",
    description: "Perfiles, roles y accesos internos.",
    icon: UserCog,
  },
  {
    href: "/notifications/recipients",
    title: "Notificaciones",
    description: "Destinatarios para avisos operativos.",
    icon: Bell,
  },
  {
    href: "/product-categories",
    title: "Categorías de producto",
    description: "Estructura comercial para el catálogo.",
    icon: Boxes,
  },
  {
    href: "/product-tags",
    title: "Etiquetas de producto",
    description: "Clasificación flexible para búsquedas y filtros.",
    icon: Tags,
  },
  {
    href: "/commercial-partners",
    title: "Aliados comerciales",
    description: "Identidad visual para cotizaciones white label.",
    icon: Handshake,
  },
  {
    href: "/admin/operations",
    title: "Operaciones del Sistema",
    description: "Herramientas internas de mantenimiento.",
    icon: Wrench,
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#111111] text-white">
            <SlidersHorizontal size={20} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
            Configuración
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            Centro de control del sistema.
          </h1>
          <p className="mt-5 text-base leading-8 text-[#666666]">
            Accesos administrativos concentrados en un solo lugar, separados de
            la navegación operativa diaria.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {settingsLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#7A1F2B]/40 hover:shadow-2xl hover:shadow-black/[0.06]"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-semibold">{item.title}</h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-[#666666]">
                      {item.description}
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7F6F3] text-[#7A1F2B] transition group-hover:bg-[#7A1F2B] group-hover:text-white">
                    <Icon size={19} />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
