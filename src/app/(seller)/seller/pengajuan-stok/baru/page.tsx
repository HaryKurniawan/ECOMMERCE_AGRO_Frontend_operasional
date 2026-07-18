"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Warehouse,
  Plus,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Package,
  ShoppingCart,
  Split,
  Layers,
  ClipboardList,
} from "lucide-react";

import { gudangApi } from "@/lib/ecommerce-api";

// ─── Constants ─────────────────────────────────────────────────────────────────
const CART_KEY = "pengajuan_cart";
const RETAIL_KG = 1.0; // Retail = 1 kg / pack
const MEDIUM_KG = 2.5; // Medium = 2.5 kg / pack

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface ProductData {
  id: string;
  nama: string;
  varianProduk?: string | null;
  hargaGudang: number;
  satuan: string;
  minimalPembelianKg?: number;
  gambarUrl?: string;
}

interface GudangData {
  id: string;
  nama: string;
  alamat: string;
}

/** Item per produk — disimpan hanya jumlah pack per kemasan */
interface FormItem {
  produkGudangId: string;
  packRetail: number; // jumlah pack 1 kg
  packMedium: number; // jumlah pack 2.5 kg
}

interface CartStorage {
  gudangId: string;
  items: FormItem[];
}

// ─── Helper ────────────────────────────────────────────────────────────────────
const totalKgOf = (it: { packRetail: number; packMedium: number }) =>
  Math.round((it.packRetail * RETAIL_KG + it.packMedium * MEDIUM_KG) * 10) / 10;

/**
 * Bagi total kg rata ke dua kemasan (50% medium, 50% retail).
 * Medium dibulatkan ke bawah, sisa kg masuk retail (1 kg pas).
 */
function bagiRata(targetKg: number): {
  packRetail: number;
  packMedium: number;
} {
  const safe = Math.max(0, targetKg);
  const setengah = safe / 2;
  const packMedium = Math.floor(setengah / MEDIUM_KG);
  const kgMedium = packMedium * MEDIUM_KG;
  const sisaKg = Math.round((safe - kgMedium) * 10) / 10;
  const packRetail = Math.ceil(sisaKg / RETAIL_KG);
  return { packRetail, packMedium };
}

// ─── localStorage ──────────────────────────────────────────────────────────────
function loadCart(): CartStorage | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartStorage) : null;
  } catch {
    return null;
  }
}
function saveCart(gudangId: string, items: FormItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ gudangId, items }));
  } catch {
    /* ignore */
  }
}
function clearCart() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    /* ignore */
  }
}

