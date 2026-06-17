"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ClipboardList,
  Search,
  Loader2,
  AlertCircle,
  ShoppingBag,
  MapPin,
  Store,
  CreditCard,
  Package,
  UserCircle,
} from "lucide-react";

import { ordersApi, formatRupiah, formatTanggal } from "@/lib/ecommerce-api";

interface OrderItem {
  produk?: {
    nama?: string;
    gambarUrl?: string;
    toko?: { nama?: string };
  };
  product?: {
    nama?: string;
    gambarUrl?: string;
    store?: { nama?: string };
  };
  nama?: string;
  grade?: string;
  jumlah?: number | string;
  qty?: number | string;
  harga?: number | string;
}

interface OrderData {
  id: string;
  status: string;
  createdAt?: string;
  tanggal?: string;
  customer?: { name?: string; email?: string };
  konsumen?: { nama?: string; email?: string };
  pembeli?: string;
  penerima?: string;
  alamatKirim?: string;
  alamat?: string;
  tokoNama?: string;
  items?: OrderItem[];
  catatan?: string;
  metodeBayar?: string;
  totalHarga?: number | string;
  total?: number | string;
  ongkir?: number | string;
}

export default function ManajemenPesananPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");

  const statusTabs = [
    { id: "semua", label: "Semua" },
    { id: "menunggu_bayar", label: "Menunggu Bayar" },
    { id: "diproses", label: "Diproses" },
    { id: "dikirim", label: "Dikirim" },
    { id: "selesai", label: "Selesai" },
    { id: "dibatalkan", label: "Dibatalkan" },
  ];

  const fetchOrders = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError("");

        const payload: { limit: number; status?: string } = { limit: 100 };
        if (filterStatus !== "semua") {
          payload.status = filterStatus.toUpperCase();
        }

        const res = await ordersApi.adminGetAll(payload);
        const data = res?.data?.data || res?.data;

        if (data && Array.isArray(data.data)) {
          setOrders(data.data);
        } else if (Array.isArray(data)) {
          setOrders(data);
        } else {
          setOrders([]);
        }
      } catch {
        setError("Gagal memuat data pesanan.");
      } finally {
        setLoading(false);
      }
    },
    [filterStatus],
  );

  useEffect(() => {
    Promise.resolve().then(() => fetchOrders(false)); // Already loading by default
  }, [filterStatus, fetchOrders]);

  const getStatusBadge = (status: string) => {
    const s = status ? status.toUpperCase() : "";
    switch (s) {
      case "MENUNGGU_BAYAR":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "DIPROSES":
        return "bg-amber-50 text-amber-600 border-amber-200";
      case "DIKIRIM":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "SELESAI":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "DIBATALKAN":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    const s = status ? status.toUpperCase() : "";
    switch (s) {
      case "MENUNGGU_BAYAR":
        return "Menunggu Bayar";
      case "DIPROSES":
        return "Sedang Diproses";
      case "DIKIRIM":
        return "Dalam Pengiriman";
      case "SELESAI":
        return "Pesanan Selesai";
      case "DIBATALKAN":
        return "Dibatalkan";
      default:
        return status || "Unknown";
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (o.id || "").toLowerCase().includes(query) ||
      (o.customer?.name || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-emerald-50 via-teal-50/20 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <ClipboardList size={24} />
              </div>
              <h1 className="text-3xl font-display font-bold text-gray-900">
                Manajemen Pesanan
              </h1>
            </div>
            <p className="text-gray-500 font-medium">
              Lacak dan pantau seluruh transaksi masuk pada ekosistem platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                Total Tampil
              </span>
              <span className="text-xl font-bold text-emerald-800">
                {filteredOrders.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-20">
        <div className="flex overflow-x-auto w-full md:w-auto hide-scrollbar gap-2 pb-2 md:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                filterStatus === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72 flex-shrink-0">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID Pesanan / Nama..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
          />
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="bg-white rounded-[32px] border border-gray-100 p-20 flex flex-col items-center justify-center text-center shadow-sm">
          <Loader2 size={40} className="animate-spin text-emerald-600 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Menyinkronkan Pesanan
          </h3>
          <p className="text-gray-500 text-sm">
            Menarik data transaksi terbaru dari server...
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-[32px] border border-red-100 p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-700 mb-2">
            Gagal Memuat Data
          </h3>
          <p className="text-red-600 font-medium mb-6">{error}</p>
          <button
            onClick={() => fetchOrders()}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 p-20 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={32} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Pesanan Kosong
          </h3>
          <p className="text-gray-500 text-sm">
            Tidak ada pesanan yang sesuai dengan filter saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const firstItem = order.items?.[0];
            const storeName =
              firstItem?.produk?.toko?.nama ||
              firstItem?.product?.store?.nama ||
              order.tokoNama ||
              "Toko Tidak Diketahui";
            const customerName =
              order.konsumen?.nama ||
              order.penerima ||
              order.customer?.name ||
              order.pembeli ||
              "Anonim";
            const orderIdShort = order.id
              ? order.id.slice(-8).toUpperCase()
              : "UNKNOWN";

            return (
              <div
                key={order.id}
                className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
              >
                {/* Header Card */}
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-gray-200 p-2 rounded-xl flex items-center gap-2 font-mono text-xs font-bold text-gray-700">
                      <ShoppingBag size={14} className="text-emerald-500" />#
                      {orderIdShort}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(order.id);
                        }}
                        className="ml-1 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Salin ID Pesanan"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {formatTanggal(
                        order.createdAt ||
                          order.tanggal ||
                          new Date().toISOString(),
                      )}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${getStatusBadge(
                      order.status,
                    )}`}
                  >
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Col: Customer & Shipping Info */}
                  <div className="md:col-span-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <UserCircle size={16} />{" "}
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Pembeli
                        </span>
                      </div>
                      <p className="font-bold text-gray-900">{customerName}</p>
                      {order.customer?.email && (
                        <p className="text-xs text-gray-500">
                          {order.customer.email}
                        </p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <MapPin size={16} />{" "}
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Alamat Pengiriman
                        </span>
                      </div>
                      <p
                        className="text-sm font-medium text-gray-700 leading-relaxed line-clamp-2"
                        title={order.alamatKirim || order.alamat}
                      >
                        {order.alamatKirim ||
                          order.alamat ||
                          "Tidak ada alamat"}
                      </p>
                    </div>
                  </div>

                  {/* Middle Col: Items */}
                  <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <div className="flex items-center gap-2 mb-4 text-emerald-600">
                      <Store size={16} />{" "}
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {storeName}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {order.items?.map((item, idx: number) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {item.product?.gambarUrl ? (
                              <Image
                                src={item.product?.gambarUrl}
                                className="object-cover"
                                alt="item"
                                fill
                                unoptimized
                              />
                            ) : (
                              <Package size={16} className="text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {item.product?.nama || item.nama || "Produk"}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">
                              {item.jumlah || item.qty}x
                            </p>
                          </div>
                          <div className="text-sm font-bold text-gray-900 shrink-0">
                            {formatRupiah(
                              Number(item.harga || 0) *
                                Number(item.jumlah || item.qty || 1),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {order.catatan && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                          Catatan Pembeli
                        </p>
                        <p className="text-xs text-amber-800 italic">
                          {order.catatan}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Col: Totals */}
                  <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <CreditCard size={16} />{" "}
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Pembayaran
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {order.metodeBayar || "-"}
                      </p>

                      <div className="pt-3 space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                          <span>Total Items/Barang</span>
                          <span>
                            {formatRupiah(
                              Number(order.totalHarga || order.total || 0) -
                                Number(order.ongkir || 0),
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                          <span>Ongkos Kirim</span>
                          <span>{formatRupiah(order.ongkir || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                        Total Tagihan
                      </p>
                      <p className="text-2xl font-display font-bold text-emerald-700">
                        {formatRupiah(order.totalHarga || order.total || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
