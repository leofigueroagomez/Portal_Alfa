"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  BarChart3,
  FileText,
  FolderOpen,
  Gauge,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PlusCircle,
  Ruler,
  Settings,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/services/supabase";
import type { UserProfile } from "@/services/profile";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AdminShellProps = {
  children: React.ReactNode;
  profile: UserProfile | null;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard comercial", icon: Gauge },
  { href: "/director-dashboard", label: "Dashboard direccion", icon: BarChart3 },
  { href: "/clients", label: "Clientes", icon: Building2 },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/quotes", label: "Cotizaciones", icon: FileText },
  { href: "/quotes/new", label: "Nueva cotización", icon: PlusCircle },
  { href: "/engineering-quotes", label: "Ingenierías", icon: Ruler },
  { href: "/projects", label: "Proyectos", icon: FolderOpen },
  { href: "/contractors", label: "Contratistas", icon: Users },
  { href: "/services", label: "Servicios", icon: Wrench },
  { href: "/admin/operations", label: "Operaciones", icon: Settings },
  {
    href: "/notifications/recipients",
    label: "Notificaciones",
    icon: MessageCircle,
  },
];

const roleLabels: Record<UserProfile["role"], string> = {
  admin: "Admin",
  sales: "Ventas",
  engineering: "Ingeniería",
};

export default function AdminShell({ children, profile }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isPrintRoute = pathname.endsWith("/print");
  const displayName = profile?.full_name?.trim() || "Usuario ALFA";
  const roleLabel = profile?.role ? roleLabels[profile.role] : "Interno";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (isPrintRoute) {
    return <div className="admin-print-route min-h-screen">{children}</div>;
  }

  return (
    <div className="admin-shell min-h-screen bg-[#0B0D0F] text-white lg:flex">
      <header className="mobile-admin-header no-print sticky top-0 z-40 flex items-center justify-between border-b border-[#1A1A1F] bg-[#0B0D0F]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.28em] text-[#9E1B32]">ALFA OS</p>
          <p className="mt-1 truncate text-sm font-semibold">{displayName}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="admin-menu-button no-print inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#151518] text-white"
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
          className="admin-menu-overlay no-print fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`admin-sidebar no-print fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-80 flex-col border-r border-[#1A1A1F] bg-[#0B0D0F] p-5 shadow-2xl shadow-black/40 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-20 lg:max-w-none lg:translate-x-0 lg:p-4 lg:shadow-none xl:w-72 xl:p-6 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between gap-4 xl:mb-10">
          <div className="min-w-0">
            <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
              ALFA OS
            </p>

            <h2 className="text-2xl font-bold lg:hidden xl:block">
              Administración
            </h2>

            <div className="admin-user-card mt-4 hidden rounded-xl border border-[#1F1F24] bg-[#151518] p-3 xl:block">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="mt-1 text-xs text-[#B3B3B8]">{roleLabel}</p>
            </div>
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

        <nav className="admin-nav no-print space-y-2">
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

        <div className="mt-auto border-t border-[#1A1A1F] pt-4">
          <div className="admin-user-card mb-3 rounded-xl border border-[#1F1F24] bg-[#151518] p-3 xl:hidden">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="mt-1 text-xs text-[#B3B3B8]">{roleLabel}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[#B3B3B8] transition hover:bg-[#151518] hover:text-white lg:justify-center xl:justify-start"
          >
            <LogOut size={20} />
            <span className="lg:hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
