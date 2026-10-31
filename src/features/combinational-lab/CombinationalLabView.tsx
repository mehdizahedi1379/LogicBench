import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Layers, 
  Grid, 
  Bookmark, 
  Check, 
  Copy, 
  Info, 
  Sliders, 
  Zap, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  evaluateHalfAdder, 
  evaluateFullAdder, 
  evaluateRippleCarryAdder4, 
  evaluateMux2To1, 
  evaluateMux4To1, 
  evaluateMux8To1, 
  evaluateDecoder2To4, 
  evaluateDecoder3To8 
} from '../../lib/combinationalLogic';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const CombinationalLabView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  // Top Category Tabs: 'adders' | 'mux' | 'decoders'
  const [activeTab, setActiveTab] = useState<'adders' | 'mux' | 'decoders'>('adders');

  // Sub-modes
  const [adderSubMode, setAdderSubMode] = useState<'half' | 'full' | 'ripple4'>('full');
  const [muxSubMode, setMuxSubMode] = useState<'2:1' | '4:1' | '8:1'>('4:1');
  const [decoderSubMode, setDecoderSubMode] = useState<'2:4' | '3:8'>('3:8');

  // Adder inputs
  const [a1, setA1] = useState<0 | 1>(1);
  const [b1, setB1] = useState<0 | 1>(1);
  const [cin1, setCin1] = useState<0 | 1>(0);

  // 4-bit adder inputs [bit0..bit3]
  const [a4, setA4] = useState<[0 | 1, 0 | 1, 0 | 1, 0 | 1]>([1, 0, 1, 0]); // 5
  const [b4, setB4] = useState<[0 | 1, 0 | 1, 0 | 1, 0 | 1]>([1, 1, 0, 0]); // 3
  const [cin4, setCin4] = useState<0 | 1>(0);

  // MUX inputs
  const [muxData8, setMuxData8] = useState<(0 | 1)[]>([0, 1, 1, 0, 1, 0, 0, 1]);
  const [muxSelect3, setMuxSelect3] = useState<[0 | 1, 0 | 1, 0 | 1]>([1, 0, 0]); // S0, S1, S2

  // Decoder inputs
  const [decAddr3, setDecAddr3] = useState<[0 | 1, 0 | 1, 0 | 1]>([1, 0, 1]); // A0, A1, A2
  const [decEnable, setDecEnable] = useState<0 | 1>(1);
  const [decActiveLow, setDecActiveLow] = useState<boolean>(false);

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState<boolean>(false);
  const [showSteps, setShowSteps] = useState<boolean>(false);

  // Calculations
  const halfAdderRes = useMemo(() => evaluateHalfAdder(a1, b1), [a1, b1]);
  const fullAdderRes = useMemo(() => evaluateFullAdder(a1, b1, cin1), [a1, b1, cin1]);
  const ripple4Res = useMemo(() => evaluateRippleCarryAdder4(a4, b4, cin4), [a4, b4, cin4]);

  const mux2Res = useMemo(() => evaluateMux2To1(muxData8[0], muxData8[1], muxSelect3[0]), [muxData8, muxSelect3]);
  const mux4Res = useMemo(
    () => evaluateMux4To1([muxData8[0], muxData8[1], muxData8[2], muxData8[3]], [muxSelect3[0], muxSelect3[1]]),
    [muxData8, muxSelect3]
  );
  const mux8Res = useMemo(() => evaluateMux8To1(muxData8, muxSelect3), [muxData8, muxSelect3]);

  const dec24Res = useMemo(() => evaluateDecoder2To4(decAddr3[0], decAddr3[1], decEnable, decActiveLow), [decAddr3, decEnable, decActiveLow]);
  const dec38Res = useMemo(() => evaluateDecoder3To8(decAddr3[0], decAddr3[1], decAddr3[2], decEnable, decActiveLow), [decAddr3, decEnable, decActiveLow]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    let title = '';
    let content = '';

    if (activeTab === 'adders') {
      if (adderSubMode === 'half') {
        title = `Half Adder: A=${a1}, B=${b1} => Sum=${halfAdderRes.sum}, Carry=${halfAdderRes.carry}`;
        content = `# Half Adder Evaluation\n- A = ${a1}, B = ${b1}\n- Sum (A ⊕ B) = ${halfAdderRes.sum}\n- Carry (A · B) = ${halfAdderRes.carry}\n\n### Steps:\n` + halfAdderRes.steps.join('\n');
      } else if (adderSubMode === 'full') {
        title = `Full Adder: A=${a1}, B=${b1}, Cin=${cin1} => Sum=${fullAdderRes.sum}, Cout=${fullAdderRes.carryOut}`;
        content = `# Full Adder Evaluation\n- A = ${a1}, B = ${b1}, Cin = ${cin1}\n- Sum = ${fullAdderRes.sum}\n- Cout = ${fullAdderRes.carryOut}\n- Propagate P = ${fullAdderRes.intermediate.aXorB}, Generate G = ${fullAdderRes.intermediate.aAndB}\n\n### Steps:\n` + fullAdderRes.steps.join('\n');
      } else {
        title = `4-Bit Ripple Carry Adder: ${ripple4Res.aDec} + ${ripple4Res.bDec} = ${ripple4Res.sumDec}`;
        content = `# 4-Bit Ripple Carry Adder Evaluation\n- A: 0b${a4.slice().reverse().join('')} (${ripple4Res.aDec})\n- B: 0b${b4.slice().reverse().join('')} (${ripple4Res.bDec})\n- Cin: ${cin4}\n- Sum: 0b${ripple4Res.sumBits.slice().reverse().join('')} (${ripple4Res.sumDec})\n- Cout: ${ripple4Res.cout} | Overflow V: ${ripple4Res.overflow}\n\n### Steps:\n` + ripple4Res.steps.join('\n');
      }
    } else if (activeTab === 'mux') {
      const activeMux = muxSubMode === '2:1' ? mux2Res : muxSubMode === '4:1' ? mux4Res : mux8Res;
      title = `${muxSubMode} Multiplexer: Channel ${activeMux.selectedChannel} => Y=${activeMux.outputY}`;
      content = `# ${muxSubMode} Multiplexer Evaluation\n- Channel: ${activeMux.selectedChannel}\n- Data Inputs: [${activeMux.dataInputs.join(', ')}]\n- Select Lines: [${activeMux.selectInputs.join(', ')}]\n- Output Y: ${activeMux.outputY}\n- Equation: ${activeMux.equation}\n\n### Steps:\n` + activeMux.steps.join('\n');
    } else {
      const activeDec = decoderSubMode === '2:4' ? dec24Res : dec38Res;
      title = `${decoderSubMode} Decoder: Active Line Y${activeDec.activeLineIndex} = 1`;
      content = `# ${decoderSubMode} Decoder Evaluation\n- Enable: ${decEnable} | Active-Low: ${decActiveLow}\n- Address Inputs: [${activeDec.inputs.join(', ')}]\n- Output Bus: [${activeDec.outputs.join(', ')}]\n- Active Index: ${activeDec.activeLineIndex}\n\n### Steps:\n` + activeDec.steps.join('\n');
    }

    await saveToolResultToNotes(title, content, ['combinational-logic', activeTab]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>{t.combinationalLab.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.combinationalLab.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToNotes}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              savedToNotes
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-card hover:bg-neutral-800 border-subtle text-primary'
            }`}
          >
            {savedToNotes ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{savedToNotes ? t.common.savedToNotes : t.common.saveToNotes}</span>
          </button>
        </div>
      </div>

      {/* Main Module Category Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab('adders')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'adders' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{t.combinationalLab.tabAdders}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mux')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'mux' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{t.combinationalLab.tabMultiplexers}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('decoders')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'decoders' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>{t.combinationalLab.tabDecoders}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ADDERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'adders' && (
        <div className="space-y-6">
          {/* Sub-mode selector */}
          <div className="flex items-center gap-2">
            {[
              { id: 'half', label: t.combinationalLab.halfAdder },
              { id: 'full', label: t.combinationalLab.fullAdder },
              { id: 'ripple4', label: t.combinationalLab.rippleCarryAdder },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setAdderSubMode(sub.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  adderSubMode === sub.id
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                    : 'bg-card hover:bg-neutral-800 border-subtle text-secondary'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inputs Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Toggleable Adder Inputs</span>
                </h3>

                {adderSubMode === 'half' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setA1((a1 === 0 ? 1 : 0) as 0 | 1)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        a1 === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      <div className="text-[11px]">Input A</div>
                      <div className="text-2xl font-mono mt-1">{a1}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setB1((b1 === 0 ? 1 : 0) as 0 | 1)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        b1 === 1 ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      <div className="text-[11px]">Input B</div>
                      <div className="text-2xl font-mono mt-1">{b1}</div>
                    </button>
                  </div>
                )}

                {adderSubMode === 'full' && (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setA1((a1 === 0 ? 1 : 0) as 0 | 1)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        a1 === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      <div className="text-[11px]">A</div>
                      <div className="text-2xl font-mono mt-1">{a1}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setB1((b1 === 0 ? 1 : 0) as 0 | 1)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        b1 === 1 ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      <div className="text-[11px]">B</div>
                      <div className="text-2xl font-mono mt-1">{b1}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCin1((cin1 === 0 ? 1 : 0) as 0 | 1)}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        cin1 === 1 ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      <div className="text-[11px]">Cin</div>
                      <div className="text-2xl font-mono mt-1">{cin1}</div>
                    </button>
                  </div>
                )}

                {adderSubMode === 'ripple4' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-secondary mb-1 flex justify-between">
                        <span>Bus A [A3..A0]</span>
                        <span className="font-mono text-cyan-400 font-bold">{ripple4Res.aDec}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono">
                        {[3, 2, 1, 0].map((idx) => (
                          <button
                            key={`a-${idx}`}
                            type="button"
                            onClick={() => {
                              const n = [...a4] as [0 | 1, 0 | 1, 0 | 1, 0 | 1];
                              n[idx] = (n[idx] === 0 ? 1 : 0) as 0 | 1;
                              setA4(n);
                            }}
                            className={`py-2 rounded border text-center text-sm font-bold ${
                              a4[idx] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-neutral-900 border-subtle text-secondary'
                            }`}
                          >
                            {a4[idx]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-secondary mb-1 flex justify-between">
                        <span>Bus B [B3..B0]</span>
                        <span className="font-mono text-purple-400 font-bold">{ripple4Res.bDec}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono">
                        {[3, 2, 1, 0].map((idx) => (
                          <button
                            key={`b-${idx}`}
                            type="button"
                            onClick={() => {
                              const n = [...b4] as [0 | 1, 0 | 1, 0 | 1, 0 | 1];
                              n[idx] = (n[idx] === 0 ? 1 : 0) as 0 | 1;
                              setB4(n);
                            }}
                            className={`py-2 rounded border text-center text-sm font-bold ${
                              b4[idx] === 1 ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-neutral-900 border-subtle text-secondary'
                            }`}
                          >
                            {b4[idx]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-subtle">
                      <span className="text-xs text-secondary">Initial Carry-In (Cin):</span>
                      <button
                        type="button"
                        onClick={() => setCin4((cin4 === 0 ? 1 : 0) as 0 | 1)}
                        className={`px-3 py-1 rounded border font-mono text-xs font-bold ${
                          cin4 === 1 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-neutral-900 border-subtle text-secondary'
                        }`}
                      >
                        Cin = {cin4}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Probe / Intermediate values */}
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-2 text-xs">
                <div className="font-semibold text-secondary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.combinationalLab.intermediateSignals}</span>
                </div>
                {adderSubMode === 'full' && (
                  <div className="space-y-1 font-mono code-ltr text-secondary text-[11px] bg-neutral-950 p-2.5 rounded-lg border border-subtle">
                    <div>Propagate P (A ⊕ B): {fullAdderRes.intermediate.aXorB}</div>
                    <div>Generate G (A · B): {fullAdderRes.intermediate.aAndB}</div>
                    <div>Cin · P: {fullAdderRes.intermediate.cinAndAxorB}</div>
                  </div>
                )}
                {adderSubMode === 'ripple4' && (
                  <div className="space-y-1 font-mono code-ltr text-secondary text-[11px] bg-neutral-950 p-2.5 rounded-lg border border-subtle">
                    <div>Carries [C1, C2, C3, Cout]: [{ripple4Res.carries.join(', ')}]</div>
                    <div>Overflow Flag V (C3 ⊕ C4): {ripple4Res.overflow} ({ripple4Res.isSignedOverflow ? 'SIGNED OVERFLOW' : 'OK'})</div>
                  </div>
                )}
              </div>
            </div>

            {/* Schematic & Results Column */}
            <div className="lg:col-span-7 space-y-4">
              {/* Output Readout Banner */}
              <div className="bg-card border border-subtle rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-secondary uppercase font-semibold">Circuit Output</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5 code-ltr">
                    {adderSubMode === 'half' && `Sum = ${halfAdderRes.sum}, Carry = ${halfAdderRes.carry}`}
                    {adderSubMode === 'full' && `Sum = ${fullAdderRes.sum}, Cout = ${fullAdderRes.carryOut}`}
                    {adderSubMode === 'ripple4' && (
                      <span>
                        0b{ripple4Res.sumBits.slice().reverse().join('')} ({ripple4Res.sumDec})
                        {ripple4Res.cout === 1 && <span className="text-amber-400 text-sm ml-2">+ Carry</span>}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(adderSubMode === 'ripple4' ? String(ripple4Res.sumDec) : adderSubMode === 'full' ? `Sum=${fullAdderRes.sum}, Cout=${fullAdderRes.carryOut}` : `Sum=${halfAdderRes.sum}, Carry=${halfAdderRes.carry}`, 'out')}
                  className="p-2 text-secondary hover:text-primary transition-colors"
                >
                  {copiedKey === 'out' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Logic Circuit SVG Schematic with live wire glows */}
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  Live Logic Gate Schematic
                </span>

                <div className="w-full h-48 bg-neutral-950 rounded-lg border border-subtle flex items-center justify-center p-2">
                  {adderSubMode === 'full' ? (
                    <svg viewBox="0 0 450 180" className="w-full h-full max-w-lg font-mono">
                      {/* Inputs */}
                      <text x="20" y="45" fill={a1 ? '#06b6d4' : '#64748b'} fontSize="11" fontWeight="bold">A ({a1})</text>
                      <text x="20" y="85" fill={b1 ? '#a855f7' : '#64748b'} fontSize="11" fontWeight="bold">B ({b1})</text>
                      <text x="20" y="145" fill={cin1 ? '#f59e0b' : '#64748b'} fontSize="11" fontWeight="bold">Cin ({cin1})</text>

                      {/* XOR Gate 1 */}
                      <rect x="100" y="40" width="45" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      <text x="122" y="60" fill="#94a3b8" fontSize="10" textAnchor="middle">XOR</text>
                      <line x1="60" y1="45" x2="100" y2="45" stroke={a1 ? '#06b6d4' : '#475569'} strokeWidth="2" />
                      <line x1="60" y1="65" x2="100" y2="65" stroke={b1 ? '#a855f7' : '#475569'} strokeWidth="2" />

                      {/* XOR Gate 2 (Sum) */}
                      <rect x="230" y="45" width="45" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      <text x="252" y="65" fill="#94a3b8" fontSize="10" textAnchor="middle">XOR</text>
                      <line x1="145" y1="55" x2="230" y2="55" stroke={fullAdderRes.intermediate.aXorB ? '#10b981' : '#475569'} strokeWidth="2" />
                      <line x1="60" y1="145" x2="210" y2="145" stroke={cin1 ? '#f59e0b' : '#475569'} strokeWidth="2" />
                      <line x1="210" y1="145" x2="210" y2="70" stroke={cin1 ? '#f59e0b' : '#475569'} strokeWidth="2" />
                      <line x1="210" y1="70" x2="230" y2="70" stroke={cin1 ? '#f59e0b' : '#475569'} strokeWidth="2" />

                      {/* Output Sum */}
                      <line x1="275" y1="60" x2="380" y2="60" stroke={fullAdderRes.sum ? '#10b981' : '#475569'} strokeWidth="2.5" />
                      <text x="390" y="64" fill={fullAdderRes.sum ? '#10b981' : '#64748b'} fontSize="12" fontWeight="bold">
                        SUM ({fullAdderRes.sum})
                      </text>

                      {/* AND Gate 1 (A·B) */}
                      <rect x="160" y="100" width="45" height="26" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      <text x="182" y="117" fill="#94a3b8" fontSize="9" textAnchor="middle">AND</text>

                      {/* OR Gate (Cout) */}
                      <rect x="300" y="115" width="45" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      <text x="322" y="135" fill="#94a3b8" fontSize="10" textAnchor="middle">OR</text>

                      {/* Output Cout */}
                      <line x1="345" y1="130" x2="380" y2="130" stroke={fullAdderRes.carryOut ? '#f59e0b' : '#475569'} strokeWidth="2.5" />
                      <text x="390" y="134" fill={fullAdderRes.carryOut ? '#f59e0b' : '#64748b'} fontSize="12" fontWeight="bold">
                        COUT ({fullAdderRes.carryOut})
                      </text>
                    </svg>
                  ) : adderSubMode === 'half' ? (
                    <svg viewBox="0 0 360 120" className="w-full h-full max-w-sm font-mono">
                      <text x="20" y="40" fill={a1 ? '#06b6d4' : '#64748b'} fontSize="11" fontWeight="bold">A ({a1})</text>
                      <text x="20" y="80" fill={b1 ? '#a855f7' : '#64748b'} fontSize="11" fontWeight="bold">B ({b1})</text>
                      {/* XOR */}
                      <rect x="120" y="25" width="50" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      <text x="145" y="44" fill="#94a3b8" fontSize="10" textAnchor="middle">XOR</text>
                      <line x1="170" y1="40" x2="260" y2="40" stroke={halfAdderRes.sum ? '#10b981' : '#475569'} strokeWidth="2.5" />
                      <text x="270" y="44" fill={halfAdderRes.sum ? '#10b981' : '#64748b'} fontSize="11" fontWeight="bold">
                        SUM ({halfAdderRes.sum})
                      </text>

                      {/* AND */}
                      <rect x="120" y="70" width="50" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                      <text x="145" y="89" fill="#94a3b8" fontSize="10" textAnchor="middle">AND</text>
                      <line x1="170" y1="85" x2="260" y2="85" stroke={halfAdderRes.carry ? '#f59e0b' : '#475569'} strokeWidth="2.5" />
                      <text x="270" y="89" fill={halfAdderRes.carry ? '#f59e0b' : '#64748b'} fontSize="11" fontWeight="bold">
                        CARRY ({halfAdderRes.carry})
                      </text>
                    </svg>
                  ) : (
                    /* 4-Bit Ripple Carry Adder Cascade */
                    <svg viewBox="0 0 460 110" className="w-full h-full font-mono">
                      {[3, 2, 1, 0].map((bit, idx) => {
                        const x = 50 + idx * 95;
                        const sVal = ripple4Res.sumBits[bit];
                        return (
                          <g key={`fa-${bit}`}>
                            <rect x={x} y="20" width="75" height="70" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                            <text x={x + 37} y="38" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">FA[{bit}]</text>
                            <text x={x + 37} y="52" fill="#06b6d4" fontSize="8" textAnchor="middle">A={a4[bit]}</text>
                            <text x={x + 37} y="64" fill="#a855f7" fontSize="8" textAnchor="middle">B={b4[bit]}</text>
                            <text x={x + 37} y="78" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">S={sVal}</text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MULTIPLEXERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'mux' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            {(['2:1', '4:1', '8:1'] as ('2:1' | '4:1' | '8:1')[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuxSubMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  muxSubMode === m
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                    : 'bg-card hover:bg-neutral-800 border-subtle text-secondary'
                }`}
              >
                {m} Multiplexer
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* MUX Inputs */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Lines &amp; Channels</span>
                </h3>

                {/* Select Lines */}
                <div className="space-y-2">
                  <div className="text-xs text-secondary">Select Lines (Channel Address):</div>
                  <div className="flex items-center gap-2">
                    {muxSubMode === '8:1' && (
                      <button
                        type="button"
                        onClick={() => setMuxSelect3([muxSelect3[0], muxSelect3[1], (muxSelect3[2] === 0 ? 1 : 0) as 0 | 1])}
                        className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                          muxSelect3[2] === 1 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-neutral-900 border-subtle text-secondary'
                        }`}
                      >
                        S2 = {muxSelect3[2]}
                      </button>
                    )}
                    {(muxSubMode === '4:1' || muxSubMode === '8:1') && (
                      <button
                        type="button"
                        onClick={() => setMuxSelect3([muxSelect3[0], (muxSelect3[1] === 0 ? 1 : 0) as 0 | 1, muxSelect3[2]])}
                        className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                          muxSelect3[1] === 1 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-neutral-900 border-subtle text-secondary'
                        }`}
                      >
                        S1 = {muxSelect3[1]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMuxSelect3([(muxSelect3[0] === 0 ? 1 : 0) as 0 | 1, muxSelect3[1], muxSelect3[2]])}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                        muxSelect3[0] === 1 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      S0 = {muxSelect3[0]}
                    </button>
                  </div>
                </div>

                {/* Data Input Channel Toggles */}
                <div className="space-y-2 pt-2 border-t border-subtle">
                  <div className="text-xs text-secondary">Data Inputs (D0..Dn):</div>
                  <div className="grid grid-cols-4 gap-2 font-mono">
                    {Array.from({ length: muxSubMode === '2:1' ? 2 : muxSubMode === '4:1' ? 4 : 8 }).map((_, idx) => {
                      const selectedCh = muxSubMode === '2:1' ? mux2Res.selectedChannel : muxSubMode === '4:1' ? mux4Res.selectedChannel : mux8Res.selectedChannel;
                      const isSelected = selectedCh === idx;
                      return (
                        <button
                          key={`mux-d-${idx}`}
                          type="button"
                          onClick={() => {
                            const nd = [...muxData8];
                            nd[idx] = (nd[idx] === 0 ? 1 : 0) as 0 | 1;
                            setMuxData8(nd);
                          }}
                          className={`p-2 rounded-lg border text-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                              : muxData8[idx] === 1
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                              : 'bg-neutral-900 border-subtle text-secondary'
                          }`}
                        >
                          <div className="text-[10px]">D{idx}</div>
                          <div className="text-base mt-0.5">{muxData8[idx]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* MUX Visual Schematic & Output */}
            <div className="lg:col-span-7 space-y-4">
              {/* Output Readout */}
              {(() => {
                const activeMux = muxSubMode === '2:1' ? mux2Res : muxSubMode === '4:1' ? mux4Res : mux8Res;
                return (
                  <div className="bg-card border border-subtle rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-secondary uppercase font-semibold">
                        Multiplexer Routed Output
                      </div>
                      <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5 code-ltr">
                        Y = D{activeMux.selectedChannel} ({activeMux.outputY})
                      </div>
                    </div>
                    <div className="text-xs text-secondary font-mono">
                      Channel: {activeMux.selectedChannel}
                    </div>
                  </div>
                );
              })()}

              {/* Trapezoid MUX Symbol SVG */}
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  MUX Hardware Trapezoid Symbol
                </span>
                <div className="w-full h-52 bg-neutral-950 rounded-lg border border-subtle flex items-center justify-center p-2">
                  <svg viewBox="0 0 380 180" className="w-full h-full max-w-md font-mono">
                    {/* Trapezoid body */}
                    <polygon
                      points="120,20 220,45 220,135 120,160"
                      fill="#090d16"
                      stroke="#334155"
                      strokeWidth="2"
                    />
                    <text x="170" y="95" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle">
                      {muxSubMode} MUX
                    </text>

                    {/* Output Line */}
                    <line x1="220" y1="90" x2="310" y2="90" stroke="#10b981" strokeWidth="2.5" />
                    <text x="320" y="94" fill="#10b981" fontSize="12" fontWeight="bold">
                      Y ({(muxSubMode === '2:1' ? mux2Res : muxSubMode === '4:1' ? mux4Res : mux8Res).outputY})
                    </text>

                    {/* Bottom select lines */}
                    <line x1="170" y1="147" x2="170" y2="175" stroke="#f59e0b" strokeWidth="2" />
                    <text x="170" y="175" fill="#f59e0b" fontSize="9" textAnchor="middle">SEL</text>

                    {/* Left channel pins */}
                    {Array.from({ length: muxSubMode === '2:1' ? 2 : muxSubMode === '4:1' ? 4 : 8 }).map((_, i) => {
                      const total = muxSubMode === '2:1' ? 2 : muxSubMode === '4:1' ? 4 : 8;
                      const py = 35 + i * (110 / (total - 1));
                      const selectedCh = muxSubMode === '2:1' ? mux2Res.selectedChannel : muxSubMode === '4:1' ? mux4Res.selectedChannel : mux8Res.selectedChannel;
                      const isSel = selectedCh === i;
                      return (
                        <g key={`pin-${i}`}>
                          <line x1="70" y1={py} x2="120" y2={py} stroke={isSel ? '#10b981' : '#475569'} strokeWidth={isSel ? '2.5' : '1.5'} />
                          <text x="60" y={py + 3} fill={isSel ? '#10b981' : '#64748b'} fontSize="9" textAnchor="end">
                            D{i} ({muxData8[i]})
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DECODERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'decoders' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            {(['2:4', '3:8'] as ('2:4' | '3:8')[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecoderSubMode(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  decoderSubMode === d
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                    : 'bg-card hover:bg-neutral-800 border-subtle text-secondary'
                }`}
              >
                {d} Decoder
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Decoder Inputs */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Address &amp; Enable Inputs</span>
                </h3>

                <div className="space-y-2">
                  <div className="text-xs text-secondary">Address Lines (A0..An):</div>
                  <div className="flex items-center gap-2">
                    {decoderSubMode === '3:8' && (
                      <button
                        type="button"
                        onClick={() => setDecAddr3([decAddr3[0], decAddr3[1], (decAddr3[2] === 0 ? 1 : 0) as 0 | 1])}
                        className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                          decAddr3[2] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-neutral-900 border-subtle text-secondary'
                        }`}
                      >
                        A2 = {decAddr3[2]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDecAddr3([decAddr3[0], (decAddr3[1] === 0 ? 1 : 0) as 0 | 1, decAddr3[2]])}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                        decAddr3[1] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      A1 = {decAddr3[1]}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecAddr3([(decAddr3[0] === 0 ? 1 : 0) as 0 | 1, decAddr3[1], decAddr3[2]])}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                        decAddr3[0] === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-neutral-900 border-subtle text-secondary'
                      }`}
                    >
                      A0 = {decAddr3[0]}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-subtle">
                  <button
                    type="button"
                    onClick={() => setDecEnable((decEnable === 1 ? 0 : 1) as 0 | 1)}
                    className={`p-2 rounded-lg border text-center font-mono text-xs ${
                      decEnable === 1 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                    }`}
                  >
                    <div>ENABLE (EN)</div>
                    <div className="text-sm font-bold mt-0.5">{decEnable}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecActiveLow(!decActiveLow)}
                    className={`p-2 rounded-lg border text-center font-mono text-xs ${
                      decActiveLow ? 'bg-purple-500/20 border-purple-500 text-purple-400 font-bold' : 'bg-neutral-900 border-subtle text-secondary'
                    }`}
                  >
                    <div>POLARITY</div>
                    <div className="text-xs mt-0.5">{decActiveLow ? 'Active-Low (Ȳ)' : 'Active-High (Y)'}</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Decoder Outputs */}
            <div className="lg:col-span-7 space-y-4">
              {(() => {
                const activeDec = decoderSubMode === '2:4' ? dec24Res : dec38Res;
                return (
                  <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                        Decoded Output Bus Lines [Y0..Yn]
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {activeDec.activeLineIndex !== null ? `Active Line: Y${activeDec.activeLineIndex}` : 'Disabled'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 font-mono">
                      {activeDec.outputs.map((val, idx) => {
                        const isActive = activeDec.activeLineIndex === idx;
                        return (
                          <div
                            key={`dec-out-${idx}`}
                            className={`p-2.5 rounded-lg border text-center transition-colors ${
                              isActive
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-neutral-950 border-subtle text-secondary'
                            }`}
                          >
                            <div className="text-[10px] text-secondary">Y{idx}</div>
                            <div className="text-lg font-bold mt-0.5">{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
