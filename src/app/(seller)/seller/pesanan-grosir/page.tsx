"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Loader2,
  AlertCircle,
  ChevronRight,
  Copy,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";

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

function CustomSortDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative min-w-[150px] h-[38px] group" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-full flex items-center justify-between gap-2 bg-white border shadow-sm rounded-xl px-3.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer ${
          isOpen
            ? "border-emerald-500 ring-4 ring-emerald-500/10"
            : "border-slate-200 hover:border-emerald-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <ArrowUpDown
            size={14}
            className={`transition-colors ${isOpen ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-500"}`}
          />
          <span className="truncate">{selectedOption?.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute z-50 mt-1 w-full right-0 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-200 origin-top ${
          isOpen
            ? "opacity-100 scale-y-100 translate-y-0"
            : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="max-h-60 overflow-y-auto py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                value === opt.value
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const GrosirOrdersPage: React.FC = () => {
  const router = useRouter();
  const { store, loading: storeLoading } = useSellerDashboard();
  const { orders, isLoading: ordersLoading } = useSellerGrosirOrders(
    store?.id ?? "",
  );
  const [filterStatus, setFilterStatus] = useState("semua");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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

  const filtered = typedOrders
    .filter((o) => {
      if (filterStatus === "semua") {
        return !["SELESAI", "DIBATALKAN"].includes(o.status);
      }
      return o.status === filterStatus;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

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
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="py-1.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SegmentedControl
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { id: "semua", label: "Aktif" },
            { id: "MENUNGGU_KONFIRMASI_SELLER", label: "Perlu Konfirmasi" },
            { id: "MENUNGGU_BAYAR", label: "Menunggu Bayar" },
            { id: "DIPROSES", label: "Diproses" },
            { id: "DIKIRIM", label: "Dikirim" },
            { id: "SELESAI", label: "Selesai" },
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

        <CustomSortDropdown
          value={sortOrder}
          onChange={(val) => setSortOrder(val as "desc" | "asc")}
          options={[
            { value: "desc", label: "Urutkan: Terbaru" },
            { value: "asc", label: "Urutkan: Terlama" },
          ]}
        />
      </div>

      {/* Main Content Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 max-w-xl mx-auto space-y-5">
          <div className="w-14 h-14 bg-slate-100/50 border-2 border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Package size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-lg text-slate-700">
              Tidak Ada Pesanan
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto px-4 leading-relaxed font-medium">
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
              className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/60 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Header strip */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-medium text-slate-800">
                    {order.konsumen?.nama || "Guest User"}
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide ${statusColor(order.status)}`}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatRupiah(Number(order.totalHarga || 0))}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {/* Meta row */}
                <div className="flex items-center gap-3 mb-4 text-[11px] text-slate-400">
                  <span className="font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(order.id);
                    }}
                    title="Salin ID"
                    className="text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    <Copy size={11} />
                  </button>
                  <span>•</span>
                  <span>{formatTanggal(order.createdAt)}</span>
                </div>

                {/* Items */}
                {order.item && order.item.length > 0 ? (
                  <div className="space-y-2.5">
                    {order.item.slice(0, 2).map((item, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center text-sm flex-shrink-0 border border-slate-100">
                          <Package size={14} className="text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-700 truncate">
                            {item.produk?.nama || "—"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.jumlah} kg ×{" "}
                            {formatRupiah(Number(item.harga))}
                          </p>
                        </div>
                        <p className="text-[12px] font-medium text-slate-600 whitespace-nowrap">
                          {formatRupiah(
                            Number(item.jumlah) * Number(item.harga),
                          )}
                        </p>
                      </div>
                    ))}
                    {order.item.length > 2 && (
                      <p className="text-[11px] text-slate-400 pl-12">
                        +{order.item.length - 2} produk lainnya
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Data produk tidak tersedia
                  </p>
                )}
              </div>

              {/* Footer actions */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-2 px-5 py-3 bg-slate-50/60 border-t border-slate-100/80"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Aksi grosir khusus dapat ditambahkan di sini nantinya */}
                </div>

                <button
                  onClick={() =>
                    router.push(`/seller/pesanan-grosir/${order.id}`)
                  }
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 font-medium transition-colors whitespace-nowrap"
                >
                  Detail <ChevronRight size={13} />
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
