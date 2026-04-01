import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Table as TableIcon, 
  BarChart3, Upload, Info, FileCode,
  Layers, Database, Zap, ArrowRightLeft,
  BookOpen, Calculator, Target, Users
} from 'lucide-react';

const PROGRESSION_STEPS = [0, 20, 35, 40, 50, 60, 65, 70, 75, 80, 85];

/** * BENCHMARK THỰC TẾ (Lấy từ dữ liệu PDF và Hình ảnh Hypo)
 */
const TIER_BENCHMARKS = {
  "NoBrain": { naturalWR: 97.5, playUser: 1.02, userAdPct: 3.2, delta: -3.8, adsPerUser: 0.03 },
  "Easy": { naturalWR: 67.0, playUser: 1.45, userAdPct: 12.2, delta: -4.2, adsPerUser: 0.16 },
  "EasyPlus": { naturalWR: 66.0, playUser: 1.46, userAdPct: 21.5, delta: -4.5, adsPerUser: 0.28 },
  "Medium": { naturalWR: 71.4, playUser: 1.37, userAdPct: 56.5, delta: -4.2, adsPerUser: 0.84 },
  "MediumPlus": { naturalWR: 53.0, playUser: 1.81, userAdPct: 60.6, delta: -4.8, adsPerUser: 0.99 },
  "MediumPlus2": { naturalWR: 49.0, playUser: 1.95, userAdPct: 84.0, delta: -5.0, adsPerUser: 2.10 },
  "Hard": { naturalWR: 40.0, playUser: 2.37, userAdPct: 83.4, delta: -5.2, adsPerUser: 1.85 },
  "HardPlus": { naturalWR: 35.0, playUser: 2.80, userAdPct: 84.5, delta: -5.5, adsPerUser: 2.05 },
  "SuperHardPlus": { naturalWR: 18.77, playUser: 4.90, userAdPct: 80.9, delta: -5.8, adsPerUser: 1.87 },
  "SuperHardPlus2": { naturalWR: 25.2, playUser: 3.73, userAdPct: 82.5, delta: -4.5, adsPerUser: 1.79 },
  "SuperHardPlus3": { naturalWR: 22.0, playUser: 5.80, userAdPct: 91.0, delta: -4.0, adsPerUser: 2.90 }
};

const TIERS = Object.keys(TIER_BENCHMARKS);

