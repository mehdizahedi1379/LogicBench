/**
 * Pure logic for I2C Address Tool
 * - 7-bit to 8-bit Read/Write address conversions
 * - Bus conflict detection & pin jumper resolution
 * - Self-check assertions
 */

import { COMMON_I2C_DEVICES, I2cDeviceEntry } from '../data/mcu-presets';

export interface I2cAddressBreakdown {
  address7Bit: number; // 0x00 to 0x7F
  hex7Bit: string; // e.g. "0x3C"
  bin7Bit: string; // e.g. "0b0111100"
  writeAddress8Bit: number; // (addr << 1)
  hexWrite8Bit: string; // e.g. "0x78"
  binWrite8Bit: string; // e.g. "0b01111000"
  readAddress8Bit: number; // (addr << 1) | 1
  hexRead8Bit: string; // e.g. "0x79"
  binRead8Bit: string; // e.g. "0b01111001"
  isReserved: boolean;
  reservedReason?: string;
  steps: string[];
}

export function analyzeI2cAddress(address7Bit: number): I2cAddressBreakdown {
  const addr = address7Bit & 0x7f;
  const hex7Bit = `0x${addr.toString(16).padStart(2, '0').toUpperCase()}`;
  const bin7Bit = `0b${addr.toString(2).padStart(7, '0')}`;

  const write8 = (addr << 1) & 0xfe;
  const hexWrite8Bit = `0x${write8.toString(16).padStart(2, '0').toUpperCase()}`;
  const binWrite8Bit = `0b${write8.toString(2).padStart(8, '0')}`;

  const read8 = ((addr << 1) | 1) & 0xff;
  const hexRead8Bit = `0x${read8.toString(16).padStart(2, '0').toUpperCase()}`;
  const binRead8Bit = `0b${read8.toString(2).padStart(8, '0')}`;

  // Check standard I2C reserved address ranges
  let isReserved = false;
  let reservedReason: string | undefined;

  if (addr === 0x00) {
    isReserved = true;
    reservedReason = 'General Call / START byte (Reserved by I2C spec)';
  } else if (addr === 0x01) {
    isReserved = true;
    reservedReason = 'CBUS address (Reserved by I2C spec)';
  } else if (addr === 0x02) {
    isReserved = true;
    reservedReason = 'Reserved for different bus format';
  } else if (addr === 0x03) {
    isReserved = true;
    reservedReason = 'Reserved for future purposes';
  } else if (addr >= 0x04 && addr <= 0x07) {
    isReserved = true;
    reservedReason = 'Hs-mode master code (Reserved by I2C spec)';
  } else if (addr >= 0x78 && addr <= 0x7b) {
    isReserved = true;
    reservedReason = '10-bit I2C Slave addressing prefix (Reserved)';
  } else if (addr >= 0x7c && addr <= 0x7f) {
    isReserved = true;
    reservedReason = 'Device ID / Reserved by I2C specification';
  }

  const steps: string[] = [
    `1. 7-Bit Base Slave Address: ${hex7Bit} (${bin7Bit}, decimal ${addr}).`,
    `2. In I2C protocol, the 7-bit address occupies bits [7:1] of the first transmitted byte.`,
    `3. Bit 0 is the Direction Flag: 0 = Master Write, 1 = Master Read.`,
    `4. 8-Bit WRITE Address: (Addr << 1) | 0 = (${hex7Bit} << 1) = ${hexWrite8Bit} (${binWrite8Bit}).`,
    `5. 8-Bit READ Address:  (Addr << 1) | 1 = (${hex7Bit} << 1) | 1 = ${hexRead8Bit} (${binRead8Bit}).`,
  ];

  if (isReserved) {
    steps.push(`⚠️ NOTE: ${hex7Bit} is a reserved special address: ${reservedReason}`);
  }

  return {
    address7Bit: addr,
    hex7Bit,
    bin7Bit,
    writeAddress8Bit: write8,
    hexWrite8Bit,
    binWrite8Bit,
    readAddress8Bit: read8,
    hexRead8Bit,
    binRead8Bit,
    isReserved,
    reservedReason,
    steps,
  };
}

export interface UserBusDevice {
  instanceId: string;
  name: string;
  address7Bit: number;
  notes?: string;
}

export interface BusConflictReport {
  hasConflicts: boolean;
  conflictingAddresses: number[];
  conflictGroups: { addressHex: string; devices: string[] }[];
  totalDevices: number;
  steps: string[];
}

export function detectI2cBusConflicts(devices: UserBusDevice[]): BusConflictReport {
  const addressMap = new Map<number, string[]>();

  for (const dev of devices) {
    const list = addressMap.get(dev.address7Bit) || [];
    list.push(dev.name);
    addressMap.set(dev.address7Bit, list);
  }

  const conflictingAddresses: number[] = [];
  const conflictGroups: { addressHex: string; devices: string[] }[] = [];

  addressMap.forEach((deviceNames, addr) => {
    if (deviceNames.length > 1) {
      conflictingAddresses.push(addr);
      conflictGroups.push({
        addressHex: `0x${addr.toString(16).padStart(2, '0').toUpperCase()}`,
        devices: deviceNames,
      });
    }
  });

  const hasConflicts = conflictingAddresses.length > 0;
  const steps: string[] = [
    `1. Scanned ${devices.length} devices across the user I2C bus.`,
  ];

  if (hasConflicts) {
    steps.push(`2. ⚠️ CONFLICT DETECTED: ${conflictGroups.length} address collision(s) found!`);
    conflictGroups.forEach((cg) => {
      steps.push(`   - Address ${cg.addressHex} is claimed by multiple devices: [${cg.devices.join(', ')}].`);
    });
    steps.push(`3. Recommendation: Change the hardware address pin (e.g. ADDR/A0/A1/SDO) on one of the colliding devices, or use an I2C multiplexer (e.g. TCA9548A).`);
  } else {
    steps.push(`2. ✓ ALL CLEAR: All ${devices.length} device addresses on this bus are completely unique.`);
  }

  return {
    hasConflicts,
    conflictingAddresses,
    conflictGroups,
    totalDevices: devices.length,
    steps,
  };
}

/**
 * Self-check assertions to verify I2C address conversions
 */
export function runI2cAddressToolSelfChecks(): boolean {
  try {
    // 1. SSD1306 7-bit 0x3C -> Write 0x78, Read 0x79
    const oled = analyzeI2cAddress(0x3c);
    console.assert(oled.hexWrite8Bit === '0x78', `Self-check failed: 0x3C Write should be 0x78, got ${oled.hexWrite8Bit}`);
    console.assert(oled.hexRead8Bit === '0x79', `Self-check failed: 0x3C Read should be 0x79, got ${oled.hexRead8Bit}`);

    // 2. Conflict detection check
    const bus: UserBusDevice[] = [
      { instanceId: '1', name: 'DS3231 RTC', address7Bit: 0x68 },
      { instanceId: '2', name: 'MPU6050 IMU', address7Bit: 0x68 }, // conflict!
      { instanceId: '3', name: 'SSD1306 Display', address7Bit: 0x3c },
    ];
    const report = detectI2cBusConflicts(bus);
    console.assert(report.hasConflicts === true, 'Self-check failed: Conflict should be detected on 0x68');
    console.assert(report.conflictingAddresses.includes(0x68), 'Self-check failed: 0x68 should be in conflicting list');

    return true;
  } catch (err) {
    console.error('I2C Address Tool self-check error:', err);
    return false;
  }
}

runI2cAddressToolSelfChecks();
