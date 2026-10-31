import { 
  Binary, 
  Settings, 
  Cpu, 
  Grid, 
  ShieldCheck, 
  Sliders,
  Timer,
  Radio,
  Cable,
  Network,
  Layers,
  CircuitBoard,
  Zap,
  Activity,
  GitBranch,
  Workflow,
  Waves,
  BookOpen,
  FileText,
  FolderKanban,
  Code
} from 'lucide-react';
import { FeatureDefinition, FeatureCategory } from './types';
import { BaseConverterView } from './base-converter/BaseConverterView';
import { BitwiseCalcView } from './bitwise-calc/BitwiseCalcView';
import { BooleanAlgebraView } from './boolean-algebra/BooleanAlgebraView';
import { ErrorDetectionView } from './error-detection/ErrorDetectionView';
import { AdcDacView } from './adcdac-calc/AdcDacView';
import { FlipFlopLabView } from './timing-lab/FlipFlopLabView';
import { CombinationalLabView } from './combinational-lab/CombinationalLabView';
import { FsmEditorView } from './fsm-editor/FsmEditorView';
import { ProtocolVisualizerView } from './protocol-visualizer/ProtocolVisualizerView';
import { LearnView } from './learn/LearnView';
import { TimerPwmView } from './timer-pwm/TimerPwmView';
import { UartCalcView } from './uart-calc/UartCalcView';
import { SpiI2cView } from './spi-i2c/SpiI2cView';
import { I2cAddressView } from './i2c-address/I2cAddressView';
import { RegisterBitfieldView } from './register-tool/RegisterBitfieldView';
import { GpioPlannerView } from './gpio-planner/GpioPlannerView';
import { PowerDebounceView } from './power-debounce/PowerDebounceView';
import { SettingsView } from './settings/SettingsView';
import { NotesView } from './notes/NotesView';
import { ChipLibraryView } from './library/ChipLibraryView';
import { SnippetLibraryView } from './snippets/SnippetLibraryView';
import { ProjectsView } from './projects/ProjectsView';
import { TranslationDictionary } from '../i18n/types';

class FeatureRegistry {
  private features: Map<string, FeatureDefinition> = new Map();

  constructor() {
    this.registerDefaultFeatures();
  }