const INITIAL_BASE_WEIGHTS = {
  "NoBrain": [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  "Easy": [0, 0, 0, 0.5, 0.5, 1, 1, 1, 1.5, 1.5, 1.5],
  "EasyPlus": [0, 0.5, 0.5, 0.5, 1, 1, 1, 1.5, 1.5, 1.75, 1.75],
  "Medium": [0, 0.5, 1, 1.5, 1.5, 1.75, 1, 1.5, 1.5, 1.75, 1.75],
  "MediumPlus": [0, 0.5, 1, 1.5, 1.5, 1.75, 1.5, 1.75, 1.75, 2, 2],
  "MediumPlus2": [0, 0.5, 1, 1.5, 1.5, 1.75, 1.5, 1.75, 1.75, 2, 2],
  "Hard": [0, 0.5, 1, 1.5, 1.5, 2, 1.5, 2, 2, 2.5, 2.5],
  "HardPlus": [0, 0.5, 1, 1.5, 1.5, 2, 1.5, 2, 2, 2.5, 2.5],
  "SuperHardPlus": [0, 0.5, 1, 1.5, 1.5, 2, 1.5, 2.5, 2.5, 3, 3],
  "SuperHardPlus2": [0, 0.5, 1, 1.5, 1.5, 2, 1.5, 2.5, 2.5, 3, 3],
  "SuperHardPlus3": [0, 0.5, 1, 1.5, 1.5, 2, 1.5, 2.5, 2.5, 3, 3]
};

const INITIAL_HYPO_WEIGHTS = {
  "NoBrain": [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  "Easy": [0, 0, 0, 0.5, 0.5, 1, 1, 1, 1.5, 1.5, 1.5],
  "EasyPlus": [0, 0.5, 0.5, 0.5, 1, 1, 1, 1.5, 1.5, 1.75, 1.75],
  "Medium": [0, 0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.75, 1.75],
  "MediumPlus": [0, 0.5, 1.5, 1.5, 0.5, 1.5, 1.5, 1.75, 1.75, 2, 2],
  "MediumPlus2": [0, 0.5, 1.5, 1.5, 0.5, 1.5, 1.5, 2, 2, 2.25, 2.25],
  "Hard": [0, 0.5, 1.5, 1.5, 1, 1.5, 1.5, 2, 2, 2.5, 2.5],
  "HardPlus": [0, 1, 1.5, 1.5, 1, 2, 2, 2.5, 2.5, 3, 3],
  "SuperHardPlus": [0, 1, 1.5, 1.5, 1, 2, 2, 2.5, 2.5, 3, 3],
  "SuperHardPlus2": [0, 1, 1.5, 1.5, 1.25, 2.25, 2.25, 2.75, 2.75, 3.25, 3.25],
  "SuperHardPlus3": [0, 1, 2, 2, 1.5, 2.5, 2.5, 3, 3, 3.5, 3.5]
};

const App = () => {
  const [viewMode, setViewMode] = useState('chart'); // chart, table, guide
  const [baseDataFile, setBaseDataFile] = useState(null);
  const [hypoDataFile, setHypoDataFile] = useState(null);
  const [baseWeights, setBaseWeights] = useState(INITIAL_BASE_WEIGHTS);
  const [hypoWeights, setHypoWeights] = useState(INITIAL_HYPO_WEIGHTS);

  const baseInputRef = useRef(null);
  const hypoInputRef = useRef(null);

  /**
   * CÔNG THỨC DỰ BÁO
   */
  const predictMetrics = (tier, weight) => {
    const bench = TIER_BENCHMARKS[tier] || TIER_BENCHMARKS["Medium"];
    const w = Math.max(0, parseFloat(weight));
    const natWR = Math.max(18.0, bench.naturalWR - (w * 3.8));
    const replayFactor = Math.pow((bench.naturalWR / natWR), 0.65);
    const predictedPlay = Math.min(6.5, bench.playUser * replayFactor);
    const adFactor = (bench.naturalWR - natWR) * 1.15;
    const adPct = Math.min(99.0, bench.userAdPct + adFactor);
    const effectiveWR = natWR + (100 - natWR) * (adPct / 100 * 0.55);
    const frustrationPenalty = effectiveWR < 50 ? Math.pow((50 - effectiveWR) / 10, 1.45) * 0.85 : 0;
    const fatiguePenalty = predictedPlay > 3.8 ? (predictedPlay - 3.8) * 0.6 : 0;
    const totalDelta = bench.delta - frustrationPenalty - fatiguePenalty;

    return { naturalWR: natWR, effectiveWR: effectiveWR, playUser: predictedPlay, userAdPct: adPct, delta: totalDelta };
  };

  const handleFileUpload = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      const headers = rows[0].map(h => h.toLowerCase().replace(/ /g, '_'));
      const data = rows.slice(1).filter(r => r.length > 1).map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });
      if (target === 'base') setBaseDataFile(data);
      else setHypoDataFile(data);
    };
    reader.readAsText(file);
  };

  const levelComparison = useMemo(() => {
    const count = hypoDataFile ? hypoDataFile.length : (baseDataFile ? baseDataFile.length : 100);
    const results = [];
    let cumulativeBaseRetain = 100;
    let cumulativeHypoRetain = 100;

    for (let i = 0; i < count; i++) {
      const lv = i + 1;
      const prog = (i / (count - 1)) * 85;
      const getPIdx = (p) => {
        for (let j = PROGRESSION_STEPS.length - 1; j >= 0; j--) {
          if (p >= PROGRESSION_STEPS[j]) return j;
        }
        return 0;
      };
      const pIdx = getPIdx(prog);

      const bTier = baseDataFile?.[i]?.tier || baseDataFile?.[i]?.Tier || (lv <= 2 ? "NoBrain" : (lv % 15 === 0 ? "SuperHardPlus" : "Medium"));
      const hTier = hypoDataFile?.[i]?.tier || hypoDataFile?.[i]?.Tier || bTier;

      const bWeight = baseWeights[bTier]?.[pIdx] || 0;
      const hWeight = hypoWeights[hTier]?.[pIdx] || 0;

      const baseRes = predictMetrics(bTier, bWeight);
      const hypoRes = predictMetrics(hTier, hWeight);

      if (lv > 1) {
        cumulativeBaseRetain = Math.max(0.1, cumulativeBaseRetain * (1 + baseRes.delta / 100));
        cumulativeHypoRetain = Math.max(0.1, cumulativeHypoRetain * (1 + hypoRes.delta / 100));
      }

      results.push({
        lv, prog: prog.toFixed(0), baseTier: bTier, hypoTier: hTier,
        base: { ...baseRes, retain: cumulativeBaseRetain, weight: bWeight },
        hypo: { ...hypoRes, retain: cumulativeHypoRetain, weight: hWeight }
      });
    }
    return results;
  }, [baseDataFile, hypoDataFile, baseWeights, hypoWeights]);

  const stats = useMemo(() => {
    const avg = (key, target) => levelComparison.reduce((a, b) => a + b[target][key], 0) / levelComparison.length;
    return [
      { label: 'Avg Effective WR (H)', b: avg('effectiveWR', 'base'), h: avg('effectiveWR', 'hypo'), u: '%' },
      { label: 'Avg Play/User (H)', b: avg('playUser', 'base'), h: avg('playUser', 'hypo'), u: '' },
      { label: '%User Ad Reward (H)', b: avg('userAdPct', 'base'), h: avg('userAdPct', 'hypo'), u: '%' },
      { label: 'Retention @L50 (H)', b: levelComparison[49]?.base.retain || 0, h: levelComparison[49]?.hypo.retain || 0, u: '%' }
    ];
  }, [levelComparison]);

  const getRelativeChange = (hypo, base) => {
    if (!base) return 0;
    return ((hypo / base) - 1) * 100;
  };

  const ChangeBadge = ({ val, inverse = false }) => {
    if (isNaN(val) || Math.abs(val) < 0.1) return null;
    const isPositive = val > 0;
    const isGood = inverse ? !isPositive : isPositive;
    return (
      <span className={`text-[8px] font-bold ml-1 ${isGood ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '▲' : '▼'}{Math.abs(val).toFixed(1)}%
      </span>
    );
  };

  const WeightMatrix = ({ title, weights, setWeights, color }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto mb-2">
      <div className={`text-[10px] font-black mb-3 uppercase tracking-widest ${color} italic`}>{title}</div>
      <table className="w-full text-[9px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="p-2 text-left border-r font-bold text-slate-500 min-w-[100px]">TIERS / PROG %</th>
            {PROGRESSION_STEPS.map(p => <th key={p} className="p-2 text-center border-r last:border-r-0 text-slate-400">{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {TIERS.map(tier => (
            <tr key={tier} className="border-b hover:bg-slate-50 transition-colors">
              <td className="p-2 border-r bg-slate-50/50 font-bold text-slate-600">{tier}</td>
              {weights[tier]?.map((v, idx) => (
                <td key={idx} className="p-0 border-r last:border-r-0 text-center">
                  <input 
                    type="number" step="0.1" 
                    className="w-full text-center bg-transparent focus:bg-white focus:outline-indigo-400 rounded p-1 font-bold text-indigo-700 h-8"
                    value={v}
                    onChange={(e) => {
                      const newW = JSON.parse(JSON.stringify(weights));
                      newW[tier][idx] = parseFloat(e.target.value) || 0;
                      setWeights(newW);
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100"><Layers size={28}/></div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tight text-slate-800 leading-none">Curve Predictor Suite</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">Puzzle Hybrid Economics Simulation</p>
            </div>
          </div>
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
            <button onClick={() => setViewMode('chart')} className={`px-6 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${viewMode === 'chart' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <BarChart3 size={16} /> DASHBOARD
            </button>
            <button onClick={() => setViewMode('table')} className={`px-6 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <TableIcon size={16} /> DETAIL
            </button>
            <button onClick={() => setViewMode('guide')} className={`px-6 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${viewMode === 'guide' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <BookOpen size={16} /> GUIDE
            </button>
          </div>
        </header>

        {viewMode === 'guide' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Guide Section */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5"><Layers size={200} /></div>
              <h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <BookOpen className="text-indigo-600" /> Hướng dẫn & Phương pháp (Methodology)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target size={18} /> 1. Mục tiêu công cụ
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Công cụ này được thiết kế để <b>mô phỏng phản ứng của người chơi</b> khi thay đổi cấu trúc roadmap (Tier) hoặc trọng số độ khó (Weights). Nó giúp Game Designer dự báo được điểm rơi của Retention và hiệu quả của quảng cáo Reward trước khi triển khai thực tế.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Calculator size={18} /> 2. Logic tính toán Win Rate
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Natural Win Rate (Skill-based)</div>
                        <p className="text-xs text-slate-600 font-medium italic">WR_Natural = WR_Benchmark - (Weight * 3.8)</p>
                        <p className="text-[10px] text-slate-400 mt-1">*Khóa sàn ở mức 18% để đảm bảo game luôn có thể thắng.</p>
                      </div>
                      <div className="border-t pt-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase">Effective Win Rate (Hybrid Logic)</div>
                        <p className="text-xs text-slate-600 font-medium italic">WR_Effective = WR_Natural + (100 - WR_Natural) * (%Ad_Reward * 0.55)</p>
                        <p className="text-[10px] text-slate-400 mt-1">*Mô phỏng việc xem Ads giúp tăng 55% khả năng thắng màn đó ngay lập tức.</p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Users size={18} /> 3. Logic Giữ chân (Retention)
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <b>Retain Level</b> được tính <b>tích lũy (Cumulative)</b> bắt đầu từ 100% ở Level 1.
                    </p>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                       <ul className="text-xs text-indigo-800 space-y-2 list-disc ml-4 font-medium">
                         <li>Mỗi màn chơi có một Churn Rate cơ bản dựa trên Tier.</li>
                         <li><b>Penalty Ức chế:</b> Nếu Effective WR {'<'} 50%, Churn tăng mạnh.</li>
                         <li><b>Penalty Mệt mỏi:</b> Nếu Play/User {'>'} 3.8, Churn tăng thêm.</li>
                         <li>Dốc rớt được hiệu chỉnh sát mốc: <b>L10(69%) - L30(27%) - L50(13%) - L100(3%)</b>.</li>
                       </ul>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={18} /> 4. Cách sử dụng
                    </h3>
                    <ol className="text-sm text-slate-600 space-y-2 list-decimal ml-4">
                      <li><b>Config Sources:</b> Upload file CSV (Level, Tier) để thay đổi cấu trúc roadmap.</li>
                      <li><b>Weights Grid:</b> Chỉnh sửa các ô trọng số để thay đổi độ khó của từng Tier tại các mốc tiến trình (0-85%).</li>
                      <li><b>Detailed Data:</b> Quan sát các huy hiệu <b>▲▼%</b> để thấy sự chênh lệch so với bản Base cũ.</li>
                    </ol>
                  </section>
                </div>
              </div>
            </div>

            {/* Quick Math Preview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-full"><TrendingUp size={20}/></div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Ngưỡng ức chế</div>
                  <div className="text-lg font-black">Effective WR {'<'} 50%</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-full"><Target size={20}/></div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Ngưỡng mệt mỏi</div>
                  <div className="text-lg font-black">Play/User {'>'} 3.8</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-full"><Zap size={20}/></div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Hiệu quả Ads</div>
                  <div className="text-lg font-black">Success Rate ~55%</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Main Content (Dashboard/Detail) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-700">{s.b.toFixed(1)}{s.u}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-2xl font-black text-indigo-600">{s.h.toFixed(1)}{s.u}</span>
                    <ChangeBadge val={getRelativeChange(s.h, s.b)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <WeightMatrix title="Base Weights (Historical 18)" weights={baseWeights} setWeights={setBaseWeights} color="text-slate-400" />
                <WeightMatrix title="Hypo Weights (Test 22)" weights={hypoWeights} setWeights={setHypoWeights} color="text-indigo-600" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                  <h3 className="text-xs font-black mb-4 uppercase tracking-widest text-slate-500 flex items-center gap-2"><Database size={16} /> Config Sources</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => baseInputRef.current.click()} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
                      <div className="flex items-center gap-2"><Upload size={16}/> BASE CSV</div>
                    </button>
                    <button onClick={() => hypoInputRef.current.click()} className="flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-700 hover:bg-indigo-200 transition-all">
                      <div className="flex items-center gap-2"><Upload size={16}/> HYPO CSV</div>
                    </button>
                    <input type="file" ref={baseInputRef} className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, 'base')} />
                    <input type="file" ref={hypoInputRef} className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, 'hypo')} />
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 bg-indigo-900 text-white p-5 rounded-2xl shadow-xl">
                     <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-indigo-300"><Zap size={16} className="text-yellow-400" /> Quick Logic</h3>
                     <p className="text-[11px] text-indigo-100 leading-relaxed italic">
                      Sử dụng các bảng trọng số phía trên để điều chỉnh độ khó. Các thay đổi về <b>Tier</b> (trong file upload) sẽ có tác động lớn nhất đến Win Rate và Retention.
                     </p>
                  </div>
                </div>

                <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
                  {viewMode === 'chart' ? (
                    <div className="p-8">
                      <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Win Rate Mirror View (Ads Support included)</div>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={levelComparison} stackOffset="sign">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="lv" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} />
                            <YAxis hide domain={[-110, 110]} />
                            <Tooltip cursor={{fill: '#f8fafc'}} content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xl text-[10px] min-w-[200px]">
                                      <div className="font-black text-slate-400 mb-2 border-b pb-1 uppercase italic">Level {data.lv}</div>
                                      <div className="space-y-1.5 font-bold">
                                        <div className="flex justify-between"><span>Base Tier:</span> <span className="text-slate-500">{data.baseTier}</span></div>
                                        <div className="flex justify-between text-indigo-600 font-black"><span>Hypo Tier:</span> <span>{data.hypoTier}</span></div>
                                        <div className="pt-2 border-t flex justify-between"><span>Base Eff. WR:</span> <span className="font-bold">{data.base.effectiveWR.toFixed(1)}%</span></div>
                                        <div className="flex justify-between text-indigo-600"><span>Hypo Eff. WR:</span> <span>{data.hypo.effectiveWR.toFixed(1)}%</span></div>
                                        <div className="pt-2 flex justify-between font-black text-indigo-900 border-t"><span>Hypo Retain:</span> <span>{data.hypo.retain.toFixed(1)}%</span></div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey={(d) => -d.base.effectiveWR} stackId="a" fill="#e2e8f0" radius={[0, 0, 4, 4]} />
                            <Bar dataKey={(d) => d.hypo.effectiveWR} stackId="a" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm border-b uppercase text-slate-400 font-black tracking-tighter">
                          <tr className="bg-slate-50">
                            <th className="p-4">Lv</th>
                            <th className="p-4">Tier (B)</th>
                            <th className="p-4">Tier (H)</th>
                            <th className="p-4 text-center">Natural WR (H)</th>
                            <th className="p-4 text-center bg-indigo-50 text-indigo-700">Eff. WR (H)</th>
                            <th className="p-4 text-center">Play/User (H)</th>
                            <th className="p-4 text-center text-blue-600">%User Ad Reward (H)</th>
                            <th className="p-4 text-center bg-indigo-50/50">Retain Level (H)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {levelComparison.map((row, i) => {
                            const wrChange = getRelativeChange(row.hypo.effectiveWR, row.base.effectiveWR);
                            const playChange = getRelativeChange(row.hypo.playUser, row.base.playUser);
                            const adChange = getRelativeChange(row.hypo.userAdPct, row.base.userAdPct);
                            const retainChange = getRelativeChange(row.hypo.retain, row.base.retain);
                            return (
                              <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 transition-all font-medium ${row.hypo.naturalWR < 20 ? 'bg-red-50/20' : ''}`}>
                                <td className="p-4 text-slate-400 font-bold">{row.lv}</td>
                                <td className="p-4 text-[8px] font-bold text-slate-300">{row.baseTier}</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${row.baseTier !== row.hypoTier ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>{row.hypoTier}</span>
                                </td>
                                <td className="p-4 text-center text-slate-400 font-bold">{row.hypo.naturalWR.toFixed(1)}%</td>
                                <td className="p-4 text-center font-black text-indigo-700 bg-indigo-50/20">
                                  {row.hypo.effectiveWR.toFixed(1)}%
                                  <ChangeBadge val={wrChange} />
                                </td>
                                <td className="p-4 text-center">
                                  <div className="font-bold text-slate-700">{row.hypo.playUser.toFixed(2)}</div>
                                  <ChangeBadge val={playChange} inverse={true} />
                                </td>
                                <td className="p-4 text-center font-black text-blue-600">
                                  {row.hypo.userAdPct.toFixed(1)}%
                                  <ChangeBadge val={adChange} />
                                </td>
                                <td className="p-4 text-center bg-indigo-50/30">
                                  <div className="font-bold text-indigo-700">{row.hypo.retain.toFixed(1)}%</div>
                                  <ChangeBadge val={retainChange} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;