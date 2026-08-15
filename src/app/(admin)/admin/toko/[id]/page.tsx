"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Clock,
  Phone,
  ArrowLeft,
  Package,
  ShoppingBag,
  Info,
  CalendarDays,
  Truck,
  Building2,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

import {
  storesApi,
  productsApi,
  ordersApi,
  gudangApi,
  formatTanggal,
  formatRupiah,
} from "@/lib/ecommerce-api";

interface StoreItem {
  id: string;
  nama: string;
  status: string;
  kabupaten?: string;
  wilayah?: string;
  lat?: number;
  lng?: number;
  telepon?: string;
  jamOperasional?: string;
  alamat?: string;
  createdAt?: string;
  courierStaff?: { name: string };
  warehouseAdmin?: { name: string };
}

interface ProductItem {
  id: string;
  nama: string;
  harga: number;
  status: string;
  gambarBase64?: string;
  gambarUtama?: string;
  gambarUrl?: string;
  fotoLainnya?: string[];
  stok?: number;
  rating?: number;
  grades?: Array<{ grade: string; stok: number }>;
}

interface OrderItem {
  id: string;
  createdAt: string;
  customer?: { name: string };
  user?: { name: string };
  totalAmount?: number;
  totalHarga?: number;
  status: string;
  orders?: { tokoId: string }[];
  tokoId?: string;
  items?: { product?: { tokoId: string } }[];
}

interface StockRequestItem {
  id: string;
  nomorPengajuan?: string;
  createdAt: string;
  status: string;
  catatan?: string;
  tokoId?: string;
  gudangId?: string;
  gudang?: {
    nama?: string;
  };
  toko?: {
    id_toko?: string;
    id?: string;
    nama?: string;
  };
  items?: Array<{
    id: string;
    produkGudangId?: string;
    produkGudang?: {
      nama?: string;
      satuan?: string;
    };
    namaProduk?: string;
    jumlahPermintaan: number;
    jumlahDisetujui?: number;
  }>;
}

