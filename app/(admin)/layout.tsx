import Link from "next/link";
import {
  Building2,
  FileText,
  FolderOpen,
  Gauge,
  Package,
  PlusCircle,
  Ruler,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Gauge,
  },
  {
    href: "/clients",
    label: "Clientes",
    icon: Building2,
  },
  {
    href: "/products",
    label: "Productos",
    icon: Package,
  },
  {
    href: "/quotes",
    label: "Cotizaciones",
    icon: FileText,
  },
  {
    href: "/quotes/new",
    label: "Nueva cotización",
    icon: PlusCircle,
  },
  {
    href: "/engineering-quotes",
    label: "Ingenierías",
    icon: Ruler,
  },
  {
    href: "/dashboard",
    label: "Proyectos",
    icon: FolderOpen,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white lg:flex">
      <aside className="border-b border-[#1A1A1F] bg-[#0B0D0F] p-4 lg:sticky lg:top-0 lg:h-screen lg:w-20 lg:border-b-0 lg:border-r xl:w-72 xl:p-6">
        <div className="mb-4 lg:mb-8 xl:mb-10">
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>

          <h2 className="hidden text-2xl font-bold xl:block">
            Administración
          </h2>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-[#B3B3B8] transition hover:bg-[#151518] hover:text-white lg:justify-center xl:justify-start"
              >
                <Icon size={20} />
                <span className="lg:hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
