"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MessageCircle, User, Loader2, Search, Headphones } from "lucide-react";

import { chatApi } from "@/lib/ecommerce-api";
import { useAuthStore } from "@/store/auth-store";

interface AdminConvData {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  customer: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  unreadCount: number;
}

const AdminChatPage: React.FC = () => {
  const router = useRouter();
  const [conversations, setConversations] = useState<AdminConvData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await chatApi.adminGetConversations({ limit: 50 });
        const data = res.data?.data?.data || res.data?.data || [];
        setConversations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch CS conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();

    // SSE Real-time Updates for CS Conversation List
    const eventSource = new EventSource("/api/proxy/chat/stream", {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);
        if (
          rawData?.type === "heartbeat" ||
          rawData?.data?.type === "heartbeat"
        )
          return;
        fetchConversations();
      } catch (err) {
        fetchConversations();
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE CS list connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = conv.customer?.name || conv.customer?.email || "";
    return name.toLowerCase().includes(q);
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "Kemarin";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 flex items-center gap-3">
            <Headphones size={28} className="text-blue-600" />
            Customer Service Chat
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {conversations.length} tiket chat
            {totalUnread > 0 && (
              <span className="ml-2 text-red-500 font-bold">
                • {totalUnread} belum dibaca
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            useAuthStore.getState().clearAuth();
            router.push("/");
          }}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Cari customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredConversations.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {filteredConversations.map((conv) => {
            const customerName =
              conv.customer?.name || conv.customer?.email || "Customer";

            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/cs/chat/${conv.id}`)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-blue-600" />
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold text-sm text-gray-900 truncate">
                      {customerName}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage || "Belum ada pesan"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
            <MessageCircle size={36} className="text-gray-300" />
          </div>
          <p className="font-display font-bold text-gray-400 mb-1">
            Belum Ada Tiket CS
          </p>
          <p className="text-xs text-gray-400 max-w-[280px]">
            Chat Customer Service dari pelanggan akan muncul di sini
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminChatPage;
