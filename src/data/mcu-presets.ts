/**
 * Extensible MCU Presets & Common I2C Devices Database
 * IMPORTANT: All hardware presets are engineering reference baselines.
 * Always verify against the specific manufacturer datasheet and errata sheet.
 */

export interface McuTimerConfig {
  name: string;
  bitResolution: 8 | 16 | 24 | 32;
  allowedPrescalers: number[]; // e.g. [1, 8, 64, 256, 1024] or [1..65536]
  isContinuousPrescaler?: boolean; // if true, prescaler can be any integer from min to max
  minPrescaler?: number;
  maxPrescaler?: number;
  isFractionalPrescaler?: boolean; // e.g. RP2040 8.4-bit fractional prescaler
  topRegisterName: string; // e.g. ARR, ICR1, PR2, TOP
  compareRegisterName: string; // e.g. CCRx, OCR1A, CCPRx
}

export interface McuPinInfo {
  pin: number | string; // Pin number or identifier (e.g. "PA0", "GPIO2", "PB1")
  label: string;
  supportedFunctions: Array<'GPIO_IN' | 'GPIO_OUT' | 'ADC' | 'PWM' | 'UART_TX' | 'UART_RX' | 'SPI_SCK' | 'SPI_MOSI' | 'SPI_MISO' | 'SPI_CS' | 'I2C_SDA' | 'I2C_SCL' | 'RESET' | 'POWER' | 'GROUND'>;
  isInputOnly?: boolean;
  notes?: string;
}

export interface McuPreset {
  id: string;
  name: string;
  manufacturer: string;
  architecture: string;
  defaultClockHz: number;
  allowedClockPresets: number[];
  datasheetNotice: string;
  timers: McuTimerConfig[];
  pins: McuPinInfo[];
}

