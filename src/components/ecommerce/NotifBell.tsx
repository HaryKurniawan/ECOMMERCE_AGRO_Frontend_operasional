"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ShoppingCart,
  Info,
  Check,
  Megaphone,
  Truck,
  PackageCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useNotifStore } from "@/store/notifikasi-store";
import { notificationsApi } from "@/lib/api/notifications";
import { queryKeys } from "@/hooks/query-keys";
import { useNotifSSE } from "@/hooks/notifikasi/useNotifSSE";
import { useAuthStore } from "@/store/auth-store";

export default function NotifBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifStore();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Enable SSE
  useNotifSSE();

  // Fetch initial data — hanya jika sudah login
  const { data } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationsApi.getAll({ limit: 5 }),
    enabled: isAuthenticated,
    refetchInterval: false,
    retry: false,
  });

  useEffect(() => {
    if (data?.data) {
      setNotifications(data.data.data, data.data.unreadCount);
    }
  }, [data, setNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = async (id: string, isRead: boolean) => {
    setIsOpen(false);
    if (!isRead) {
      markAsRead(id);
      try {
        await notificationsApi.markAsRead(id);
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
    router.push("/notifikasi");
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const getIcon = (tipe: string) => {
    switch (tipe) {
      case "PESANAN":
        return <ShoppingCart size={16} />;
      case "PESANAN_BARU":
        return <PackageCheck size={16} />;
      case "TUGAS_BARU":
        return <Truck size={16} />;
      case "ESKALASI":
        return <AlertTriangle size={16} />;
      case "BROADCAST":
        return <Megaphone size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const getColor = (tipe: string) => {
    switch (tipe) {
      case "PESANAN_BARU":
        return "bg-amber-100 text-amber-600";
      case "TUGAS_BARU":
        return "bg-indigo-100 text-indigo-600";
      case "BROADCAST":
        return "bg-orange-100 text-orange-600";
      case "ESKALASI":
        return "bg-red-100 text-red-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-primary-600 hover:border-primary-600 transition-colors flex items-center justify-center relative group shadow-sm"
        >
          <Bell
            size={18}
            className="text-slate-700 group-hover:text-white transition-colors"
          />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[9998] transition-all duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Slide from Right */}
      <div
        className={`fixed top-0 right-0 h-screen w-80 sm:w-96 bg-white shadow-2xl z-[9999] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <h3 className="font-bold text-[15px] text-slate-800 tracking-tight">
            Notifikasi
          </h3>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Tandai Dibaca
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif.id, notif.isRead)}
                className={`p-4 sm:p-5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex gap-3.5 transition-colors ${
                  !notif.isRead ? "bg-emerald-50/30" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(notif.tipe)}`}
                >
                  {getIcon(notif.tipe)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[13px] truncate ${!notif.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}
                  >
                    {notif.judul}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {notif.pesan}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                <Bell size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">
                Belum ada notifikasi
              </p>
              <p className="text-[12px] text-slate-400">
                Pemberitahuan terbaru akan muncul di sini
              </p>
            </div>
          )}
        </div>

        {/* Footer Action */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/notifikasi");
              }}
              className="w-full py-2.5 text-center text-[12px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/60"
            >
              Lihat Semua Notifikasi
            </button>
          </div>
        )}
      </div>
    </>
  );
}
