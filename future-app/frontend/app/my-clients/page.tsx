"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getOwnerClients, verifyOwnerKey, createOwnerClient, deleteOwnerClient } from "@/lib/api";
import type { Client } from "@/types";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "future_owner_key";

function ClientCard({ client, onSelect, onDelete }: { client: Client; onSelect: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full text-right glass rounded-2xl p-6 border border-white/5 hover:border-indigo-500/20 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)} className="text-xs text-red-400/40 hover:text-red-400 transition-colors px-2 py-1 rounded-lg">מחק</button>
          ) : (
            <>
              <button onClick={() => setConfirmDel(false)} className="text-xs text-text-muted hover:text-white transition-colors px-2 py-1">ביטול</button>
              <button onClick={onDelete} className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">אשר מחיקה</button>
            </>
          )}
        </div>
        <button onClick={onSelect} className="group text-right">
          <div className="text-white font-bold text-lg group-hover:text-indigo-300 transition-colors">{client.name}</div>
        </button>
      </div>
      <button onClick={onSelect} className="w-full text-right">
        <div className="flex gap-4 text-xs text-text-secondary mt-3 justify-end">
          <span>גיל {client.age}</span>
          <span className="text-indigo-400/60 text-xs">פתח תיק ←</span>
        </div>
      </button>
    </motion.div>
  );
}

function PinGate({ onSuccess }: { onSuccess: (key: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      await verifyOwnerKey(pin);
      sessionStorage.setItem(STORAGE_KEY, pin);
      onSuccess(pin);
    } catch {
      setError("סיסמה שגויה");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border border-indigo-500/60" />
            <div className="absolute inset-2 rounded-full border border-emerald-500/60" />
            <div className="absolute inset-4 rounded-full bg-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">אזור מוגן</h1>
          <p className="text-text-secondary text-sm">תיקי לקוחות — גישה לבעלים בלבד</p>
        </div>

        <div className="bg-surface-2 rounded-2xl p-8 border border-white/8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">סיסמת כניסה</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="הכנס סיסמה"
                required
                autoFocus
                className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={checking}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {checking ? "בודק..." : "כניסה ←"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MyClientsPage() {
  const router = useRouter();
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setOwnerKey(stored);
  }, []);

  useEffect(() => {
    if (!ownerKey) return;
    setLoading(true);
    getOwnerClients(ownerKey)
      .then(setClients)
      .catch(() => { sessionStorage.removeItem(STORAGE_KEY); setOwnerKey(null); })
      .finally(() => setLoading(false));
  }, [ownerKey]);

  const handleDelete = async (id: number) => {
    if (!ownerKey) return;
    await deleteOwnerClient(ownerKey, id);
    setClients(c => c.filter(x => x.id !== id));
  };

  if (!ownerKey) return <PinGate onSuccess={setOwnerKey} />;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">תיקי לקוחות</h1>
          <p className="text-text-muted text-xs mt-0.5">מידע אישי — גישה מוגבלת לבעלים</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/clients/new")}
            className="px-4 py-2 text-sm font-medium text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-colors"
          >
            + לקוח חדש
          </button>
          <button
            onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setOwnerKey(null); }}
            className="px-3 py-2 text-xs text-text-muted hover:text-white border border-white/5 rounded-xl transition-colors"
          >
            התנתק
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        {clients.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <p className="text-lg mb-2">אין עדיין לקוחות</p>
            <p className="text-sm text-text-muted mb-6">לקוחות חדשים שתוסיף יופיעו כאן</p>
            <button
              onClick={() => router.push("/clients/new")}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              + הוסף לקוח ראשון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onSelect={() => router.push(`/dashboard/${client.id}`)}
                onDelete={() => handleDelete(client.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
