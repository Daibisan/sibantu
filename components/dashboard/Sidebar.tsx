"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Truck,
  QrCode,
  MapPin,
  ShieldCheck,
  Siren,
  FileSearch,
  LogOut,
} from "lucide-react";

type Role = "ADMIN" | "GUDANG" | "PETUGAS_POSKO";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

type SidebarUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  role: {
    code: string;
    name: string;
  };
};

type SidebarProps = {
  user: SidebarUser;
};

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

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const role = user.role.code as Role;
  const menus = menuByRole[role] ?? [];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
      {/* Brand */}
      <div className="flex h-20 shrink-0 items-center border-b border-slate-200 px-6">
        <Link
          href={menus[0]?.href ?? "/dashboard"}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900">
              SIBANTU
            </div>

            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Sistem Bantuan Bencana
            </div>
          </div>
        </Link>
      </div>

      {/* User */}
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

      {/* Navigation */}
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

      {/* Bottom */}
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-2 px-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sistem aktif
        </div>

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
  );
}