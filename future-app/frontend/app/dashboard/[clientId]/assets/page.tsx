"use client";

import { useEffect, useState } from "react";
import { getDashboard, createAsset, deleteAsset } from "@/lib/api";
import type { DashboardData, RingType, RiskLevel, LiquidityLevel, AssetType } from "@/types";
import { RING_CONFIG, RISK_LABELS, LIQUIDITY_LABELS, ASSET_TYPE_LABELS, formatCurrency } from "@/lib/utils";

interface Props { params: { clientId: string } }

const RING_ASSET_TYPES: Record<RingType, AssetType[]> = {
  retirement: ["pension_fund", "pension_insurance", "ira", "study_fund", "provident_fund"],
  security: ["money_market", "bank_deposit", "government_bond", "liquid_etf"],
  growth: ["stock", "etf", "crypto", "high_risk_provident", "stock_portfolio"],
};

const PROVIDERS: Record<AssetType, string[]> = {
  pension_fund:         ["מגדל", "הראל", "מנורה", "כלל", "פניקס", "מיטב", "אלטשולר שחם", "אנליסט"],
  pension_insurance:    ["מגדל", "הראל", "מנורה", "כלל", "פניקס", "הפועלים"],
  ira:                  ["מגדל", "הראל", "מנורה", "כלל", "פניקס", "מיטב", "אלטשולר שחם"],
  study_fund:           ["מגדל", "הראל", "מנורה", "כלל", "פניקס", "מיטב", "אלטשולר שחם", "אנליסט", "IBI"],
  provident_fund:       ["מגדל", "הראל", "מנורה", "כלל", "פניקס", "מיטב"],
  money_market:         ["מגדל", "הראל", "מנורה", "כלל", "פניקס", "מיטב", "אנליסט", "IBI"],
  bank_deposit:         ["בנק לאומי", "בנק הפועלים", "בנק דיסקונט", "בנק מזרחי", "בנק הבינלאומי"],
  government_bond:      ["אג\"ח ממשלת ישראל", "אג\"ח צמוד", "אג\"ח שקלי"],
  liquid_etf:           ["קסם", "תכלית", "מור", "פסגות", "הראל"],
  stock:                ["ישיר", "IBI", "מיטב טרייד", "אינטראקטיב ברוקרס"],
  etf:                  ["קסם", "תכלית", "מור", "BlackRock iShares", "Vanguard"],
  crypto:               ["ביטקוין", "את'ריום", "אחר"],
  high_risk_provident:  ["מגדל", "הראל", "מנורה", "כלל"],
  stock_portfolio:      ["ישיר", "IBI", "מיטב", "אינטראקטיב ברוקרס"],
};

const TRACKS: Record<AssetType, string[]> = {
  pension_fund:      ["מסלול מניות", "מסלול כללי", "מסלול תלוי גיל", "מסלול אג\"ח", "מסלול מניות חו\"ל", "מסלול S&P 500", "מסלול שמרני"],
  pension_insurance: ["מסלול מניות", "מסלול כללי", "מסלול אג\"ח", "מסלול שמרני"],
  ira:               ["מסלול מניות", "מסלול כללי", "מסלול תלוי גיל", "מסלול אג\"ח"],
  study_fund:        ["מסלול מניות", "מסלול כללי", "מסלול אג\"ח", "מסלול S&P 500", "מסלול שמרני"],
  provident_fund:    ["מסלול מניות", "מסלול כללי", "מסלול אג\"ח"],
  money_market:      ["קרן כספית שקלית", "קרן כספית צמודה"],
  bank_deposit:      ["פיקדון שקלי", "פיקדון צמוד מדד"],
  government_bond:   ["אג\"ח ממשלתי", "גלבוע", "שחר", "גליל"],
  liquid_etf:        ["מדד כללי", "מדד אג\"ח", "מדד מניות"],
  stock:             [],
  etf:               ["S&P 500", "MSCI World", "נאסד\"ק 100", "ת\"א 125", "ת\"א 35"],
  crypto:            [],
  high_risk_provident: ["מסלול מניות", "מסלול כללי"],
  stock_portfolio:   [],
};

