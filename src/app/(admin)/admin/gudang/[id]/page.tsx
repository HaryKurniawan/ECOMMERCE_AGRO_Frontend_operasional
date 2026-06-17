"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Warehouse,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Store,
  Calendar,
  User,
} from "lucide-react";

import { gudangApi, apiClient } from "@/lib/ecommerce-api";

interface WarehouseDetail {
  id: string;
  kode: string;
  nama: string;
  alamat: string;
  kabupaten: string;
  provinsi: string;
  telepon?: string;
  email?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface StockRequest {
  id: string;
  tokoId: string;
  gudangId: string;
  produkGudangId: string;
  jumlah: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  toko?: {
    id: string;
    nama: string;
  };
  produk?: {
    id: string;
    nama: string;
    satuan: string;
  };
}

export default function DetailGudangPage() {
  const router = useRouter();
  const params = useParams();
  const gudangId = params.id as string;

  const [gudang, setGudang] = useState<WarehouseDetail | null>(null);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      // Fetch gudang detail
      const gudangRes = await gudangApi.getWarehouseById(gudangId);
      const gudangData = gudangRes?.data?.data || gudangRes?.data;
      setGudang(gudangData);

      // Fetch pengajuan stok untuk gudang ini
      try {
        const requestsRes = await apiClient.get(
          `/ecommerce/pengajuan-stok/admin/all`,
        );
        const requestsData = requestsRes?.data?.data || requestsRes?.data || [];
        const allRequests = Array.isArray(requestsData)
          ? requestsData
          : (requestsData.data ?? []);

        // Filter by gudangId
        const filteredByGudang = allRequests.filter(
          (req: any) => req.gudangId === gudangId,
        );
        setRequests(filteredByGudang);
      } catch (err) {
        console.warn("Failed to fetch stock requests:", err);
        setRequests([]);
      }
    } catch (err: any) {
      console.error("Error fetching gudang detail:", err);
      setError("Gagal memuat data gudang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gudangId) {
      fetchData();
    }
  }, [gudangId]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 flex items-center gap-1 w-fit">
            <CheckCircle size={14} /> Aktif
          </span>
        );
      case "INACTIVE":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-gray-600 bg-gray-50 border border-gray-100 flex items-center gap-1 w-fit">
            <XCircle size={14} /> Nonaktif
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 w-fit">
            {status}
          </span>
        );
    }
  };

  const requestStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 flex items-center gap-1 w-fit uppercase">
            <Clock size={12} /> Menunggu
          </span>
        );
      case "APPROVED":
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 flex items-center gap-1 w-fit uppercase">
            <CheckCircle size={12} /> Disetujui
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 flex items-center gap-1 w-fit uppercase">
            <XCircle size={12} /> Ditolak
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-100 w-fit uppercase">
            {status}
          </span>
        );
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "ALL") return true;
    return req.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={40} className="animate-spin text-emerald-600" />
        <p className="text-gray-400 font-medium">Memuat detail gudang...</p>
      </div>
    );
  }

  if (error || !gudang) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm"
        >
          <ChevronLeft size={18} /> Kembali
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-2xl flex items-center gap-3">
          <AlertCircle size={24} className="shrink-0" />
          <p className="text-sm font-semibold">
            {error || "Gudang tidak ditemukan."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
              <Warehouse size={26} className="text-emerald-600" /> {gudang.nama}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Kode: {gudang.kode}</p>
          </div>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:text-emerald-600 shadow-sm active:scale-95 transition-all"
        >
          <RefreshCw size={16} />
          Segarkan
        </button>
      </div>

      {/* Detail Gudang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Warehouse size={18} className="text-emerald-600" /> Informasi
            Gudang
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Status
              </p>
              {statusBadge(gudang.status)}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Provinsi
              </p>
              <p className="text-sm font-medium text-gray-900">
                {gudang.provinsi}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Kabupaten
              </p>
              <p className="text-sm font-medium text-gray-900">
                {gudang.kabupaten}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Alamat Lengkap
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {gudang.alamat}
              </p>
            </div>

            {gudang.telepon && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Telepon
                </p>
                <a
                  href={`tel:${gudang.telepon}`}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Phone size={14} /> {gudang.telepon}
                </a>
              </div>
            )}

            {gudang.email && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Email
                </p>
                <a
                  href={`mailto:${gudang.email}`}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Mail size={14} /> {gudang.email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={18} className="text-emerald-600" /> Statistik
            Pengajuan
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  Menunggu
                </span>
              </div>
              <span className="text-lg font-bold text-amber-700">
                {requests.filter((r) => r.status === "PENDING").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">
                  Disetujui
                </span>
              </div>
              <span className="text-lg font-bold text-emerald-700">
                {requests.filter((r) => r.status === "APPROVED").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  Ditolak
                </span>
              </div>
              <span className="text-lg font-bold text-red-700">
                {requests.filter((r) => r.status === "REJECTED").length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Total</span>
              </div>
              <span className="text-lg font-bold text-gray-700">
                {requests.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Pengajuan */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={18} className="text-emerald-600" /> Riwayat
            Pengajuan Stok
          </h3>
        </div>

        {/* Filter */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex gap-2 flex-wrap">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === status
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-200"
                }`}
              >
                {status === "ALL"
                  ? "Semua"
                  : status === "PENDING"
                    ? "Menunggu"
                    : status === "APPROVED"
                      ? "Disetujui"
                      : "Ditolak"}
              </button>
            ),
          )}
        </div>

        {/* Table */}
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              Tidak ada pengajuan stok
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Toko / Seller
                  </th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Produk
                  </th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Jumlah
                  </th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Status
                  </th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[11px]">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-emerald-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {req.toko?.nama || "Toko"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {req.produk?.nama || "Produk"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {req.produk?.satuan || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {req.jumlah}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {requestStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
