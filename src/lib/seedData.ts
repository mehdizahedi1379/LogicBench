import { db, DBNote, DBChip, DBSnippet, DBProject } from './db';

export const INITIAL_SEED_NOTES: Omit<DBNote, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'note-oscilloscope-probes',
    title: 'Oscilloscope Probe Compensation & Ground Loop Avoidance',
    tags: ['measurement', 'analog', 'safety', 'hw-debug'],
    pinned: true,
    content: `# Oscilloscope Probe Compensation & Ground Loop Avoidance

When measuring high-speed digital signals (e.g. [[SPI and I2C Bus Helpers]] or [[UART Baud Rate Analysis]]), proper 10x probe compensation is mandatory to prevent parasitic high-frequency attenuation or overshoot.

## 1. 10x Probe Trimmer Adjustment
Connect probe tip to the 1 kHz 3.3V / 5V square-wave test point on the front panel:
- **Undercompensated**: Rounded rising edges, high frequencies attenuated ($RC > R_1 C_1$).
- **Overcompensated**: Sharp overshoot ringing spike, risk of false logic glitch detection.
- **Properly Compensated**: Flat-top square wave with sharp rise time (< 5ns).

## 2. Ground Loops & Mains Earth
Oscilloscope probe ground clips are internally connected directly to Mains Earth ground!
- **Rule 1**: Never connect ground clip to a non-isolated live rail.
- **Rule 2**: When debugging USB or mains-powered boards like [[ESP32-WROOM-32]] or [[STM32F401RE Development]], use a USB isolator or battery pack to eliminate ground loops.
- **Rule 3**: Keep ground lead as short as possible; use spring ground clips above 20 MHz to avoid LC ringing with the ~15pF probe input.

See also: [[I2C Bus Engineering & Pull-Up Sizing]] and [[ATmega328P Pinout & Clock Configuration]].`
  },
  {
    id: 'note-i2c-bus-engineering',
    title: 'I2C Bus Engineering & Pull-Up Sizing',
    tags: ['protocols', 'i2c', 'hardware-design'],
    pinned: true,
    content: `# I2C Bus Engineering & Pull-Up Sizing

The I2C bus utilizes open-drain drivers for both SDA and SCL. Rise time $t_r$ is determined strictly by the pull-up resistor $R_p$ and total bus capacitance $C_b$:

$$t_r = 0.8473 \\times R_p \\times C_b$$

## Specification Limits (NXP UM10204)
- **Standard Mode (100 kHz)**: Max rise time $t_r \\le 1000\\text{ ns}$, max bus capacitance $C_b = 400\\text{ pF}$.
- **Fast Mode (400 kHz)**: Max rise time $t_r \\le 300\\text{ ns}$, max bus capacitance $C_b = 400\\text{ pF}$.
- **Fast Mode Plus (1 MHz)**: Max rise time $t_r \\le 120\\text{ ns}$, max bus capacitance $C_b = 550\\text{ pF}$.

## Resistor Calculation
Minimum pull-up resistance (preventing excessive current through open-drain FET):
$$R_{p,\\min} = \\frac{V_{DD} - V_{OL,\\max}}{I_{OL}}$$
For 3.3V systems with $V_{OL} = 0.4\\text{V}$ and $I_{OL} = 3\\text{ mA}$:
$$R_{p,\\min} = \\frac{3.3 - 0.4}{0.003} = 966\\,\\Omega$$

Maximum pull-up resistance (ensuring rise time target):
$$R_{p,\\max} = \\frac{t_r}{0.8473 \\times C_b}$$

For typical 100 pF bus in Fast Mode (400 kHz):
$$R_{p,\\max} = \\frac{300\\text{ ns}}{0.8473 \\times 100\\text{ pF}} = 3540\\,\\Omega \\approx 3.3\\text{ k}\\Omega$$

Linked sensors: [[BME280 Environmental Sensor]] and [[SSD1306 OLED Display]].`
  },
  {
    id: 'note-atmega328p-architecture',
    title: 'ATmega328P Pinout & Clock Configuration',
    tags: ['microcontrollers', 'avr', 'embedded-c'],
    pinned: false,
    content: `# ATmega328P Pinout & Clock Configuration

The classic 8-bit AVR RISC microcontroller. 32 general-purpose 8-bit registers directly connected to the ALU.

## Key Hardware Subsystems
- **Core Clock**: 16 MHz external crystal or 8 MHz internal calibrated RC oscillator.
- **Timers**:
  - Timer0: 8-bit, 2 PWM channels (pins D5, D6).
  - Timer1: 16-bit, input capture, 2 PWM channels (pins D9, D10).
  - Timer2: 8-bit asynchronous with 32.768 kHz RTC support (pins D3, D11).
- **Serial**: USART0 (Rx PD0, Tx PD1), SPI (SCK PB5, MISO PB4, MOSI PB3), I2C (SDA PC4, SCL PC5).

## Fuse Bits Safety
- **High Fuse**: SPIEN, EESAVE, BOOTSZ.
- **Low Fuse**: CKSEL[3:0], SUT[1:0], CKDIV8. Always beware disabling CKSEL or RSTDISBL to avoid bricking.

Refer to: [[Oscilloscope Probe Compensation & Ground Loop Avoidance]] and [[74HC595 Shift Register Expansion]].`
  },
  {
    id: 'note-74hc595-shift-register',
    title: '74HC595 Shift Register Expansion',
    tags: ['logic-ic', '74xx', 'interfacing'],
    pinned: false,
    content: `# 74HC595 Shift Register Expansion

The 74HC595 consists of an 8-bit serial-in, parallel-out shift register that feeds an 8-bit D-type storage register with 3-state outputs.

## Pinout & Control Lines
- **SER (DS, Pin 14)**: Serial data input.
- **SRCLK (SH_CP, Pin 11)**: Shift register clock. Latches SER on rising edge.
- **RCLK (ST_CP, Pin 12)**: Storage register clock (latch). Updates outputs on rising edge.
- **OE (Pin 13)**: Active-low output enable. Tie to GND for continuous output.
- **SRCLR (MR, Pin 10)**: Active-low master reset. Tie to VCC for normal operation.

## Cascading Multiple 74HC595s
Connect **Q7S (Pin 9)** of the first shift register to **SER (Pin 14)** of the next. Tie all SRCLK and RCLK pins in parallel.

Related note: [[ATmega328P Pinout & Clock Configuration]].`
  }
];

