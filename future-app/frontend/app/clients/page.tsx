"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getClients } from "@/lib/api";
import type { Client } from "@/types";
import { useRouter } from "next/navigation";

const HEBREW_NAMES: Record<string, string> = {
  "David Cohen":   "דוד כהן",
  "Maya Levi":     "מאיה לוי",
  "Ruth Shapiro":  "רות שפירו",
  "Oren Mizrahi":  "אורן מזרחי",
  "Noa Ben-David": "נועה בן-דוד",
  "Yosef Katz":    "יוסף כץ",
};

const CLIENT_DESCRIPTIONS: Record<string, string> = {
  "David Cohen":   "איש מקצוע בעיצומו של הקריירה · משכנתה + הלוואת רכב · זקוק לאיזון",
  "Maya Levi":     "איש מקצוע טכנולוגי צעיר · צמיחה גבוהה, פער קריטי בקרן חירום",
  "Ruth Shapiro":  "רופאה לפני פרישה · פנסיה חזקה, קרן ישנה בעמלה גבוהה",
  "Oren Mizrahi":  "בעל עסק · צמיחה אגרסיבית, מבנה חוב מורכב",
  "Noa Ben-David": "זוג צעיר בתחילת דרך · חיסכון ראשוני, יעד דירה",
  "Yosef Katz":    "גמלאי · תיק השקעות מנוהל, הכנסה פאסיבית",
};

function ClientCard({ client, onSelect }: { client: Client; onSelect: () => void }) {
  const hebrewName = HEBREW_NAMES[client.name] ?? client.name;
  const description = CLIENT_DESCRIPTIONS[client.name] ?? "";

  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.25 }}
      className="w-full text-right glass rounded-2xl p-8 border border-white/8 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-indigo-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity pt-1">
          פתח תיק ←
        </div>
        <div>
          <div className="text-white font-bold text-xl group-hover:text-indigo-300 transition-colors">
            {hebrewName}
          </div>
          {description && (
            <div className="text-text-muted text-sm mt-1 leading-relaxed">{description}</div>
          )}
        </div>
      </div>
      <div className="flex gap-6 text-sm text-text-secondary mt-4 justify-end border-t border-white/5 pt-4">
        <span>גיל <span className="text-white font-medium">{client.age}</span></span>
        <span>פרישה בגיל <span className="text-white font-medium">{client.retirement_age}</span></span>
      </div>
    </motion.button>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">טוען תיקי לקוחות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">תיקים לדוגמא</h1>
        <button
          onClick={() => router.push("/clients/new")}
          className="px-4 py-2 text-sm font-medium text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-colors"
        >
          + לקוח חדש
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {clients.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <p className="text-lg mb-2">אין עדיין תיקים לדוגמא</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onSelect={() => router.push(`/dashboard/${client.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