  private registerDefaultFeatures() {
    // ----------------------------------------------------
    // DIGITAL ELECTRONICS TOOLS
    // ----------------------------------------------------
    // 1. Base Converter
    this.register({
      id: 'base-converter',
      titleKey: 'baseConverter.title',
      titleFallback: 'Base Converter & Bit Lab',
      descriptionKey: 'baseConverter.description',
      descriptionFallback: 'Instant multi-radix conversion with two\'s complement, IEEE-754 breakdown, and bit toggling.',
      category: 'tools',
      icon: Binary,
      component: BaseConverterView,
      shortcut: 'Ctrl+Shift+B',
      keywords: ['binary', 'hex', 'decimal', 'octal', 'bitwise', 'ieee754', 'float32', 'endianness', 'radix', 'twos complement'],
      badge: 'Interactive',
      singleton: false,
    });

    // 2. Bitwise Calculator
    this.register({
      id: 'bitwise-calc',
      titleKey: 'bitwiseCalc.title',
      titleFallback: 'Bitwise Calculator & C Code Generator',
      descriptionKey: 'bitwiseCalc.description',
      descriptionFallback: 'Execute bitwise operations, shifts, rotates, and generate C bitfield and mask code.',
      category: 'tools',
      icon: Cpu,
      component: BitwiseCalcView,
      shortcut: 'Ctrl+Shift+C',
      keywords: ['bitwise', 'and', 'or', 'xor', 'not', 'shift', 'rotate', 'c code', 'mask', 'bitfield', 'register'],
      badge: 'C Code Gen',
      singleton: false,
    });

    // 3. Boolean Algebra & K-Map
    this.register({
      id: 'boolean-algebra',
      titleKey: 'booleanAlgebra.title',
      titleFallback: 'Boolean Algebra & Karnaugh Map',
      descriptionKey: 'booleanAlgebra.description',
      descriptionFallback: 'Truth tables, Gray-code Karnaugh maps (2-4 vars), minimized SOP/POS, and SVG circuit schematics.',
      category: 'tools',
      icon: Grid,
      component: BooleanAlgebraView,
      shortcut: 'Ctrl+Shift+K',
      keywords: ['boolean', 'kmap', 'karnaugh', 'truth table', 'sop', 'pos', 'logic gates', 'schematic', 'minterm'],
      badge: 'K-Map 2-4V',
      singleton: false,
    });

    // 4. CRC, Checksums & Hamming SECDED
    this.register({
      id: 'error-detection',
      titleKey: 'errorCorrection.title',
      titleFallback: 'CRC, Checksums & Hamming SECDED',
      descriptionKey: 'errorCorrection.description',
      descriptionFallback: 'CRC-8/16/32 polynomials, Internet & Fletcher checksums, and Hamming(7,4) error injection/correction.',
      category: 'tools',
      icon: ShieldCheck,
      component: ErrorDetectionView,
      shortcut: 'Ctrl+Shift+E',
      keywords: ['crc', 'checksum', 'hamming', 'parity', 'secded', 'crc32', 'crc16', 'error correction', 'polynomial'],
      badge: 'SECDED',
      singleton: false,
    });

    // 5. ADC / DAC Quantization Calculator
    this.register({
      id: 'adcdac-calc',
      titleKey: 'adcdacCalc.title',
      titleFallback: 'ADC & DAC Quantization Calculator',
      descriptionKey: 'adcdacCalc.description',
      descriptionFallback: 'Resolution, LSB step voltage, quantization error, theoretical SNR, and code-to-voltage conversion.',
      category: 'tools',
      icon: Sliders,
      component: AdcDacView,
      shortcut: 'Ctrl+Shift+A',
      keywords: ['adc', 'dac', 'resolution', 'lsb', 'vref', 'quantization', 'snr', 'enob', 'voltage', 'code'],
      badge: 'Analog/Digital',
      singleton: false,
    });

    // ----------------------------------------------------
    // VISUAL SIMULATORS
    // ----------------------------------------------------
    // 6. Flip-Flop & Sequential Logic Lab
    this.register({
      id: 'flipflop-lab',
      titleKey: 'flipflopLab.title',
      titleFallback: 'Flip-Flop & Sequential Logic Lab',
      descriptionKey: 'flipflopLab.description',
      descriptionFallback: 'Simulate SR, D, JK, and T flip-flops with interactive clock stepping, async controls, and live timing diagrams.',
      category: 'tools',
      icon: Activity,
      component: FlipFlopLabView,
      shortcut: 'Ctrl+Shift+F',
      keywords: ['flipflop', 'sequential', 'clock', 'd flipflop', 'jk flipflop', 'sr latch', 'timing diagram', 'waveform', 'excitation'],
      badge: 'Live Timing',
      singleton: false,
    });

    // 7. Combinational Logic Lab
    this.register({
      id: 'combinational-lab',
      titleKey: 'combinationalLab.title',
      titleFallback: 'Combinational Logic Lab',
      descriptionKey: 'combinationalLab.description',
      descriptionFallback: 'Interactive adders, multiplexers, and decoders with live logic gate schematics and truth table tracing.',
      category: 'tools',
      icon: Workflow,
      component: CombinationalLabView,
      shortcut: 'Ctrl+Shift+L',
      keywords: ['adder', 'full adder', 'ripple carry', 'multiplexer', 'mux', 'decoder', 'logic gates', 'combinational'],
      badge: 'Logic Gates',
      singleton: false,
    });

    // 8. Finite State Machine (FSM) Editor & Simulator
    this.register({
      id: 'fsm-editor',
      titleKey: 'fsmEditor.title',
      titleFallback: 'Finite State Machine Editor & Simulator',
      descriptionKey: 'fsmEditor.description',
      descriptionFallback: 'Visually create states, draw transitions, step through inputs, and export state tables and C switch-case engines.',
      category: 'tools',
      icon: GitBranch,
      component: FsmEditorView,
      shortcut: 'Ctrl+Shift+M',
      keywords: ['fsm', 'state machine', 'mealy', 'moore', 'state diagram', 'c code', 'switch case', 'sequence detector'],
      badge: 'FSM & C Gen',
      singleton: false,
    });

    // 9. Protocol Waveform Visualizer & Decoder
    this.register({
      id: 'protocol-visualizer',
      titleKey: 'protocolVisualizer.title',
      titleFallback: 'Protocol Waveform Visualizer & Decoder',
      descriptionKey: 'protocolVisualizer.description',
      descriptionFallback: 'Generate multi-channel UART, SPI, and I2C waveforms with bus framing, or decode raw bitstreams into bytes.',
      category: 'tools',
      icon: Waves,
      component: ProtocolVisualizerView,
      shortcut: 'Ctrl+Shift+W',
      keywords: ['protocol', 'waveform', 'uart', 'spi', 'i2c', 'logic analyzer', 'decoder', 'framing error', 'bus timing'],
      badge: 'Bus Waveform',
      singleton: false,
    });

    // ----------------------------------------------------
    // MICROCONTROLLER TOOLS
    // ----------------------------------------------------
    // 10. Timer / PWM Frequency Calculator
    this.register({
      id: 'timer-pwm',
      titleKey: 'timerPwm.title',
      titleFallback: 'Timer & PWM Frequency Calculator',
      descriptionKey: 'timerPwm.description',
      descriptionFallback: 'Calculate prescaler, auto-reload/top, compare match, and exact error for AVR, STM32, RP2040, ESP32, and PIC.',
      category: 'microcontrollers',
      icon: Timer,
      component: TimerPwmView,
      shortcut: 'Ctrl+Shift+T',
      keywords: ['timer', 'pwm', 'frequency', 'prescaler', 'autoreload', 'arr', 'top', 'atmega328p', 'stm32', 'rp2040', 'esp32', 'pic'],
      badge: 'MCU Presets',
      singleton: false,
    });

    // 11. UART Baud-Rate Calculator
    this.register({
      id: 'uart-calc',
      titleKey: 'uartBaud.title',
      titleFallback: 'UART Baud-Rate & Framing Error',
      descriptionKey: 'uartBaud.description',
      descriptionFallback: 'UART divider, fractional baud generator, baud framing error %, and tolerance safety analysis.',
      category: 'microcontrollers',
      icon: Radio,
      component: UartCalcView,
      shortcut: 'Ctrl+Shift+U',
      keywords: ['uart', 'baud', 'baudrate', 'serial', 'brr', 'ubrr', 'framing error', 'usart', '115200', '9600'],
      badge: 'Baud Table',
      singleton: false,
    });

    // 12. SPI & I2C Bus Timing & Pull-Up Sizing
    this.register({
      id: 'spi-i2c',
      titleKey: 'spiI2c.title',
      titleFallback: 'SPI & I2C Bus Timing & Pull-Up Sizing',
      descriptionKey: 'spiI2c.description',
      descriptionFallback: 'Bus clock dividers, payload transfer times, and I2C pull-up resistor sizing from bus capacitance.',
      category: 'microcontrollers',
      icon: Cable,
      component: SpiI2cView,
      shortcut: 'Ctrl+Shift+S',
      keywords: ['spi', 'i2c', 'pullup', 'resistor', 'capacitance', 'transfer time', 'clock divider', 'bus speed', 'fast mode'],
      badge: 'Pull-Up Sizing',
      singleton: false,
    });

    // 13. I2C Address Converter & Bus Conflict Checker
    this.register({
      id: 'i2c-address',
      titleKey: 'i2cAddress.title',
      titleFallback: 'I2C Address Tool & Conflict Checker',
      descriptionKey: 'i2cAddress.description',
      descriptionFallback: '7-bit to 8-bit read/write conversion, comprehensive peripheral catalog, and multi-device bus conflict detection.',
      category: 'microcontrollers',
      icon: Network,
      component: I2cAddressView,
      shortcut: 'Ctrl+Shift+I',
      keywords: ['i2c', 'address', '7-bit', '8-bit', 'read', 'write', 'conflict', 'oled', 'sensor', 'eeprom', 'mpu6050', 'bme280'],
      badge: 'Conflict Check',
      singleton: false,
    });

    // 14. Register & Bitfield Layout Helper
    this.register({
      id: 'register-tool',
      titleKey: 'registerBitfield.title',
      titleFallback: 'Register & Bitfield Layout Helper',
      descriptionKey: 'registerBitfield.description',
      descriptionFallback: 'Visually define hardware registers with named bitfields; generates C header macros, RMW snippets, and union structs.',
      category: 'microcontrollers',
      icon: Layers,
      component: RegisterBitfieldView,
      shortcut: 'Ctrl+Shift+R',
      keywords: ['register', 'bitfield', 'c header', 'read modify write', 'mask', 'shift', 'macro', 'struct', 'embedded c'],
      badge: 'C Code Gen',
      singleton: false,
    });

    // 15. GPIO Pinout Planner & Conflict Detector
    this.register({
      id: 'gpio-planner',
      titleKey: 'gpioPlanner.title',
      titleFallback: 'GPIO Pinout Planner & Conflict Detector',
      descriptionKey: 'gpioPlanner.description',
      descriptionFallback: 'Assign MCU pin functions, validate hardware capabilities, detect conflicts, and export C #defines and Markdown pinouts.',
      category: 'microcontrollers',
      icon: CircuitBoard,
      component: GpioPlannerView,
      shortcut: 'Ctrl+Shift+G',
      keywords: ['gpio', 'pinout', 'pin planner', 'conflict', 'atmega328p', 'stm32', 'esp32', 'rp2040', 'c define', 'hardware'],
      badge: 'Pinout & C Exp',
      singleton: false,
    });

    // 16. Debounce Estimator & Duty-Cycled Battery Life
    this.register({
      id: 'power-debounce',
      titleKey: 'powerDebounce.title',
      titleFallback: 'Debounce Estimator & Battery Life',
      descriptionKey: 'powerDebounce.description',
      descriptionFallback: 'Calculate RC switch debouncing time constants, threshold delays, and duty-cycled low-power battery life projections.',
      category: 'microcontrollers',
      icon: Zap,
      component: PowerDebounceView,
      shortcut: 'Ctrl+Shift+P',
      keywords: ['debounce', 'rc filter', 'battery life', 'duty cycle', 'low power', 'sleep current', 'cr2032', 'tau', 'threshold'],
      badge: 'Low Power & RC',
      singleton: false,
    });

    // ----------------------------------------------------
    // LEARN ACADEMY
    // ----------------------------------------------------
    this.register({
      id: 'learn',
      titleKey: 'learn.title',
      titleFallback: 'Digital Electronics & Microcontroller Academy',
      descriptionKey: 'learn.description',
      descriptionFallback: 'Concise engineering lessons, interactive widget labs, instant quizzes, and SM-2 spaced repetition.',
      category: 'learn',
      icon: BookOpen,
      component: LearnView,
      shortcut: 'Ctrl+Shift+L',
      keywords: ['learn', 'academy', 'lessons', 'quiz', 'flashcards', 'sm2', 'code reading', 'curriculum', 'education'],
      badge: '10 Lessons & SM-2',
      singleton: true,
    });

    // ----------------------------------------------------
    // SETTINGS
    // ----------------------------------------------------
    this.register({
      id: 'settings',
      titleKey: 'settings.title',
      titleFallback: 'Workbench Settings',
      descriptionKey: 'settings.description',
      descriptionFallback: 'Display themes, Persian/English language, motion, and IndexedDB storage.',
      category: 'settings',
      icon: Settings,
      component: SettingsView,
      shortcut: 'Ctrl+,',
      keywords: ['settings', 'theme', 'dark', 'light', 'language', 'persian', 'english', 'storage', 'indexeddb', 'graticule'],
      singleton: true,
    });

    // ----------------------------------------------------
    // KNOWLEDGE MANAGEMENT FEATURES (STEP 5)
    // ----------------------------------------------------
    // Notes & Knowledge Graph
    this.register({
      id: 'notes',
      titleKey: 'notes.title',
      titleFallback: 'Knowledge Notes & Graph',
      descriptionKey: 'notes.description',
      descriptionFallback: 'Markdown notes with [[wiki-links]], backlinks, interactive knowledge graph, and flashcard extraction.',
      category: 'notes',
      icon: FileText,
      component: NotesView,
      shortcut: 'Ctrl+Shift+N',
      keywords: ['notes', 'wiki', 'backlinks', 'graph', 'markdown', 'flashcards', 'sm2', 'knowledge'],
      badge: 'Wiki-Graph',
      singleton: true,
    });

    // Chip & Component Library
    this.register({
      id: 'library',
      titleKey: 'chipLibrary.title',
      titleFallback: 'Chip & Component Catalog',
      descriptionKey: 'chipLibrary.description',
      descriptionFallback: 'Microcontrollers, 74xx discrete logic, sensors, analog ICs & stock inventory.',
      category: 'library',
      icon: Layers,
      component: ChipLibraryView,
      shortcut: 'Ctrl+Shift+L',
      keywords: ['chips', 'components', 'ic', '74xx', 'mcu', 'datasheet', 'pinout', 'stock', 'inventory', 'specs'],
      badge: 'IC Catalog',
      singleton: true,
    });

    // Code Snippets
    this.register({
      id: 'snippets',
      titleKey: 'snippets.title',
      titleFallback: 'Embedded Snippet Library',
      descriptionKey: 'snippets.description',
      descriptionFallback: 'Tagged C, C++, MicroPython, and Verilog routines with note cross-linking.',
      category: 'library',
      icon: Code,
      component: SnippetLibraryView,
      shortcut: 'Ctrl+Shift+S',
      keywords: ['snippets', 'c', 'cpp', 'python', 'verilog', 'rust', 'code', 'macros', 'fifo', 'ring buffer'],
      badge: 'Code Lib',
      singleton: true,
    });

    // Hardware Projects & BOM
    this.register({
      id: 'projects',
      titleKey: 'projects.title',
      titleFallback: 'Hardware Projects & BOM',
      descriptionKey: 'projects.description',
      descriptionFallback: 'Project charter, GPIO pin assignments, Bill of Materials with live costing, and bring-up checklist.',
      category: 'tools',
      icon: FolderKanban,
      component: ProjectsView,
      shortcut: 'Ctrl+Shift+P',
      keywords: ['project', 'bom', 'bill of materials', 'costing', 'pins', 'gpio', 'checklist', 'bringup'],
      badge: 'BOM & Costing',
      singleton: true,
    });
  }

