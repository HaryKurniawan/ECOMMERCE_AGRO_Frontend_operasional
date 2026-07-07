"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2, AlertCircle, ChevronRight } from "lucide-react";

import { useSellerGrosirOrders } from "@/hooks/seller/useSellerGrosirOrders";
import { useSellerDashboard } from "@/hooks/seller/useSellerDashboard";
import { formatRupiah, formatTanggal } from "@/lib/ecommerce-api";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type OrderGrosirDto = {
  id: string;
  status: string;
  totalHarga?: number;
  alamatKirim?: string;
  createdAt: string;
  konsumen?: { nama?: string; email?: string };
  item?: Array<{
    id: string;
    jumlah: number;
    harga: number;
    grade?: string;
    produk?: { nama: string; hargaBeli?: number };
  }>;
};

const GrosirOrdersPage: React.FC = () => {
  const router = useRouter();
  const { store, loading: storeLoading } = useSellerDashboard();
  const { orders, isLoading: ordersLoading } = useSellerGrosirOrders(
    store?.id ?? "",
  );
  const [filterStatus, setFilterStatus] = useState("semua");

  const loading = storeLoading || (store?.id && ordersLoading);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600/80 animate-spin" />
      </div>
    );
  }

  if (!store || store.error) {
    return (
      <div className="bg-amber-50/50 text-amber-700 p-6 rounded-2xl flex items-center gap-3 border border-amber-100/60 max-w-2xl mx-auto mt-8">
        <AlertCircle size={20} className="text-amber-500 shrink-0" />
        <div className="space-y-0.5">
          <h3 className="font-medium text-sm text-amber-800">
            Toko Tidak Ditemukan
          </h3>
          <p className="text-xs text-amber-600/90 leading-relaxed font-medium">
            Anda harus memiliki toko untuk melihat daftar pesanan grosir.
          </p>
        </div>
      </div>
    );
  }

  const typedOrders: OrderGrosirDto[] = orders ?? [];

  const filtered = typedOrders.filter(
    (o) => filterStatus === "semua" || o.status === filterStatus,
  );

  const statusColor = (s: string) => {
    switch (s) {
      case "MENUNGGU_KONFIRMASI_SELLER":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "MENUNGGU_BAYAR":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "DIPROSES":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "DIKIRIM":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "SELESAI":
        return "bg-slate-50 text-slate-400 border-slate-100";
      case "DIBATALKAN":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Package size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-800">
              Pembelian Grosiran
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            Kelola pesanan dalam jumlah besar (Grosir) yang membutuhkan
            konfirmasi ketersediaan stok Anda.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="py-1.5">
        <SegmentedControl
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { id: "semua", label: "Semua Pesanan" },
            { id: "MENUNGGU_KONFIRMASI_SELLER", label: "Perlu Konfirmasi" },
            { id: "MENUNGGU_BAYAR", label: "Menunggu Bayar" },
            { id: "DIPROSES", label: "Diproses" },
          ].map((tab) => {
            const count =
              tab.id === "semua"
                ? typedOrders.filter(
                    (o) => !["SELESAI", "DIBATALKAN"].includes(o.status),
                  ).length
                : typedOrders.filter((o) => o.status === tab.id).length;
            const isActive = filterStatus === tab.id;

            return {
              value: tab.id,
              label: (
                <div className="flex items-center gap-2">
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              ),
            };
          })}
        />
      </div>

      {/* Main Content Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100/80 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100/50 text-slate-300">
            <Package size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-base text-slate-700">
              Tidak Ada Pesanan
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto px-4 leading-relaxed font-medium">
              Tidak ada pesanan grosir yang ditemukan sesuai dengan filter saat
              ini.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/seller/pesanan-grosir/${order.id}`)}
              className="bg-white rounded-3xl border border-slate-100 p-5 md:p-6 hover:shadow-lg hover:shadow-slate-100/60 hover:border-emerald-200/60 transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5 group"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100/60 shrink-0">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${statusColor(order.status)} shrink-0`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-750 group-hover:text-emerald-600 transition-colors text-base truncate">
                    {order.konsumen?.nama || "Guest User"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2.5">
                    <span>Dipesan pada {formatTanggal(order.createdAt)}</span>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                    <span>{order.item?.length || 0} Item Produk</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50 shrink-0">
                <div className="text-left md:text-right space-y-0.5">
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                    Total Transaksi
                  </p>
                  <p className="text-lg font-medium text-emerald-650 leading-none">
                    {formatRupiah(order.totalHarga || 0)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/seller/pesanan-grosir/${order.id}`);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 rounded-xl text-xs font-medium transition-all flex items-center gap-1 border border-slate-100 hover:border-emerald-100 shrink-0"
                >
                  Detail
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrosirOrdersPage;
