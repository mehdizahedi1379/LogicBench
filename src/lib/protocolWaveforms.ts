/**
 * Pure logic for Protocol Waveform Visualizer & Decoder
 * Generates accurate digital logic transitions for UART, SPI, and I2C protocols.
 * Includes decoder engine for framing inspection, bit sampling, and self-checks.
 */

export interface WaveformTransition {
  time: number;
  value: number | string; // 0, 1, or bus hex/label string
}

export interface SignalRow {
  name: string;
  color?: string;
  type?: 'digital' | 'bus';
  transitions: WaveformTransition[];
  ariaDescription?: string;
}

export interface ProtocolWaveformResult {
  protocol: 'UART' | 'SPI' | 'I2C';
  signals: SignalRow[];
  totalDuration: number;
  timeUnit: string;
  annotations: { time: number; label: string; type: 'start' | 'stop' | 'ack' | 'data' | 'parity' }[];
  summary: string;
  decodedBytesHex: string[];
  steps: string[];
}

// ----------------------------------------------------
// UART GENERATOR
// ----------------------------------------------------

export interface UartConfig {
  baudRate: number;
  dataBits: 7 | 8;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
}

export function generateUartWaveforms(
  bytes: number[],
  config: UartConfig = { baudRate: 9600, dataBits: 8, parity: 'none', stopBits: 1 }
): ProtocolWaveformResult {
  const bitTime = 1; // Normalized bit time unit (1 unit = 1/baud)
  const signals: SignalRow[] = [];
  const annotations: { time: number; label: string; type: 'start' | 'stop' | 'ack' | 'data' | 'parity' }[] = [];
  const steps: string[] = [];

  const txTransitions: WaveformTransition[] = [{ time: 0, value: 1 }]; // IDLE is HIGH (Mark)
  const busTransitions: WaveformTransition[] = [{ time: 0, value: 'IDLE' }];

  let currentTime = 1; // 1 unit idle padding

  steps.push(`1. UART Frame Configuration: ${config.baudRate} baud, ${config.dataBits} Data bits, Parity: ${config.parity.toUpperCase()}, ${config.stopBits} Stop bit(s).`);

  for (let bIdx = 0; bIdx < bytes.length; bIdx++) {
    const byte = bytes[bIdx] & 0xFF;
    const hex = '0x' + byte.toString(16).padStart(2, '0').toUpperCase();
    const char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '';
    steps.push(`2. Byte #${bIdx + 1}: ${hex} ${char ? `('${char}')` : ''} = 0b${byte.toString(2).padStart(8, '0')}.`);

    // START BIT (0)
    txTransitions.push({ time: currentTime, value: 0 });
    busTransitions.push({ time: currentTime, value: 'START' });
    annotations.push({ time: currentTime, label: 'START', type: 'start' });
    currentTime += bitTime;

    // DATA BITS (LSB FIRST)
    let parityCount = 0;
    for (let i = 0; i < config.dataBits; i++) {
      const bit = ((byte >> i) & 1) as 0 | 1;
      if (bit === 1) parityCount++;
      txTransitions.push({ time: currentTime, value: bit });
      busTransitions.push({ time: currentTime, value: `D${i}:${bit}` });
      annotations.push({ time: currentTime, label: `D${i}`, type: 'data' });
      currentTime += bitTime;
    }

    // PARITY BIT
    if (config.parity !== 'none') {
      const isEven = parityCount % 2 === 0;
      const parityBit = config.parity === 'even' ? (isEven ? 0 : 1) : (isEven ? 1 : 0);
      txTransitions.push({ time: currentTime, value: parityBit });
      busTransitions.push({ time: currentTime, value: `PAR:${parityBit}` });
      annotations.push({ time: currentTime, label: `PAR(${config.parity[0].toUpperCase()})`, type: 'parity' });
      currentTime += bitTime;
    }

    // STOP BIT(S) (1)
    for (let s = 0; s < config.stopBits; s++) {
      txTransitions.push({ time: currentTime, value: 1 });
      busTransitions.push({ time: currentTime, value: 'STOP' });
      annotations.push({ time: currentTime, label: 'STOP', type: 'stop' });
      currentTime += bitTime;
    }

    // Small inter-byte idle gap
    txTransitions.push({ time: currentTime, value: 1 });
    busTransitions.push({ time: currentTime, value: 'IDLE' });
    currentTime += bitTime * 0.5;
  }

  // End idle
  currentTime += 1;
  txTransitions.push({ time: currentTime, value: 1 });

  signals.push({
    name: 'UART TX',
    type: 'digital',
    color: '#38bdf8', // sky-400
    transitions: txTransitions,
    ariaDescription: `UART TX digital waveform with ${bytes.length} bytes transmitted.`,
  });

  signals.push({
    name: 'UART Framing',
    type: 'bus',
    color: '#f59e0b', // amber-400
    transitions: busTransitions,
    ariaDescription: 'UART Frame packets with Start, Data, Parity, and Stop segments.',
  });

  return {
    protocol: 'UART',
    signals,
    totalDuration: currentTime,
    timeUnit: 'bit periods (T_bit)',
    annotations,
    summary: `UART Stream: ${bytes.length} byte(s) rendered at ${config.baudRate} baud (1 T_bit = ${(1e6 / config.baudRate).toFixed(2)} µs).`,
    decodedBytesHex: bytes.map((b) => '0x' + (b & 0xFF).toString(16).padStart(2, '0').toUpperCase()),
    steps,
  };
}

