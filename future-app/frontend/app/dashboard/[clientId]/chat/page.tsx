"use client";

import { useEffect, useState } from "react";
import { getClient } from "@/lib/api";
import type { Client } from "@/types";
import ChatInterface from "@/components/ui/ChatInterface";

interface Props { params: { clientId: string } }

export default function ChatPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [client, setClient] = useState<Client | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    getClient(clientId).then(setClient).catch(() => {});
  }, [clientId]);

  const handleClear = () => {
    setResetKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border border-indigo-500/60" />
            <div className="absolute inset-1.5 rounded-full border border-emerald-500/60" />
            <div className="absolute inset-3 rounded-full bg-amber-500" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">יועץ פיננסי AI</div>
            {client && (
              <div className="text-text-muted text-xs">{client.name} · גיל {client.age}</div>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs text-indigo-400">Claude AI</span>
          </div>
        </div>
      </div>

      {/* Chat interface fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface key={resetKey} clientId={clientId} onClear={handleClear} />
      </div>
    </div>
  );
}