export default function DetailTokoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<
    "info" | "produk" | "riwayat" | "stok"
  >("info");

  const [store, setStore] = useState<StoreItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (!id) return;
      try {
        if (showLoading) setLoading(true);
        setError("");

        // 1. Fetch store
        const storeRes = await storesApi.getById(id);
        const storeData = storeRes?.data?.data || storeRes?.data;
        setStore(storeData);

        // 2. Fetch products
        try {
          const productsRes = await productsApi.getByStore(id);
          const productsData =
            productsRes?.data?.data || productsRes?.data || [];
          const prodList = Array.isArray(productsData)
            ? productsData
            : productsData.data || [];
          setProducts(prodList);
        } catch (err) {
          console.warn("Failed to fetch products", err);
        }

        // 3. Fetch orders directly via admin API
        try {
          const adminOrdersRes = await ordersApi.adminGetAll({ limit: 1000 });
          const adminOrdersData =
            adminOrdersRes?.data?.data || adminOrdersRes?.data || [];
          const adminOrdList = Array.isArray(adminOrdersData)
            ? adminOrdersData
            : adminOrdersData.data || [];
          const filteredOrders = adminOrdList.filter((o: OrderItem) => {
            const ordtokoId = o.orders?.[0]?.tokoId;
            const itemtokoId = o.items?.[0]?.product?.tokoId;
            return ordtokoId === id || o.tokoId === id || itemtokoId === id;
          });
          setOrders(filteredOrders);
        } catch (err) {
          console.warn("Could not fetch orders for store", err);
        }

        // 4. Fetch real stock requests for this store
        try {
          const stockRes = await gudangApi.getAdminAllStockRequests();
          const rawStock = stockRes?.data?.data || stockRes?.data || [];
          const stockArr = Array.isArray(rawStock)
            ? rawStock
            : (rawStock.data ?? []);
          const filteredStock = stockArr.filter((s: StockRequestItem) => {
            const reqTokoId = s.tokoId || s.toko?.id_toko || s.toko?.id;
            return reqTokoId === id;
          });
          setStockRequests(filteredStock);
        } catch (err) {
          console.warn("Failed to fetch stock requests", err);
          setStockRequests([]);
        }
      } catch {
        setError("Gagal memuat detail toko.");
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    Promise.resolve().then(() => fetchData(false));
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 min-h-[400px]">
        <Loader2 size={36} className="animate-spin text-emerald-600" />
        <p className="text-slate-400 font-normal text-xs">
          Memuat detail toko...
        </p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="max-w-md mx-auto py-20 px-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-center gap-2 text-center">
          <AlertCircle size={28} className="text-rose-500 mb-1" />
          <h2 className="text-base font-normal text-slate-800">
            Data Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-400 font-normal">
            {error || "Toko tidak ditemukan"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-3 px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-normal hover:bg-slate-50 transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const mapUrl =
    store.lat && store.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${store.lng - 0.012}%2C${store.lat - 0.007}%2C${store.lng + 0.012}%2C${store.lat + 0.007}&layer=mapnik&marker=${store.lat}%2C${store.lng}`
      : "";

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in font-sans pb-8">
      {/* Header Info Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-normal bg-slate-50 border border-slate-200 w-fit px-3 py-1.5 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft size={13} /> Kembali ke Daftar
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center text-2xl font-normal flex-shrink-0">
                {store.nama?.charAt(0) || "🏪"}
              </div>
              <div>
                <h1 className="text-lg font-normal text-slate-900 leading-tight">
                  {store.nama}
                </h1>
                <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 font-normal">
                  <MapPin size={13} className="text-slate-400" />{" "}
                  {store.kabupaten} {store.wilayah ? `• ${store.wilayah}` : ""}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                      store.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : store.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {store.status === "ACTIVE"
                      ? "Aktif"
                      : store.status === "PENDING"
                        ? "Menunggu"
                        : "Nonaktif / Suspend"}
                  </span>
                </div>
              </div>
            </div>

            {/* Affiliations Cards in Header */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200 flex items-center gap-3 min-w-[170px]">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                  <Truck size={14} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-normal text-slate-400 tracking-wider">
                    Kurir Afiliasi
                  </p>
                  <p className="font-normal text-xs text-slate-800 mt-0.5">
                    {store.courierStaff?.name || "Belum Ada Kurir"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-200 flex items-center gap-3 min-w-[170px]">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                  <Building2 size={14} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-normal text-slate-400 tracking-wider">
                    Gudang Penyimpanan
                  </p>
                  <p className="font-normal text-xs text-slate-800 mt-0.5">
                    {store.warehouseAdmin?.name || "Belum Ada Gudang"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-8 px-6 border-b border-slate-100 overflow-x-auto no-scrollbar">
          {[
            { id: "info", label: "Info & Lokasi", icon: Info },
            { id: "produk", label: "Produk Dijual", icon: Package },
            { id: "riwayat", label: "Riwayat Penjualan", icon: ShoppingBag },
            { id: "stok", label: "Riwayat Stok Gudang", icon: Truck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as "info" | "produk" | "riwayat" | "stok")
              }
              className={`flex items-center gap-2 py-3 text-xs font-normal relative whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <tab.icon size={14} className="stroke-[1.5]" />
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-slate-900" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        {/* INFO TAB */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
              <h3 className="font-normal text-sm text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Info size={15} className="text-emerald-600" /> Detail Informasi
              </h3>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Nama Toko
                  </span>
                  <span className="text-slate-800 font-normal mt-0.5 block">
                    {store.nama}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Telepon
                  </span>
                  <span className="text-slate-800 font-normal mt-0.5 block">
                    {store.telepon || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Jam Operasional
                  </span>
                  <span className="text-slate-800 font-normal mt-0.5 block">
                    {store.jamOperasional || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Alamat
                  </span>
                  <span className="text-slate-800 font-normal mt-0.5 block">
                    {store.alamat || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Bergabung Sejak
                  </span>
                  <span className="text-slate-800 font-normal mt-0.5 block">
                    {store.createdAt ? formatTanggal(store.createdAt) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
              <h3 className="font-normal text-sm text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
                <MapPin size={15} className="text-emerald-600" /> Lokasi Fisik
                Toko
              </h3>
              {mapUrl ? (
                <div className="h-[280px] rounded-xl overflow-hidden border border-slate-200">
                  <iframe
                    title="Peta Lokasi Toko"
                    width="100%"
                    height="100%"
                    src={mapUrl}
                    style={{ border: 0 }}
                  />
                </div>
              ) : (
                <div className="h-[200px] bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-xs text-slate-400 font-normal">
                  Koordinat lokasi peta belum ditentukan.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUK TAB */}
        {activeTab === "produk" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-normal text-sm text-slate-800 flex items-center gap-2">
                <Package size={15} className="text-emerald-600" /> Katalog
                Produk Toko
              </h3>
              <span className="text-xs text-slate-400 font-normal">
                {products.length} Produk
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-slate-100">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-normal text-slate-800 text-xs">
                  Belum ada produk
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toko ini belum menambahkan produk ke katalog.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((prod, idx) => (
                  <Link
                    href={`/admin/produk/${prod.id}`}
                    key={prod.id || (prod as any).id_produk || `prod-${idx}`}
                    className="block bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="aspect-square bg-slate-50 relative overflow-hidden border-b border-slate-100 p-2">
                      {prod.gambarUrl ||
                      prod.gambarBase64 ||
                      prod.gambarUtama ? (
                        <Image
                          src={
                            prod.gambarUrl ||
                            prod.gambarBase64 ||
                            prod.gambarUtama ||
                            ""
                          }
                          alt={prod.nama}
                          className="object-cover"
                          fill
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package size={24} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="font-normal text-xs text-slate-800 truncate">
                        {prod.nama}
                      </h4>
                      <p className="text-emerald-600 font-normal text-xs">
                        {formatRupiah(prod.harga || 0)}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Stok: {prod.stok || 0}</span>
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star
                            size={9}
                            className="fill-amber-400 text-amber-400"
                          />
                          {Number(prod.rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RIWAYAT PENJUALAN TAB */}
        {activeTab === "riwayat" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-normal text-sm text-slate-800 flex items-center gap-2">
                <ShoppingBag size={15} className="text-emerald-600" /> Riwayat
                Pesanan
              </h3>
              <span className="text-xs text-slate-400 font-normal">
                {orders.length} Pesanan
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-slate-100">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-normal text-slate-800 text-xs">
                  Belum ada pesanan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Belum ada riwayat transaksi yang tercatat untuk toko ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white text-xs">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 border-b border-slate-200 text-[11px] font-normal uppercase tracking-wider">
                      <th className="px-5 py-3 font-normal">Order ID</th>
                      <th className="px-5 py-3 font-normal">Tanggal</th>
                      <th className="px-5 py-3 font-normal">Pembeli</th>
                      <th className="px-5 py-3 font-normal">Total</th>
                      <th className="px-5 py-3 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order, idx) => (
                      <tr
                        key={
                          order.id ||
                          (order as any).id_pesanan ||
                          `order-${idx}`
                        }
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-emerald-600 font-normal">
                          #{order?.id?.slice(-8).toUpperCase() ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-normal">
                          {formatTanggal(order.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-slate-800 font-normal">
                          {order.customer?.name || order.user?.name || "-"}
                        </td>
                        <td className="px-5 py-3 text-slate-800 font-normal">
                          {formatRupiah(
                            order.totalAmount || order.totalHarga || 0,
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-normal rounded-md uppercase tracking-wider border ${
                              ["DELIVERED", "COMPLETED"].includes(order.status)
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : order.status === "CANCELLED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RIWAYAT STOK GUDANG TAB (DATA RIIL DARI DATABASE) */}
        {activeTab === "stok" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-normal text-sm text-slate-800 flex items-center gap-2">
                <Truck size={15} className="text-emerald-600" /> Riwayat
                Pengajuan & Mutasi Stok Gudang
              </h3>
              <span className="text-xs text-slate-400 font-normal">
                {stockRequests.length} Pengajuan
              </span>
            </div>

            {stockRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-slate-100">
                <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-normal text-slate-800 text-xs">
                  Belum Ada Riwayat Pengajuan Stok
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                  Toko ini belum pernah mengajukan permintaan pengadaan atau
                  mutasi stok ke gudang penyimpanan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white text-xs">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 border-b border-slate-200 text-[11px] font-normal uppercase tracking-wider">
                      <th className="px-5 py-3 font-normal">Tanggal</th>
                      <th className="px-5 py-3 font-normal">No. Pengajuan</th>
                      <th className="px-5 py-3 font-normal">Gudang</th>
                      <th className="px-5 py-3 font-normal">Item Produk</th>
                      <th className="px-5 py-3 font-normal">
                        Total Permintaan
                      </th>
                      <th className="px-5 py-3 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockRequests.map((item, idx) => {
                      const totalQty = (item.items || []).reduce(
                        (acc, it) => acc + (it.jumlahPermintaan || 0),
                        0,
                      );
                      const itemsPreview = (item.items || [])
                        .map(
                          (it) =>
                            it.produkGudang?.nama || it.namaProduk || "Produk",
                        )
                        .slice(0, 2)
                        .join(", ");

                      return (
                        <tr
                          key={
                            item.id ||
                            (item as any).id_pengajuan ||
                            `stock-${idx}`
                          }
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3 text-slate-500 font-normal">
                            {formatTanggal(item.createdAt)}
                          </td>
                          <td className="px-5 py-3 font-mono text-emerald-600 font-normal">
                            {item.nomorPengajuan ||
                              `#${item.id.slice(-8).toUpperCase()}`}
                          </td>
                          <td className="px-5 py-3 text-slate-700 font-normal">
                            {item.gudang?.nama ||
                              store.warehouseAdmin?.name ||
                              "Gudang Utama"}
                          </td>
                          <td className="px-5 py-3 text-slate-800 font-normal max-w-xs truncate">
                            {itemsPreview || "—"}
                            {(item.items?.length || 0) > 2
                              ? ` (+${item.items!.length - 2} lainnya)`
                              : ""}
                          </td>
                          <td className="px-5 py-3 text-slate-800 font-normal">
                            {totalQty} unit / kg
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-normal rounded-md uppercase tracking-wider border ${
                                ["COMPLETED", "APPROVED", "DISETUJUI"].includes(
                                  item.status,
                                )
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : ["REJECTED", "DITOLAK"].includes(
                                        item.status,
                                      )
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
