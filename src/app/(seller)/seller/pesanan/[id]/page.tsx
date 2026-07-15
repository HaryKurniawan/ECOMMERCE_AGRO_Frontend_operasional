"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  MapPin,
  User,
  CheckCircle,
  Copy,
  Calendar,
  CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";

import { formatRupiah, formatTanggal, ordersApi } from "@/lib/ecommerce-api";

const getStatusLabel = (s: string) => {
  switch (s) {
    case "PREPARING":
      return "Disiapkan";
    case "PICKUP_CONFIRMATION":
      return "Diserahkan ke Kurir";
    case "PICKED_UP":
      return "Diterima Kurir";
    case "IN_TRANSIT":
      return "Dalam Perjalanan";
    case "ARRIVED":
      return "Sampai";
    default:
      return s;
  }
};

const TRACKING_STEPS = [
  "PREPARING",
  "PICKUP_CONFIRMATION",
  "PICKED_UP",
  "IN_TRANSIT",
  "ARRIVED",
];

interface OrderDetail {
  id: string;
  status: string;
  totalHarga: number | string;
  metodeBayar: string;
  alamatKirim: string;
  catatan?: string;
  createdAt: string;
  updatedAt?: string;
  customer?: { name?: string; email?: string; phone?: string };
  alamatLat?: number;
  alamatLng?: number;
  items?: Array<{
    id: string;
    jumlah: number;
    harga: number | string;
    grade?: string;
    product?: {
      nama: string;
      namaEtalase?: string;
      gambarUrl?: string;
      satuan?: string;
    };
  }>;
  shipping?: {
    id: string;
    status: string;
    kurirName?: string;
    kurirPhone?: string;
    catatan?: string;
    buktiKirimFoto?: string[];
    buktiKirimCatatan?: string;
    buktiKirimWaktu?: string;
    trackingHistory?: Array<{
      status: string;
      label?: string;
      note?: string;
      timestamp?: string;
      createdAt?: string;
    }>;
  };
}

const statusConfig: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  MENUNGGU_BAYAR: {
    label: "Menunggu Bayar",
    color: "text-amber-600 bg-amber-50",
    dot: "bg-amber-400",
  },
  MENUNGGU_KONFIRMASI_SELLER: {
    label: "Menunggu Konfirmasi",
    color: "text-blue-600 bg-blue-50",
    dot: "bg-blue-400",
  },
  DIPROSES: {
    label: "Diproses",
    color: "text-blue-600 bg-blue-50",
    dot: "bg-blue-400",
  },
  DIKIRIM: {
    label: "Dikirim",
    color: "text-emerald-600 bg-emerald-50",
    dot: "bg-emerald-500",
  },
  SELESAI: {
    label: "Selesai",
    color: "text-emerald-600 bg-emerald-50",
    dot: "bg-emerald-500",
  },
  DITUTUP: {
    label: "Ditutup",
    color: "text-gray-500 bg-gray-50",
    dot: "bg-gray-400",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    color: "text-rose-600 bg-rose-50",
    dot: "bg-rose-400",
  },
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs text-gray-700 text-right">{value || "–"}</span>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} className="text-gray-300" />
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

