import React, { useState, useRef, useMemo, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Sliders, 
  Activity, 
  Clock,
  Eye,
  Table as TableIcon
} from 'lucide-react';
import { SignalRow, WaveformTransition } from '../../lib/protocolWaveforms';

export interface TimingDiagramProps {
  signals: SignalRow[];
  totalDuration: number;
  timeUnit?: string;
  enableCursors?: boolean;
  initialZoom?: number;
  className?: string;
  onCursorChange?: (cursorA: number, cursorB: number, delta: number) => void;
}

export const TimingDiagram: React.FC<TimingDiagramProps> = ({
  signals,
  totalDuration,
  timeUnit = 'cycles',
  enableCursors = true,
  initialZoom = 1.0,
  className = '',
  onCursorChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom level: 0.5 to 5.0
  const [zoom, setZoom] = useState<number>(initialZoom);

  // Dual Cursors: Cursor 1 (cyan) and Cursor 2 (amber) in time units
  const [cursorA, setCursorA] = useState<number>(Math.max(0, totalDuration * 0.2));
  const [cursorB, setCursorB] = useState<number>(Math.min(totalDuration, totalDuration * 0.7));
  const [draggingCursor, setDraggingCursor] = useState<'A' | 'B' | null>(null);

  // Show accessible data table modal/accordion
  const [showAccessibleTable, setShowAccessibleTable] = useState<boolean>(false);

  // Geometry dimensions
  const labelWidth = 140; // width of signal names on left
  const rowHeight = 44; // height of each signal trace
  const timeAxisHeight = 28;
  const paddingRight = 40;
  const basePixelsPerUnit = 48; // Base scale: 48px per 1 unit of time
  const pixelsPerUnit = basePixelsPerUnit * zoom;
  const waveformWidth = Math.max(500, totalDuration * pixelsPerUnit) + paddingRight;
  const totalSvgWidth = labelWidth + waveformWidth;
  const totalSvgHeight = timeAxisHeight + signals.length * rowHeight + 10;

  // Handle cursor dragging
  const handleMouseDownCursor = (c: 'A' | 'B', e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingCursor(c);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingCursor || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const mouseX = e.clientX - rect.left + scrollLeft;
    const waveformX = mouseX - labelWidth;
    const newTime = Math.max(0, Math.min(totalDuration, waveformX / pixelsPerUnit));

    if (draggingCursor === 'A') {
      setCursorA(newTime);
      onCursorChange?.(newTime, cursorB, Math.abs(cursorB - newTime));
    } else {
      setCursorB(newTime);
      onCursorChange?.(cursorA, newTime, Math.abs(newTime - cursorA));
    }
  }, [draggingCursor, labelWidth, pixelsPerUnit, totalDuration, cursorA, cursorB, onCursorChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingCursor(null);
  }, []);

  // Time ticks calculation
  const tickStep = useMemo(() => {
    if (pixelsPerUnit > 120) return 0.5;
    if (pixelsPerUnit > 50) return 1;
    if (pixelsPerUnit > 20) return 2;
    if (pixelsPerUnit > 10) return 5;
    return 10;
  }, [pixelsPerUnit]);

  const ticks = useMemo(() => {
    const list: number[] = [];
    const max = Math.ceil(totalDuration);
    for (let t = 0; t <= max; t += tickStep) {
      list.push(t);
    }
    return list;
  }, [totalDuration, tickStep]);

  // Telemetry computations
  const deltaT = Math.abs(cursorB - cursorA);
  const freqEquivalent = deltaT > 0 ? 1 / deltaT : 0;

  // Render individual signal waveforms
  const renderSignalTrace = (sig: SignalRow, index: number) => {
    const yTop = timeAxisHeight + index * rowHeight;
    const yBaseline = yTop + rowHeight - 10;
    const yHigh = yTop + 10;
    const isBus = sig.type === 'bus';
    const color = sig.color || '#38bdf8';

    if (isBus) {
      // BUS RENDERER: diamond/hexagonal segments for multi-bit data
      const segments: React.ReactNode[] = [];
      const transitions = sig.transitions;

      for (let i = 0; i < transitions.length; i++) {
        const cur = transitions[i];
        const nextTime = i < transitions.length - 1 ? transitions[i + 1].time : totalDuration;
        const xStart = labelWidth + cur.time * pixelsPerUnit;
        const xEnd = labelWidth + nextTime * pixelsPerUnit;
        const width = xEnd - xStart;
        const label = String(cur.value);
        const bevel = Math.min(6, width / 4);

        if (width <= 0) continue;

        if (label === 'IDLE' || label === '0' || label === '') {
          // Flat neutral line for idle
          segments.push(
            <line
              key={`bus-idle-${i}`}
              x1={xStart}
              y1={(yHigh + yBaseline) / 2}
              x2={xEnd}
              y2={(yHigh + yBaseline) / 2}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          );
        } else {
          // Hexagonal packet polygon: <polygon points="x1,yMid x1+b,yHigh x2-b,yHigh x2,yMid x2-b,yLow x1+b,yLow" />
          const yMid = (yHigh + yBaseline) / 2;
          const points = [
            `${xStart},${yMid}`,
            `${xStart + bevel},${yHigh}`,
            `${xEnd - bevel},${yHigh}`,
            `${xEnd},${yMid}`,
            `${xEnd - bevel},${yBaseline}`,
            `${xStart + bevel},${yBaseline}`,
          ].join(' ');

          segments.push(
            <g key={`bus-seg-${i}`}>
              <polygon
                points={points}
                fill={`${color}18`} // 10% opacity fill
                stroke={color}
                strokeWidth="1.6"
              />
              {width > 24 && (
                <text
                  x={xStart + width / 2}
                  y={yMid + 3.5}
                  fill="#f8fafc"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {label}
                </text>
              )}
            </g>
          );
        }
      }

      return (
        <g key={sig.name}>
          {/* Row guide line */}
          <line
            x1={labelWidth}
            y1={yTop + rowHeight}
            x2={totalSvgWidth}
            y2={yTop + rowHeight}
            stroke="#1e293b"
            strokeWidth="0.8"
          />
          {segments}
        </g>
      );
    }

    // DIGITAL 0/1 STEP RENDERER
    const pathSegments: string[] = [];
    const sorted = [...sig.transitions].sort((a, b) => a.time - b.time);

    let currentVal = sorted[0]?.value === 1 ? 1 : 0;
    let currentX = labelWidth + (sorted[0]?.time || 0) * pixelsPerUnit;
    let currentY = currentVal === 1 ? yHigh : yBaseline;

    pathSegments.push(`M ${labelWidth} ${currentY}`);
    pathSegments.push(`L ${currentX} ${currentY}`);

    for (let i = 0; i < sorted.length; i++) {
      const trans = sorted[i];
      const targetVal = trans.value === 1 ? 1 : 0;
      const targetX = labelWidth + trans.time * pixelsPerUnit;
      const targetY = targetVal === 1 ? yHigh : yBaseline;

      // Draw horizontal to transition time
      pathSegments.push(`L ${targetX} ${currentY}`);
      // Draw vertical edge
      if (currentY !== targetY) {
        pathSegments.push(`L ${targetX} ${targetY}`);
      }

      currentX = targetX;
      currentY = targetY;
      currentVal = targetVal;
    }

    // Draw final tail to totalDuration
    const finalX = labelWidth + totalDuration * pixelsPerUnit;
    pathSegments.push(`L ${finalX} ${currentY}`);

    return (
      <g key={sig.name}>
        {/* Subtle background track */}
        <line
          x1={labelWidth}
          y1={yTop + rowHeight}
          x2={totalSvgWidth}
          y2={yTop + rowHeight}
          stroke="#1e293b"
          strokeWidth="0.8"
        />
        {/* High / Low grid guide */}
        <line
          x1={labelWidth}
          y1={yHigh}
          x2={totalSvgWidth}
          y2={yHigh}
          stroke="#0f172a"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        <line
          x1={labelWidth}
          y1={yBaseline}
          x2={totalSvgWidth}
          y2={yBaseline}
          stroke="#0f172a"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />

        {/* Digital step trace */}
        <path
          d={pathSegments.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2.0"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
    );
  };

  return (
    <div className={`flex flex-col bg-canvas border border-subtle rounded-xl overflow-hidden ${className}`}>
      {/* Top Toolbar: Telemetry & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-neutral-900 border-b border-subtle text-xs">
        {/* Cursors Telemetry Readout */}
        {enableCursors && (
          <div className="flex items-center gap-3 font-mono text-[11px] code-ltr">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span>C1: {cursorA.toFixed(2)} {timeUnit}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>C2: {cursorB.toFixed(2)} {timeUnit}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              <span>ΔT: {deltaT.toFixed(2)} {timeUnit}</span>
              {deltaT > 0 && <span className="text-secondary font-normal">({freqEquivalent.toFixed(3)}/T)</span>}
            </div>
          </div>
        )}

        {/* Zoom & Table Buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[11px] font-mono text-secondary mr-1">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))}
            title="Zoom Out"
            className="p-1.5 text-secondary hover:text-primary hover:bg-neutral-800 rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4.0, parseFloat((z + 0.2).toFixed(1))))}
            title="Zoom In"
            className="p-1.5 text-secondary hover:text-primary hover:bg-neutral-800 rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            title="Reset Zoom (100%)"
            className="p-1.5 text-secondary hover:text-primary hover:bg-neutral-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowAccessibleTable(!showAccessibleTable)}
            title="Toggle Accessibility Data Table"
            className={`p-1.5 rounded transition-colors ml-1 ${
              showAccessibleTable ? 'bg-emerald-500/20 text-emerald-400' : 'text-secondary hover:text-primary hover:bg-neutral-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Waveform SVG Container */}
      <div 
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-hidden bg-neutral-950/95 relative select-none"
        style={{ minHeight: `${totalSvgHeight}px` }}
      >
        <svg
          width={totalSvgWidth}
          height={totalSvgHeight}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="block"
          role="img"
          aria-label={`Logic Timing Diagram showing ${signals.length} signals across ${totalDuration} ${timeUnit}`}
        >
          {/* Left Signal Labels Background */}
          <rect x="0" y="0" width={labelWidth} height={totalSvgHeight} fill="#090d16" />
          <line x1={labelWidth} y1="0" x2={labelWidth} y2={totalSvgHeight} stroke="#334155" strokeWidth="1.2" />

          {/* Time Axis Header */}
          <rect x="0" y="0" width={totalSvgWidth} height={timeAxisHeight} fill="#0d131f" />
          <line x1="0" y1={timeAxisHeight} x2={totalSvgWidth} y2={timeAxisHeight} stroke="#334155" strokeWidth="1" />
          <text
            x={10}
            y={18}
            fill="#94a3b8"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
          >
            SIGNAL [{timeUnit}]
          </text>

          {/* Time Axis Ticks and Grid Lines */}
          {ticks.map((t) => {
            const tx = labelWidth + t * pixelsPerUnit;
            return (
              <g key={`tick-${t}`}>
                {/* Vertical oscilloscope graticule line */}
                <line
                  x1={tx}
                  y1={timeAxisHeight}
                  x2={tx}
                  y2={totalSvgHeight}
                  stroke="#1e293b"
                  strokeWidth="0.6"
                  strokeDasharray="2 3"
                />
                {/* Tick mark */}
                <line x1={tx} y1={timeAxisHeight - 6} x2={tx} y2={timeAxisHeight} stroke="#64748b" strokeWidth="1" />
                <text
                  x={tx}
                  y={18}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Signal Rows */}
          {signals.map((sig, idx) => {
            const yTop = timeAxisHeight + idx * rowHeight;
            const color = sig.color || '#38bdf8';
            return (
              <g key={`row-${sig.name}`}>
                {/* Label on left */}
                <text
                  x={12}
                  y={yTop + 24}
                  fill={color}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {sig.name}
                </text>
                <text
                  x={labelWidth - 8}
                  y={yTop + 24}
                  fill="#475569"
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {sig.type === 'bus' ? 'BUS' : 'DIG'}
                </text>
                {/* Waveform Trace */}
                {renderSignalTrace(sig, idx)}
              </g>
            );
          })}

          {/* Dual Cursors */}
          {enableCursors && (
            <>
              {/* Cursor 1 (Cyan) */}
              {(() => {
                const cx1 = labelWidth + cursorA * pixelsPerUnit;
                return (
                  <g 
                    className="cursor-ew-resize group"
                    onMouseDown={(e) => handleMouseDownCursor('A', e)}
                  >
                    <line
                      x1={cx1}
                      y1={0}
                      x2={cx1}
                      y2={totalSvgHeight}
                      stroke="#06b6d4"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                    <polygon
                      points={`${cx1 - 6},0 ${cx1 + 6},0 ${cx1},10`}
                      fill="#06b6d4"
                    />
                    <rect
                      x={cx1 - 12}
                      y={0}
                      width="24"
                      height={totalSvgHeight}
                      fill="transparent"
                      className="cursor-ew-resize"
                    />
                  </g>
                );
              })()}

              {/* Cursor 2 (Amber) */}
              {(() => {
                const cx2 = labelWidth + cursorB * pixelsPerUnit;
                return (
                  <g 
                    className="cursor-ew-resize group"
                    onMouseDown={(e) => handleMouseDownCursor('B', e)}
                  >
                    <line
                      x1={cx2}
                      y1={0}
                      x2={cx2}
                      y2={totalSvgHeight}
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                    <polygon
                      points={`${cx2 - 6},0 ${cx2 + 6},0 ${cx2},10`}
                      fill="#f59e0b"
                    />
                    <rect
                      x={cx2 - 12}
                      y={0}
                      width="24"
                      height={totalSvgHeight}
                      fill="transparent"
                      className="cursor-ew-resize"
                    />
                  </g>
                );
              })()}
            </>
          )}
        </svg>
      </div>

      {/* Screen Reader & Accessible Table Alternative */}
      {showAccessibleTable && (
        <div className="p-3 bg-neutral-900 border-t border-subtle text-xs space-y-2">
          <div className="font-semibold text-primary flex items-center gap-1.5">
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accessible Signal Transition Table</span>
          </div>
          <div className="max-h-48 overflow-y-auto border border-subtle rounded-lg">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-neutral-950 text-secondary border-b border-subtle sticky top-0">
                <tr>
                  <th className="px-3 py-1.5">Signal</th>
                  <th className="px-3 py-1.5">Type</th>
                  <th className="px-3 py-1.5">Transitions ({timeUnit})</th>
                  <th className="px-3 py-1.5">Value at C1 ({cursorA.toFixed(1)})</th>
                  <th className="px-3 py-1.5">Value at C2 ({cursorB.toFixed(1)})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle/50 text-primary">
                {signals.map((sig) => {
                  const sorted = [...sig.transitions].sort((a, b) => a.time - b.time);
                  const getValAt = (time: number) => {
                    let v = sorted[0]?.value ?? '-';
                    for (const tr of sorted) {
                      if (tr.time <= time) v = tr.value;
                      else break;
                    }
                    return v;
                  };

                  return (
                    <tr key={sig.name} className="hover:bg-neutral-800/50">
                      <td className="px-3 py-1 font-semibold">{sig.name}</td>
                      <td className="px-3 py-1 text-secondary uppercase">{sig.type || 'digital'}</td>
                      <td className="px-3 py-1 text-secondary">
                        {sorted.map((t) => `@${t.time}:${t.value}`).join(', ')}
                      </td>
                      <td className="px-3 py-1 text-cyan-400 font-bold">{String(getValAt(cursorA))}</td>
                      <td className="px-3 py-1 text-amber-400 font-bold">{String(getValAt(cursorB))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screen Reader Only Text for blind users */}
      <table className="sr-only" aria-label="Screen reader signal transition table">
        <caption>Signal transition timeline</caption>
        <thead>
          <tr>
            <th scope="col">Signal</th>
            <th scope="col">Transitions</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((sig) => (
            <tr key={`sr-${sig.name}`}>
              <th scope="row">{sig.name}</th>
              <td>
                {sig.transitions.map((t) => `At ${t.time} ${timeUnit}, transition to ${t.value}`).join('. ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
