"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Trash2,
  Image as ImageIcon,
  Folder,
  AlertCircle,
  Trash,
  Upload,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

import { apiClient, formatTanggal } from "@/lib/ecommerce-api";

interface PhotoItem {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function KelolaFotoPage() {
  const folders = [
    { id: "produk", label: "Produk" },
    { id: "kurir", label: "Kurir" },
    { id: "pesanan", label: "Pesanan" },
    { id: "temp", label: "Temporary (Sampah)" },
  ];

  const [activeFolder, setActiveFolder] = useState(folders[0].id);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async (folder: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/upload/admin/list?folder=${folder}`);
      // Safely unwrap data array from TransformInterceptor
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      const dataList = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
      setPhotos(dataList);
    } catch (err: any) {
      setError("Gagal memuat foto dari server.");
      console.error(err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos(activeFolder);
  }, [activeFolder]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be re-uploaded if needed
    e.target.value = "";

    const formData = new FormData();
    formData.append("file", file);

    setUploadLoading(true);
    try {
      await apiClient.post(`/upload/${activeFolder}/gambar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Foto berhasil diunggah ke server");
      fetchPhotos(activeFolder);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal mengunggah foto ke server",
      );
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus foto ${fileName}?`)) return;

    setDeleteLoading(fileName);
    try {
      await apiClient.delete(
        `/upload/admin/file?folder=${activeFolder}&fileName=${fileName}`,
      );
      toast.success("Foto berhasil dihapus");
      setPhotos((prev) => prev.filter((p) => p.name !== fileName));
    } catch (err: any) {
      toast.error("Gagal menghapus foto");
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCleanFolder = async () => {
    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA file di folder ${activeFolder}? Aksi ini tidak dapat dibatalkan.`,
      )
    )
      return;

    setCleaning(true);
    try {
      const res = await apiClient.delete(
        `/upload/admin/clean-folder?folder=${activeFolder}`,
      );
      toast.success(res.data?.message || "Folder berhasil dibersihkan");
      setPhotos([]);
    } catch (err: any) {
      toast.error("Gagal membersihkan folder");
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  const handleCopyUrl = (photo: PhotoItem) => {
    const fullUrl = `${window.location.origin}/api/proxy${photo.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedName(photo.name);
    toast.success("URL foto disalin!");
    setTimeout(() => setCopiedName(null), 2000);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 animate-fade-in font-sans pb-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-normal text-slate-900 leading-tight">
            Kelola Foto Server
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-normal">
            Kelola file media foto produk, kurir, pesanan, dan upload server
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadFile}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-normal hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            {uploadLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            Unggah Foto ke {folders.find((f) => f.id === activeFolder)?.label}
          </button>

          {activeFolder === "temp" && photos.length > 0 && (
            <button
              onClick={handleCleanFolder}
              disabled={cleaning || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-normal hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              {cleaning ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash size={13} />
              )}
              Bersihkan Temp
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 px-4 flex gap-6 overflow-x-auto no-scrollbar">
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`flex items-center gap-2 py-2 text-xs font-normal relative whitespace-nowrap transition-colors ${
              activeFolder === f.id
                ? "text-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Folder size={14} className="stroke-[1.5]" />
            {f.label}
            {activeFolder === f.id && (
              <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-slate-900" />
            )}
          </button>
        ))}
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-center text-xs text-rose-600 font-normal">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Content Grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col justify-center items-center py-24 gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={24} />
          <p className="text-xs text-slate-400 font-normal">
            Memuat file media...
          </p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
          <ImageIcon size={36} className="mb-2 text-slate-300 stroke-[1.5]" />
          <p className="text-xs font-normal text-slate-800">Folder Kosong</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4 max-w-sm">
            Belum ada file foto yang diunggah ke folder {activeFolder}. Anda
            dapat mengunggah file baru menggunakan tombol di atas.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-normal hover:bg-slate-100 transition-colors"
          >
            <Upload size={12} /> Unggah Foto Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.name || `photo-${idx}`}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden group hover:border-slate-300 transition-all text-xs"
            >
              <div className="relative aspect-square bg-slate-50 border-b border-slate-100">
                <Image
                  src={`/api/proxy${photo.url}`}
                  alt={photo.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(photo)}
                    className="p-1.5 bg-white text-slate-800 hover:bg-slate-100 rounded-full transition-colors shadow-sm"
                    title="Salin URL Foto"
                  >
                    {copiedName === photo.name ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(photo.name)}
                    disabled={deleteLoading === photo.name}
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors disabled:opacity-50 shadow-sm"
                    title="Hapus Foto"
                  >
                    {deleteLoading === photo.name ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
              <div className="p-2.5 space-y-1">
                <p
                  className="font-normal text-slate-800 truncate"
                  title={photo.name}
                >
                  {photo.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatBytes(photo.size)}</span>
                  <span>{formatTanggal(photo.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