export const MCU_PRESETS: McuPreset[] = [
  {
    id: 'atmega328p',
    name: 'Microchip AVR ATmega328P (Arduino Uno)',
    manufacturer: 'Microchip / Atmel',
    architecture: '8-bit AVR RISC',
    defaultClockHz: 16000000,
    allowedClockPresets: [8000000, 12000000, 16000000, 20000000],
    datasheetNotice: 'Verify against ATmega328P Datasheet DS40002061B (Timer1 / Timer2 chapters).',
    timers: [
      {
        name: 'Timer1 (16-bit High-Res PWM)',
        bitResolution: 16,
        allowedPrescalers: [1, 8, 64, 256, 1024],
        topRegisterName: 'ICR1 / OCR1A',
        compareRegisterName: 'OCR1A / OCR1B',
      },
      {
        name: 'Timer0 (8-bit Millis/PWM)',
        bitResolution: 8,
        allowedPrescalers: [1, 8, 64, 256, 1024],
        topRegisterName: 'OCR0A / 0xFF',
        compareRegisterName: 'OCR0A / OCR0B',
      },
      {
        name: 'Timer2 (8-bit Asynchronous/PWM)',
        bitResolution: 8,
        allowedPrescalers: [1, 8, 32, 64, 128, 256, 1024],
        topRegisterName: 'OCR2A / 0xFF',
        compareRegisterName: 'OCR2A / OCR2B',
      },
    ],
    pins: [
      { pin: 'PD0', label: 'D0 / RX', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'UART_RX'] },
      { pin: 'PD1', label: 'D1 / TX', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'UART_TX'] },
      { pin: 'PD2', label: 'D2 / INT0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT'] },
      { pin: 'PD3', label: 'D3 / PWM', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM'] },
      { pin: 'PD4', label: 'D4', supportedFunctions: ['GPIO_IN', 'GPIO_OUT'] },
      { pin: 'PD5', label: 'D5 / PWM', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM'] },
      { pin: 'PD6', label: 'D6 / PWM', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM'] },
      { pin: 'PD7', label: 'D7', supportedFunctions: ['GPIO_IN', 'GPIO_OUT'] },
      { pin: 'PB0', label: 'D8', supportedFunctions: ['GPIO_IN', 'GPIO_OUT'] },
      { pin: 'PB1', label: 'D9 / PWM', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM'] },
      { pin: 'PB2', label: 'D10 / PWM / CS', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_CS'] },
      { pin: 'PB3', label: 'D11 / PWM / MOSI', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_MOSI'] },
      { pin: 'PB4', label: 'D12 / MISO', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'SPI_MISO'] },
      { pin: 'PB5', label: 'D13 / SCK / LED', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'SPI_SCK'] },
      { pin: 'PC0', label: 'A0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC'] },
      { pin: 'PC1', label: 'A1', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC'] },
      { pin: 'PC2', label: 'A2', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC'] },
      { pin: 'PC3', label: 'A3', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC'] },
      { pin: 'PC4', label: 'A4 / SDA', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'I2C_SDA'] },
      { pin: 'PC5', label: 'A5 / SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'I2C_SCL'] },
    ],
  },
  {
    id: 'stm32f4',
    name: 'STMicroelectronics STM32F4 (ARM Cortex-M4)',
    manufacturer: 'STMicroelectronics',
    architecture: '32-bit ARM Cortex-M4F',
    defaultClockHz: 84000000,
    allowedClockPresets: [16000000, 48000000, 84000000, 100000000, 168000000],
    datasheetNotice: 'Verify against STM32F401/411 Reference Manual RM0368 / RM0383.',
    timers: [
      {
        name: 'TIM2 / TIM5 (32-bit General Purpose)',
        bitResolution: 32,
        allowedPrescalers: [],
        isContinuousPrescaler: true,
        minPrescaler: 1,
        maxPrescaler: 65536,
        topRegisterName: 'TIMx_ARR (32-bit)',
        compareRegisterName: 'TIMx_CCRx',
      },
      {
        name: 'TIM1 (16-bit Advanced Control PWM)',
        bitResolution: 16,
        allowedPrescalers: [],
        isContinuousPrescaler: true,
        minPrescaler: 1,
        maxPrescaler: 65536,
        topRegisterName: 'TIM1_ARR (16-bit)',
        compareRegisterName: 'TIM1_CCRx',
      },
      {
        name: 'TIM3 / TIM4 (16-bit General Purpose)',
        bitResolution: 16,
        allowedPrescalers: [],
        isContinuousPrescaler: true,
        minPrescaler: 1,
        maxPrescaler: 65536,
        topRegisterName: 'TIMx_ARR (16-bit)',
        compareRegisterName: 'TIMx_CCRx',
      },
    ],
    pins: [
      { pin: 'PA0', label: 'PA0 / WKUP / TIM2_CH1', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM', 'UART_TX'] },
      { pin: 'PA1', label: 'PA1 / TIM2_CH2', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM', 'UART_RX'] },
      { pin: 'PA2', label: 'PA2 / USART2_TX', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM', 'UART_TX'] },
      { pin: 'PA3', label: 'PA3 / USART2_RX', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM', 'UART_RX'] },
      { pin: 'PA4', label: 'PA4 / SPI1_NSS', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'SPI_CS'] },
      { pin: 'PA5', label: 'PA5 / SPI1_SCK', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'SPI_SCK'] },
      { pin: 'PA6', label: 'PA6 / SPI1_MISO', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM', 'SPI_MISO'] },
      { pin: 'PA7', label: 'PA7 / SPI1_MOSI', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM', 'SPI_MOSI'] },
      { pin: 'PB6', label: 'PB6 / I2C1_SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'I2C_SCL'] },
      { pin: 'PB7', label: 'PB7 / I2C1_SDA', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'I2C_SDA'] },
      { pin: 'PB8', label: 'PB8 / I2C1_SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'I2C_SCL'] },
      { pin: 'PB9', label: 'PB9 / I2C1_SDA', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'I2C_SDA'] },
      { pin: 'PB10', label: 'PB10 / I2C2_SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'I2C_SCL'] },
    ],
  },
  {
    id: 'rp2040',
    name: 'Raspberry Pi RP2040 (Pico)',
    manufacturer: 'Raspberry Pi',
    architecture: 'Dual-core ARM Cortex-M0+',
    defaultClockHz: 125000000,
    allowedClockPresets: [48000000, 125000000, 133000000, 250000000],
    datasheetNotice: 'Verify against RP2040 Datasheet Chapter 4.5 (PWM Slices).',
    timers: [
      {
        name: 'PWM Slice (16-bit Counter with 8.4 Fractional Divider)',
        bitResolution: 16,
        allowedPrescalers: [],
        isContinuousPrescaler: true,
        isFractionalPrescaler: true,
        minPrescaler: 1,
        maxPrescaler: 255,
        topRegisterName: 'PWM_TOP (16-bit)',
        compareRegisterName: 'PWM_CC_A / PWM_CC_B',
      },
    ],
    pins: [
      { pin: 'GP0', label: 'GP0 / UART0_TX / I2C0_SDA', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'UART_TX', 'I2C_SDA'] },
      { pin: 'GP1', label: 'GP1 / UART0_RX / I2C0_SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'UART_RX', 'I2C_SCL'] },
      { pin: 'GP2', label: 'GP2 / SPI0_SCK', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_SCK'] },
      { pin: 'GP3', label: 'GP3 / SPI0_TX (MOSI)', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_MOSI'] },
      { pin: 'GP4', label: 'GP4 / SPI0_RX (MISO)', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_MISO'] },
      { pin: 'GP5', label: 'GP5 / SPI0_CS', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_CS'] },
      { pin: 'GP26', label: 'GP26 / ADC0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'ADC'] },
      { pin: 'GP27', label: 'GP27 / ADC1', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'ADC'] },
      { pin: 'GP28', label: 'GP28 / ADC2', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'ADC'] },
    ],
  },
  {
    id: 'esp32',
    name: 'Espressif ESP32 (WROOM / NodeMCU)',
    manufacturer: 'Espressif Systems',
    architecture: 'Dual-Core Xtensa LX6',
    defaultClockHz: 80000000, // APB clock for timers
    allowedClockPresets: [40000000, 80000000, 160000000, 240000000],
    datasheetNotice: 'Verify against ESP32 Technical Reference Manual (LEDC and General Purpose Timer chapters). Note GPIO34-39 are input only!',
    timers: [
      {
        name: 'LEDC PWM Timer (1..20 bit Configurable)',
        bitResolution: 16,
        allowedPrescalers: [],
        isContinuousPrescaler: true,
        minPrescaler: 1,
        maxPrescaler: 1024,
        topRegisterName: '2^duty_resolution',
        compareRegisterName: 'LEDC_DUTY',
      },
      {
        name: 'Hardware Timer Group (64-bit with 16-bit Prescaler)',
        bitResolution: 32,
        allowedPrescalers: [],
        isContinuousPrescaler: true,
        minPrescaler: 2,
        maxPrescaler: 65536,
        topRegisterName: 'TIMERGn_T0ALARM',
        compareRegisterName: 'TIMERGn_T0AUTORELOAD',
      },
    ],
    pins: [
      { pin: 'GPIO1', label: 'TXD0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'UART_TX'] },
      { pin: 'GPIO3', label: 'RXD0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'UART_RX'] },
      { pin: 'GPIO2', label: 'GPIO2 / Strapping / LED', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'ADC'] },
      { pin: 'GPIO4', label: 'GPIO4 / ADC2_CH0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'ADC'] },
      { pin: 'GPIO21', label: 'GPIO21 / I2C_SDA', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'I2C_SDA'] },
      { pin: 'GPIO22', label: 'GPIO22 / I2C_SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'I2C_SCL'] },
      { pin: 'GPIO18', label: 'GPIO18 / VSPI_SCK', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_SCK'] },
      { pin: 'GPIO19', label: 'GPIO19 / VSPI_MISO', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_MISO'] },
      { pin: 'GPIO23', label: 'GPIO23 / VSPI_MOSI', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_MOSI'] },
      { pin: 'GPIO5', label: 'GPIO5 / VSPI_CS', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM', 'SPI_CS'] },
      { pin: 'GPIO34', label: 'GPIO34 (Input-only!)', supportedFunctions: ['GPIO_IN', 'ADC'], isInputOnly: true, notes: 'Input only. No internal pull-up/down.' },
      { pin: 'GPIO35', label: 'GPIO35 (Input-only!)', supportedFunctions: ['GPIO_IN', 'ADC'], isInputOnly: true, notes: 'Input only. No internal pull-up/down.' },
    ],
  },
  {
    id: 'pic18f',
    name: 'Microchip PIC18F / PIC16F',
    manufacturer: 'Microchip Technology',
    architecture: '8-bit PIC Architecture',
    defaultClockHz: 16000000,
    allowedClockPresets: [4000000, 8000000, 16000000, 32000000, 64000000],
    datasheetNotice: 'F_OSC/4 instruction cycle. Verify against PIC18F25K80 / PIC16F1825 Datasheets.',
    timers: [
      {
        name: 'Timer2 / CCP PWM (8-bit Period PR2)',
        bitResolution: 8,
        allowedPrescalers: [1, 4, 16, 64],
        topRegisterName: 'PR2 (8-bit)',
        compareRegisterName: 'CCPRxL',
      },
      {
        name: 'Timer1 (16-bit Counter)',
        bitResolution: 16,
        allowedPrescalers: [1, 2, 4, 8],
        topRegisterName: '0xFFFF',
        compareRegisterName: 'CCPRx',
      },
    ],
    pins: [
      { pin: 'RA0', label: 'RA0 / AN0', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC'] },
      { pin: 'RA1', label: 'RA1 / AN1', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'ADC'] },
      { pin: 'RC1', label: 'RC1 / CCP2 / PWM', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM'] },
      { pin: 'RC2', label: 'RC2 / CCP1 / PWM', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'PWM'] },
      { pin: 'RC3', label: 'RC3 / SCK / SCL', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'SPI_SCK', 'I2C_SCL'] },
      { pin: 'RC4', label: 'RC4 / SDI / SDA', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'SPI_MISO', 'I2C_SDA'] },
      { pin: 'RC5', label: 'RC5 / SDO', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'SPI_MOSI'] },
      { pin: 'RC6', label: 'RC6 / TX', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'UART_TX'] },
      { pin: 'RC7', label: 'RC7 / RX', supportedFunctions: ['GPIO_IN', 'GPIO_OUT', 'UART_RX'] },
    ],
  },
];

export interface I2cDeviceEntry {
  address7Bit: number; // e.g. 0x68
  name: string;
  category: 'RTC' | 'Sensor' | 'Display' | 'EEPROM' | 'ADC' | 'Expander' | 'Power' | 'Driver';
  description: string;
  addressPins?: string; // e.g. "A0, A1, A2 (0x50 - 0x57)"
  typicalVoltage: string; // e.g. "3.3V - 5.0V"
}

export const COMMON_I2C_DEVICES: I2cDeviceEntry[] = [
  { address7Bit: 0x3c, name: 'SSD1306 / SH1106 OLED Display', category: 'Display', description: '128x64 or 128x32 Monochrome OLED driver', addressPins: 'D/C pin selects 0x3C or 0x3D', typicalVoltage: '3.3V - 5.0V' },
  { address7Bit: 0x3d, name: 'SSD1306 (Alt Address)', category: 'Display', description: 'Secondary OLED display address', addressPins: 'D/C pin high', typicalVoltage: '3.3V - 5.0V' },
  { address7Bit: 0x68, name: 'DS3231 / DS1307 RTC & MPU6050 IMU', category: 'RTC', description: 'Extremely accurate TCXO RTC (or MPU6050 6-DOF IMU)', addressPins: 'Fixed 0x68 (MPU6050 AD0=LOW)', typicalVoltage: '3.3V - 5.0V' },
  { address7Bit: 0x69, name: 'MPU6050 / MPU9250 IMU (Alt)', category: 'Sensor', description: 'Accelerometer & Gyroscope secondary address', addressPins: 'AD0 pin HIGH', typicalVoltage: '3.3V' },
  { address7Bit: 0x76, name: 'BMP280 / BME280 Environmental Sensor', category: 'Sensor', description: 'Barometric pressure, temperature & humidity', addressPins: 'SDO pin to GND', typicalVoltage: '1.8V - 3.3V' },
  { address7Bit: 0x77, name: 'BMP280 / BME280 (Alt Address)', category: 'Sensor', description: 'Barometric pressure, temperature & humidity', addressPins: 'SDO pin to VDD', typicalVoltage: '1.8V - 3.3V' },
  { address7Bit: 0x50, name: 'AT24C32 / AT24C256 I2C EEPROM', category: 'EEPROM', description: 'Non-volatile I2C memory (32kb - 256kb)', addressPins: 'A0, A1, A2 pins set 0x50..0x57', typicalVoltage: '1.8V - 5.5V' },
  { address7Bit: 0x48, name: 'ADS1115 16-Bit ADC / TMP102 Sensor', category: 'ADC', description: 'Precision 4-channel 16-bit analog-to-digital converter', addressPins: 'ADDR pin to GND, VDD, SDA, SCL (0x48..0x4B)', typicalVoltage: '2.0V - 5.5V' },
  { address7Bit: 0x20, name: 'PCF8574 8-Bit I/O Port Expander', category: 'Expander', description: 'GPIO extender, commonly used on HD44780 LCD backpack', addressPins: 'A0..A2 select 0x20..0x27', typicalVoltage: '2.5V - 6.0V' },
  { address7Bit: 0x27, name: 'PCF8574T I2C LCD Backpack', category: 'Expander', description: 'Standard address for 16x2 / 20x4 LCD I2C adapters', addressPins: 'A0..A2 all pulled high', typicalVoltage: '5.0V' },
  { address7Bit: 0x40, name: 'INA219 High-Side DC Current Sensor', category: 'Power', description: 'Bidirectional voltage, current and power monitor', addressPins: 'A0, A1 select 0x40..0x4F', typicalVoltage: '3.0V - 5.5V' },
  { address7Bit: 0x29, name: 'VL53L0X Time-of-Flight Laser Sensor', category: 'Sensor', description: 'Laser distance ranging sensor (up to 2m)', addressPins: 'Software programmable via XSHUT', typicalVoltage: '2.8V - 3.3V' },
  { address7Bit: 0x44, name: 'SHT31 Temperature & Humidity Sensor', category: 'Sensor', description: 'High-precision Sensirion climate sensor', addressPins: 'ADDR pin selects 0x44 or 0x45', typicalVoltage: '2.4V - 5.5V' },
  { address7Bit: 0x60, name: 'MCP4725 12-Bit DAC', category: 'Driver', description: 'Digital-to-Analog converter with non-volatile EEPROM', addressPins: 'A0 selects 0x60 or 0x61', typicalVoltage: '2.7V - 5.5V' },
];