export default function DetailPesananSellerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleCopyId = () => {
    if (!order?.id) return;
    navigator.clipboard.writeText(order.id);
    setCopiedId(true);
    toast.success("ID Pesanan disalin!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const res = await ordersApi.getById(id);
        let data = res?.data?.data || res?.data;
        if (data) {
          data = {
            ...data,
            shipping: data.shipping || data.pengiriman,
            customer: data.customer || {
              name: data.konsumen?.nama,
              email: data.konsumen?.email,
              phone:
                data.konsumen?.noTelepon ||
                data.konsumen?.addresses?.[0]?.telepon,
            },
            items: (data.items || data.item || []).map((it: any) => ({
              ...it,
              product: it.product || it.produk,
            })),
          };
          if (data.konsumen?.addresses?.length > 0) {
            data.alamatLat = data.konsumen.addresses[0].lat;
            data.alamatLng = data.konsumen.addresses[0].lng;
          }
        }
        setOrder(data);
      } catch (err) {
        setError("Gagal memuat detail pesanan.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleSellerConfirm = async () => {
    if (!order?.id || confirmLoading) return;
    try {
      setConfirmLoading(true);
      await ordersApi.sellerConfirm(order.id);
      toast.success("Pesanan berhasil dikonfirmasi & ditutup!");
      const res = await ordersApi.getById(order.id);
      const data = res?.data?.data || res?.data;
      if (data) setOrder({ ...order, ...data, status: "DITUTUP" });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal mengkonfirmasi pesanan",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        <p className="text-xs text-gray-400">Memuat detail pesanan…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={13} /> Kembali
        </button>
        <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl flex items-center gap-3 border border-rose-100">
          <AlertCircle size={16} />
          <p className="text-sm">{error || "Pesanan tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  const shipping = order.shipping;
  const history = Array.isArray(shipping?.trackingHistory)
    ? shipping.trackingHistory
    : [];

  const sc = statusConfig[order.status] || {
    label: order.status,
    color: "text-gray-500 bg-gray-50",
    dot: "bg-gray-400",
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => router.push("/seller/pesanan")}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
            Detail Pesanan
          </p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-gray-500 font-mono truncate">
              #{order.id}
            </p>
            <button
              onClick={handleCopyId}
              className="p-0.5 text-gray-300 hover:text-gray-500 transition-colors"
              title="Salin ID"
            >
              {copiedId ? (
                <CheckCircle size={11} className="text-emerald-500" />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>
        </div>
        {/* Status badge */}
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${sc.color}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </div>

      {/* Customer */}
      <SectionCard>
        <SectionLabel icon={User} label="Pelanggan" />
        <InfoRow label="Nama" value={order.customer?.name} />
        <InfoRow label="Email" value={order.customer?.email} />
        <InfoRow label="Telepon" value={order.customer?.phone} />
      </SectionCard>

      {/* Address */}
      <SectionCard>
        <SectionLabel icon={MapPin} label="Alamat Pengiriman" />
        <p className="text-sm text-gray-700 leading-relaxed">
          {order.alamatKirim || "–"}
        </p>
        {order.catatan && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
            <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
              Catatan
            </span>
            <p className="text-[11px] text-gray-600">{order.catatan}</p>
          </div>
        )}
        {order.alamatLat && order.alamatLng && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <a
              href={`https://www.google.com/maps?q=${order.alamatLat},${order.alamatLng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <MapPin size={12} /> Buka di Google Maps
            </a>
          </div>
        )}
      </SectionCard>

      {/* Items */}
      <SectionCard>
        <SectionLabel icon={Package} label="Item Pesanan" />
        <div className="space-y-0">
          {order.items?.map((item, i) => (
            <div
              key={item.id || i}
              className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
            >
              <div className="w-10 h-10 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                {item.product?.gambarUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={item.product.gambarUrl}
                      alt={item.product.nama?.replace(" - ", " ") || "Produk"}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={14} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">
                  {item.product?.namaEtalase ||
                    item.product?.nama?.replace(" - ", " ") ||
                    "Produk"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.jumlah} {item.product?.satuan || "kg"} ×{" "}
                  {formatRupiah(item.harga)}
                  {item.grade && (
                    <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Grade {item.grade}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-sm text-gray-700 shrink-0">
                {formatRupiah(item.jumlah * Number(item.harga))}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Payment */}
      <SectionCard>
        <SectionLabel icon={CreditCard} label="Ringkasan Pembayaran" />
        <InfoRow label="Metode Bayar" value={order.metodeBayar} />
        <InfoRow
          label="Tanggal Pesanan"
          value={formatTanggal(order.createdAt)}
        />
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-base text-gray-900">
            {formatRupiah(order.totalHarga)}
          </span>
        </div>
      </SectionCard>

      {/* Shipping Tracking */}
      {shipping && (
        <SectionCard>
          <SectionLabel icon={Truck} label="Status Pengiriman" />

          {shipping.kurirName && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-6 h-6 bg-white rounded-lg border border-gray-100 flex items-center justify-center">
                <Truck size={12} className="text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-700">{shipping.kurirName}</p>
                {shipping.kurirPhone && (
                  <p className="text-[10px] text-gray-400">
                    {shipping.kurirPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step tracker */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
            {TRACKING_STEPS.map((st, idx) => {
              const stepIdx = TRACKING_STEPS.indexOf(st);
              const currentIdx = TRACKING_STEPS.indexOf(shipping.status);
              const done = stepIdx < currentIdx;
              const current = shipping.status === st;
              return (
                <div key={st} className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        current
                          ? "bg-blue-500"
                          : done
                            ? "bg-emerald-500"
                            : "bg-gray-200"
                      }`}
                    />
                    <span
                      className={`text-[9px] whitespace-nowrap ${
                        current
                          ? "text-blue-600"
                          : done
                            ? "text-emerald-600"
                            : "text-gray-400"
                      }`}
                    >
                      {getStatusLabel(st)}
                    </span>
                  </div>
                  {idx < TRACKING_STEPS.length - 1 && (
                    <div
                      className={`w-6 h-px mb-3 ${done || current ? "bg-emerald-200" : "bg-gray-100"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* History timeline */}
          {history.length > 0 && (
            <div className="border-t border-gray-50 pt-4 space-y-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Riwayat
              </p>
              {[...history].reverse().map((h, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    {i < history.length - 1 && (
                      <div
                        className="w-px bg-gray-100 flex-1 mt-1 mb-0"
                        style={{ minHeight: 20 }}
                      />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs text-gray-700">
                      {h.label || getStatusLabel(h.status)}
                    </p>
                    {h.note && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {h.note}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {formatTanggal(h.timestamp || h.createdAt || "")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Seller Confirm — SELESAI */}
      {order.status === "SELESAI" && (
        <SectionCard>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={15} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-800">
                Pembeli telah mengkonfirmasi penerimaan
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Periksa foto bukti pengiriman, lalu tutup pesanan ini.
              </p>
            </div>
          </div>

          {shipping?.buktiKirimFoto && shipping.buktiKirimFoto.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Foto Bukti Pengiriman
              </p>
              <div className="flex gap-2 flex-wrap">
                {shipping.buktiKirimFoto.map((foto, i) => (
                  <a key={i} href={foto} target="_blank" rel="noreferrer">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 hover:border-emerald-200 transition-colors">
                      <Image
                        src={foto}
                        alt={`Bukti ${i + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </a>
                ))}
              </div>
              {shipping.buktiKirimCatatan && (
                <p className="text-xs text-gray-500 mt-2">
                  {shipping.buktiKirimCatatan}
                </p>
              )}
            </div>
          )}

          {!shipping?.buktiKirimFoto?.length && (
            <p className="text-xs text-gray-400 mb-4">
              Kurir tidak mengunggah foto bukti pengiriman.
            </p>
          )}

          <button
            onClick={handleSellerConfirm}
            disabled={confirmLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {confirmLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            {confirmLoading ? "Memproses..." : "Konfirmasi & Tutup Pesanan"}
          </button>
        </SectionCard>
      )}

      {/* Ditutup */}
      {order.status === "DITUTUP" && (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
          <CheckCircle size={14} className="text-gray-400" />
          <p className="text-xs text-gray-500">
            Pesanan ini sudah ditutup oleh seller.
          </p>
        </div>
      )}
    </div>
  );
}
