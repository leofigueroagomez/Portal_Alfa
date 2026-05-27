"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  FolderOpen,
  Gauge,
  Menu,
  Package,
  PlusCircle,
  Ruler,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
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

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white lg:flex">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#1A1A1F] bg-[#0B0D0F]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-xs tracking-[0.28em] text-[#9E1B32]">ALFA OS</p>
          <p className="mt-1 text-sm font-semibold">Administración</p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#151518] text-white"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[82vw] max-w-80 border-r border-[#1A1A1F] bg-[#0B0D0F] p-5 shadow-2xl shadow-black/40 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-20 lg:max-w-none lg:translate-x-0 lg:p-4 lg:shadow-none xl:w-72 xl:p-6 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between gap-4 xl:mb-10">
          <div>
            <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
              ALFA OS
            </p>

            <h2 className="text-2xl font-bold lg:hidden xl:block">
              Administración
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#151518] lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition lg:justify-center xl:justify-start ${
                  isActive
                    ? "bg-[#151518] text-white"
                    : "text-[#B3B3B8] hover:bg-[#151518] hover:text-white"
                }`}
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