// ----------------------------------------------------
// SPI GENERATOR
// ----------------------------------------------------

export interface SpiConfig {
  mode: 0 | 1 | 2 | 3; // CPOL / CPHA
  msbFirst: boolean;
}

export function generateSpiWaveforms(
  bytes: number[],
  config: SpiConfig = { mode: 0, msbFirst: true }
): ProtocolWaveformResult {
  const { mode, msbFirst } = config;
  const cpol = (mode === 2 || mode === 3) ? 1 : 0;
  const cpha = (mode === 1 || mode === 3) ? 1 : 0;

  const csTransitions: WaveformTransition[] = [{ time: 0, value: 1 }];
  const sckTransitions: WaveformTransition[] = [{ time: 0, value: cpol }];
  const mosiTransitions: WaveformTransition[] = [{ time: 0, value: 0 }];
  const busTransitions: WaveformTransition[] = [{ time: 0, value: 'IDLE' }];
  const annotations: { time: number; label: string; type: 'start' | 'stop' | 'ack' | 'data' | 'parity' }[] = [];
  const steps: string[] = [
    `1. SPI Mode ${mode}: CPOL = ${cpol} (Clock Idle ${cpol ? 'HIGH' : 'LOW'}), CPHA = ${cpha} (Sample on ${cpha ? 'trailing/second' : 'leading/first'} clock edge).`,
  ];

  let t = 1;

  // Assert CS active low
  csTransitions.push({ time: t, value: 0 });
  busTransitions.push({ time: t, value: 'CS ASSERT' });
  annotations.push({ time: t, label: 'CS LOW', type: 'start' });
  t += 1;

  for (let bIdx = 0; bIdx < bytes.length; bIdx++) {
    const byte = bytes[bIdx] & 0xFF;
    const hex = '0x' + byte.toString(16).padStart(2, '0').toUpperCase();
    steps.push(`2. Byte #${bIdx + 1}: ${hex} (${msbFirst ? 'MSB First' : 'LSB First'}).`);

    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const bitPos = msbFirst ? (7 - bitIdx) : bitIdx;
      const bitVal = ((byte >> bitPos) & 1) as 0 | 1;

      // MOSI setup
      mosiTransitions.push({ time: t, value: bitVal });
      busTransitions.push({ time: t, value: `B${bitPos}:${bitVal}` });
      annotations.push({ time: t, label: `b${bitPos}`, type: 'data' });

      // SCK first edge
      sckTransitions.push({ time: t + 0.5, value: 1 - cpol });

      // SCK second edge
      sckTransitions.push({ time: t + 1.0, value: cpol });

      t += 1;
    }

    t += 0.5; // Inter-byte spacing
  }

  // Deassert CS
  csTransitions.push({ time: t, value: 1 });
  sckTransitions.push({ time: t, value: cpol });
  busTransitions.push({ time: t, value: 'CS IDLE' });
  annotations.push({ time: t, label: 'CS HIGH', type: 'stop' });
  t += 1;

  const signals: SignalRow[] = [
    { name: 'SPI CS (SS)', type: 'digital', color: '#f43f5e', transitions: csTransitions },
    { name: 'SPI SCK', type: 'digital', color: '#10b981', transitions: sckTransitions },
    { name: 'SPI MOSI', type: 'digital', color: '#06b6d4', transitions: mosiTransitions },
    { name: 'SPI Packets', type: 'bus', color: '#a855f7', transitions: busTransitions },
  ];

  return {
    protocol: 'SPI',
    signals,
    totalDuration: t,
    timeUnit: 'clock half-cycles',
    annotations,
    summary: `SPI Mode ${mode} transfer of ${bytes.length} byte(s) with Chip-Select framing.`,
    decodedBytesHex: bytes.map((b) => '0x' + (b & 0xFF).toString(16).padStart(2, '0').toUpperCase()),
    steps,
  };
}

// ----------------------------------------------------
// I2C GENERATOR
// ----------------------------------------------------

export interface I2cConfig {
  slaveAddress7Bit: number; // e.g. 0x3C or 0x68
  isRead: boolean; // false = Write (0), true = Read (1)
}

