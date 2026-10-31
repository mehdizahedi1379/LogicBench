import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Cable, 
  Network, 
  Activity, 
  Bookmark, 
  Check, 
  Copy, 
  Sliders, 
  Binary, 
  Search, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  generateUartWaveforms, 
  generateSpiWaveforms, 
  generateI2cWaveforms, 
  decodeUartBitstream, 
  ProtocolWaveformResult, 
  UartDecodeResult 
} from '../../lib/protocolWaveforms';
import { TimingDiagram } from '../../components/TimingDiagram/TimingDiagram';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const ProtocolVisualizerView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  // Mode: 'generator' | 'decoder'
  const [viewMode, setViewMode] = useState<'generator' | 'decoder'>('generator');

  // Protocol in generator mode: 'UART' | 'SPI' | 'I2C'
  const [protocol, setProtocol] = useState<'UART' | 'SPI' | 'I2C'>('UART');

  // Input Format in generator: 'hex' | 'ascii'
  const [inputFormat, setInputFormat] = useState<'hex' | 'ascii'>('hex');
  const [rawPayloadInput, setRawPayloadInput] = useState<string>('0x48, 0x69'); // 'Hi'

  // Protocol Specific Configurations
  // UART:
  const [uartBaud, setUartBaud] = useState<number>(9600);
  const [uartDataBits, setUartDataBits] = useState<7 | 8>(8);
  const [uartParity, setUartParity] = useState<'none' | 'even' | 'odd'>('none');
  const [uartStopBits, setUartStopBits] = useState<1 | 2>(1);

  // SPI:
  const [spiMode, setSpiMode] = useState<0 | 1 | 2 | 3>(0);
  const [spiMsbFirst, setSpiMsbFirst] = useState<boolean>(true);

  // I2C:
  const [i2cAddressHex, setI2cAddressHex] = useState<string>('0x3C');
  const [i2cIsRead, setI2cIsRead] = useState<boolean>(false);

  // Decoder Mode State:
  const [rawBitstreamInput, setRawBitstreamInput] = useState<string>('0100000101 0100001001'); // 'A' and 'B'
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState<boolean>(false);
  const [showSteps, setShowSteps] = useState<boolean>(false);

  // Parse bytes from user input
  const parsedBytes = useMemo(() => {
    if (inputFormat === 'ascii') {
      return Array.from(rawPayloadInput).map((c) => c.charCodeAt(0));
    }
    // Parse hex or decimal list e.g. "0x48, 0x69" or "48 69"
    const cleaned = rawPayloadInput.replace(/,/g, ' ').trim();
    if (!cleaned) return [0x55];
    const tokens = cleaned.split(/\s+/);
    const bytes: number[] = [];
    for (const tok of tokens) {
      const v = tok.startsWith('0x') || tok.startsWith('0X')
        ? parseInt(tok, 16)
        : parseInt(tok, 10);
      if (!isNaN(v)) {
        bytes.push(v & 0xFF);
      }
    }
    return bytes.length > 0 ? bytes : [0x55];
  }, [inputFormat, rawPayloadInput]);

  // Waveform generation result
  const waveformResult: ProtocolWaveformResult = useMemo(() => {
    if (protocol === 'UART') {
      return generateUartWaveforms(parsedBytes, {
        baudRate: uartBaud,
        dataBits: uartDataBits,
        parity: uartParity,
        stopBits: uartStopBits,
      });
    }
    if (protocol === 'SPI') {
      return generateSpiWaveforms(parsedBytes, {
        mode: spiMode,
        msbFirst: spiMsbFirst,
      });
    }
    // I2C:
    const addr = parseInt(i2cAddressHex, 16) || 0x3C;
    return generateI2cWaveforms(parsedBytes, {
      slaveAddress7Bit: addr,
      isRead: i2cIsRead,
    });
  }, [protocol, parsedBytes, uartBaud, uartDataBits, uartParity, uartStopBits, spiMode, spiMsbFirst, i2cAddressHex, i2cIsRead]);

  // Decoder result
  const decodeResult: UartDecodeResult = useMemo(() => {
    return decodeUartBitstream(rawBitstreamInput);
  }, [rawBitstreamInput]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    if (viewMode === 'generator') {
      const title = `${protocol} Protocol Waveform: [${waveformResult.decodedBytesHex.join(', ')}]`;
      const content = [
        `# ${title}`,
        `- Protocol: ${protocol}`,
        `- Payload: ${waveformResult.decodedBytesHex.join(' ')}`,
        `- Total Duration: ${waveformResult.totalDuration.toFixed(1)} ${waveformResult.timeUnit}`,
        `- Summary: ${waveformResult.summary}`,
        `\n### Waveform Generation Steps:\n` + waveformResult.steps.join('\n'),
      ].join('\n');
      await saveToolResultToNotes(title, content, ['protocol', protocol.toLowerCase(), 'waveform']);
    } else {
      const title = `UART Decoded Bitstream: "${decodeResult.decodedAscii}" (${decodeResult.decodedHex.join(', ')})`;
      const content = [
        `# ${title}`,
        `- Raw Input Bits: ${rawBitstreamInput}`,
        `- Decoded ASCII: "${decodeResult.decodedAscii}"`,
        `- Decoded Hex: ${decodeResult.decodedHex.join(' ')}`,
        `- Framing Integrity: ${decodeResult.success ? 'Valid' : 'Errors Detected'}`,
        decodeResult.framingErrors.length > 0 ? `\n### Errors:\n- ` + decodeResult.framingErrors.join('\n- ') : '',
        `\n### Frame Inspection Steps:\n` + decodeResult.steps.join('\n'),
      ].join('\n');
      await saveToolResultToNotes(title, content, ['protocol', 'uart', 'decoder']);
    }

    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <span>{t.protocolVisualizer.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.protocolVisualizer.description}</p>
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

      {/* Mode Toggle: Generator vs Decoder */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          type="button"
          onClick={() => setViewMode('generator')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            viewMode === 'generator' ? 'border-sky-500 text-sky-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t.protocolVisualizer.modeGenerator}</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('decoder')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            viewMode === 'decoder' ? 'border-sky-500 text-sky-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{t.protocolVisualizer.modeDecoder}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: WAVEFORM GENERATOR */}
      {/* ========================================================================= */}
      {viewMode === 'generator' ? (
        <div className="space-y-6">
          {/* Protocol Selector & Inputs Bar */}
          <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Protocol Selector */}
              <div className="flex items-center gap-1.5">
                {(['UART', 'SPI', 'I2C'] as ('UART' | 'SPI' | 'I2C')[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProtocol(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      protocol === p
                        ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                        : 'bg-input hover:bg-neutral-800 border-subtle text-secondary'
                    }`}
                  >
                    {p} Bus
                  </button>
                ))}
              </div>

              {/* Input Format Toggle */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-subtle text-xs">
                <button
                  type="button"
                  onClick={() => setInputFormat('hex')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    inputFormat === 'hex' ? 'bg-sky-500 text-white font-bold' : 'text-secondary hover:text-primary'
                  }`}
                >
                  Hex List (0x..)
                </button>
                <button
                  type="button"
                  onClick={() => setInputFormat('ascii')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    inputFormat === 'ascii' ? 'bg-sky-500 text-white font-bold' : 'text-secondary hover:text-primary'
                  }`}
                >
                  ASCII Text ("..")
                </button>
              </div>
            </div>

            {/* Input payload field */}
            <div className="space-y-1">
              <label className="text-xs text-secondary flex justify-between">
                <span>{t.protocolVisualizer.inputBytes}</span>
                <span className="font-mono text-sky-400 code-ltr">{parsedBytes.length} byte(s) parsed</span>
              </label>
              <input
                type="text"
                value={rawPayloadInput}
                onChange={(e) => setRawPayloadInput(e.target.value)}
                placeholder={inputFormat === 'hex' ? '0x55, 0xA3, 0x0F' : 'Hello World'}
                className="w-full px-3 py-2 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Protocol Specific Configuration Sub-panel */}
            <div className="pt-2 border-t border-subtle">
              {protocol === 'UART' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Baud Rate</label>
                    <select
                      value={uartBaud}
                      onChange={(e) => setUartBaud(parseInt(e.target.value, 10))}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="9600">9600 baud</option>
                      <option value="19200">19200 baud</option>
                      <option value="38400">38400 baud</option>
                      <option value="57600">57600 baud</option>
                      <option value="115200">115200 baud</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Data Bits</label>
                    <select
                      value={uartDataBits}
                      onChange={(e) => setUartDataBits(parseInt(e.target.value, 10) as any)}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="8">8 Data Bits</option>
                      <option value="7">7 Data Bits</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Parity</label>
                    <select
                      value={uartParity}
                      onChange={(e) => setUartParity(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="none">None (8N1)</option>
                      <option value="even">Even Parity (8E1)</option>
                      <option value="odd">Odd Parity (8O1)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Stop Bits</label>
                    <select
                      value={uartStopBits}
                      onChange={(e) => setUartStopBits(parseInt(e.target.value, 10) as any)}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="1">1 Stop Bit</option>
                      <option value="2">2 Stop Bits</option>
                    </select>
                  </div>
                </div>
              )}

              {protocol === 'SPI' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">SPI Mode (CPOL / CPHA)</label>
                    <select
                      value={spiMode}
                      onChange={(e) => setSpiMode(parseInt(e.target.value, 10) as any)}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="0">Mode 0 (CPOL=0, CPHA=0)</option>
                      <option value="1">Mode 1 (CPOL=0, CPHA=1)</option>
                      <option value="2">Mode 2 (CPOL=1, CPHA=0)</option>
                      <option value="3">Mode 3 (CPOL=1, CPHA=1)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Bit Order</label>
                    <select
                      value={spiMsbFirst ? 'msb' : 'lsb'}
                      onChange={(e) => setSpiMsbFirst(e.target.value === 'msb')}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="msb">MSB First (Standard)</option>
                      <option value="lsb">LSB First</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Chip-Select Logic</label>
                    <div className="text-xs font-mono text-emerald-400 pt-1.5">Active-Low (/SS)</div>
                  </div>
                </div>
              )}

              {protocol === 'I2C' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">7-Bit Slave Address</label>
                    <input
                      type="text"
                      value={i2cAddressHex}
                      onChange={(e) => setI2cAddressHex(e.target.value)}
                      placeholder="0x3C"
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary font-mono text-xs code-ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Transfer Direction</label>
                    <select
                      value={i2cIsRead ? 'read' : 'write'}
                      onChange={(e) => setI2cIsRead(e.target.value === 'read')}
                      className="w-full px-2 py-1.5 bg-input border border-subtle rounded text-primary text-xs"
                    >
                      <option value="write">Write (R/W = 0)</option>
                      <option value="read">Read (R/W = 1)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-secondary text-[11px]">Handshake</label>
                    <div className="text-xs font-mono text-amber-400 pt-1.5">ACK (SDA=0 on 9th Clk)</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rendered Timing Diagram */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.protocolVisualizer.waveform}</span>
              </span>
              <span className="text-xs font-mono text-secondary code-ltr">
                Duration: {waveformResult.totalDuration.toFixed(1)} {waveformResult.timeUnit}
              </span>
            </div>

            <TimingDiagram
              signals={waveformResult.signals}
              totalDuration={waveformResult.totalDuration}
              timeUnit={waveformResult.timeUnit}
              enableCursors={true}
              initialZoom={1.0}
            />
          </div>

          {/* Protocol Summary & Steps */}
          <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-secondary uppercase tracking-wider">
                Protocol Framing Summary
              </span>
              <button
                type="button"
                onClick={() => setShowSteps(!showSteps)}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{t.common.stepByStep} ({showSteps ? '−' : '+'})</span>
              </button>
            </div>

            <div className="text-xs text-primary font-mono bg-neutral-950 p-2.5 rounded-lg border border-subtle code-ltr">
              {waveformResult.summary}
            </div>

            {showSteps && (
              <div className="bg-neutral-900 border border-subtle rounded-lg p-3 text-xs font-mono space-y-1 text-secondary code-ltr">
                {waveformResult.steps.map((st, i) => (
                  <div key={i}>{st}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE 2: BITSTREAM DECODER */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Bitstream Input */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                <Binary className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.protocolVisualizer.decodeBitstream}</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs text-secondary">Raw Bit Sequence (Start=0, 8 Data LSB-first, Stop=1)</label>
                <textarea
                  rows={4}
                  value={rawBitstreamInput}
                  onChange={(e) => setRawBitstreamInput(e.target.value)}
                  placeholder="0100000101 0100001001"
                  className="w-full p-2.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-secondary">Quick Sample Bitstreams:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRawBitstreamInput('0100000101 0100001001')}
                    className="px-2 py-1 bg-subtle hover:bg-neutral-700 rounded text-[11px] font-mono text-secondary hover:text-primary transition-colors"
                  >
                    "AB" (0x41, 0x42)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawBitstreamInput('0101010101 0010101011')}
                    className="px-2 py-1 bg-subtle hover:bg-neutral-700 rounded text-[11px] font-mono text-secondary hover:text-primary transition-colors"
                  >
                    Alternating 0xAA, 0x55
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawBitstreamInput('0110010001 0110111101')}
                    className="px-2 py-1 bg-subtle hover:bg-neutral-700 rounded text-[11px] font-mono text-secondary hover:text-primary transition-colors"
                  >
                    "do" (ASCII)
                  </button>
                </div>
              </div>
            </div>

            {/* Framing Integrity Card */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-2 text-xs">
              <span className="font-semibold text-secondary uppercase tracking-wider text-[11px]">
                {t.protocolVisualizer.framingStatus}
              </span>

              <div className={`p-3 rounded-lg border font-mono ${
                decodeResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {decodeResult.success ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{decodeResult.success ? 'Framing Valid (No parity/stop bit errors)' : 'Framing Faults Detected'}</span>
                </div>
                {decodeResult.framingErrors.length > 0 && (
                  <div className="text-[11px] mt-1 space-y-0.5 text-rose-300">
                    {decodeResult.framingErrors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Decoded Results */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-card border border-subtle rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  {t.protocolVisualizer.decodedResults}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(decodeResult.decodedAscii, 'ascii')}
                  className="px-2.5 py-1 bg-input hover:bg-neutral-800 border border-subtle rounded text-xs text-primary flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'ascii' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy ASCII</span>
                </button>
              </div>

              {/* Decoded ASCII Banner */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-subtle space-y-1">
                <div className="text-[10px] text-secondary uppercase font-semibold">Decoded ASCII Text:</div>
                <div className="text-3xl font-bold font-mono text-sky-400 tracking-wider code-ltr">
                  "{decodeResult.decodedAscii || '-'}"
                </div>
              </div>

              {/* Decoded Hex Array */}
              <div className="space-y-1.5">
                <div className="text-xs text-secondary">Hex Payload Representation:</div>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {decodeResult.decodedHex.map((hex, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-neutral-900 border border-subtle text-emerald-400 font-bold">
                      {hex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Frame Inspection */}
              <div className="space-y-2 pt-2 border-t border-subtle">
                <span className="text-xs text-secondary font-semibold">Frame Inspection Breakdown:</span>
                <div className="bg-neutral-950 p-3 rounded-lg border border-subtle font-mono text-xs space-y-1 text-secondary code-ltr max-h-48 overflow-y-auto">
                  {decodeResult.steps.map((st, i) => (
                    <div key={i}>{st}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
