"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  FileText,
  FolderOpen,
  Gauge,
  Inbox,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  ReceiptText,
  Ruler,
  Settings,
  SlidersHorizontal,
  Users,
  UserCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/services/supabase";
import type { UserProfile } from "@/services/profile";
import {
  canManageContractors,
  canManageProductTaxonomy,
  canManageServices,
  canViewFinancials,
  canManageUsers,
  normalizeRole,
} from "@/lib/permissions";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  visible?: boolean;
  badgeCount?: number;
};

type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavLink[];
};

type AdminShellProps = {
  children: React.ReactNode;
  profile: UserProfile | null;
  newLeadsCount?: number;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  direccion: "Dirección",
  comercial: "Comercial",
  sales: "Comercial",
  ingenieria: "Ingeniería",
  project_manager: "Project Manager",
  instalador: "Instalador",
  compras: "Compras",
  finanzas: "Finanzas",
  engineering: "Ingeniería",
};

export default function AdminShell({
  children,
  profile,
  newLeadsCount = 0,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isPrintRoute = pathname.endsWith("/print");
  const displayName = profile?.full_name?.trim() || "Usuario ALFA";
  const role = normalizeRole(profile?.role);
  const roleLabel = roleLabels[role] || "Interno";

  const commercialItems: NavLink[] = [
    { href: "/leads", label: "Leads", icon: Inbox, badgeCount: newLeadsCount },
    { href: "/quotes/new", label: "Nueva Cotización", icon: PlusCircle },
    { href: "/customers", label: "Clientes", icon: Building2 },
    { href: "/quotes", label: "Cotizaciones", icon: FileText },
    {
      href: "/products",
      label: "Productos",
      icon: Package,
      visible: canManageProductTaxonomy(role),
    },
  ];

  const operationsItems: NavLink[] = [
    { href: "/projects", label: "Proyectos", icon: FolderOpen },
    {
      href: "/contractors",
      label: "Contratistas",
      icon: Users,
      visible: canManageContractors(role),
    },
    {
      href: "/services",
      label: "Servicios",
      icon: Wrench,
      visible: canManageServices(role),
    },
  ];

  const financeItems: NavLink[] = [
    {
      href: "/invoices",
      label: "Facturacion",
      icon: ReceiptText,
      visible: canViewFinancials(role),
    },
  ];

  const settingsItems: NavLink[] = [
    { href: "/users", label: "Usuarios", icon: UserCog, visible: canManageUsers(role) },
    {
      href: "/notifications/recipients",
      label: "Notificaciones",
      icon: Bell,
      visible: canManageUsers(role),
    },
    {
      href: "/settings",
      label: "Configuración General",
      icon: SlidersHorizontal,
      visible: canManageUsers(role),
    },
    {
      href: "/admin/operations",
      label: "Operaciones del Sistema",
      icon: Settings,
      visible: canManageUsers(role),
    },
  ];

  const navGroups: NavGroup[] = [
    { label: "Comercial", icon: FileText, items: commercialItems },
    { label: "Operaciones", icon: FolderOpen, items: operationsItems },
    { label: "Finanzas", icon: ReceiptText, items: financeItems },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (isPrintRoute) {
    return <div className="admin-print-route min-h-screen">{children}</div>;
  }

  return (
    <div className="admin-shell min-h-screen bg-[#F7F6F3] text-[#111111] lg:flex">
      <header className="mobile-admin-header no-print sticky top-0 z-40 flex items-center justify-between border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
          <Image
            src="/logo-alfa-os.png"
            alt="ALFA OS"
            width={146}
            height={64}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="admin-menu-button no-print inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#111111]"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
        >
          <Menu size={20} />
        </button>
      </header>

      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="admin-menu-overlay no-print fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`admin-sidebar no-print fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-80 flex-col border-r border-black/10 bg-[#0F0F0F] p-5 text-white shadow-2xl shadow-black/30 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-24 lg:max-w-none lg:translate-x-0 lg:p-4 lg:shadow-none xl:w-80 xl:p-6 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="block"
            aria-label="Ir a Dashboard Dirección"
          >
            <Image
              src="/logo-alfa-os.png"
              alt="ALFA OS"
              width={230}
              height={110}
              priority
              className="mx-auto h-auto w-40 object-contain lg:w-14 xl:mx-0 xl:w-48"
            />
          </Link>

          <div className="mt-7 hidden border-t border-white/10 pt-5 xl:block">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
              {roleLabel}
            </p>
          </div>
        </div>

        <nav className="admin-nav no-print space-y-2">
          <NavEntry
            href="/dashboard"
            label="Dashboard Dirección"
            icon={Gauge}
            pathname={pathname}
            onNavigate={() => setIsOpen(false)}
          />

          {navGroups.map((group) => (
            <NavDropdown
              key={group.label}
              group={group}
              pathname={pathname}
              onNavigate={() => setIsOpen(false)}
            />
          ))}

          <NavEntry
            href="/engineering"
            label="Ingenierías"
            icon={Ruler}
            pathname={pathname}
            onNavigate={() => setIsOpen(false)}
          />
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 w-full items-center gap-3 rounded-full px-4 text-sm text-white/58 transition hover:bg-white/[0.06] hover:text-white lg:justify-center xl:justify-start"
          >
            <LogOut size={19} />
            <span className="lg:hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <SettingsGear
        items={settingsItems}
        pathname={pathname}
        onNavigate={() => setIsOpen(false)}
      />

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function NavEntry({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
}: NavLink & {
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-sm transition lg:justify-center xl:justify-start ${
        isActive
          ? "bg-white text-[#111111]"
          : "text-white/62 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon size={19} />
      <span className="lg:hidden xl:inline">{label}</span>
    </Link>
  );
}

function NavDropdown({
  group,
  pathname,
  onNavigate,
  compact = false,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
  compact?: boolean;
}) {
  const visibleItems = group.items.filter((item) => item.visible !== false);
  const isActive = visibleItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (visibleItems.length === 0) return null;

  const Icon = group.icon;

  return (
    <details className="group/nav" open={isActive && !compact}>
      <summary
        className={`flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-full px-4 text-sm transition marker:hidden lg:justify-center xl:justify-start [&::-webkit-details-marker]:hidden ${
          isActive
            ? "bg-white text-[#111111]"
            : "text-white/62 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <Icon size={19} />
        <span className="lg:hidden xl:inline">{group.label}</span>
        <ChevronDown
          size={16}
          className="ml-auto transition group-open/nav:rotate-180 lg:hidden xl:block"
        />
      </summary>

      <div className="mt-2 space-y-1 pl-5 lg:pl-0 xl:pl-5">
        {visibleItems.map((item) => {
          const ItemIcon = item.icon;
          const itemActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={`${group.label}-${item.href}`}
              href={item.href}
              onClick={onNavigate}
              className={`flex min-h-10 items-center gap-3 rounded-full px-4 text-sm transition lg:justify-center xl:justify-start ${
                itemActive
                  ? "bg-[#7A1F2B] text-white"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <ItemIcon size={17} />
              <span className="lg:hidden xl:inline">{item.label}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <span
                  className={`ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold lg:hidden xl:inline-flex ${
                    itemActive
                      ? "bg-white/18 text-white"
                      : "bg-[#7A1F2B] text-white"
                  }`}
                >
                  {item.badgeCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

function SettingsGear({
  items,
  pathname,
  onNavigate,
}: {
  items: NavLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  const visibleItems = items.filter((item) => item.visible !== false);

  if (visibleItems.length === 0) return null;

  return (
    <details
      data-admin-chrome="true"
      className="no-print fixed right-4 top-20 z-30 lg:right-6 lg:top-5"
    >
      <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full border border-black/10 bg-white text-[#111111] shadow-xl shadow-black/[0.08] transition hover:border-[#7A1F2B]/40 hover:text-[#7A1F2B] marker:hidden [&::-webkit-details-marker]:hidden">
        <Settings size={20} />
        <span className="sr-only">Configuración</span>
      </summary>

      <div className="mt-3 w-72 border border-black/10 bg-white p-2 text-[#111111] shadow-2xl shadow-black/[0.12]">
        <p className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#7A1F2B]">
          Configuración
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={`settings-${item.href}`}
              href={item.href}
              onClick={onNavigate}
              className={`flex min-h-11 items-center gap-3 px-3 text-sm transition ${
                isActive
                  ? "bg-[#F7F6F3] text-[#7A1F2B]"
                  : "text-[#444444] hover:bg-[#F7F6F3] hover:text-[#111111]"
              }`}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
