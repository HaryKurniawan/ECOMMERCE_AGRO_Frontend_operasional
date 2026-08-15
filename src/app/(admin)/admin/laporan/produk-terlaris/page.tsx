"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  Package,
  TrendingDown,
  Minus,
  Store,
} from "lucide-react";

import { analyticsApi, type TrenProdukItem } from "@/lib/api/analytics";
import { storesApi } from "@/lib/api/stores";

interface TokoOption {
  id: string;
  nama: string;
}

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// --- SUB-COMPONENTS ---

const TrendIcon = ({ arah }: { arah: string }) => {
  if (arah === "UP")
    return <TrendingUp size={12} className="text-primary-600" />;
  if (arah === "DOWN")
    return <TrendingDown size={12} className="text-red-500" />;
  return <Minus size={12} className="text-slate-400" />;
};

const trendBadge = (arah: string, persen: number) => {
  const colors =
    arah === "UP"
      ? "bg-primary-50 border-primary-100 text-primary-700"
      : arah === "DOWN"
        ? "bg-red-50 border-red-100 text-red-600"
        : "bg-slate-50 border-slate-100 text-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-normal ${colors}`}
    >
      <TrendIcon arah={arah} />
      {arah === "UP" && "+"}
      {persen.toFixed(1)}%
    </span>
  );
};

export default function ProdukTerlarisAdminPage() {
  const [stores, setStores] = useState<TokoOption[]>([]);
  const [selectedToko, setSelectedToko] = useState<string>("");
  const [items, setItems] = useState<TrenProdukItem[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoadingStores(true);
        const res = await storesApi.adminGetAll({ limit: 200 });
        const raw = res?.data?.data || res?.data || [];
        const list: TokoOption[] = Array.isArray(raw)
          ? raw
          : (raw.data ?? raw.items ?? []);
        setStores(list);
        // Do not force select the first store, leave it as "" (Semua Toko)
      } catch (err) {
        console.error("Error fetching stores:", err);
        setError("Gagal memuat daftar toko.");
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  }, []);

  const fetchTrenProduk = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getTrenProdukBulanan(
        selectedToko,
        undefined,
        undefined,
        15,
      );
      setItems(result?.data ?? []);
      setPeriodLabel(result?.period?.label ?? "");
    } catch (err: any) {
      setError(err.message || "Gagal memuat tren produk.");
    } finally {
      setLoading(false);
    }
  }, [selectedToko]);

  useEffect(() => {
    // Always fetch, because "" is a valid state (Semua Toko)
    fetchTrenProduk();
  }, [selectedToko, fetchTrenProduk]);

  const maxQty = Math.max(...items.map((i) => Number(i.jumlahTerjual) || 0), 1);

  const handleRefresh = () => {
    fetchTrenProduk();
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 font-sans pb-10">
      {/* ── Page Header ─────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-normal text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-500" />
            Produk Terlaris
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Analisis produk terlaris dan grafik detail untuk setiap Toko/Seller.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-all active:scale-95"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Segarkan
        </button>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* ── Store Selector ─────────────────── */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
          <label className="text-[10px] font-normal text-slate-400 block mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Store size={11} /> Pilih Toko
          </label>
          {loadingStores ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin text-primary-600" />{" "}
              Memuat daftar toko...
            </div>
          ) : (
            <select
              value={selectedToko}
              onChange={(e) => setSelectedToko(e.target.value)}
              className="w-full md:w-96 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
            >
              <option value="">Semua Toko (Global)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          )}
          {periodLabel && !loading && (
            <p className="text-[10px] text-slate-400 mt-2 font-normal">
              Periode: <span className="text-slate-600">{periodLabel}</span>
            </p>
          )}
        </div>

        {/* ── Loading ─────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={26} className="animate-spin text-primary-600" />
              <p className="text-xs text-slate-400 font-normal">
                Memuat data produk terlaris...
              </p>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────── */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-xl">
            <p className="text-xs font-normal">{error}</p>
          </div>
        )}

        {/* ── Chart + Table ─────────────────── */}
        {!loading &&
          !error &&
          items &&
          (items.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
              <Package size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-normal text-slate-500">
                Belum ada data produk untuk toko ini
              </p>
            </div>
          ) : (
            <>
              {/* Mini bar chart visual */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <h2 className="text-xs font-normal text-slate-500 uppercase tracking-wider mb-4">
                  Grafik Qty Terjual — {periodLabel}
                </h2>
                <div className="space-y-2.5">
                  {items.slice(0, 10).map((item) => {
                    const qty = Number(item.jumlahTerjual) || 0;
                    const widthPct = Math.max(2, (qty / maxQty) * 100);
                    return (
                      <div
                        key={item.produk.id}
                        className="flex items-center gap-3"
                      >
                        <div className="w-32 flex-shrink-0 truncate">
                          <p className="text-[11px] font-normal text-slate-700 truncate">
                            {item.produk.nama?.replace(" - ", " ")}
                          </p>
                        </div>
                        <div className="flex-1 h-5 bg-slate-50 rounded-md overflow-hidden relative">
                          <div
                            className="h-full bg-primary-500 rounded-md transition-all duration-700"
                            style={{ width: `${widthPct}%` }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-normal">
                            {qty.toFixed(1)} {item.produk.satuan}
                          </span>
                        </div>
                        <div className="w-16 flex-shrink-0 text-right">
                          {trendBadge(item.trendArah, item.trendPersen)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail Table */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30">
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider">
                          Produk
                        </th>
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider text-right">
                          Terjual
                        </th>
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider text-right">
                          Bulan Lalu
                        </th>
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider text-center">
                          Tren
                        </th>
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider text-right">
                          Revenue
                        </th>
                        <th className="px-5 py-3 text-[10px] font-normal text-slate-400 uppercase tracking-wider text-center">
                          Transaksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((item) => (
                        <tr
                          key={item.produk.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-xs font-normal ${
                                item.rank === 1
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : item.rank === 2
                                    ? "bg-slate-100 text-slate-600"
                                    : item.rank === 3
                                      ? "bg-orange-50 text-orange-600 border border-orange-100"
                                      : "bg-slate-50 text-slate-400"
                              }`}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs font-normal text-slate-800">
                              {item.produk.nama?.replace(" - ", " ")}
                            </p>
                            {item.produk.kategori && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {item.produk.kategori.nama}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs font-normal text-slate-700">
                            {item.jumlahTerjual} {item.produk.satuan}
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs font-normal text-slate-400">
                            {item.prevJumlahTerjual} {item.produk.satuan}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {trendBadge(item.trendArah, item.trendPersen)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs font-normal text-slate-700">
                            {fmtRp(item.totalRevenue)}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs font-normal text-slate-600">
                            {item.jumlahTransaksi}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ))}
      </div>
    </div>
  );
}