// Fee benchmarks per asset type
const FEE_BENCHMARKS: Record<string, { good: number; ok: number; label: string }> = {
  pension_fund:      { good: 0.2, ok: 0.5, label: "% מצבירה שנתי" },
  pension_insurance: { good: 0.6, ok: 1.2, label: "% מצבירה שנתי" },
  ira:               { good: 0.3, ok: 0.6, label: "% מצבירה שנתי" },
  study_fund:        { good: 0.15, ok: 0.4, label: "% מצבירה שנתי" },
  provident_fund:    { good: 0.3, ok: 0.6, label: "% מצבירה שנתי" },
  money_market:      { good: 0.1, ok: 0.3, label: "% שנתי" },
  bank_deposit:      { good: 0, ok: 0, label: "ריבית פיקדון" },
  government_bond:   { good: 0.1, ok: 0.3, label: "% שנתי" },
  liquid_etf:        { good: 0.1, ok: 0.3, label: "% שנתי" },
  stock:             { good: 0.05, ok: 0.15, label: "% עמלת קנייה/מכירה" },
  etf:               { good: 0.07, ok: 0.2, label: "% דמי ניהול שנתיים" },
  crypto:            { good: 0.1, ok: 0.5, label: "% עמלה" },
  high_risk_provident: { good: 0.3, ok: 0.6, label: "% שנתי" },
  stock_portfolio:   { good: 0.1, ok: 0.25, label: "% עמלת קנייה/מכירה" },
};

function FeeIndicator({ fee, assetType }: { fee: string; assetType: string }) {
  const val = parseFloat(fee);
  if (!fee || isNaN(val)) return null;
  const bench = FEE_BENCHMARKS[assetType];
  if (!bench) return null;

  let color = "text-emerald-400";
  let label = "מצוין";
  if (val > bench.ok) { color = "text-red-400"; label = "יקר — שווה לבדוק ניוד"; }
  else if (val > bench.good) { color = "text-amber-400"; label = "סביר"; }

  return (
    <div className={`text-xs mt-1 ${color} flex items-center gap-1`}>
      <span>{val <= bench.good ? "✓" : val > bench.ok ? "✗" : "~"}</span>
      <span>{label} · {bench.label}: טוב &lt; {bench.good}%, סביר עד {bench.ok}%</span>
    </div>
  );
}

function ReturnIndicator({ ret, assetType }: { ret: string; assetType: string }) {
  const val = parseFloat(ret);
  if (!ret || isNaN(val)) return null;

  const isEquity = ["pension_fund", "study_fund", "ira", "stock", "etf", "stock_portfolio", "high_risk_provident"].includes(assetType);
  const isSafe = ["money_market", "bank_deposit", "government_bond"].includes(assetType);

  if (isEquity) {
    const color = val >= 8 ? "text-emerald-400" : val >= 5 ? "text-amber-400" : "text-red-400";
    const label = val >= 8 ? "תשואה טובה" : val >= 5 ? "ממוצע" : "נמוך — שקול מסלול אחר";
    return <div className={`text-xs mt-1 ${color}`}>↑ {label} · ממוצע היסטורי מניות: ~8-10%</div>;
  }
  if (isSafe) {
    const color = val >= 3 ? "text-emerald-400" : val >= 1.5 ? "text-amber-400" : "text-red-400";
    const label = val >= 3 ? "טוב לאפיק סולידי" : val >= 1.5 ? "ממוצע" : "נמוך מהציפייה";
    return <div className={`text-xs mt-1 ${color}`}>↑ {label} · ריבית בנק ישראל כיום: ~4.5%</div>;
  }
  return null;
}

const INITIAL_FORM = {
  ring: "retirement" as RingType,
  asset_type: "pension_fund" as AssetType,
  name: "",
  provider: "",
  balance: "",
  monthly_deposit: "",
  investment_track: "",
  management_fees: "",
  historical_return: "",
  risk_level: "medium" as RiskLevel,
  liquidity_level: "long_term" as LiquidityLevel,
};

const RISK_DEFAULTS: Record<AssetType, { risk: RiskLevel; liquidity: LiquidityLevel }> = {
  pension_fund:         { risk: "medium", liquidity: "long_term" },
  pension_insurance:    { risk: "medium", liquidity: "long_term" },
  ira:                  { risk: "medium", liquidity: "long_term" },
  study_fund:           { risk: "medium", liquidity: "medium_term" },
  provident_fund:       { risk: "medium", liquidity: "long_term" },
  money_market:         { risk: "very_low", liquidity: "immediate" },
  bank_deposit:         { risk: "very_low", liquidity: "short_term" },
  government_bond:      { risk: "low", liquidity: "medium_term" },
  liquid_etf:           { risk: "low", liquidity: "immediate" },
  stock:                { risk: "high", liquidity: "immediate" },
  etf:                  { risk: "high", liquidity: "immediate" },
  crypto:               { risk: "very_high", liquidity: "immediate" },
  high_risk_provident:  { risk: "high", liquidity: "long_term" },
  stock_portfolio:      { risk: "high", liquidity: "immediate" },
};

