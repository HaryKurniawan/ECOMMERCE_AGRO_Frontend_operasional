"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Store,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";

import { analyticsApi, type TrenBulananResponse } from "@/lib/api/analytics";
import { storesApi } from "@/lib/api/stores";
import TrenBarChart from "@/components/ecommerce/analytics/TrenBarChart";

interface TokoOption {
  id: string;
  nama: string;
}

function fmt(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

export default function TrenPerSellerPage() {
  const [stores, setStores] = useState<TokoOption[]>([]);
  const [selectedToko, setSelectedToko] = useState<string>("");
  const [data, setData] = useState<TrenBulananResponse | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartMode, setChartMode] = useState<"revenue" | "qty">("revenue");

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
        if (list.length > 0) setSelectedToko(list[0].id);
      } catch (err) {
        console.error("Error fetching stores:", err);
        setError("Gagal memuat daftar toko.");
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  }, []);

  const fetchTren = useCallback(async () => {
    if (!selectedToko) return;
    setLoading(true);
    setError("");
    try {
      const result = await analyticsApi.getTrenBulanan(selectedToko, 6);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Gagal memuat tren penjualan seller.");
    } finally {
      setLoading(false);
    }
  }, [selectedToko]);

  useEffect(() => {
    if (selectedToko) fetchTren();
  }, [selectedToko, fetchTren]);

  const lastMonth = data?.summary?.bulanTerakhir;
  const bestMonth = data?.summary?.bulanTerbaik;
  const displayMonth =
    (lastMonth?.jumlahTransaksi ?? 0) > 0 ? lastMonth : bestMonth;
  const growth = lastMonth?.growthRevenuePersen;
  const isUp = growth !== null && growth !== undefined && growth > 0;
  const isDown = growth !== null && growth !== undefined && growth < 0;
  const chartData = data?.data ?? [];

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 font-sans pb-10">
      {/* ── Page Header ─────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-normal text-slate-900 tracking-tight flex items-center gap-2">
            <Store size={18} className="text-primary-600" />
            Tren Per Seller
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Analisis tren penjualan bulanan untuk setiap toko / seller
          </p>
        </div>
        <button
          onClick={() => fetchTren()}
          disabled={loading || !selectedToko}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-all active:scale-95"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Segarkan
        </button>
      </div>

      {/* ── Store Selector ─────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
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
            className="w-full md:w-96 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
          >
            {stores.length === 0 && <option value="">Tidak ada toko</option>}
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Loading ─────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={26} className="animate-spin text-primary-600" />
            <p className="text-xs text-slate-400 font-normal">
              Memuat tren penjualan...
            </p>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-xl flex items-center gap-2.5">
          <p className="text-xs font-normal">{error}</p>
        </div>
      )}

      {/* ── Summary Cards ─────────────────── */}
      {!loading && !error && displayMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-wider mb-2">
              Revenue Bulan Ini
            </p>
            <p className="text-xl font-normal text-slate-900">
              {fmt(displayMonth.totalRevenue)}
            </p>
            {growth !== null && (
              <div
                className={`flex items-center gap-1 mt-1.5 text-xs font-normal ${isUp ? "text-primary-600" : isDown ? "text-red-500" : "text-slate-400"}`}
              >
                {isUp ? (
                  <TrendingUp size={12} />
                ) : isDown ? (
                  <TrendingDown size={12} />
                ) : null}
                {isUp ? "+" : ""}
                {growth}% vs bulan lalu
              </div>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-wider mb-2">
              Qty Terjual
            </p>
            <p className="text-xl font-normal text-slate-900">
              {displayMonth.totalQty.toFixed(1)}{" "}
              <span className="text-sm text-slate-400">kg</span>
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-wider mb-2">
              Jumlah Transaksi
            </p>
            <p className="text-xl font-normal text-slate-900">
              {displayMonth.jumlahTransaksi}{" "}
              <span className="text-sm text-slate-400">pesanan</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Chart ─────────────────── */}
      {!loading && !error && chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-normal text-slate-500 uppercase tracking-wider">
              6 Bulan Terakhir
            </h2>
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
              {(["revenue", "qty"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-normal transition-all ${chartMode === m ? "bg-white border border-slate-200 text-primary-700" : "text-slate-400"}`}
                >
                  {m === "revenue" ? "Revenue" : "Qty (kg)"}
                </button>
              ))}
            </div>
          </div>
          <TrenBarChart data={chartData} mode={chartMode} />
        </div>
      )}

      {/* ── Empty ─────────────────── */}
      {!loading && !error && data && chartData.length === 0 && (
        <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
          <BarChart3 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-normal text-slate-500">
            Belum ada data tren untuk toko ini
          </p>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Pastikan ada transaksi SELESAI pada periode ini
          </p>
        </div>
      )}
    </div>
  );
}