  public register(feature: FeatureDefinition): void {
    if (this.features.has(feature.id)) {
      console.warn(`Feature with ID "${feature.id}" is already registered. Overwriting.`);
    }
    this.features.set(feature.id, feature);
  }

  public get(id: string): FeatureDefinition | undefined {
    return this.features.get(id);
  }

  public getAll(): FeatureDefinition[] {
    return Array.from(this.features.values());
  }

  public getByCategory(category: FeatureCategory): FeatureDefinition[] {
    return this.getAll().filter((f) => f.category === category);
  }

  public resolveTitle(feature: FeatureDefinition, t: TranslationDictionary): string {
    if (feature.id === 'base-converter') return t.baseConverter.title;
    if (feature.id === 'bitwise-calc') return t.bitwiseCalc.title;
    if (feature.id === 'boolean-algebra') return t.booleanAlgebra.title;
    if (feature.id === 'error-detection') return t.errorCorrection.title;
    if (feature.id === 'adcdac-calc') return t.adcdacCalc.title;
    if (feature.id === 'flipflop-lab') return t.flipflopLab.title;
    if (feature.id === 'combinational-lab') return t.combinationalLab.title;
    if (feature.id === 'fsm-editor') return t.fsmEditor.title;
    if (feature.id === 'protocol-visualizer') return t.protocolVisualizer.title;
    if (feature.id === 'timer-pwm') return t.timerPwm.title;
    if (feature.id === 'uart-calc') return t.uartBaud.title;
    if (feature.id === 'spi-i2c') return t.spiI2c.title;
    if (feature.id === 'i2c-address') return t.i2cAddress.title;
    if (feature.id === 'register-tool') return t.registerBitfield.title;
    if (feature.id === 'gpio-planner') return t.gpioPlanner.title;
    if (feature.id === 'power-debounce') return t.powerDebounce.title;
    if (feature.id === 'learn') return t.learn.title;
    if (feature.id === 'settings') return t.settings.title;
    if (feature.id === 'notes') return t.notes.title;
    if (feature.id === 'library') return t.chipLibrary.title;
    if (feature.id === 'snippets') return t.snippets.title;
    if (feature.id === 'projects') return t.projects.title;
    return feature.titleFallback;
  }