export const INITIAL_SEED_CHIPS: Omit<DBChip, 'updatedAt'>[] = [
  {
    id: 'chip-atmega328p',
    partNumber: 'ATmega328P-PU',
    manufacturer: 'Microchip / Atmel',
    architecture: '8-bit AVR RISC',
    category: 'mcu',
    pinCount: 28,
    description: 'High performance, low-power 8-bit AVR RISC microcontroller used in Arduino Uno.',
    keySpecs: '20 MHz, 32KB Flash, 2KB SRAM, 1KB EEPROM, 23 GPIOs, 6-ch 10-bit ADC, 6 PWM channels, SPI, I2C, USART',
    pinoutNotes: 'DIP-28: Pin 1 PC6(RESET), Pin 7 VCC, Pin 8 GND, Pin 9-10 XTAL1/2, Pin 14 PB0, Pin 19 PB5(SCK), Pin 27 PC4(SDA), Pin 28 PC5(SCL)',
    datasheetUrl: 'https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf',
    stockQuantity: 12,
    voltageMin: 1.8,
    voltageMax: 5.5
  },
  {
    id: 'chip-stm32f401re',
    partNumber: 'STM32F401RET6',
    manufacturer: 'STMicroelectronics',
    architecture: 'ARM Cortex-M4',
    category: 'mcu',
    pinCount: 64,
    description: 'Entry-level ARM Cortex-M4 with FPU, high performance running up to 84 MHz.',
    keySpecs: '84 MHz Cortex-M4F, 512KB Flash, 96KB SRAM, 50 GPIOs, 1x 12-bit ADC (16 ch, 2.4 MSPS), 3x SPI, 3x I2C, 3x USART, USB 2.0 OTG FS',
    pinoutNotes: 'LQFP-64: SWD on PA13/PA14, USART2 on PA2/PA3 (ST-Link VCP), I2C1 on PB8/PB9, SPI1 on PA5/PA6/PA7',
    datasheetUrl: 'https://www.st.com/resource/en/datasheet/stm32f401re.pdf',
    stockQuantity: 5,
    voltageMin: 1.7,
    voltageMax: 3.6
  },
  {
    id: 'chip-esp32-wroom',
    partNumber: 'ESP32-WROOM-32D',
    manufacturer: 'Espressif Systems',
    architecture: 'Xtensa Dual-Core 32-bit LX6',
    category: 'mcu',
    pinCount: 38,
    description: 'Powerful generic Wi-Fi + Bluetooth + BLE MCU module for IoT applications.',
    keySpecs: '240 MHz Dual Core, 520KB SRAM, 4MB SPI Flash, Wi-Fi 802.11 b/g/n, BT 4.2 BR/EDR/BLE, 12-bit ADC, capacitive touch sensors',
    pinoutNotes: 'Module SMD: GPIO0 (boot strap, pull high), EN (reset with 10k pullup + 1uF cap), GPIO1/3 (UART0), GPIO21 (SDA), GPIO22 (SCL)',
    datasheetUrl: 'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32d_esp32-wroom-32u_datasheet_en.pdf',
    stockQuantity: 8,
    voltageMin: 3.0,
    voltageMax: 3.6
  },
  {
    id: 'chip-rp2040',
    partNumber: 'RP2040',
    manufacturer: 'Raspberry Pi Foundation',
    architecture: 'Dual ARM Cortex-M0+',
    category: 'mcu',
    pinCount: 56,
    description: 'Dual Cortex-M0+ microcontroller with unique Programmable I/O (PIO) state machines.',
    keySpecs: '133 MHz Dual Cortex-M0+, 264KB on-chip SRAM in 6 banks, 8 PIO state machines, 30 GPIOs, 2x UART, 2x SPI, 2x I2C, 4-ch 12-bit ADC',
    pinoutNotes: 'QFN-56: SWD pins on dedicated debug header, QSPI flash interface pins (QSPI_SD0..3, SCLK, CS), internal buck converter requires external 3.3uH inductor',
    datasheetUrl: 'https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf',
    stockQuantity: 15,
    voltageMin: 1.8,
    voltageMax: 3.3
  },
  {
    id: 'chip-74hc595',
    partNumber: 'SN74HC595N',
    manufacturer: 'Texas Instruments',
    architecture: '74xx High-Speed CMOS',
    category: 'logic_ic',
    pinCount: 16,
    description: '8-bit serial-in, parallel-out shift register with storage register and 3-state outputs.',
    keySpecs: 'Operating clock up to 35 MHz (at 4.5V), 8-bit parallel latch, 35mA source/sink per pin, 70mA total current capability',
    pinoutNotes: 'DIP-16: Pin 1-7 QA-QG, Pin 8 GND, Pin 9 QH\', Pin 10 /SRCLR, Pin 11 SRCLK, Pin 12 RCLK, Pin 13 /OE, Pin 14 SER, Pin 15 QA, Pin 16 VCC',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/sn74hc595.pdf',
    stockQuantity: 24,
    voltageMin: 2.0,
    voltageMax: 6.0
  },
  {
    id: 'chip-bme280',
    partNumber: 'BME280',
    manufacturer: 'Bosch Sensortec',
    architecture: 'MEMS Sensor',
    category: 'sensor',
    pinCount: 8,
    description: 'Combined digital humidity, pressure, and temperature sensor in compact LGA package.',
    keySpecs: 'I2C (up to 3.4MHz) and SPI (up to 10MHz). Humidity 0-100% (±3%), Pressure 300-1100 hPa (±1 hPa), Temp -40 to +85°C (±0.5°C)',
    pinoutNotes: 'LGA-8: Pin 1 GND, Pin 2 CSB (pull high for I2C), Pin 3 SDI (SDA), Pin 4 SCK (SCL), Pin 5 SDO (I2C addr select: GND=0x76, VDDIO=0x77), Pin 6 VDDIO, Pin 7 GND, Pin 8 VDD',
    datasheetUrl: 'https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf',
    stockQuantity: 6,
    voltageMin: 1.71,
    voltageMax: 3.6
  },
  {
    id: 'chip-ne555',
    partNumber: 'NE555P',
    manufacturer: 'Texas Instruments',
    architecture: 'Precision Timer',
    category: 'analog',
    pinCount: 8,
    description: 'Industry-standard precision timer capable of producing accurate time delays or oscillation.',
    keySpecs: 'Timing from microseconds through hours. Astable and monostable modes. Output can source or sink up to 200 mA.',
    pinoutNotes: 'DIP-8: Pin 1 GND, Pin 2 Trigger, Pin 3 Output, Pin 4 Reset, Pin 5 Control Voltage (0.01uF to GND), Pin 6 Threshold, Pin 7 Discharge, Pin 8 VCC',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/ne555.pdf',
    stockQuantity: 30,
    voltageMin: 4.5,
    voltageMax: 16.0
  },
  {
    id: 'chip-lm358',
    partNumber: 'LM358N',
    manufacturer: 'Texas Instruments / ON Semi',
    architecture: 'Dual Op-Amp',
    category: 'analog',
    pinCount: 8,
    description: 'Dual low-power operational amplifier designed to operate from a single supply over a wide range of voltages.',
    keySpecs: '1 MHz Gain Bandwidth, Single supply 3V-32V, Low input bias current 45 nA, Ground-sensing input range',
    pinoutNotes: 'DIP-8: Pin 1 OUT1, Pin 2 IN1-, Pin 3 IN1+, Pin 4 GND, Pin 5 IN2+, Pin 6 IN2-, Pin 7 OUT2, Pin 8 VCC',
    datasheetUrl: 'https://www.ti.com/lit/ds/symlink/lm358.pdf',
    stockQuantity: 18,
    voltageMin: 3.0,
    voltageMax: 32.0
  }
];

