import { useState, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";

const TIERS = ["NoBrain","Easy","EasyPlus","Medium","MediumPlus","Hard","SuperHard"];
const TC = {
  NoBrain:["#E6F1FB","#0C447C"],Easy:["#EAF3DE","#27500A"],EasyPlus:["#E1F5EE","#085041"],
  Medium:["#FAEEDA","#633806"],MediumPlus:["#FAEEDA","#854F0B"],Hard:["#FAECE7","#712B13"],
  SuperHard:["#FCEBEB","#791F1F"]
};
const METRICS = [
  {key:"win_rate",label:"Win Rate",unit:"%",hi:true,pct:true},
  {key:"play_user",label:"Play/User",unit:"",hi:false,pct:false},
  {key:"drop",label:"Drop Start→Win",unit:"%",hi:false,pct:true},
  {key:"retain",label:"Retain Level",unit:"%",hi:true,pct:true},
  {key:"delta",label:"%Delta",unit:"%",hi:false,pct:true},
  {key:"user_ad_reward",label:"%User Ad Reward",unit:"%",hi:null,pct:true},
  {key:"ads_reward_user",label:"Ads Reward/User",unit:"",hi:null,pct:false},
  {key:"user_revive",label:"%User Revive",unit:"%",hi:null,pct:true},
  {key:"avg_revive",label:"Avg Revive",unit:"",hi:null,pct:false},
  {key:"p_rate",label:"P-rate",unit:"%",hi:null,pct:true},
  {key:"user_ad_inter",label:"%User Ad Inter",unit:"%",hi:null,pct:true},
  {key:"ads_inter_user",label:"Ads Inter/User",unit:"",hi:null,pct:false},
];
const ALIASES = {
  level:["level","lv","lv."],
  tier:["tier","difficulty","difficulty_tier","base ske","base_ske","ske","type"],
  win_rate:["win_rate","win rate","winrate","wr"],
  play_user:["play_user","play/user","plays/user","play per user","plays_per_user"],
  drop:["drop","drop_rate","drop from start to w","drop from start to win","drop_from_start_to_win"],
  retain:["retain","retain_level","retain level","retention"],
  delta:["delta","%delta","pct_delta"],
  user_ad_reward:["user_ad_reward","%user ad reward","user ad reward"],
  ads_reward_user:["ads_reward_user","ads reward/user","ads reward per user"],
  user_ad_inter:["user_ad_inter","%user ad inter","user ad inter"],
  ads_inter_user:["ads_inter_user","ads inter/user"],
  user_revive:["user_revive","%user revive","user revive"],
  avg_revive:["avg_revive","avg revive"],
  p_rate:["p_rate","p-rate","prate","purchase_rate"],
  users:["users","users_start_level","users start level"],
};

function matchCol(h) {
  const n = h.toLowerCase().replace(/[_\-]/g, " ").trim();
  for (const [k, als] of Object.entries(ALIASES)) {
    for (const a of als) { if (n === a || n.startsWith(a)) return k; }
  }
  return null;
}

function pNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  return typeof v === "number" ? v : isNaN(+String(v).replace(/[%,]/g, "").trim()) ? NaN : +String(v).replace(/[%,]/g, "").trim();
}

function shouldScale(vals) {
  const c = vals.filter((v) => !isNaN(v) && v !== 0);
  if (c.length < 2) return false;
  return Math.max(...c.map(Math.abs)) <= 1.05;
}