export default function AssetsPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [filterRing, setFilterRing] = useState<RingType | "all">("all");

  const refresh = () => getDashboard(clientId).then(setData);
  useEffect(() => { refresh(); }, [clientId]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleTypeChange = (type: AssetType) => {
    const defaults = RISK_DEFAULTS[type];
    setForm((f) => ({
      ...f,
      asset_type: type,
      provider: "",
      investment_track: "",
      risk_level: defaults.risk,
      liquidity_level: defaults.liquidity,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAsset(clientId, {
        ring: form.ring,
        asset_type: form.asset_type,
        name: form.name,
        provider: form.provider || undefined,
        balance: parseFloat(form.balance) || 0,
        monthly_deposit: parseFloat(form.monthly_deposit) || 0,
        investment_track: form.investment_track || undefined,
        management_fees: parseFloat(form.management_fees) || 0,
        historical_return: parseFloat(form.historical_return) || 0,
        risk_level: form.risk_level,
        liquidity_level: form.liquidity_level,
      });
      setShowForm(false);
      setForm(INITIAL_FORM);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assetId: number) => {
    if (!confirm("למחוק את הנכס?")) return;
    await deleteAsset(assetId);
    refresh();
  };

  if (!data) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  const allAssets = (["retirement", "security", "growth"] as RingType[]).flatMap(
    (ring) => data.rings[ring].assets.map((a) => ({ ...a, ring }))
  );
  const filtered = filterRing === "all" ? allAssets : allAssets.filter((a) => a.ring === filterRing);

  const bench = FEE_BENCHMARKS[form.asset_type];
  const providers = PROVIDERS[form.asset_type] ?? [];
  const tracks = TRACKS[form.asset_type] ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">◈ כל הנכסים</h1>
          <p className="text-text-secondary text-sm mt-1">{allAssets.length} נכסים · {formatCurrency(data.total_assets)} סה&quot;כ</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all"
        >
          {showForm ? "✕ סגור" : "+ הוסף נכס"}
        </button>
      </div>

      {/* Add asset form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-white text-lg">הוספת נכס חדש</h2>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Step 1 — Ring + Type */}
            <div className="bg-surface rounded-xl p-4 space-y-4">
              <div className="text-xs text-text-muted font-medium uppercase tracking-wider">שלב 1 — סוג המוצר</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">טבעת</label>
                  <select
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    value={form.ring}
                    onChange={(e) => {
                      const ring = e.target.value as RingType;
                      const firstType = RING_ASSET_TYPES[ring][0];
                      const defaults = RISK_DEFAULTS[firstType];
                      setForm({ ...form, ring, asset_type: firstType, provider: "", investment_track: "", ...defaults });
                    }}
                  >
                    {(["retirement", "security", "growth"] as RingType[]).map((r) => (
                      <option key={r} value={r}>{RING_CONFIG[r].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">סוג מוצר</label>
                  <select
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    value={form.asset_type}
                    onChange={(e) => handleTypeChange(e.target.value as AssetType)}
                  >
                    {RING_ASSET_TYPES[form.ring].map((t) => (
                      <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2 — Details */}
            <div className="bg-surface rounded-xl p-4 space-y-4">
              <div className="text-xs text-text-muted font-medium uppercase tracking-wider">שלב 2 — פרטי המוצר</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">שם המוצר <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder={`לדוגמא: פנסיה מגדל מסלול מניות`}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-text-muted"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">חברה מנהלת</label>
                  <input
                    type="text"
                    list={`providers-${form.asset_type}`}
                    value={form.provider}
                    onChange={(e) => setField("provider", e.target.value)}
                    placeholder="בחר או הקלד..."
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-text-muted"
                  />
                  <datalist id={`providers-${form.asset_type}`}>
                    {providers.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
                {tracks.length > 0 && (
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">מסלול השקעה</label>
                    <input
                      type="text"
                      list={`tracks-${form.asset_type}`}
                      value={form.investment_track}
                      onChange={(e) => setField("investment_track", e.target.value)}
                      placeholder="בחר מסלול..."
                      className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-text-muted"
                    />
                    <datalist id={`tracks-${form.asset_type}`}>
                      {tracks.map((t) => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 — Numbers */}
            <div className="bg-surface rounded-xl p-4 space-y-4">
              <div className="text-xs text-text-muted font-medium uppercase tracking-wider">שלב 3 — מספרים</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">יתרה נוכחית (₪)</label>
                  <input type="number" value={form.balance} onChange={(e) => setField("balance", e.target.value)}
                    placeholder="0" min="0" step="100"
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">הפקדה חודשית (₪)</label>
                  <input type="number" value={form.monthly_deposit} onChange={(e) => setField("monthly_deposit", e.target.value)}
                    placeholder="0" min="0" step="100"
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">
                    דמי ניהול (%) · {bench?.label}
                  </label>
                  <input type="number" value={form.management_fees} onChange={(e) => setField("management_fees", e.target.value)}
                    placeholder="0.00" min="0" max="3" step="0.01"
                    className={`w-full border rounded-lg px-3 py-2 text-white text-sm transition-colors
                      ${!form.management_fees ? "bg-surface-2 border-white/10"
                        : parseFloat(form.management_fees) <= (bench?.good ?? 99) ? "bg-emerald-500/10 border-emerald-500/30"
                        : parseFloat(form.management_fees) <= (bench?.ok ?? 99) ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-red-500/10 border-red-500/30"}`}
                  />
                  <FeeIndicator fee={form.management_fees} assetType={form.asset_type} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">תשואה היסטורית (%)</label>
                  <input type="number" value={form.historical_return} onChange={(e) => setField("historical_return", e.target.value)}
                    placeholder="0.0" min="-50" max="100" step="0.1"
                    className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                  <ReturnIndicator ret={form.historical_return} assetType={form.asset_type} />
                </div>
              </div>
            </div>

            {/* Step 4 — Risk & Liquidity (auto-set but editable) */}
            <div className="bg-surface rounded-xl p-4 space-y-4">
              <div className="text-xs text-text-muted font-medium uppercase tracking-wider">שלב 4 — סיכון ונזילות (הוגדר אוטומטי)</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">רמת סיכון</label>
                  <select className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    value={form.risk_level} onChange={(e) => setField("risk_level", e.target.value)}>
                    {Object.entries(RISK_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">נזילות</label>
                  <select className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    value={form.liquidity_level} onChange={(e) => setField("liquidity_level", e.target.value)}>
                    {Object.entries(LIQUIDITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setForm(INITIAL_FORM); }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-white border border-white/10 rounded-lg transition-colors">
                ביטול
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {saving ? "שומר..." : "הוסף נכס"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "retirement", "security", "growth"] as const).map((r) => (
          <button key={r} onClick={() => setFilterRing(r)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={filterRing === r
              ? r === "all"
                ? { backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                : { backgroundColor: `${RING_CONFIG[r].color}18`, color: RING_CONFIG[r].color, border: `1px solid ${RING_CONFIG[r].color}40` }
              : { backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {r === "all" ? "הכל" : RING_CONFIG[r].label}
          </button>
        ))}
      </div>

      {/* Asset table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {["נכס", "טבעת", "סוג", "יתרה", "חודשי", "דמי ניהול", "תשואה", "סיכון", ""].map((h) => (
                <th key={h} className="text-right px-4 py-3 text-xs text-text-muted font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset, i) => {
              const cfg = RING_CONFIG[asset.ring as RingType];
              const fees = asset.management_fees ?? 0;
              const bench = FEE_BENCHMARKS[asset.asset_type as string];
              const feeColor = !bench ? "text-text-muted"
                : fees <= bench.good ? "text-emerald-400"
                : fees <= bench.ok ? "text-amber-400"
                : "text-red-400";
              return (
                <tr key={asset.id ?? i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{asset.name}</div>
                    {asset.provider && <div className="text-xs text-text-muted">{asset.provider}</div>}
                    {asset.investment_track && <div className="text-xs text-indigo-400">{asset.investment_track}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{ASSET_TYPE_LABELS[asset.asset_type as string] ?? asset.asset_type}</td>
                  <td className="px-4 py-3 text-white font-semibold">{formatCurrency(asset.balance)}</td>
                  <td className="px-4 py-3 text-text-secondary">₪{(asset.monthly_deposit ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={feeColor}>{fees.toFixed(2)}%</span>
                  </td>
                  <td className="px-4 py-3 text-emerald-400">{(asset.historical_return ?? 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{RISK_LABELS[asset.risk_level as string] ?? asset.risk_level}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(asset.id)} className="text-xs text-text-muted hover:text-red-400 transition-colors">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">לא נמצאו נכסים</div>
        )}
      </div>
    </div>
  );
}