export const INITIAL_SEED_SNIPPETS: Omit<DBSnippet, 'updatedAt'>[] = [
  {
    id: 'snip-c-bitfields',
    title: 'Embedded C Safe Bit Manipulation Macros',
    language: 'c',
    category: 'registers',
    description: 'Fast, type-safe bit set, clear, toggle, and read-modify-write macros for bare-metal registers.',
    tags: ['c', 'registers', 'embedded', 'macros'],
    linkedNoteId: 'note-atmega328p-architecture',
    code: `/* Embedded C Safe Bit Manipulation Macros */
#ifndef BIT_MANIP_H
#define BIT_MANIP_H

#define BIT(x)                 (1UL << (x))
#define SET_BIT(reg, bit)      ((reg) |= BIT(bit))
#define CLEAR_BIT(reg, bit)    ((reg) &= ~BIT(bit))
#define TOGGLE_BIT(reg, bit)   ((reg) ^= BIT(bit))
#define READ_BIT(reg, bit)     (((reg) >> (bit)) & 1UL)

/* Field mask & shift operations */
#define MASK_FIELD(mask, shift, val) (((val) & (mask)) << (shift))
#define GET_FIELD(reg, mask, shift)  (((reg) >> (shift)) & (mask))
#define MODIFY_FIELD(reg, mask, shift, val) \\
    ((reg) = ((reg) & ~((mask) << (shift))) | (((val) & (mask)) << (shift)))

#endif /* BIT_MANIP_H */`
  },
  {
    id: 'snip-ring-buffer',
    title: 'Lock-Free Circular Ring Buffer (Single Producer Single Consumer)',
    language: 'c',
    category: 'algorithms',
    description: 'Efficient power-of-two FIFO ring buffer commonly used in UART and DMA ISRs.',
    tags: ['c', 'uart', 'dma', 'data-structures'],
    linkedNoteId: 'note-atmega328p-architecture',
    code: `#include <stdint.h>
#include <stdbool.h>

#define RING_BUF_SIZE 64 /* Must be power of 2 */
#define RING_BUF_MASK (RING_BUF_SIZE - 1)

typedef struct {
    uint8_t buffer[RING_BUF_SIZE];
    volatile uint16_t head;
    volatile uint16_t tail;
} RingBuffer;

void ring_buf_init(RingBuffer *rb) {
    rb->head = 0;
    rb->tail = 0;
}

bool ring_buf_push(RingBuffer *rb, uint8_t byte) {
    uint16_t next = (rb->head + 1) & RING_BUF_MASK;
    if (next == rb->tail) return false; /* Buffer Full */
    rb->buffer[rb->head] = byte;
    rb->head = next;
    return true;
}

bool ring_buf_pop(RingBuffer *rb, uint8_t *byte) {
    if (rb->head == rb->tail) return false; /* Buffer Empty */
    *byte = rb->buffer[rb->tail];
    rb->tail = (rb->tail + 1) & RING_BUF_MASK;
    return true;
}`
  },
  {
    id: 'snip-micropython-i2c',
    title: 'MicroPython I2C Bus Scanner & Device Prober',
    language: 'python',
    category: 'protocols',
    description: 'Interactive I2C bus scan utility with hexadecimal reporting for RP2040 and ESP32.',
    tags: ['python', 'micropython', 'i2c', 'rp2040', 'esp32'],
    linkedNoteId: 'note-i2c-bus-engineering',
    code: `from machine import Pin, I2C
import time

def scan_i2c(scl_pin=22, sda_pin=21, freq=100000):
    i2c = I2C(0, scl=Pin(scl_pin), sda=Pin(sda_pin), freq=freq)
    print(f"Scanning I2C bus (SCL={scl_pin}, SDA={sda_pin}) at {freq/1000} kHz...")
    devices = i2c.scan()
    if not devices:
        print("No I2C devices acknowledged (check pull-up resistors and VDD)!")
    else:
        print(f"Found {len(devices)} device(s):")
        for addr in devices:
            print(f" - 7-bit Addr: 0x{addr:02X} (8-bit Write: 0x{(addr << 1):02X})")
    return devices

# Run scan
scan_i2c()`
  },
  {
    id: 'snip-verilog-dff',
    title: 'Verilog Parameterized D-Flip-Flop with Sync Reset',
    language: 'verilog',
    category: 'digital-design',
    description: 'Synthesis-ready synchronous D-flip-flop register with clock enable and active-high reset.',
    tags: ['verilog', 'fpga', 'sequential', 'flip-flop'],
    linkedNoteId: 'note-oscilloscope-probes',
    code: `module dff_sync_reset #(
    parameter WIDTH = 8
)(
    input  wire             clk,
    input  wire             rst,  // Synchronous reset
    input  wire             en,   // Clock enable
    input  wire [WIDTH-1:0] d,
    output reg  [WIDTH-1:0] q
);

    always @(posedge clk) begin
        if (rst) begin
            q <= {WIDTH{1'b0}};
        end else if (en) begin
            q <= d;
        end
    end

endmodule`
  }
];