function readCSV(file) {
  return new Promise((res, rej) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
      delimitersToGuess: [",", "\t", ";", "|"],
      complete(result) {
        try {
          if (!result.data?.length) return rej("Empty file");
          const headers = result.meta.fields || [];
          const colMap = {};
          headers.forEach((h) => { const m = matchCol(h.trim()); if (m) colMap[m] = h; });
          if (!colMap.level) return rej("Column Level not found. Available: " + headers.join(", "));
          let rows = result.data.map((r) => {
            const o = {};
            for (const k in colMap) { o[k] = k === "tier" ? String(r[colMap[k]] || "").trim() : pNum(r[colMap[k]]); }
            return o;
          }).filter((r) => !isNaN(r.level) && r.level > 0);
          if (!rows.length) return rej("No valid rows.");
          METRICS.forEach((m) => {
            if (!m.pct || !colMap[m.key]) return;
            const vals = rows.map((r) => r[m.key]);
            if (shouldScale(vals)) { rows.forEach((r) => { if (!isNaN(r[m.key])) r[m.key] = Math.round(r[m.key] * 10000) / 100; }); }
          });
          res({ rows, headers, mapped: Object.keys(colMap), count: rows.length });
        } catch (e) { rej("Parse error: " + e.message); }
      },
      error(e) { rej("CSV error: " + e.message); },
    });
  });
}

function inferTier(r) {
  if (r.tier && TIERS.includes(r.tier)) return r.tier;
  const w = r.win_rate;
  if (isNaN(w)) return "Medium";
  if (w >= 85) return "NoBrain"; if (w >= 70) return "Easy"; if (w >= 60) return "EasyPlus";
  if (w >= 50) return "Medium"; if (w >= 40) return "MediumPlus"; if (w >= 30) return "Hard";
  return "SuperHard";
}

function compTierAvgs(rows) {
  const g = {}; TIERS.forEach((t) => (g[t] = []));
  rows.forEach((r) => { const t = inferTier(r); if (g[t]) g[t].push(r); });
  const a = {};
  for (const t in g) {
    a[t] = {};
    METRICS.forEach((m) => {
      const v = g[t].map((x) => x[m.key]).filter((x) => !isNaN(x));
      a[t][m.key] = v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    });
  }
  return a;
}

function predictR(br, bt, ht, ta) {
  if (bt === ht) return { ...br, tier: ht };
  const p = { ...br, tier: ht };
  METRICS.forEach((m) => {
    const bv = br[m.key], ba = ta[bt]?.[m.key], ha = ta[ht]?.[m.key];
    if (!isNaN(bv) && ba && ha && ba !== 0) p[m.key] = Math.round((bv * ha / ba) * 100) / 100;
  });
  return p;
}

function Pill({ tier }) {
  const c = TC[tier] || ["#eee", "#333"];
  return <span style={{ fontSize: "10px", padding: "2px 6px", background: c[0], color: c[1], borderRadius: "6px", fontWeight: 500, whiteSpace: "nowrap" }}>{tier}</span>;
}

function F(v, u) { if (isNaN(v) || v == null) return "\u2014"; return u === "%" ? v.toFixed(1) + "%" : v.toFixed(2); }

function Delt({ bv, hv, hi }) {
  if (isNaN(bv) || isNaN(hv) || bv === 0) return null;
  const d = hv - bv, p = (d / Math.abs(bv)) * 100;
  if (Math.abs(p) < 0.5) return null;
  const g = hi == null ? null : hi ? d > 0 : d < 0;
  const col = g == null ? "var(--color-text-secondary)" : g ? "var(--color-text-success)" : "var(--color-text-danger)";
  return <span style={{ fontSize: "10px", color: col, marginLeft: "3px" }}>({p > 0 ? "+" : ""}{p.toFixed(1)}%)</span>;
}

