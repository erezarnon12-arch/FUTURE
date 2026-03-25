"use client";

import { useState, useRef, useEffect } from "react";

const SUGGESTED = [
  "מה זה קרן השתלמות ולמה כדאי?",
  "כמה כסף צריך בכרית ביטחון?",
  "מה ההבדל בין פנסיה לביטוח מנהלים?",
  "מה זה קרן כספית ואיך היא עובדת?",
  "איך להשקיע לטווח ארוך בשוק ההון?",
  "מה זה דמי ניהול ואיך הם משפיעים?",
];

interface QA {
  question: string;
  answer: string;
  streaming: boolean;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [pairs, setPairs] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pairs]);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setQuery("");
    setLoading(true);
    setPairs((prev) => [...prev, { question: q, answer: "", streaming: true }]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snapshot = full;
        setPairs((prev) =>
          prev.map((p, i) =>
            i === prev.length - 1 ? { ...p, answer: snapshot, streaming: true } : p
          )
        );
      }

      setPairs((prev) =>
        prev.map((p, i) =>
          i === prev.length - 1 ? { ...p, answer: full, streaming: false } : p
        )
      );
    } catch {
      setPairs((prev) =>
        prev.map((p, i) =>
          i === prev.length - 1
            ? { ...p, answer: "שגיאת חיבור, נסה שוב", streaming: false }
            : p
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(query);
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-2xl text-indigo-400">✦</span>
          <div>
            <h1 className="text-xl font-bold text-white">חיפוש FUTURE</h1>
            <p className="text-text-secondary text-sm mt-0.5">שאל כל שאלה פיננסית — תשובה מיידית</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {pairs.length === 0 ? (
            /* Empty state */
            <div className="text-center">
              <div className="text-7xl text-indigo-400/20 mb-6 font-extralight tracking-[0.3em] select-none">✦</div>
              <h2 className="text-white text-2xl font-light mb-2">במה נוכל לעזור?</h2>
              <p className="text-text-secondary text-base mb-10">
                שאל שאלה פיננסית — או בחר מהנושאים הפופולריים
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-right p-4 bg-surface-2 rounded-2xl border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-950/20 text-text-secondary hover:text-white text-base transition-all duration-200 group flex items-center gap-3"
                  >
                    <span className="text-indigo-500/0 group-hover:text-indigo-400 transition-all duration-200 text-sm flex-shrink-0">✦</span>
                    <span className="flex-1">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Q&A list */
            <div className="space-y-10">
              {pairs.map((pair, i) => (
                <div key={i} className="space-y-4">
                  {/* Question */}
                  <div className="flex justify-end">
                    <div className="bg-indigo-600/15 border border-indigo-500/25 rounded-2xl px-5 py-3 text-white text-base font-medium max-w-[85%]">
                      {pair.question}
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="bg-surface-2 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                      <span
                        className={`text-indigo-400 text-base leading-none ${
                          pair.streaming ? "animate-pulse" : ""
                        }`}
                      >
                        ✦
                      </span>
                      <span className="text-indigo-400 text-sm font-semibold tracking-wider">
                        FUTURE
                      </span>
                      {pair.streaming && (
                        <div className="flex gap-1 mr-2">
                          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "120ms" }} />
                          <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "240ms" }} />
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      {pair.answer ? (
                        <p className="text-text-secondary text-base leading-relaxed whitespace-pre-wrap">
                          {pair.answer}
                          {pair.streaming && (
                            <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse mr-0.5 align-middle" />
                          )}
                        </p>
                      ) : (
                        <p className="text-text-muted text-base animate-pulse">חושב...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5 px-8 py-4 bg-surface">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="שאל שאלה פיננסית..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-indigo-500/40 outline-none text-base placeholder:text-text-muted disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all text-base tracking-wide"
          >
            {loading ? <span className="animate-pulse">✦</span> : "שאל"}
          </button>
        </form>
      </div>
    </div>
  );
}