export function generateI2cWaveforms(
  payloadBytes: number[],
  config: I2cConfig = { slaveAddress7Bit: 0x3C, isRead: false }
): ProtocolWaveformResult {
  const sclTransitions: WaveformTransition[] = [{ time: 0, value: 1 }];
  const sdaTransitions: WaveformTransition[] = [{ time: 0, value: 1 }];
  const busTransitions: WaveformTransition[] = [{ time: 0, value: 'IDLE' }];
  const annotations: { time: number; label: string; type: 'start' | 'stop' | 'ack' | 'data' | 'parity' }[] = [];
  const steps: string[] = [];

  let t = 1;

  // I2C START CONDITION: SDA falls while SCL is HIGH
  steps.push(`1. START Condition: SDA pulled LOW while SCL is HIGH.`);
  sdaTransitions.push({ time: t, value: 0 });
  busTransitions.push({ time: t, value: 'START' });
  annotations.push({ time: t, label: 'START', type: 'start' });
  t += 0.5;

  sclTransitions.push({ time: t, value: 0 }); // SCL falls
  t += 0.5;

  // 7-BIT ADDRESS + R/W BIT (Total 8 bits)
  const addr7 = config.slaveAddress7Bit & 0x7F;
  const rwBit = config.isRead ? 1 : 0;
  const addressByte = (addr7 << 1) | rwBit;
  steps.push(`2. Address Frame: 7-bit Address 0x${addr7.toString(16).toUpperCase()} + ${config.isRead ? 'READ (1)' : 'WRITE (0)'} = 0x${addressByte.toString(16).padStart(2, '0').toUpperCase()}.`);

  for (let i = 7; i >= 0; i--) {
    const bit = ((addressByte >> i) & 1) as 0 | 1;
    sdaTransitions.push({ time: t, value: bit });
    busTransitions.push({ time: t, value: i === 0 ? (rwBit ? 'RD' : 'WR') : `A${i - 1}:${bit}` });

    // Clock pulse (SCL high then low)
    sclTransitions.push({ time: t + 0.3, value: 1 });
    sclTransitions.push({ time: t + 0.7, value: 0 });
    t += 1;
  }

  // ACK BIT FROM SLAVE (SDA pulled low during 9th clock pulse)
  sdaTransitions.push({ time: t, value: 0 }); // ACK is LOW
  busTransitions.push({ time: t, value: 'ACK (0)' });
  annotations.push({ time: t, label: 'ACK', type: 'ack' });
  sclTransitions.push({ time: t + 0.3, value: 1 });
  sclTransitions.push({ time: t + 0.7, value: 0 });
  t += 1;

  // DATA BYTES
  for (let bIdx = 0; bIdx < payloadBytes.length; bIdx++) {
    const byte = payloadBytes[bIdx] & 0xFF;
    const hex = '0x' + byte.toString(16).padStart(2, '0').toUpperCase();
    steps.push(`3. Data Byte #${bIdx + 1}: ${hex} = 0b${byte.toString(2).padStart(8, '0')}.`);

    for (let i = 7; i >= 0; i--) {
      const bit = ((byte >> i) & 1) as 0 | 1;
      sdaTransitions.push({ time: t, value: bit });
      busTransitions.push({ time: t, value: `D${i}:${bit}` });

      sclTransitions.push({ time: t + 0.3, value: 1 });
      sclTransitions.push({ time: t + 0.7, value: 0 });
      t += 1;
    }

    // ACK on data byte
    sdaTransitions.push({ time: t, value: 0 });
    busTransitions.push({ time: t, value: 'ACK (0)' });
    annotations.push({ time: t, label: 'ACK', type: 'ack' });
    sclTransitions.push({ time: t + 0.3, value: 1 });
    sclTransitions.push({ time: t + 0.7, value: 0 });
    t += 1;
  }

  // STOP CONDITION: SDA rises while SCL is HIGH
  steps.push(`4. STOP Condition: SCL released HIGH, then SDA rises from LOW to HIGH.`);
  sdaTransitions.push({ time: t, value: 0 });
  sclTransitions.push({ time: t + 0.3, value: 1 });
  sdaTransitions.push({ time: t + 0.7, value: 1 });
  busTransitions.push({ time: t + 0.7, value: 'STOP' });
  annotations.push({ time: t + 0.7, label: 'STOP', type: 'stop' });
  t += 1.5;

  const signals: SignalRow[] = [
    { name: 'I2C SCL', type: 'digital', color: '#10b981', transitions: sclTransitions },
    { name: 'I2C SDA', type: 'digital', color: '#38bdf8', transitions: sdaTransitions },
    { name: 'I2C Bus Events', type: 'bus', color: '#f59e0b', transitions: busTransitions },
  ];

  return {
    protocol: 'I2C',
    signals,
    totalDuration: t,
    timeUnit: 'clock periods',
    annotations,
    summary: `I2C ${config.isRead ? 'Read' : 'Write'} to Address 0x${addr7.toString(16).toUpperCase()} with ${payloadBytes.length} data byte(s) and ACK handshaking.`,
    decodedBytesHex: [
      '0x' + addressByte.toString(16).padStart(2, '0').toUpperCase(),
      ...payloadBytes.map((b) => '0x' + (b & 0xFF).toString(16).padStart(2, '0').toUpperCase()),
    ],
    steps,
  };
}