function Upload({ label, color, data, onPick, loading }) {
  const ref = useRef();
  return (
    <div style={{ flex: 1, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "12px", textAlign: "center", background: data ? "var(--color-background-primary)" : "var(--color-background-secondary)" }}>
      <div style={{ fontSize: "12px", fontWeight: 500, color, marginBottom: "6px" }}>{label}</div>
      {loading ? (
        <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>Parsing...</div>
      ) : data ? (
        <div style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
          {data.count} levels, {data.mapped.length} cols
          <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "3px", justifyContent: "center" }}>
            {data.mapped.map((m) => (
              <span key={m} style={{ fontSize: "9px", padding: "1px 4px", background: "var(--color-background-info)", color: "var(--color-text-info)", borderRadius: "4px" }}>{m}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>CSV file (save Excel as CSV)</div>
      )}
      <button onClick={() => ref.current?.click()} style={{ fontSize: "11px", padding: "4px 12px", marginTop: "8px" }}>
        {data ? "Re-upload" : "Upload CSV"}
      </button>
      <input ref={ref} type="file" accept=".csv,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} style={{ display: "none" }} />
    </div>
  );
}

function GuidePage({ onBack }) {
  const thS = { padding: "6px 8px", textAlign: "left", fontWeight: 500, background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" };
  const tdS = { padding: "5px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", fontSize: "11px" };
  const bxS = { background: "var(--color-background-secondary)", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "12px", lineHeight: 1.8, color: "var(--color-text-secondary)" };

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "0.5rem 0", fontSize: "13px" }}>
      <button onClick={onBack} style={{ fontSize: "12px", padding: "4px 12px", marginBottom: "16px" }}>
        {"← Back to tool"}
      </button>

      <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "20px 0 8px" }}>{"1. Data preparation"}</h2>
      <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "14px 0 6px" }}>{"File format"}</h3>
      <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{"CSV only. Excel → File → Save As → CSV UTF-8."}</p>

      <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "14px 0 6px" }}>{"% Value auto-detection"}</h3>
      <div style={bxS}>
        <div>{"Tool auto-detects % values (0-1 or 0-100):"}</div>
        <div>{"Win Rate = 0.6051 → ×100 → 60.51%"}</div>
        <div>{"Win Rate = 60.51 → as-is → 60.51%"}</div>
        <div style={{ marginTop: "4px" }}>{"Logic: if max(abs(column)) ≤ 1.05 → decimal → ×100"}</div>
      </div>

      <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "14px 0 6px" }}>{"Column name matching"}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
        <thead><tr><th style={thS}>{"Metric"}</th><th style={thS}>{"Accepted names"}</th></tr></thead>
        <tbody>
          <tr><td style={tdS}>{"Level"}</td><td style={tdS}>{"Level, Lv, Lv."}</td></tr>
          <tr><td style={tdS}>{"Tier"}</td><td style={tdS}>{"Tier, Difficulty, Base SKE, Type"}</td></tr>
          <tr><td style={tdS}>{"Win Rate"}</td><td style={tdS}>{"Win Rate, WR, Win_Rate"}</td></tr>
          <tr><td style={tdS}>{"Play/User"}</td><td style={tdS}>{"Play/User, Plays/User"}</td></tr>
          <tr><td style={tdS}>{"Drop"}</td><td style={tdS}>{"Drop From Start To Win, Drop"}</td></tr>
          <tr><td style={tdS}>{"Retain"}</td><td style={tdS}>{"Retain Level, Retain, Retention"}</td></tr>
          <tr><td style={tdS}>{"P-rate"}</td><td style={tdS}>{"P-rate, P_Rate, Purchase_Rate"}</td></tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "20px 0 8px" }}>{"2. How to use"}</h2>
      <div style={bxS}>
        <div><strong>{"Option A — Tier only:"}</strong>{" File with Level + Tier. Tool predicts metrics."}</div>
        <div style={{ marginTop: "4px" }}><strong>{"Option B — Full override:"}</strong>{" Copy base, edit tier/metrics."}</div>
        <div style={{ marginTop: "4px" }}><strong>{"Option C — No Tier col:"}</strong>{" Tool infers from Win Rate."}</div>
      </div>

      <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "20px 0 8px" }}>{"3. Prediction methodology"}</h2>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontFamily: "var(--font-mono)", fontSize: "13px", textAlign: "center" }}>
        {"predicted = base_metric × (new_tier_avg / old_tier_avg)"}
      </div>
      <div style={bxS}>
        <div><strong>{"Step 1:"}</strong>{" Compute tier averages from base data"}</div>
        <div>{"Hard avg WR = 38.2%, Medium avg WR = 62.1%"}</div>
        <div style={{ marginTop: "4px" }}><strong>{"Step 2:"}</strong>{" Level 15: WR=30.35%, tier=Hard → change to Medium"}</div>
        <div style={{ marginTop: "4px" }}><strong>{"Step 3:"}</strong>{" Ratio = 62.1/38.2 = 1.626. Predicted WR = 30.35 × 1.626 = 49.35%"}</div>
      </div>

      <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "14px 0 6px" }}>{"Tier inference brackets"}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
        <thead><tr><th style={thS}>{"Win Rate"}</th><th style={thS}>{"Tier"}</th></tr></thead>
        <tbody>
          {[["≥85%","NoBrain"],["70-85%","Easy"],["60-70%","EasyPlus"],["50-60%","Medium"],["40-50%","MediumPlus"],["30-40%","Hard"],["<30%","SuperHard"]].map(([wr,t]) => (
            <tr key={t}><td style={tdS}>{wr}</td><td style={tdS}><Pill tier={t} /></td></tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 500, margin: "20px 0 8px" }}>{"4. Limitations"}</h2>
      <div style={bxS}>
        <div><strong style={{ color: "var(--color-text-danger)" }}>{"Assumption:"}</strong>{" Tier is the only driver."}</div>
        <div style={{ marginTop: "6px" }}><strong style={{ color: "var(--color-text-warning)" }}>{"Not captured:"}</strong></div>
        <div>{"- Cross-metric interactions, accumulated frustration"}</div>
        <div>{"- Session effects, player skill variance"}</div>
        <div>{"- Economy/booster carry-over, level-specific mechanics"}</div>
        <div style={{ marginTop: "6px" }}><strong style={{ color: "var(--color-text-info)" }}>{"Improve:"}</strong>{" More levels/tier, segment files, cross-validate with AB tests."}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [base, setBase] = useState(null);
  const [hypo, setHypo] = useState(null);
  const [err, setErr] = useState(null);
  const [loadB, setLoadB] = useState(false);
  const [loadH, setLoadH] = useState(false);
  const [view, setView] = useState("chart");
  const [selLv, setSelLv] = useState(null);
  const [focusM, setFocusM] = useState("win_rate");
  const [page, setPage] = useState("tool");

  const pickBase = useCallback((f) => {
    setErr(null); setLoadB(true);
    readCSV(f).then((d) => { setBase(d); setLoadB(false); }).catch((e) => { setErr("Base: " + e); setLoadB(false); });
  }, []);
  const pickHypo = useCallback((f) => {
    setErr(null); setLoadH(true);
    readCSV(f).then((d) => { setHypo(d); setLoadH(false); }).catch((e) => { setErr("Hypo: " + e); setLoadH(false); });
  }, []);

  const ta = useMemo(() => base ? compTierAvgs(base.rows) : {}, [base]);

  const merged = useMemo(() => {
    if (!base || !hypo) return null;
    const hM = {}; hypo.rows.forEach((r) => { hM[r.level] = r; });
    return base.rows.map((b) => {
      const bt = inferTier(b); const h = hM[b.level];
      const ht = h ? (h.tier && TIERS.includes(h.tier) ? h.tier : inferTier(h)) : bt;
      return { level: b.level, base: { ...b, tier: bt }, hypo: { ...predictR(b, bt, ht, ta), tier: ht }, changed: bt !== ht };
    }).sort((a, b) => a.level - b.level);
  }, [base, hypo, ta]);

  const summary = useMemo(() => {
    if (!merged) return null;
    const avg = (arr, f) => { const v = arr.map((a) => a[f]).filter((x) => !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
    const r = {}; METRICS.forEach((m) => { r[m.key] = { b: avg(merged.map((x) => x.base), m.key), h: avg(merged.map((x) => x.hypo), m.key) }; });
    r.ch = merged.filter((x) => x.changed).length;
    return r;
  }, [merged]);

  const fm = METRICS.find((m) => m.key === focusM) || METRICS[0];
  const sel = selLv != null && merged ? merged.find((x) => x.level === selLv) : null;

  if (page === "guide") return <GuidePage onBack={() => setPage("tool")} />;

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "0.5rem 0", fontSize: "13px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h1 style={{ fontSize: "16px", fontWeight: 500 }}>{"Difficulty Curve Predictor"}</h1>
        <button onClick={() => setPage("guide")} style={{ fontSize: "11px", padding: "4px 12px" }}>{"Guide & methodology"}</button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <Upload label="Base config (current)" color="var(--color-text-info)" data={base} onPick={pickBase} loading={loadB} />
        <Upload label="Hypothesis config (new)" color="var(--color-text-warning)" data={hypo} onPick={pickHypo} loading={loadH} />
      </div>

      {err && <div style={{ padding: "8px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "8px", fontSize: "12px", marginBottom: "12px" }}>{err}</div>}

      {!merged && !err && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: "12px" }}>
          {"Upload 2 CSV files to start. Click Guide for details."}
        </div>
      )}

      {merged && summary && (
        <>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>{merged.length}{" levels, "}{summary.ch}{" changed"}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
              {["chart", "table"].map((m) => (
                <button key={m} onClick={() => setView(m)} style={{ fontSize: "11px", padding: "3px 8px", fontWeight: view === m ? 500 : 400, background: view === m ? "var(--color-background-secondary)" : "transparent" }}>
                  {m === "chart" ? "Chart" : "Table"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px", marginBottom: "14px" }}>
            {METRICS.slice(0, 8).map((m) => {
              const bv = summary[m.key].b, hv = summary[m.key].h;
              return (
                <div key={m.key} onClick={() => setFocusM(m.key)} style={{ background: focusM === m.key ? "var(--color-background-info)" : "var(--color-background-secondary)", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", border: focusM === m.key ? "0.5px solid var(--color-border-info)" : "0.5px solid transparent" }}>
                  <div style={{ fontSize: "10px", color: "var(--color-text-secondary)", marginBottom: "2px" }}>{m.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>{F(bv, m.unit)}</span>
                    <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>{"→"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>{F(hv, m.unit)}</span>
                    <Delt bv={bv} hv={hv} hi={m.hi} />
                  </div>
                </div>
              );
            })}
          </div>

          {view === "chart" && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginBottom: "6px", textAlign: "center" }}>{fm.label}{" — Base (top) vs Hypothesis (bottom)"}</div>
              {["base", "hypo"].map((w) => {
                const mx = Math.max(...merged.map((x) => { const v = x[w][fm.key]; return isNaN(v) ? 0 : Math.abs(v); }), 0.01);
                return (
                  <div key={w} style={{ display: "flex", alignItems: w === "base" ? "flex-end" : "flex-start", height: "70px", gap: "1px", background: "var(--color-background-secondary)", borderRadius: "8px", padding: "4px 2px", marginBottom: "2px" }}>
                    {merged.map((m, i) => {
                      const v = m[w][fm.key]; const pct = isNaN(v) ? 3 : Math.max(3, (Math.abs(v) / mx) * 100);
                      const c = TC[m[w].tier] || ["#ddd", "#333"];
                      return (
                        <div key={i} onClick={() => setSelLv(selLv === m.level ? null : m.level)} title={`Lv.${m.level} ${m[w].tier} ${fm.label}:${F(v, fm.unit)}`}
                          style={{ flex: 1, minWidth: 0, height: `${pct}%`, background: c[0], cursor: "pointer", borderTop: w === "base" ? `2px solid ${c[1]}` : "none", borderBottom: w === "hypo" ? `2px solid ${c[1]}` : "none", opacity: selLv != null && selLv !== m.level ? 0.3 : 1, outline: m.changed ? "1px solid var(--color-border-warning)" : "none", transition: "opacity 0.1s" }} />
                      );
                    })}
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--color-text-tertiary)", padding: "0 4px" }}>
                <span>{"Lv." + merged[0].level}</span><span>{"Lv." + merged[merged.length - 1].level}</span>
              </div>
            </div>
          )}

          {view === "table" && (
            <div style={{ maxHeight: "360px", overflow: "auto", marginBottom: "12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "var(--color-background-secondary)", zIndex: 1 }}>
                    <th style={{ padding: "4px 6px", textAlign: "left", fontWeight: 500 }}>{"Lv"}</th>
                    <th style={{ padding: "4px", fontWeight: 500 }}>{"Base"}</th>
                    <th style={{ padding: "4px", fontWeight: 500 }}>{"Hypo"}</th>
                    {METRICS.slice(0, 6).map((m) => <th key={m.key} style={{ padding: "4px", fontWeight: 500, fontSize: "10px" }}>{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {merged.map((m, i) => (
                    <tr key={i} onClick={() => setSelLv(selLv === m.level ? null : m.level)} style={{ cursor: "pointer", background: selLv === m.level ? "var(--color-background-info)" : m.changed ? "var(--color-background-warning)" : "transparent" }}>
                      <td style={{ padding: "3px 6px", fontWeight: 500 }}>{m.level}</td>
                      <td style={{ padding: "3px", textAlign: "center" }}><Pill tier={m.base.tier} /></td>
                      <td style={{ padding: "3px", textAlign: "center" }}><Pill tier={m.hypo.tier} /></td>
                      {METRICS.slice(0, 6).map((met) => (
                        <td key={met.key} style={{ padding: "3px 4px", textAlign: "center", fontSize: "10px" }}>
                          <span style={{ color: "var(--color-text-tertiary)" }}>{F(m.base[met.key], met.unit)}</span>
                          {m.changed && (
                            <>
                              <br />
                              <span style={{ fontWeight: 500 }}>{F(m.hypo[met.key], met.unit)}</span>
                              <Delt bv={m.base[met.key]} hv={m.hypo[met.key]} hi={met.hi} />
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sel && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span style={{ fontWeight: 500 }}>{"Level " + sel.level}</span>
                <Pill tier={sel.base.tier} />
                <span style={{ color: "var(--color-text-tertiary)", fontSize: "11px" }}>{"→"}</span>
                <Pill tier={sel.hypo.tier} />
                {sel.changed && <span style={{ fontSize: "10px", padding: "2px 6px", background: "var(--color-background-warning)", color: "var(--color-text-warning)", borderRadius: "4px" }}>{"changed"}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {METRICS.map((m) => {
                  const bv = sel.base[m.key], hv = sel.hypo[m.key];
                  if (isNaN(bv) && isNaN(hv)) return null;
                  return (
                    <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "var(--color-background-secondary)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{m.label}</span>
                      <span style={{ fontSize: "12px" }}>
                        <span style={{ color: "var(--color-text-tertiary)" }}>{F(bv, m.unit)}</span>
                        <span style={{ margin: "0 3px", color: "var(--color-text-tertiary)" }}>{"→"}</span>
                        <span style={{ fontWeight: 500 }}>{F(hv, m.unit)}</span>
                        <Delt bv={bv} hv={hv} hi={m.hi} />
                      </span>
                    </div>
                  );
                })}
              </div>
              {sel.changed && (() => {
                const wr = sel.hypo.win_rate;
                const bg = wr < 30 ? "var(--color-background-danger)" : wr < 45 ? "var(--color-background-warning)" : "var(--color-background-success)";
                const cl = wr < 30 ? "var(--color-text-danger)" : wr < 45 ? "var(--color-text-warning)" : "var(--color-text-success)";
                const tx = wr < 30 ? `WR ${F(wr, "%")} — high churn risk.` : wr < 45 ? `WR ${F(wr, "%")} — moderate difficulty.` : `WR ${F(wr, "%")} — healthy range.`;
                return <div style={{ marginTop: "10px", padding: "6px 8px", borderRadius: "8px", fontSize: "11px", background: bg, color: cl }}>{tx}</div>;
              })()}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {TIERS.map((t) => {
              const bc = merged.filter((x) => x.base.tier === t).length;
              const hc = merged.filter((x) => x.hypo.tier === t).length;
              if (!bc && !hc) return null;
              const c = TC[t];
              return <div key={t} style={{ fontSize: "10px", padding: "3px 8px", background: c[0], color: c[1], borderRadius: "8px" }}>{t}{": "}{bc}{"→"}{hc}{" "}{hc > bc ? "↑" : hc < bc ? "↓" : "="}</div>;
            })}
          </div>
        </>
      )}
    </div>
  );
}