export const INITIAL_SEED_PROJECT: DBProject = {
  id: 'proj-env-monitor',
  title: 'Smart Environmental Node (ESP32 + BME280 + OLED)',
  description: 'Battery-backed environmental monitoring station with low-power deep sleep and I2C telemetry.',
  goals: `1. Sample BME280 temperature, humidity, and barometric pressure every 60 seconds.
2. Render readings to 0.96" SSD1306 OLED display for 5 seconds on wake.
3. Transmit telemetry via ESP-NOW / MQTT.
4. Enter deep-sleep mode (< 20 uA target) between sampling intervals.`,
  targetMcu: 'ESP32-WROOM-32D',
  pinMap: {
    'GPIO21': 'I2C_SDA (BME280 + OLED)',
    'GPIO22': 'I2C_SCL (BME280 + OLED)',
    'GPIO34': 'ADC1_CH6 (Battery Voltage Divider)',
    'GPIO0': 'BOOT / User Push Button',
    'GPIO2': 'Status LED Indicator'
  },
  bom: [
    {
      id: 'bom-1',
      designator: 'U1',
      partNumber: 'ESP32-WROOM-32D',
      description: 'Dual-core Wi-Fi & BLE MCU module',
      quantity: 1,
      unitCost: 3.50,
      supplierUrl: 'https://www.digikey.com',
      notes: 'Main processor'
    },
    {
      id: 'bom-2',
      designator: 'U2',
      partNumber: 'BME280',
      description: 'Digital temp / humidity / barometric sensor breakout',
      quantity: 1,
      unitCost: 4.20,
      supplierUrl: 'https://www.adafruit.com',
      notes: 'I2C address 0x76'
    },
    {
      id: 'bom-3',
      designator: 'DISP1',
      partNumber: 'SSD1306-128x64-I2C',
      description: '0.96 inch monochrome OLED display',
      quantity: 1,
      unitCost: 2.80,
      supplierUrl: 'https://www.sparkfun.com',
      notes: 'I2C address 0x3C'
    },
    {
      id: 'bom-4',
      designator: 'R1, R2',
      partNumber: 'RC0603FR-074K7L',
      description: '4.7k Ohm 1% 0603 SMD Resistors',
      quantity: 2,
      unitCost: 0.05,
      supplierUrl: 'https://www.mouser.com',
      notes: 'I2C Bus Pull-Up resistors'
    },
    {
      id: 'bom-5',
      designator: 'C1, C2',
      partNumber: 'GRM188R61A106KE69D',
      description: '10uF 10V X5R 0603 Decoupling Capacitors',
      quantity: 2,
      unitCost: 0.12,
      supplierUrl: 'https://www.digikey.com',
      notes: 'Power rail decoupling'
    }
  ],
  checklist: [
    { id: 'chk-1', label: 'Measure 3.3V rail impedance before connecting battery', completed: true },
    { id: 'chk-2', label: 'Verify I2C bus pull-ups with oscilloscope (target rise time < 300ns)', completed: true },
    { id: 'chk-3', label: 'Probe BME280 acknowledge on address 0x76 with protocol analyzer', completed: false },
    { id: 'chk-4', label: 'Calibrate ADC battery voltage divider factor in firmware', completed: false },
    { id: 'chk-5', label: 'Measure deep sleep quiescent current with multimeter (< 25 uA)', completed: false }
  ],
  linkedNoteIds: ['note-i2c-bus-engineering', 'note-oscilloscope-probes'],
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now()
};

/**
 * Ensures default seed data exists in the IndexedDB stores if empty
 */
export async function seedDefaultsIfEmpty(): Promise<void> {
  try {
    const noteCount = await db.count('notes');
    if (noteCount === 0) {
      const now = Date.now();
      for (const note of INITIAL_SEED_NOTES) {
        await db.put('notes', {
          ...note,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const chipCount = await db.count('chips');
    if (chipCount === 0) {
      const now = Date.now();
      for (const chip of INITIAL_SEED_CHIPS) {
        await db.put('chips', {
          ...chip,
          updatedAt: now,
        });
      }
    }

    const snippetCount = await db.count('snippets');
    if (snippetCount === 0) {
      const now = Date.now();
      for (const snip of INITIAL_SEED_SNIPPETS) {
        await db.put('snippets', {
          ...snip,
          updatedAt: now,
        });
      }
    }

    const projectCount = await db.count('projects');
    if (projectCount === 0) {
      await db.put('projects', INITIAL_SEED_PROJECT);
    }
  } catch (err) {
    console.error('Failed to seed default database records:', err);
  }
}
