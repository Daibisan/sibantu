"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Truck,
  QrCode,
  MapPin,
  ShieldCheck,
  LogOut,
  X,
  Siren,
  FileSearch,
  Menu,
} from "lucide-react";

type Role = "ADMIN" | "GUDANG" | "PETUGAS_POSKO";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

type MobileHeaderUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  role: {
    code: string;
    name: string;
  };
};

interface MobileHeaderProps {
  user: MobileHeaderUser;
}

const menuByRole: Record<Role, MenuItem[]> = {
  ADMIN: [
    {
      label: "Dashboard",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Permintaan Bantuan",
      href: "/dashboard/admin/requests",
      icon: ClipboardList,
    },
    {
      label: "Event Bencana",
      href: "/dashboard/admin/events",
      icon: Siren,
    },
    {
      label: "Shipment",
      href: "/dashboard/gudang/shipments",
      icon: Truck,
    },
    {
      label: "Inventory",
      href: "/dashboard/gudang/inventory",
      icon: Package,
    },
    {
      label: "Audit",
      href: "/dashboard/admin/audit",
      icon: FileSearch,
    },
  ],

  GUDANG: [
    {
      label: "Dashboard",
      href: "/dashboard/gudang",
      icon: LayoutDashboard,
    },
    {
      label: "Permintaan",
      href: "/dashboard/admin/requests",
      icon: ClipboardList,
    },
    {
      label: "Inventory",
      href: "/dashboard/gudang/inventory",
      icon: Package,
    },
    {
      label: "Shipment",
      href: "/dashboard/gudang/shipments",
      icon: Truck,
    },
    {
      label: "QR & Dispatch",
      href: "/dashboard/gudang/dispatch",
      icon: QrCode,
    },
  ],

  PETUGAS_POSKO: [
    {
      label: "Dashboard",
      href: "/dashboard/posko",
      icon: LayoutDashboard,
    },
    {
      label: "Pengajuan Bantuan",
      href: "/dashboard/posko/requests",
      icon: ClipboardList,
    },
    {
      label: "Shipment",
      href: "/dashboard/posko/shipments",
      icon: Truck,
    },
    {
      label: "Scan & Penerimaan",
      href: "/dashboard/posko/scan",
      icon: QrCode,
    },
    {
      label: "Lokasi Posko",
      href: "/dashboard/posko/location",
      icon: MapPin,
    },
  ],
};

const roleLabel: Record<Role, string> = {
  ADMIN: "Administrator",
  GUDANG: "Petugas Gudang",
  PETUGAS_POSKO: "Petugas Posko",
};

export function MobileHeader({
  user,
}: MobileHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const role = user.role.code as Role;
  const menus = menuByRole[role] ?? [];

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      {/* ==================================================
          MOBILE HEADER
      =================================================== */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-slate-900">
            SIBANTU
          </p>

          <p className="truncate text-xs text-slate-500">
            {user.name} · {user.role.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Buka menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* ==================================================
          OVERLAY
      =================================================== */}
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
        />
      )}

      {/* ==================================================
          MOBILE DRAWER
      =================================================== */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-white shadow-xl transition-transform duration-200 lg:hidden",
          open
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* Drawer Header */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                SIBANTU
              </p>

              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Sistem Bantuan Bencana
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMenu}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ==================================================
            USER
        =================================================== */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-700">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user.name}
              </p>

              <p className="truncate text-xs text-slate-500">
                {roleLabel[role] ?? user.role.name}
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            NAVIGATION
        =================================================== */}
        <nav className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Menu Utama
          </p>

          <div className="space-y-1">
            {menus.map((menu) => {
              const Icon = menu.icon;

              const isActive =
                pathname === menu.href ||
                (menu.href !== "/dashboard/admin" &&
                  menu.href !== "/dashboard/gudang" &&
                  menu.href !== "/dashboard/posko" &&
                  pathname.startsWith(`${menu.href}/`));

              return (
                <Link
                  key={`${menu.label}-${menu.href}`}
                  href={menu.href}
                  onClick={closeMenu}
                  className={[
                    "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-teal-100 bg-teal-50 text-teal-800"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-[18px] w-[18px] shrink-0",
                      isActive
                        ? "text-teal-600"
                        : "text-slate-400 group-hover:text-slate-600",
                    ].join(" ")}
                  />

                  <span>{menu.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ==================================================
            LOGOUT
        =================================================== */}
        <div className="border-t border-slate-200 p-4">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}