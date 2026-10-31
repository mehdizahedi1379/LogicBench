import React from 'react';
import { 
  Binary, 
  Settings, 
  Cpu, 
  BookOpen, 
  FileText, 
  Layers, 
  Zap, 
  Compass, 
  ChevronRight, 
  HardDrive, 
  Grid, 
  ShieldCheck, 
  Sliders, 
  Timer, 
  Radio, 
  Cable, 
  Network, 
  CircuitBoard, 
  BatteryCharging,
  Activity,
  GitBranch,
  Workflow,
  Waves,
  FolderKanban,
  Code
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface HomeViewProps {
  onOpenFeature: (featureId: string) => void;
  onSelectCategory: (category: 'tools' | 'microcontrollers' | 'learn' | 'notes' | 'library' | 'settings') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenFeature, onSelectCategory }) => {
  const { t } = useI18n();

  const visualSimulatorItems = [
    {
      id: 'flipflop-lab',
      title: t.flipflopLab.title,
      description: t.flipflopLab.description,
      icon: Activity,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      badge: 'Live Timing Diagram',
    },
    {
      id: 'combinational-lab',
      title: t.combinationalLab.title,
      description: t.combinationalLab.description,
      icon: Workflow,
      color: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      badge: 'Adders / MUX / Decoders',
    },
    {
      id: 'fsm-editor',
      title: t.fsmEditor.title,
      description: t.fsmEditor.description,
      icon: GitBranch,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      badge: 'FSM & C Generator',
    },
    {
      id: 'protocol-visualizer',
      title: t.protocolVisualizer.title,
      description: t.protocolVisualizer.description,
      icon: Waves,
      color: 'text-sky-400',
      borderHover: 'hover:border-sky-500/50',
      badge: 'UART / SPI / I2C Decoder',
    },
  ];

  const mcuToolsItems = [
    {
      id: 'timer-pwm',
      title: t.timerPwm.title,
      description: t.timerPwm.description,
      icon: Timer,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      badge: 'AVR / STM32 / RP2040',
    },
    {
      id: 'uart-calc',
      title: t.uartBaud.title,
      description: t.uartBaud.description,
      icon: Radio,
      color: 'text-sky-400',
      borderHover: 'hover:border-sky-500/50',
      badge: 'Framing Error %',
    },
    {
      id: 'spi-i2c',
      title: t.spiI2c.title,
      description: t.spiI2c.description,
      icon: Cable,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      badge: 'Pull-Up Sizing & Timing',
    },
    {
      id: 'i2c-address',
      title: t.i2cAddress.title,
      description: t.i2cAddress.description,
      icon: Network,
      color: 'text-indigo-400',
      borderHover: 'hover:border-indigo-500/50',
      badge: '7/8-Bit & Conflicts',
    },
    {
      id: 'register-tool',
      title: t.registerBitfield.title,
      description: t.registerBitfield.description,
      icon: Layers,
      color: 'text-yellow-400',
      borderHover: 'hover:border-yellow-500/50',
      badge: 'Visual Bitfields & C',
    },
    {
      id: 'gpio-planner',
      title: t.gpioPlanner.title,
      description: t.gpioPlanner.description,
      icon: CircuitBoard,
      color: 'text-teal-400',
      borderHover: 'hover:border-teal-500/50',
      badge: 'Pinout & C #defines',
    },
    {
      id: 'power-debounce',
      title: t.powerDebounce.title,
      description: t.powerDebounce.description,
      icon: BatteryCharging,
      color: 'text-lime-400',
      borderHover: 'hover:border-lime-500/50',
      badge: 'RC Debounce & Battery',
    },
  ];

  const digitalElectronicsItems = [
    {
      id: 'base-converter',
      title: t.baseConverter.title,
      description: t.baseConverter.description,
      icon: Binary,
      color: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      badge: 'Two\'s Comp / IEEE-754',
    },
    {
      id: 'bitwise-calc',
      title: t.bitwiseCalc.title,
      description: t.bitwiseCalc.description,
      icon: Cpu,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      badge: 'C Code Gen',
    },
    {
      id: 'boolean-algebra',
      title: t.booleanAlgebra.title,
      description: t.booleanAlgebra.description,
      icon: Grid,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      badge: 'K-Map 2-4V & SVG',
    },
    {
      id: 'error-detection',
      title: t.errorCorrection.title,
      description: t.errorCorrection.description,
      icon: ShieldCheck,
      color: 'text-purple-400',
      borderHover: 'hover:border-purple-500/50',
      badge: 'CRC / Hamming SECDED',
    },
    {
      id: 'adcdac-calc',
      title: t.adcdacCalc.title,
      description: t.adcdacCalc.description,
      icon: Sliders,
      color: 'text-rose-400',
      borderHover: 'hover:border-rose-500/50',
      badge: 'LSB / SNR / Codes',
    },
  ];

  const knowledgeManagementItems = [
    {
      id: 'notes',
      title: t.notes.title,
      description: t.notes.description,
      icon: FileText,
      color: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      badge: 'Wiki-Links & Graph',
    },
    {
      id: 'library',
      title: t.chipLibrary.title,
      description: t.chipLibrary.description,
      icon: Layers,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/50',
      badge: 'IC Catalog & Stock',
    },
    {
      id: 'snippets',
      title: t.snippets.title,
      description: t.snippets.description,
      icon: Code,
      color: 'text-purple-400',
      borderHover: 'hover:border-purple-500/50',
      badge: 'C / uPy / Verilog',
    },
    {
      id: 'projects',
      title: t.projects.title,
      description: t.projects.description,
      icon: FolderKanban,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/50',
      badge: 'BOM & Costing',
    },
  ];

  const domainCategories = [
    {
      id: 'tools' as const,
      name: t.navigation.tools,
      description: '9 digital instruments & visual simulators: Radix, Bitwise C, K-Map, CRC, ADC, Flip-Flops, Combinational, FSM, and Protocols.',
      icon: Zap,
      count: '9 Active Instruments',
    },
    {
      id: 'microcontrollers' as const,
      name: t.navigation.microcontrollers,
      description: '7 active microcontroller tools: Timers, UART, I2C/SPI bus, conflict checker, bitfields, GPIO, and battery/debounce.',
      icon: Cpu,
      count: '7 Active Tools',
    },
    {
      id: 'learn' as const,
      name: t.navigation.learn,
      description: '10 engineering micro-lessons, SM-2 flashcards queue, interactive widget experiments, and C code-reading exercises.',
      icon: BookOpen,
      count: '10 Lessons & SM-2',
    },
    {
      id: 'notes' as const,
      name: t.navigation.notes,
      description: 'Engineering lab scratchpad, register notes, and local markdown documents.',
      icon: FileText,
      count: 'IndexedDB Store',
    },
    {
      id: 'library' as const,
      name: t.navigation.library,
      description: '7400-series logic IC catalog, sensors, and passive components database.',
      icon: Layers,
      count: 'Component Registry',
    },
    {
      id: 'settings' as const,
      name: t.navigation.settings,
      description: 'Theme customization, dual language EN/FA, and storage controls.',
      icon: Settings,
      count: 'Configured',
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Workbench Welcome Banner */}
      <div className="bg-surface rounded-xl p-6 md:p-8 border border-subtle relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none bg-graticule" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs text-secondary font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>LOGICBENCH // DESKTOP-CLASS ELECTRONICS WORKBENCH</span>
            <span aria-hidden="true">·</span>
            <span>16 PURE-LOGIC INSTRUMENTS &amp; SIMULATORS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary">
            {t.app.title} — {t.app.subtitle}
          </h1>
          <p className="text-sm text-secondary leading-relaxed">
            {t.app.tagline}. Interactive flip-flop labs, combinational adders/multiplexers, finite state machine editor with C code export, multi-channel UART/SPI/I2C timing diagrams, and microcontroller register planners.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenFeature('flipflop-lab')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              <span>Flip-Flop Lab</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenFeature('fsm-editor')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              <span>FSM Editor</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenFeature('protocol-visualizer')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors flex items-center gap-2"
            >
              <Waves className="w-4 h-4" />
              <span>Protocol Visualizer</span>
            </button>
            <div className="code-ltr text-xs text-muted font-mono flex items-center gap-1.5 ml-auto hidden sm:flex" dir="ltr">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>IndexedDB: Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Simulators & Labs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Interactive Visual Simulators &amp; Labs</span>
          </h2>
          <span className="text-xs text-secondary font-mono">4 Visual Simulators</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visualSimulatorItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenFeature(item.id)}
                className={`text-left bg-surface rounded-xl p-5 border border-subtle ${item.borderHover} transition-all duration-150 group flex flex-col justify-between hover:bg-surface-elevated`}
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center border border-subtle">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-subtle text-secondary border border-subtle">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold pt-4 mt-2 border-t border-subtle/50 group-hover:translate-x-1 transition-transform">
                  <span>Open Simulator</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Microcontroller Engineering Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Microcontroller Engineering Tools</span>
          </h2>
          <span className="text-xs text-secondary font-mono">7 Active Instruments</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mcuToolsItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenFeature(item.id)}
                className={`text-left bg-surface rounded-xl p-5 border border-subtle ${item.borderHover} transition-all duration-150 group flex flex-col justify-between hover:bg-surface-elevated`}
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center border border-subtle">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-subtle text-secondary border border-subtle">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold pt-4 mt-2 border-t border-subtle/50 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Digital Electronics Instruments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Digital Electronics Core Tools</span>
          </h2>
          <span className="text-xs text-secondary font-mono">5 Active Instruments</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {digitalElectronicsItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenFeature(item.id)}
                className={`text-left bg-surface rounded-xl p-5 border border-subtle ${item.borderHover} transition-all duration-150 group flex flex-col justify-between hover:bg-surface-elevated`}
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center border border-subtle">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-subtle text-secondary border border-subtle">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary group-hover:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-cyan-400 font-semibold pt-4 mt-2 border-t border-subtle/50 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Knowledge Management & Components (Step 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Knowledge Management, Component Library &amp; BOM</span>
          </h2>
          <span className="text-xs text-secondary font-mono">Local-First Persistence</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {knowledgeManagementItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenFeature(item.id)}
                className={`text-left bg-surface rounded-xl p-5 border border-subtle ${item.borderHover} transition-all duration-150 group flex flex-col justify-between hover:bg-surface-elevated`}
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center border border-subtle">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-subtle text-secondary border border-subtle">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary group-hover:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-cyan-400 font-semibold pt-4 mt-2 border-t border-subtle/50 group-hover:translate-x-1 transition-transform">
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories & Architecture Explorer */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>{t.workbench.categories}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {domainCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="text-left bg-surface/70 rounded-lg p-4 border border-subtle hover:border-secondary hover:bg-surface transition-colors space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                    <span className="text-sm font-semibold text-primary">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted">{cat.count}</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