// ----------------------------------------------------
// DECODER ENGINE
// ----------------------------------------------------

export interface UartDecodeResult {
  success: boolean;
  rawBits: number[];
  decodedBytes: number[];
  decodedAscii: string;
  decodedHex: string[];
  framingErrors: string[];
  steps: string[];
}

/**
 * Decodes a string of raw bits (e.g. "0 10000010 1" or "0100000101")
 */
export function decodeUartBitstream(bitString: string): UartDecodeResult {
  const cleanBits = bitString.replace(/[^01]/g, '').split('').map(Number);
  const decodedBytes: number[] = [];
  const framingErrors: string[] = [];
  const steps: string[] = [];

  let idx = 0;
  let byteIndex = 0;

  steps.push(`1. Ingested bitstream length: ${cleanBits.length} bits.`);

  while (idx < cleanBits.length) {
    // Search for START bit (0)
    if (cleanBits[idx] !== 0) {
      idx++;
      continue;
    }

    // Found start bit at idx
    const startIdx = idx;
    if (idx + 9 >= cleanBits.length) {
      framingErrors.push(`Truncated UART frame at bit offset ${startIdx}: expected 10 bits (Start + 8 Data + Stop), found ${cleanBits.length - startIdx}.`);
      break;
    }

    // Read 8 data bits (LSB first)
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      const bit = cleanBits[startIdx + 1 + b];
      byteVal |= (bit << b);
    }

    // Check stop bit at index + 9 (must be 1)
    const stopBit = cleanBits[startIdx + 9];
    if (stopBit !== 1) {
      framingErrors.push(`Framing Error on Byte #${byteIndex + 1}: Stop bit expected 1, found ${stopBit}.`);
    }

    decodedBytes.push(byteVal);
    const hex = '0x' + byteVal.toString(16).padStart(2, '0').toUpperCase();
    const char = byteVal >= 32 && byteVal <= 126 ? String.fromCharCode(byteVal) : '.';
    steps.push(`Frame #${byteIndex + 1} at bit ${startIdx}: Decoded ${hex} ('${char}') [Stop bit: ${stopBit === 1 ? 'OK' : 'FAIL'}].`);

    byteIndex++;
    idx += 10;
  }

  const decodedAscii = decodedBytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
  const decodedHex = decodedBytes.map((b) => '0x' + b.toString(16).padStart(2, '0').toUpperCase());

  return {
    success: framingErrors.length === 0 && decodedBytes.length > 0,
    rawBits: cleanBits,
    decodedBytes,
    decodedAscii,
    decodedHex,
    framingErrors,
    steps,
  };
}

/**
 * Self-check assertions for protocol waveforms and decoder
 */
export function runProtocolWaveformsSelfChecks(): boolean {
  try {
    // 1. UART test: byte 'A' (0x41 = 0b01000001)
    const uartRes = generateUartWaveforms([0x41]);
    console.assert(uartRes.signals.length === 2, 'Self-check failed: UART should generate 2 signal rows');
    console.assert(uartRes.annotations.some((a) => a.label === 'START'), 'Self-check failed: UART should have START annotation');

    // 2. SPI test: byte 0xAA
    const spiRes = generateSpiWaveforms([0xAA], { mode: 0, msbFirst: true });
    console.assert(spiRes.signals.length === 4, 'Self-check failed: SPI should generate CS, SCK, MOSI, and Bus rows');

    // 3. I2C test: address 0x3C, payload [0x00, 0xAF]
    const i2cRes = generateI2cWaveforms([0x00, 0xAF], { slaveAddress7Bit: 0x3C, isRead: false });
    console.assert(i2cRes.signals.length === 3, 'Self-check failed: I2C should generate SCL, SDA, and Bus rows');

    // 4. UART Decoder test: ASCII 'A' (0x41) = Start (0), bits 1,0,0,0,0,0,1,0, Stop (1) -> 0 10000010 1
    const decRes = decodeUartBitstream('0100000101');
    console.assert(decRes.success, 'Self-check failed: UART bitstream decoding should succeed');
    console.assert(decRes.decodedBytes[0] === 0x41, 'Self-check failed: Decoded byte should be 0x41');

    return true;
  } catch (err) {
    console.error('Protocol waveforms self-check error:', err);
    return false;
  }
}

runProtocolWaveformsSelfChecks();