/** Migrasi item lama (format berbeda) → ke format pack */
function normalizeItem(raw: any): FormItem {
  if (
    typeof raw?.packRetail === "number" ||
    typeof raw?.packMedium === "number"
  ) {
    return {
      produkGudangId: raw.produkGudangId,
      packRetail: Number(raw.packRetail) || 0,
      packMedium: Number(raw.packMedium) || 0,
    };
  }
  // Format dari halaman daftar produk: { jumlahPermintaan, ukuranKemasanKg, jumlahKemasan }
  // atau format lama berbasis totalKg → defaultkan semua retail 1 kg
  const total = Number(raw?.jumlahPermintaan) || Number(raw?.totalKg) || 0;
  return {
    produkGudangId: raw.produkGudangId,
    packRetail: total,
    packMedium: 0,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function NewStockRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gudangId = searchParams.get("gudangId") || "";

  const [gudang, setGudang] = useState<GudangData | null>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductData[]>([]);
  const [items, setItems] = useState<FormItem[]>([]);
  // Toggle "custom kemasan" per produk (key = produkGudangId)
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});
  // Target kg acuan per produk (untuk bagi rata di mode custom)
  const [targetKg, setTargetKg] = useState<Record<string, number>>({});
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showErrorMinModal, setShowErrorMinModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successGudangNama, setSuccessGudangNama] = useState("");

  // ── Init ─────────────────────────────────────────────────────────────────────
  const initPage = useCallback(async () => {
    if (!gudangId) {
      router.push("/seller/gudang/produk");
      return;
    }
    try {
      setLoading(true);

      const prodRes = await gudangApi.getProductsForRequest(gudangId);
      const responseData =
        prodRes?.data?.data?.data || prodRes?.data?.data || prodRes?.data || {};
      const products: ProductData[] = Array.isArray(responseData.products)
        ? responseData.products
        : [];
      setAvailableProducts(products);

      try {
        const whRes = await gudangApi.getAllWarehousesForMarketplace();
        const allWh = whRes?.data?.data || whRes?.data || [];
        const found = Array.isArray(allWh)
          ? allWh.find((w: any) => w.id === gudangId)
          : null;
        if (found)
          setGudang({ id: found.id, nama: found.nama, alamat: found.alamat });
      } catch {
        /* best-effort */
      }

      // Restore cart
      const saved = loadCart();
      if (saved?.gudangId === gudangId && saved.items.length > 0) {
        const valid = saved.items
          .filter((it) => products.some((p) => p.id === it.produkGudangId))
          .map(normalizeItem);
        if (valid.length > 0) {
          setItems(valid);
          return;
        }
      }

      // Draft dari sessionStorage
      try {
        const raw = sessionStorage.getItem("pengajuan_draft");
        if (raw) {
          const draft = JSON.parse(raw) as {
            gudangId: string;
            produkIds: string[];
          };
          if (draft?.gudangId === gudangId && draft.produkIds?.length > 0) {
            const newItems: FormItem[] = draft.produkIds
              .filter((pid) => products.some((p) => p.id === pid))
              .map((pid) => {
                return {
                  produkGudangId: pid,
                  packRetail: 1,
                  packMedium: 0,
                };
              });
            setItems(newItems);
            saveCart(gudangId, newItems);
          }
          sessionStorage.removeItem("pengajuan_draft");
        }
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [gudangId, router]);

  useEffect(() => {
    initPage();
  }, [initPage]);

  useEffect(() => {
    if (gudangId && items.length > 0) saveCart(gudangId, items);
  }, [items, gudangId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      saveCart(gudangId, next);
      return next;
    });
  };

  const handlePackChange = (
    index: number,
    field: "packRetail" | "packMedium",
    value: string,
  ) => {
    const n = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    updateItem(index, { [field]: n } as Partial<FormItem>);
  };

  // Bagi target kg (acuan input) jadi 50:50 ke dua kemasan
  const handleBagiRata = (index: number, produkId: string) => {
    const target = targetKg[produkId] ?? totalKgOf(items[index]);
    if (target <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...bagiRata(target) };
      saveCart(gudangId, next);
      return next;
    });
  };

  // Toggle custom kemasan.
  const toggleCustomMode = (index: number, produkId: string) => {
    const nextOn = !customMode[produkId];
    setCustomMode((prev) => ({ ...prev, [produkId]: nextOn }));
    if (nextOn) {
      // Aktifkan: jadikan total kg saat ini sebagai target acuan
      setTargetKg((prev) => ({ ...prev, [produkId]: totalKgOf(items[index]) }));
    } else {
      // Matikan: konversi semua ke kemasan 1 kg
      setItems((prev) => {
        const next = [...prev];
        const total = totalKgOf(next[index]);
        next[index] = {
          ...next[index],
          packRetail: Math.round(total),
          packMedium: 0,
        };
        saveCart(gudangId, next);
        return next;
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) clearCart();
      else saveCart(gudangId, next);
      return next;
    });
  };

  const handleTambahProduk = () => {
    const existingIds = items.map((it) => it.produkGudangId).filter(Boolean);
    sessionStorage.setItem(
      "pengajuan_draft",
      JSON.stringify({ gudangId, produkIds: existingIds }),
    );
    router.push(`/seller/gudang/produk?gudangId=${gudangId}`);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!gudangId) {
      setError("Gudang tidak ditemukan.");
      return;
    }

    const validItems = items.filter(
      (it) => it.produkGudangId && totalKgOf(it) > 0,
    );
    if (validItems.length === 0) {
      setError(
        "Belum ada produk dengan jumlah. Tambahkan produk dan isi pack.",
      );
      return;
    }

    const totalKgAll = validItems.reduce((s, it) => s + totalKgOf(it), 0);
    if (totalKgAll < 300) {
      setShowErrorMinModal(true);
      return;
    }

    try {
      setSubmitting(true);
      const apiItems: any[] = [];
      for (const it of validItems) {
        if (it.packMedium > 0) {
          apiItems.push({
            produkGudangId: it.produkGudangId,
            jumlahPermintaan: it.packMedium * MEDIUM_KG,
            ukuranKemasanKg: MEDIUM_KG,
            jumlahKemasan: it.packMedium,
            totalKg: it.packMedium * MEDIUM_KG,
          });
        }
        if (it.packRetail > 0) {
          apiItems.push({
            produkGudangId: it.produkGudangId,
            jumlahPermintaan: it.packRetail * RETAIL_KG,
            ukuranKemasanKg: RETAIL_KG,
            jumlahKemasan: it.packRetail,
            totalKg: it.packRetail * RETAIL_KG,
          });
        }
      }

      await gudangApi.createStockRequest({
        gudangId,
        catatan,
        items: apiItems,
      });
      clearCart();
      setSuccessGudangNama(gudang?.nama || "Gudang");
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim pengajuan stok.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">
          Mempersiapkan pengajuan...
        </p>
      </div>
    );
  }

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalKgAll = items.reduce((s, it) => s + totalKgOf(it), 0);
  const totalHargaAll = items.reduce((s, it) => {
    const prod = availableProducts.find((p) => p.id === it.produkGudangId);
    return s + (prod?.hargaGudang || 0) * totalKgOf(it);
  }, 0);
  const hasValid =
    items.filter((it) => it.produkGudangId && totalKgOf(it) > 0).length > 0;

  return (
    <div className="flex bg-gray-50 h-full overflow-hidden relative">
      {/* Main Content Area - Independent Scroll */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
        <div className="px-6 pt-6 pb-24 max-w-4xl mx-auto space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <p className="text-xs">{error}</p>
            </div>
          )}
          {/* ── Success Modal ── */}
          {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center gap-5"
                style={{ animation: "fadeScaleIn 0.3s ease-out" }}
              >
                {/* Icon */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-100">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <span className="absolute -top-1 -right-1 text-2xl">🎉</span>
                </div>

                {/* Text */}
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-800">
                    Pengajuan Berhasil!
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Pengajuan stok ke{" "}
                    <span className="font-semibold text-emerald-600">
                      {successGudangNama}
                    </span>{" "}
                    telah berhasil dikirim. Tim gudang akan segera memprosesnya.
                  </p>
                </div>

                {/* Info Badge */}
                <div className="w-full bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 text-left leading-relaxed">
                    Pantau status pengajuan di halaman{" "}
                    <strong>Status Pengajuan Stok</strong>.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={() => router.push("/seller/pengajuan-stok")}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Lihat Status Pengajuan
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push("/seller/gudang/produk");
                    }}
                    className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-2xl text-sm font-medium hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    Buat Pengajuan Baru
                  </button>
                </div>
              </div>

              <style>{`
            @keyframes fadeScaleIn {
              from { opacity: 0; transform: scale(0.88); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
            </div>
          )}

          {/* ── Error Min Modal ── */}
          {showErrorMinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center gap-5"
                style={{ animation: "fadeScaleIn 0.3s ease-out" }}
              >
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center border-4 border-rose-100">
                  <AlertCircle className="w-10 h-10 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-800">
                    Gagal Mengajukan
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Pesanan Anda tidak mencukupi minimal yaitu{" "}
                    <span className="font-semibold text-rose-600">300 kg</span>.
                    Silakan tambah jumlah produk.
                  </p>
                </div>
                <button
                  onClick={() => setShowErrorMinModal(false)}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
                >
                  Mengerti
                </button>
              </div>

              <style>{`
            @keyframes fadeScaleIn {
              from { opacity: 0; transform: scale(0.88); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
            </div>
          )}

          <form
            id="pengajuan-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Daftar produk */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100/60 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                  Produk yang Diajukan
                  {items.length > 0 && (
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={handleTambahProduk}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border border-slate-200 active:scale-[0.98] shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Produk
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Belum ada produk dipilih
                  </p>
                  <button
                    type="button"
                    onClick={handleTambahProduk}
                    className="mx-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Pilih Produk dari Gudang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const prod = availableProducts.find(
                      (p) => p.id === item.produkGudangId,
                    );
                    if (!prod) return null;
                    const total = totalKgOf(item);

                    return (
                      <div
                        key={index}
                        className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all border-slate-200/70`}
                      >
                        {/* Produk info */}
                        <div className="px-4 pt-3.5 pb-3 border-b border-slate-100/80 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {prod.gambarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prod.gambarUrl}
                                alt={prod.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {prod.nama}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Rp {prod.hargaGudang.toLocaleString("id-ID")} /{" "}
                              {prod.satuan}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Input utama: jumlah kemasan 1 kg + toggle custom */}
                        <div className="px-4 pt-3.5 pb-3 bg-white border-b border-slate-100/70">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                              Jumlah Pesanan
                            </label>
                            <button
                              type="button"
                              onClick={() => toggleCustomMode(index, prod.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                customMode[prod.id]
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                              }`}
                            >
                              <Layers className="w-4 h-4" />
                              Multi Kemasan
                              <span
                                className={`w-9 h-5 rounded-full relative transition-all flex items-center shadow-inner ${customMode[prod.id] ? "bg-emerald-500" : "bg-slate-300"}`}
                              >
                                <span
                                  className={`absolute w-4 h-4 rounded-full bg-white shadow-sm border border-black/5 transition-all ${customMode[prod.id] ? "left-[18px]" : "left-[2px]"}`}
                                />
                              </span>
                            </button>
                          </div>
                          {!customMode[prod.id] && (
                            <>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder={`mis. 1`}
                                  value={item.packRetail || ""}
                                  onChange={(e) =>
                                    handlePackChange(
                                      index,
                                      "packRetail",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full pl-4 pr-12 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all bg-white"
                                />
                                <span className="absolute right-4 top-3 text-sm text-slate-400 font-medium">
                                  kg
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1.5">
                                Default semua kemasan 1 kg. Aktifkan Multi
                                Kemasan untuk membagi ke 2.5 kg.
                              </p>
                            </>
                          )}
                        </div>

                        {/* 3 card berjajar — hanya saat Multi Kemasan aktif */}
                        {customMode[prod.id] && (
                          <div className="px-4 py-4 bg-white grid grid-cols-3 gap-3">
                            {/* Bagi Rata */}
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 overflow-hidden flex flex-col">
                              <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100/70">
                                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <Split className="w-3.5 h-3.5" />
                                </div>
                                <div className="leading-tight">
                                  <p className="text-xs font-bold text-slate-700">
                                    Bagi Rata
                                  </p>
                                  <p className="text-[9px] text-slate-500">
                                    50:50
                                  </p>
                                </div>
                              </div>
                              <div className="p-3 flex-1 flex flex-col justify-center space-y-2">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Target kg"
                                  value={targetKg[prod.id] || ""}
                                  onChange={(e) =>
                                    setTargetKg((prev) => ({
                                      ...prev,
                                      [prod.id]: Math.max(
                                        0,
                                        parseFloat(e.target.value) || 0,
                                      ),
                                    }))
                                  }
                                  className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleBagiRata(index, prod.id)}
                                  className="w-full px-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                >
                                  <Split className="w-3.5 h-3.5" />
                                  Bagi 50:50
                                </button>
                              </div>
                            </div>

                            {/* Retail 1 kg */}
                            <div className="rounded-2xl border-2 border-slate-200 overflow-hidden flex flex-col">
                              <div className="bg-slate-100/50 px-3 py-2 flex items-center gap-2 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <Package className="w-3.5 h-3.5" />
                                </div>
                                <div className="leading-tight">
                                  <p className="text-xs font-bold text-slate-700">
                                    1 kg
                                  </p>
                                  <p className="text-[9px] text-slate-500">
                                    Retail
                                  </p>
                                </div>
                              </div>
                              <div className="p-3 space-y-2 flex-1">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={item.packRetail || ""}
                                    onChange={(e) =>
                                      handlePackChange(
                                        index,
                                        "packRetail",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all text-center"
                                  />
                                  <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 font-medium">
                                    pack
                                  </span>
                                </div>
                                <div className="bg-slate-100 rounded-lg py-1.5 text-center">
                                  <span className="text-xs font-bold text-slate-700">
                                    {(
                                      item.packRetail * RETAIL_KG
                                    ).toLocaleString("id-ID")}{" "}
                                    kg
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Medium 2.5 kg */}
                            <div className="rounded-2xl border-2 border-slate-200 overflow-hidden flex flex-col">
                              <div className="bg-slate-100/50 px-3 py-2 flex items-center gap-2 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <Package className="w-3.5 h-3.5" />
                                </div>
                                <div className="leading-tight">
                                  <p className="text-xs font-bold text-slate-700">
                                    2.5 kg
                                  </p>
                                  <p className="text-[9px] text-slate-500">
                                    Medium
                                  </p>
                                </div>
                              </div>
                              <div className="p-3 space-y-2 flex-1">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={item.packMedium || ""}
                                    onChange={(e) =>
                                      handlePackChange(
                                        index,
                                        "packMedium",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all text-center"
                                  />
                                  <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 font-medium">
                                    pack
                                  </span>
                                </div>
                                <div className="bg-slate-100 rounded-lg py-1.5 text-center">
                                  <span className="text-xs font-bold text-slate-700">
                                    {(
                                      item.packMedium * MEDIUM_KG
                                    ).toLocaleString("id-ID")}{" "}
                                    kg
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Total per produk */}
                        <div
                          className={`px-4 py-3 flex items-center justify-between text-xs border-t bg-white border-slate-100 text-slate-600`}
                        >
                          <span className="flex items-center gap-1.5">
                            Total Produk:
                            <span className="font-bold text-sm">
                              {total.toLocaleString("id-ID")} kg
                            </span>
                          </span>
                          <span className="font-bold text-slate-700 text-sm">
                            Rp{" "}
                            {(prod.hargaGudang * total).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Summary */}
      <div
        className={`hidden lg:flex flex-col bg-white h-full overflow-hidden transition-all duration-300 ease-in-out shrink-0 w-80 border-l border-gray-100 opacity-100`}
      >
        <div className="w-80 flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList size={18} className="text-emerald-600" />
              Ringkasan Pengajuan
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">
            {/* Grand Total */}
            {hasValid ? (
              <div
                className={`flex flex-col rounded-xl px-4 py-3 ${totalKgAll >= 300 ? "bg-emerald-700 text-white" : "bg-rose-600 text-white"}`}
              >
                <p
                  className={`text-[9.5px] uppercase tracking-wider mb-1 ${totalKgAll >= 300 ? "text-emerald-200/60" : "text-rose-200/60"}`}
                >
                  Total Pengajuan
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {totalKgAll.toLocaleString("id-ID")} kg
                  </p>
                  {totalKgAll < 300 && (
                    <span className="text-[9px] bg-rose-500 border border-rose-400 px-1.5 py-0.5 rounded-md text-white font-bold tracking-wide">
                      Min. 300 kg
                    </span>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <p className="font-bold text-lg">
                    Rp {totalHargaAll.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-center text-slate-400 text-xs font-medium">
                Belum ada produk valid
              </div>
            )}

            {/* Product Summary List */}
            {hasValid && (
              <div className="space-y-3 pb-3 border-b border-gray-100">
                <h4 className="text-xs font-semibold text-gray-900">
                  Detail Produk
                </h4>
                <div className="space-y-2">
                  {items
                    .filter((it) => totalKgOf(it) > 0)
                    .map((item, idx) => {
                      const prod = availableProducts.find(
                        (p) => p.id === item.produkGudangId,
                      );
                      if (!prod) return null;
                      return (
                        <div
                          key={idx}
                          className="flex justify-between items-start text-xs"
                        >
                          <span className="text-gray-600 pr-2 line-clamp-2">
                            {prod.nama}
                          </span>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">
                            {totalKgOf(item).toLocaleString("id-ID")} kg
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Catatan */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
                Catatan (Opsional)
              </label>
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Kirim via ekspedisi pickup..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-xs transition-all"
              />
            </div>
          </div>

          {/* Bottom Actions - Sticky */}
          <div className="p-6 border-t border-gray-100 flex-shrink-0 bg-white">
            <button
              type="submit"
              form="pengajuan-form"
              disabled={submitting || !hasValid}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                totalKgAll < 300
                  ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Kirim Pengajuan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