  public resolveDescription(feature: FeatureDefinition, t: TranslationDictionary): string {
    if (feature.id === 'base-converter') return t.baseConverter.description;
    if (feature.id === 'bitwise-calc') return t.bitwiseCalc.description;
    if (feature.id === 'boolean-algebra') return t.booleanAlgebra.description;
    if (feature.id === 'error-detection') return t.errorCorrection.description;
    if (feature.id === 'adcdac-calc') return t.adcdacCalc.description;
    if (feature.id === 'flipflop-lab') return t.flipflopLab.description;
    if (feature.id === 'combinational-lab') return t.combinationalLab.description;
    if (feature.id === 'fsm-editor') return t.fsmEditor.description;
    if (feature.id === 'protocol-visualizer') return t.protocolVisualizer.description;
    if (feature.id === 'timer-pwm') return t.timerPwm.description;
    if (feature.id === 'uart-calc') return t.uartBaud.description;
    if (feature.id === 'spi-i2c') return t.spiI2c.description;
    if (feature.id === 'i2c-address') return t.i2cAddress.description;
    if (feature.id === 'register-tool') return t.registerBitfield.description;
    if (feature.id === 'gpio-planner') return t.gpioPlanner.description;
    if (feature.id === 'power-debounce') return t.powerDebounce.description;
    if (feature.id === 'learn') return t.learn.description;
    if (feature.id === 'settings') return t.settings.description;
    if (feature.id === 'notes') return t.notes.description;
    if (feature.id === 'library') return t.chipLibrary.description;
    if (feature.id === 'snippets') return t.snippets.description;
    if (feature.id === 'projects') return t.projects.description;
    return feature.descriptionFallback;
  }
}

export const featureRegistry = new FeatureRegistry();
