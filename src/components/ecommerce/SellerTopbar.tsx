"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ChevronDown,
  User as UserIcon,
  MessageCircle,
  Store,
  BarChart2,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";

import NotifBell from "./NotifBell";

const NAV_TABS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/seller/dashboard" },
  { label: "Produk", icon: Package, path: "/seller/produk" },
  { label: "Tren & Laporan", icon: BarChart2, path: "/seller/tren" },
  { label: "Chat", icon: MessageCircle, path: "/seller/chat" },
];

export default function SellerTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const displayName = user?.name || user?.email || "Seller";
  const email = user?.email ?? "";

  return (
    <div className="w-full flex items-center justify-between px-2 relative z-50">
      {/* ── Left: logo + pill tabs ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-200">
          <Store size={18} className="text-white" />
        </div>

        <nav className="flex items-center gap-2 ml-2">
          {NAV_TABS.map((tab) => {
            let isTabActive = false;

            if (tab.path === "/seller/dashboard") {
              const dashboardRoutes = [
                "/seller/dashboard",
                "/seller/pesanan",
                "/seller/pesanan-grosir",
                "/seller/rating",
                "/seller/kurir",
              ];
              isTabActive = dashboardRoutes.some(
                (r) => pathname === r || pathname.startsWith(r + "/"),
              );
            } else if (tab.path === "/seller/produk") {
              const produkRoutes = [
                "/seller/produk",
                "/seller/stok",
                "/seller/gudang",
                "/seller/pengajuan-stok",
              ];
              isTabActive = produkRoutes.some(
                (r) => pathname === r || pathname.startsWith(r + "/"),
              );
            } else if (tab.path === "/seller/tren") {
              isTabActive =
                pathname === tab.path ||
                pathname.startsWith(tab.path + "/") ||
                pathname.startsWith("/seller/laporan");
            } else {
              isTabActive =
                pathname === tab.path || pathname.startsWith(tab.path + "/");
            }
            const Icon = tab.icon;

            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
                  isTabActive
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                <Icon size={11} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Right: Profile + Notif ── */}
      <div className="flex items-center gap-1.5">
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all group"
          >
            {/* Name — kiri */}
            <div className="hidden sm:flex items-center h-full mr-1">
              <span className="text-[14px] font-medium text-slate-800 tracking-tight leading-none mt-px">
                {displayName}
              </span>
            </div>

            {/* Avatar icon — kanan */}
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/60 group-hover:bg-emerald-50 group-hover:border-emerald-100/50 flex items-center justify-center flex-shrink-0 transition-colors">
              <UserIcon
                size={18}
                className="text-slate-600 group-hover:text-emerald-600 transition-colors"
              />
            </div>
          </button>

          {isProfileOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsProfileOpen(false)}
                aria-label="Close profile menu"
              />
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/40 overflow-hidden z-50">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-[12px] font-semibold text-slate-800 leading-none mb-0.5">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-none mb-2">
                    {email}
                  </p>
                  <span className="inline-block text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    Seller
                  </span>
                </div>

                {/* Menu Items */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push("/seller/profil-toko");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-50 text-[12px] font-medium transition-all"
                  >
                    <Store size={14} className="text-slate-400" />
                    Profil Toko
                  </button>
                  <div className="h-px bg-slate-100 my-1 mx-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 text-[12px] font-medium transition-all"
                  >
                    <LogOut size={14} />
                    Keluar Sesi
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notification Bell - Hidden on mobile, visible on tablet+ */}
        <div className="hidden md:block">
          <NotifBell />
        </div>
      </div>
    </div>
  );
}
