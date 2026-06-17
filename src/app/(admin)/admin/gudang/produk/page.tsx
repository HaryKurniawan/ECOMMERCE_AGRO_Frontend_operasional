"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Package,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  Warehouse,
} from "lucide-react";

import { gudangApi } from "@/lib/ecommerce-api";

interface ProdukGudang {
  id: string;
  nama: string;
  varianProduk?: string;
  deskripsi?: string;
  satuan: string;
  hargaGudang: number;
  gambarUrl?: string;
  gudangId?: string;
  gudangNama?: string;
  gudangKode?: string;
}

interface WarehouseItem {
  id: string;
  nama: string;
}

const fmtRp = (n: number) => `Rp ${(n || 0).toLocaleString("id-ID")}`;

export default function ProdukGudangPage() {
  const [products, setProducts] = useState<ProdukGudang[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [selectedGudang, setSelectedGudang] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Ambil daftar gudang untuk filter
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await gudangApi.getWarehouses();
        const raw = res?.data?.data || res?.data || [];
        const list = Array.isArray(raw) ? raw : (raw.data ?? []);
        setWarehouses(list);
      } catch (err) {
        console.error("Error fetching warehouses:", err);
      }
    };
    fetchWarehouses();
  }, []);

  const fetchProducts = async (gudangId?: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const res = await gudangApi.getProdukGudang(
        gudangId && gudangId !== "ALL" ? gudangId : undefined,
      );
      const raw = res?.data?.data || res?.data || [];
      setProducts(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch (err: any) {
      console.error("Error fetching warehouse products:", err);
      setError("Gagal memuat daftar produk gudang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(selectedGudang);
  }, [selectedGudang]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.nama?.toLowerCase().includes(search.toLowerCase()) ||
          p.deskripsi?.toLowerCase().includes(search.toLowerCase()) ||
          p.gudangNama?.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <Package size={26} className="text-emerald-600" /> Produk Gudang
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Daftar produk yang dijual gudang ke seller (katalog pengadaan)
          </p>
        </div>
        <button
          onClick={() => fetchProducts(selectedGudang)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:text-emerald-600 shadow-sm active:scale-95 transition-all"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Segarkan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan nama atau gudang..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <select
          value={selectedGudang}
          onChange={(e) => setSelectedGudang(e.target.value)}
          className="px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all md:w-64"
        >
          <option value="ALL">Semua Gudang</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 flex flex-col items-center justify-center gap-3">
          <Loader2 size={40} className="animate-spin text-emerald-600" />
          <p className="text-gray-400 font-medium">Memuat produk gudang...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-300 w-8 h-8" />
          </div>
          <h3 className="text-gray-900 text-lg font-bold">Tidak Ada Produk</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
            {search
              ? "Tidak ada produk yang cocok dengan pencarian Anda."
              : "Belum ada produk yang dijual gudang."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <div
              key={`${p.gudangId}-${p.id}`}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group"
            >
              {/* Image */}
              <div className="h-40 bg-gray-50 relative overflow-hidden border-b border-gray-100">
                {p.gambarUrl ? (
                  <Image
                    src={p.gambarUrl}
                    alt={p.nama}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50/50">
                    <Package size={40} className="text-emerald-200" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {p.varianProduk ? `${p.nama} ${p.varianProduk}` : p.nama}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                    {p.nama}
                  </span>
                  {p.varianProduk && (
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                      {p.varianProduk}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-emerald-700">
                    {fmtRp(p.hargaGudang)}
                  </span>
                  <span className="text-xs text-gray-400">/ {p.satuan}</span>
                </div>
                {p.gudangNama && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-1 border-t border-gray-50">
                    <Warehouse size={12} className="text-gray-400" />
                    {p.gudangNama}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
