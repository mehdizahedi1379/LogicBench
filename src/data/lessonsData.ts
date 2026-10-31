/**
 * Comprehensive micro-lessons database for LogicBench Learn Engine
 * Covers 10 technical domains with worked examples, embedded interactive widget IDs,
 * bilingual English & Persian content, quizzes, and C code-reading exercises.
 */

export interface QuizQuestion {
  id: string;
  question: { en: string; fa: string };
  options: { en: string[]; fa: string[] };
  correctIndex: number;
  explanation: { en: string; fa: string };
}

export interface CodeReadingExercise {
  title: { en: string; fa: string };
  language: 'c';
  snippet: string;
  question: { en: string; fa: string };
  options: { en: string[]; fa: string[] };
  correctIndex: number;
  explanation: { en: string; fa: string };
}

export interface LessonData {
  id: string;
  order: number;
  title: { en: string; fa: string };
  summary: { en: string; fa: string };
  category: 'digital' | 'mcu' | 'protocols';
  estimatedMinutes: number;
  interactiveWidgetId?: string;
  interactiveWidgetTitle: { en: string; fa: string };
  markdownContent: { en: string; fa: string };
  quiz: QuizQuestion[];
  codeExercise?: CodeReadingExercise;
}

export const LESSONS: LessonData[] = [
  // 1. Number Systems
  {
    id: 'number-systems',
    order: 1,
    category: 'digital',
    estimatedMinutes: 8,
    interactiveWidgetId: 'base-converter',
    interactiveWidgetTitle: {
      en: 'Base Converter & Bit Lab',
      fa: 'مبدل مبنا و آزمایشگاه بیت',
    },
    title: {
      en: 'Number Systems & Signed Representations',
      fa: 'دستگاه‌های اعداد و نمایش اعداد علامت‌دار',
    },
    summary: {
      en: 'Radix representations (bin/oct/dec/hex), two\'s complement arithmetic, fixed bit width overflow, and IEEE-754 floating-point format.',
      fa: 'نمایش مبناها، حساب مکمل دو، سرریز عرض بیتی ثابت و ساختار ممیز شناور استاندارد IEEE-754.',
    },
    markdownContent: {
      en: `### 1. Positional Number Systems
In digital electronics, numbers are represented with base $b$:
$$V = \\sum_{i=0}^{n-1} d_i \\cdot b^i$$
Hexadecimal (base-16) is the engineer's shorthand: each hex nibble represents exactly **4 binary bits** ($2^4 = 16$).
- \`0x5A\` = \`0101 1010_2\` = $5 \\times 16 + 10 = 90_{10}$.

### 2. Two's Complement for Signed Integers
To negate an $N$-bit binary integer in two's complement:
1. Invert all bits (One's complement: $\\sim x$).
2. Add 1 ($(\\sim x) + 1$).

**Worked Example (8-bit signed integer):**
- Let $x = +42_{10} = \`00101010_2\`$.
- Invert bits: \`11010101_2\`.
- Add 1: \`11010110_2\` = $-42_{10}$ (\`0xD6\`).
- Value formula: $-2^{N-1} \\cdot b_{N-1} + \\sum_{i=0}^{N-2} b_i \\cdot 2^i$.
- For \`0xD6\`: $-128 + 64 + 16 + 4 + 2 = -42$.

### 3. IEEE-754 Single-Precision Float (32-bit)
Structured into 3 distinct bitfields:
1. **Sign bit** (1 bit): $0 = +$, $1 = -$.
2. **Biased Exponent** (8 bits): Bias of $127$. Actual $E = e - 127$.
3. **Mantissa / Significand** (23 bits): Normalized as $1.M_2$.
$$V = (-1)^S \\times 2^{E - 127} \\times (1 + \\sum_{i=1}^{23} b_{23-i} \\cdot 2^{-i})$$`,
      fa: `### ۱. دستگاه‌های موقعیتی اعداد
در الکترونیک دیجیتال، اعداد در مبنای $b$ با فرمول زیر مدل می‌شوند:
$$V = \\sum_{i=0}^{n-1} d_i \\cdot b^i$$
دستگاه شانزده‌شانزدهی (Hexadecimal) زبان استاندارد مهندسان سخت‌افزار است، زیرا هر رقم هگزادسیمال دقیقاً معادل **۴ بیت باینری** است ($2^4 = 16$).

### ۲. نمایش مکمل دو (Two's Complement)
برای منفی کردن یک عدد صحیح $N$ بیتی در سیستم مکمل دو:
۱. تمام بیت‌ها وارون می‌شوند (مکمل یک: $\\sim x$).
۲. عدد ۱ به نتیجه افزوده می‌شود ($(\\sim x) + 1$).

**مثال عددی (عدد صحیح ۸ بیتی):**
- فرض کنید $x = +42_{10} = \`00101010_2\`$.
- وارون‌سازی بیت‌ها: \`11010101_2\`.
- افزودن ۱: \`11010110_2\` = $-42_{10}$ (معادل هگزادسیمال \`0xD6\`).

### ۳. استاندارد ممیز شناور IEEE-754 (۳۲ بیتی)
این استاندارد از ۳ بخش تشکیل شده است:
۱. **بیت علامت** (۱ بیت): ۰ مثبت، ۱ منفی.
۲. **توان با بایاس** (۸ بیت): بایاس برابر ۱۲۷ ($E = e - 127$).
۳. **مانتیس** (۲۳ بیت): به صورت نرمال‌شده $1.M_2$.`,
    },
    quiz: [
      {
        id: 'q-num-1',
        question: {
          en: 'What is the 8-bit two\'s complement representation of -1?',
          fa: 'نمایش هشت بیتی مکمل دو برای عدد منفی یک (-1) کدام است؟',
        },
        options: {
          en: ['0x01', '0x80', '0xFF', '0xFE'],
          fa: ['0x01', '0x80', '0xFF', '0xFE'],
        },
        correctIndex: 2,
        explanation: {
          en: '+1 is 0x01 (00000001b). Inverting gives 11111110b. Adding 1 gives 11111111b (0xFF).',
          fa: 'عدد مثبت یک 0x01 است. وارون آن 11111110b و با افزودن یک، 11111111b معادل 0xFF حاصل می‌شود.',
        },
      },
    ],
    codeExercise: {
      title: {
        en: 'Two\'s Complement Overflow in C',
        fa: 'بررسی سرریز مکمل دو در زبان C',
      },
      language: 'c',
      snippet: `int8_t a = 127;
a += 1;
printf("%d", a);`,
      question: {
        en: 'What will this C snippet print on an embedded microcontroller?',
        fa: 'خروجی چاپ شده این قطعه کد در میکروکنترلر چیست؟',
      },
      options: {
        en: ['128', '-128', '0', '-1'],
        fa: ['128', '-128', '0', '-1'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Signed 8-bit integers range from -128 to +127. Adding 1 to 0x7F (127) rolls over to 0x80, which is -128 in two\'s complement.',
        fa: 'محدوده اعداد صحیح علامت‌دار ۸ بیتی از ۱۲۸- تا ۱۲۷+ است. افزودن یک به 0x7F منجر به 0x80 می‌شود که نمایانگر ۱۲۸- است.',
      },
    },
  },

  // 2. Boolean Logic
  {
    id: 'boolean-logic',
    order: 2,
    category: 'digital',
    estimatedMinutes: 10,
    interactiveWidgetId: 'boolean-algebra',
    interactiveWidgetTitle: {
      en: 'Boolean Algebra & Karnaugh Map',
      fa: 'جبر بول و جدول کارنو',
    },
    title: {
      en: 'Boolean Algebra & Logic Gate Minimization',
      fa: 'جبر بول و کمینه‌سازی گیت‌های منطقی',
    },
    summary: {
      en: 'Fundamental logic operations, De Morgan\'s laws, Gray-code Karnaugh maps (2-4 variables), and minimal Sum of Products (SOP).',
      fa: 'عملیات پایه منطقی، قوانین دمورگان، جداول کارنو با کد گری و فرم‌های کمینه مجموع حاصل‌ضرب‌ها (SOP).',
    },
    markdownContent: {
      en: `### 1. Fundamental Boolean Axioms & Theorems
Boolean algebra operates on binary variables $\\{0, 1\\}$ with operations:
- **AND** ($\cdot$ or conjunction): $A \\cdot B = 1 \\iff A=1 \\land B=1$.
- **OR** ($+$ or disjunction): $A + B = 0 \\iff A=0 \\land B=0$.
- **NOT** ($\\bar{A}$ or $\\sim A$): $\\bar{0} = 1, \\bar{1} = 0$.

### 2. De Morgan's Laws
Crucial for transforming circuit schematics into NAND-only or NOR-only realizations:
$$\\overline{A \\cdot B} = \\bar{A} + \\bar{B}$$
$$\\overline{A + B} = \\bar{A} \\cdot \\bar{B}$$

### 3. Karnaugh Map (K-Map) Optimization
A graphical method for minimizing SOP/POS expressions without tedious algebraic manipulation.
- Adjacent cells differ by **exactly one bit** (Gray code: \`00, 01, 11, 10\`).
- Groups must be rectangular powers of two: $1, 2, 4, 8, 16$ cells.
- Wrapping around edges is permitted (toroidal topology).`,
      fa: `### ۱. اصول پایه و قضایای جبر بول
جبر بول با متغیرهای دودویی $\\{0, 1\\}$ و عملگرهای زیر کار می‌کند:
- **AND** (ضرب منطقی): خروجی ۱ تنها در صورت ۱ بودن تمام ورودی‌ها.
- **OR** (جمع منطقی): خروجی ۰ تنها در صورت ۰ بودن تمام ورودی‌ها.
- **NOT** (نقیض یا متمم): $\\bar{0} = 1, \\bar{1} = 0$.

### ۲. قوانین دمورگان (De Morgan's Laws)
این قوانین بنیاد پیاده‌سازی مدارها صرفاً با گیت‌های عمومی NAND یا NOR هستند:
$$\\overline{A \\cdot B} = \\bar{A} + \\bar{B}$$
$$\\overline{A + B} = \\bar{A} \\cdot \\bar{B}$$

### ۳. جدول کارنو (Karnaugh Map)
روشی هندسی برای بهینه‌سازی توابع بولی بدون نیاز به فرمول‌های جبری پیچیده:
- خانه‌های مجاور تنها در **یک بیت** با یکدیگر تفاوت دارند (ترتیب کد گری: 00, 01, 11, 10).
- گروه‌بندی‌ها باید در اندازه‌های توان‌های ۲ ($1, 2, 4, 8, 16$) باشند.`,
    },
    quiz: [
      {
        id: 'q-bool-1',
        question: {
          en: 'According to De Morgan\'s Law, what is the equivalent of NOT(A AND B)?',
          fa: 'طبق قوانین دمورگان، عبارت معادل NOT(A AND B) کدام است؟',
        },
        options: {
          en: ['NOT A AND NOT B', 'NOT A OR NOT B', 'A OR B', 'NOT(A OR B)'],
          fa: ['NOT A AND NOT B', 'NOT A OR NOT B', 'A OR B', 'NOT(A OR B)'],
        },
        correctIndex: 1,
        explanation: {
          en: 'De Morgan states: ~(A · B) = ~A + ~B (NOT A OR NOT B).',
          fa: 'طبق قانون دمورگان نقیض ضرب منطقی معادل جمع منطقی نقیض‌ها است: ~(A · B) = ~A + ~B.',
        },
      },
    ],
    codeExercise: {
      title: {
        en: 'Bitwise Masking in Firmware',
        fa: 'ماسک‌گذاری بیتی در سفت‌افزار',
      },
      language: 'c',
      snippet: `uint8_t reg = 0xAA; // 10101010b
reg |= (1 << 0);
printf("0x%X", reg);`,
      question: {
        en: 'What will be the final hex value of reg?',
        fa: 'مقدار نهایی متغیر reg در مبنای شانزده کدام است؟',
      },
      options: {
        en: ['0xAA', '0xAB', '0xBA', '0xFF'],
        fa: ['0xAA', '0xAB', '0xBA', '0xFF'],
      },
      correctIndex: 1,
      explanation: {
        en: '0xAA is 10101010b. Setting bit 0 with |= (1 << 0) changes it to 10101011b (0xAB).',
        fa: 'مقدار 0xAA برابر 10101010b است. ست کردن بیت شماره صفر با دستور OR مقدار را به 10101011b معادل 0xAB تبدیل می‌کند.',
      },
    },
  },

  // 3. Combinational Circuits
  {
    id: 'combinational-circuits',
    order: 3,
    category: 'digital',
    estimatedMinutes: 10,
    interactiveWidgetId: 'combinational-lab',
    interactiveWidgetTitle: {
      en: 'Combinational Logic Lab',
      fa: 'آزمایشگاه مدارهای ترکیبی',
    },
    title: {
      en: 'Combinational Logic: Adders, MUX, and Decoders',
      fa: 'مدارهای ترکیبی: جمع‌کننده‌ها، مولتی‌پلکسرها و دکودرها',
    },
    summary: {
      en: 'Memoryless digital systems: Half and Full Adders, Ripple Carry Adder delay, data routing with multiplexers, and address decoding.',
      fa: 'سیستم‌های دیجیتال بدون حافظه: نیم‌جمع‌کننده و تمام‌جمع‌کننده، انتشار رقم نقلی، هدایت داده با مولتی‌پلکسر و رمزگشایی آدرس.',
    },
    markdownContent: {
      en: `### 1. Memoryless Combinational Circuits
In combinational logic, output depends **strictly on the present input values**. There is no internal feedback, memory, or clock timing.

### 2. Binary Adders
- **Half Adder**: Adds two 1-bit inputs $A$ and $B$:
  - $Sum = A \\oplus B$
  - $Carry = A \\cdot B$
- **Full Adder**: Incorporates an incoming carry $C_{in}$:
  - $Sum = A \\oplus B \\oplus C_{in}$
  - $C_{out} = (A \\cdot B) + (C_{in} \\cdot (A \\oplus B))$

### 3. Multiplexers (MUX) & Decoders
- **Multiplexer**: A digital selector routing 1 of $2^n$ data inputs to a single output line based on $n$ select lines.
- **Decoder**: Activates exactly 1 of $2^n$ unique output lines corresponding to an $n$-bit binary code. Essential for memory address decoding (chip-select generation).`,
      fa: `### ۱. ماهیت مدارهای ترکیبی
در مدارهای منطقی ترکیبی، خروجی در هر لحظه **صرفاً به ورودی‌های حاضر** بستگی دارد و هیچ‌گونه حافظه، فیدبک یا پالس ساعت وجود ندارد.

### ۲. جمع‌کننده‌های دودویی
- **نیم‌جمع‌کننده (Half Adder)**: جمع دو بیت یکتا:
  - $Sum = A \\oplus B$
  - $Carry = A \\cdot B$
- **تمام‌جمع‌کننده (Full Adder)**: دارای رقم نقلی ورودی ($C_{in}$):
  - $Sum = A \\oplus B \\oplus C_{in}$
  - $C_{out} = (A \\cdot B) + (C_{in} \\cdot (A \\oplus B))$

### ۳. تسهیم‌کننده‌ها و رمزگشاها
- **Multiplexer**: انتخاب یکی از $2^n$ خط ورودی داده و هدایت آن به یک خروجی بر اساس $n$ خط انتخاب.
- **Decoder**: فعال‌سازی یکی از $2^n$ خط خروجی متناسب با آدرس ورودی; کاربرد بنیادین در انتخاب تراشه‌های حافظه (Chip Select).`,
    },
    quiz: [
      {
        id: 'q-comb-1',
        question: {
          en: 'How many select lines are required for an 8-to-1 Multiplexer?',
          fa: 'برای یک مولتی‌پلکسر ۸ به ۱، چند خط انتخاب (Select) مورد نیاز است؟',
        },
        options: {
          en: ['2', '3', '4', '8'],
          fa: ['2', '3', '4', '8'],
        },
        correctIndex: 1,
        explanation: {
          en: '2^n = 8 => n = 3 select lines (S0, S1, S2).',
          fa: 'طبق فرمول 2^n = 8 به ۳ خط انتخاب نیاز است.',
        },
      },
    ],
  },

  // 4. Sequential Circuits
  {
    id: 'sequential-circuits',
    order: 4,
    category: 'digital',
    estimatedMinutes: 12,
    interactiveWidgetId: 'flipflop-lab',
    interactiveWidgetTitle: {
      en: 'Flip-Flop & Sequential Logic Lab',
      fa: 'آزمایشگاه فلیپ‌فلاپ و مدارهای ترتیبی',
    },
    title: {
      en: 'Sequential Circuits & Flip-Flops',
      fa: 'مدارهای ترتیبی و فلیپ‌فلاپ‌ها',
    },
    summary: {
      en: 'State memory elements: SR Latches, D, JK, and T flip-flops, setup and hold times, clock edge triggering, and metastability.',
      fa: 'عناصر حافظه‌دار وضعیت: لچ‌های SR، فلیپ‌فلاپ‌های D، JK و T، زمان برپاسازی و نگه‌داری و پدیده فرامتغیر (Metastability).',
    },
    markdownContent: {
      en: `### 1. Bistable Latches vs Edge-Triggered Flip-Flops
- **Latch**: Transparent to inputs while Enable/Clock is held HIGH (level-sensitive).
- **Flip-Flop**: Samples input and updates output **only on a clock edge transition** (rising $\\uparrow$ or falling $\\downarrow$).

### 2. Core Flip-Flop Types
- **D Flip-Flop (Data)**: The workhorse of synchronous design. Latches input $D$ at the clock edge: $Q(t+1) = D$.
- **JK Flip-Flop**: Eliminates the invalid condition of SR latch. When $J=1, K=1$, it cleanly inverts/toggles state ($Q(t+1) = \\bar{Q}$).
- **T Flip-Flop (Toggle)**: Ideal for binary counters and frequency dividers. $Q(t+1) = T \\oplus Q$.

### 3. Timing Constraints: Setup ($t_{su}$) & Hold ($t_h$)
- **Setup Time ($t_{su}$)**: The minimum time the input data must remain stable **before** the active clock edge.
- **Hold Time ($t_h$)**: The minimum time the input data must remain stable **after** the clock edge.
- Violating either condition results in **metastability**, where the output hovers in an undefined analog voltage region.`,
      fa: `### ۱. مقایسه لچ و فلیپ‌فلاپ
- **Latch**: حساس به سطح (Level-sensitive) و تا زمانی که سیگنال فعال باشد شفاف عمل می‌کند.
- **Flip-Flop**: حساس به لبه (Edge-triggered) و تغییر وضعیت صرفاً در لحظه تغییر سطح ساعت (بالارونده یا پایین‌رونده) رخ می‌دهد.

### ۲. انواع اصلی فلیپ‌فلاپ‌ها
- **فلیپ‌فلاپ D**: عنصر پایه در ساخت ثبات‌ها و مدارهای سنکرون: $Q(t+1) = D$.
- **فلیپ‌فلاپ JK**: حل مشکل حالت نامعتبر لچ SR. در شرایط $J=1, K=1$ وضعیت خروجی معکوس می‌شود ($Q(t+1) = \\bar{Q}$).
- **فلیپ‌فلاپ T (Toggle)**: پایه ساخت شمارنده‌ها و تقسیم‌کننده‌های فرکانس: $Q(t+1) = T \\oplus Q$.

### ۳. شرایط زمانی برپاسازی ($t_{su}$) و نگه‌داری ($t_h$)
- **زمان برپاسازی (Setup Time)**: حداقل زمانی که دیتای ورودی پیش از رسیدن لبه ساعت باید کاملاً پایدار باشد.
- **زمان نگه‌داری (Hold Time)**: حداقل زمانی که دیتای ورودی پس از لبه ساعت باید بدون تغییر بماند.`,
    },
    quiz: [
      {
        id: 'q-seq-1',
        question: {
          en: 'What happens to a JK Flip-Flop on a clock rising edge when J = 1 and K = 1?',
          fa: 'در یک فلیپ‌فلاپ JK، با ورود لبه بالارونده ساعت در شرایط J=1 و K=1 چه اتفاقی می‌افتد؟',
        },
        options: {
          en: ['Q resets to 0', 'Q sets to 1', 'Q toggles to its inverted state', 'Output becomes indeterminate'],
          fa: ['خروجی صفر می‌شود', 'خروجی یک می‌شود', 'خروجی معکوس (Toggle) می‌شود', 'خروجی نامعین می‌شود'],
        },
        correctIndex: 2,
        explanation: {
          en: 'When J=1 and K=1, the JK flip-flop toggles its output Q to NOT(Q).',
          fa: 'در شرایط J=1 و K=1، فلیپ‌فلاپ JK خروجی خود را معکوس (تاتگل) می‌کند.',
        },
      },
    ],
  },

  // 5. Finite State Machines
  {
    id: 'finite-state-machines',
    order: 5,
    category: 'digital',
    estimatedMinutes: 12,
    interactiveWidgetId: 'fsm-editor',
    interactiveWidgetTitle: {
      en: 'FSM Editor & Simulator',
      fa: 'ویرایشگر و شبیه‌ساز ماشین حالت (FSM)',
    },
    title: {
      en: 'Finite State Machines: Moore vs Mealy Architecture',
      fa: 'ماشین‌های حالت متناهی: معماری مور در برابر میلی',
    },
    summary: {
      en: 'Synchronous state machine design: Moore vs Mealy outputs, state transition graphs, state encoding, and C switch-case firmware implementation.',
      fa: 'طراحی ماشین‌های حالت سنکرون: مقایسه خروجی مور و میلی، گراف‌های گذار وضعیت، کدگذاری حالت و پیاده‌سازی سوییچ-کیس در زبان C.',
    },
    markdownContent: {
      en: `### 1. What is an FSM?
A Finite State Machine (FSM) models a sequential system that transitions through a finite set of states based on current state and discrete input events.

### 2. Moore vs Mealy Architecture
- **Moore Machine**: Outputs depend **only on the current state**:
  $$Output = \\lambda(Current\\_State)$$
  *Advantages*: Synchronous with clock, glitch-free outputs, straightforward to verify.
- **Mealy Machine**: Outputs depend on **both current state and inputs**:
  $$Output = \\lambda(Current\\_State, Inputs)$$
  *Advantages*: Often requires fewer states; outputs respond instantaneously within the clock cycle.

### 3. Production C Implementation Pattern
Firmware engineers implement robust state machines using an \`enum\` for states and a nested \`switch-case\` statement inside the periodic tick handler.`,
      fa: `### ۱. ماشین حالت متناهی (FSM) چیست؟
ماشین حالت متناهی مدلی ریاضی برای توصیف سیستم‌های دیجیتال است که در هر لحظه در یکی از وضعیت‌های مشخص قرار دارند و بر اساس ورودی‌ها بین وضعیت‌ها جابجا می‌شوند.

### ۲. معماری مور (Moore) در برابر میلی (Mealy)
- **ماشین مور**: خروجی‌ها **تنها به وضعیت جاری** وابسته هستند ($Output = \\lambda(State)$). خروجی‌ها کاملاً سنکرون با پالس ساعت و عاری از نویز هستند.
- **ماشین میلی**: خروجی‌ها به **وضعیت جاری و ورودی‌های همزمان** بستگی دارند ($Output = \\lambda(State, Inputs)$). معمولاً به تعداد حالات کمتری نیاز دارد.`,
    },
    quiz: [
      {
        id: 'q-fsm-1',
        question: {
          en: 'In a Moore finite state machine, what determines the output signals?',
          fa: 'در یک ماشین حالت مور (Moore)، سیگنال‌های خروجی وابسته به چه عاملی تعیین می‌شوند؟',
        },
        options: {
          en: ['The current state only', 'The current state and current inputs', 'Only the inputs', 'The clock frequency'],
          fa: ['تنها وضعیت جاری (Current State)', 'وضعیت جاری به همراه ورودی‌های لحظه‌ای', 'صرفاً ورودی‌ها', 'فرکانس ساعت'],
        },
        correctIndex: 0,
        explanation: {
          en: 'Moore outputs are purely a function of the current state: Output = f(State).',
          fa: 'در معماری مور، خروجی‌ها منحصراً تابعی از وضعیت جاری سیستم هستند.',
        },
      },
    ],
  },

  // 6. Microcontroller Architecture
  {
    id: 'microcontroller-architecture',
    order: 6,
    category: 'mcu',
    estimatedMinutes: 12,
    interactiveWidgetId: 'register-tool',
    interactiveWidgetTitle: {
      en: 'Register & Bitfield Layout Helper',
      fa: 'ابزار طراحی و ماسک ثبات‌ها',
    },
    title: {
      en: 'Microcontroller Architecture & Memory Mapping',
      fa: 'معماری میکروکنترلرها و نگاشت حافظه',
    },
    summary: {
      en: 'Von Neumann vs Harvard architectures, memory maps (Flash, SRAM, Peripherals), CPU registers, and Memory-Mapped I/O (MMIO).',
      fa: 'مقایسه معماری فون‌نویمان و هاروارد، نگاشت حافظه فلش و رم، ثبات‌های پردازنده و ورودی/خروجی‌های نگاشت‌شده در حافظه (MMIO).',
    },
    markdownContent: {
      en: `### 1. Von Neumann vs Harvard Architecture
- **Von Neumann**: Shared bus and memory space for both program instructions and runtime data (e.g., standard x86).
- **Harvard Architecture**: Separate physical buses for program code (Flash/ROM) and data (SRAM). Microcontrollers (ARM Cortex-M, AVR, PIC) use Harvard or Modified Harvard to fetch instructions and load data simultaneously in a single cycle.

### 2. Memory-Mapped I/O (MMIO)
Microcontrollers do not use special I/O instructions. Instead, peripheral control registers (timers, GPIO, UART) reside at **fixed memory addresses**.
Reading or writing to an address like \`0x40020000\` writes directly to hardware flip-flops configuring GPIO!`,
      fa: `### ۱. مقایسه معماری فون‌نویمان و هاروارد
- **معماری فون‌نویمان**: گذرگاه و فضای آدرس‌دهی مشترک برای دستورالعمل‌های برنامه و داده‌ها.
- **معماری هاروارد**: گذرگاه‌ها و فضاهای حافظه کاملاً مجزا برای کد برنامه (حافظه Flash) و داده‌های متغیر (حافظه SRAM). این ساختار امکان خواندن همزمان دستورالعمل و داده در یک سیکل ساعت را فراهم می‌کند.

### ۲. ورودی/خروجی نگاشت‌شده در حافظه (MMIO)
در میکروکنترلرها، ثبات‌های کنترلی سخت‌افزارها (پایه‌های GPIO، تایمرها، پورت سریال) در **آدرس‌های مشخصی از فضای حافظه** قرار گرفته‌اند. نوشتن روی این آدرس‌ها مستقیماً وضعیت فلیپ‌فلاپ‌های سخت‌افزاری را تغییر می‌دهد.`,
    },
    quiz: [
      {
        id: 'q-mcu-1',
        question: {
          en: 'Why do embedded microcontrollers prefer Harvard architecture over Von Neumann?',
          fa: 'چرا در میکروکنترلرهای نهفته معماری هاروارد بر فون‌نویمان ترجیح داده می‌شود؟',
        },
        options: {
          en: [
            'It allows simultaneous instruction fetch and data access on independent buses',
            'It eliminates the need for SRAM',
            'It makes software compilation simpler',
            'It operates at lower clock frequencies',
          ],
          fa: [
            'امکان دریافت همزمان دستورالعمل و دسترسی به داده روی گذرگاه‌های مستقل',
            'نیاز به حافظه SRAM را حذف می‌کند',
            'کامپایل نرم‌افزار را ساده‌تر می‌کند',
            'در فرکانس‌های ساعت پایین‌تری کار می‌کند',
          ],
        },
        correctIndex: 0,
        explanation: {
          en: 'Dual buses eliminate the Von Neumann bottleneck by fetching instructions and data concurrently.',
          fa: 'گذرگاه‌های مجزا امکان فچ دستورالعمل و دسترسی به داده را همزمان و در یک سیکل ساعت فراهم می‌سازند.',
        },
      },
    ],
  },

  // 7. GPIO and Interrupts
  {
    id: 'gpio-interrupts',
    order: 7,
    category: 'mcu',
    estimatedMinutes: 12,
    interactiveWidgetId: 'gpio-planner',
    interactiveWidgetTitle: {
      en: 'GPIO Pinout Planner',
      fa: 'برنامه‌ریز پایه‌های GPIO',
    },
    title: {
      en: 'GPIO Modes, Interrupts, and NVIC Architecture',
      fa: 'حالت‌های پایه‌های GPIO، وقفه‌ها و معماری NVIC',
    },
    summary: {
      en: 'Push-Pull vs Open-Drain outputs, internal pull-up/pull-down resistors, interrupt latency, Interrupt Service Routines (ISRs), and debouncing.',
      fa: 'خروجی‌های پوش‌پول و اوپن‌درین، مقاومت‌های پول‌آپ داخلی، تاخیر وقفه، روتین‌های وقفه (ISR) و حذف جهش کلیدها.',
    },
    markdownContent: {
      en: `### 1. Output Driver Topologies
- **Push-Pull**: Uses a complementary pair of transistors (P-MOS pull-up to VDD, N-MOS pull-down to GND). Strongly drives both logic HIGH and LOW. Ideal for LEDs, SPI, and pushbuttons.
- **Open-Drain**: P-MOS is omitted or disabled. The pin can only pull LOW to GND or enter high-impedance (Hi-Z). Requires an external pull-up resistor to reach HIGH. Essential for multi-drop buses like **I2C** and 1-Wire to prevent short-circuit bus contention!

### 2. Interrupts & Nested Vectored Interrupt Controller (NVIC)
Rather than wasting CPU cycles polling a pin (\`while(!pin_read())\`), an interrupt triggers hardware to:
1. Suspend the main execution thread.
2. Push registers (R0-R3, R12, LR, PC, xPSR) to the stack.
3. Jump to the **Interrupt Service Routine (ISR)** address from the vector table.
4. Execute the handler and return via \`BX LR\`.`,
      fa: `### ۱. ساختار راه‌انداز خروجی پایه‌ها
- **پوش‌پول (Push-Pull)**: دارای یک جفت ترانزیستور مکمل است که خروجی را با قدرت بالا به سطح ولتاژ بالا (VDD) یا صفر (GND) وصل می‌کند.
- **اوپن‌درین (Open-Drain)**: پین صرفاً می‌تواند زمین (GND) را وصل کند و برای سطح بالا به حالت امپدانس بالا (Hi-Z) می‌رود. این حالت برای پروتکل‌هایی مانند **I2C** که چند دستگاه روی یک خط مشترک هستند حیاتی است تا از اتصال کوتاه جلوگیری شود.

### ۲. وقفه‌ها و کنترلر NVIC
به جای مصرف بیهوده توان پردازنده برای بررسی مداوم پین (Polling)، وقفه به صورت سخت‌افزاری پردازش جاری را متوقف کرده و بلافاصله تابع سرویس وقفه (ISR) را اجرا می‌کند.`,
    },
    quiz: [
      {
        id: 'q-gpio-1',
        question: {
          en: 'Why is Open-Drain configuration mandatory on the I2C SDA and SCL lines?',
          fa: 'چرا پیکربندی اوپن‌درین برای خطوط SDA و SCL در پروتکل I2C الزامی است؟',
        },
        options: {
          en: [
            'To prevent a short-circuit if one device pulls LOW while another drives HIGH',
            'To increase bus speed above 100 MHz',
            'To invert the clock polarity',
            'To reduce battery consumption to zero',
          ],
          fa: [
            'جلوگیری از اتصال کوتاه در صورت صفر کردن خط توسط یک قطعه و یک کردن آن توسط قطعه دیگر',
            'افزایش سرعت خط به بیش از ۱۰۰ مگاهرتز',
            'معکوس کردن فاز ساعت',
            'به صفر رساندن مصرف باتری',
          ],
        },
        correctIndex: 0,
        explanation: {
          en: 'Open-drain with pull-ups creates a wired-AND configuration, allowing multiple devices to safely share the same bus lines.',
          fa: 'ساختار اوپن‌درین همراه با مقاومت پول‌آپ یک ساختار AND سیمی ایجاد می‌کند که امکان اتصال چند دستگاه را بدون خطر اتصال کوتاه میسر می‌سازد.',
        },
      },
    ],
  },

  // 8. Timers and PWM
  {
    id: 'timers-pwm',
    order: 8,
    category: 'mcu',
    estimatedMinutes: 12,
    interactiveWidgetId: 'timer-pwm',
    interactiveWidgetTitle: {
      en: 'Timer & PWM Frequency Calculator',
      fa: 'محاسبه‌گر فرکانس تایمر و PWM',
    },
    title: {
      en: 'Hardware Timers, Counters, and PWM Generation',
      fa: 'تایمرها، شمارنده‌های سخت‌افزاری و تولید سیگنال PWM',
    },
    summary: {
      en: 'Timer prescalers, auto-reload / TOP registers, edge-aligned vs center-aligned PWM, duty cycle precision, and frequency calculation.',
      fa: 'تقسیم‌کننده‌های فرکانسی (Prescaler)، ثبات‌های مقدار بیشینه (TOP / ARR)، تفاوت PWM لبه‌ای و متقارن، دقت سیکل کاری و محاسبات فرکانس.',
    },
    markdownContent: {
      en: `### 1. The Anatomy of a Hardware Timer
A hardware timer consists of:
1. **Clock Source**: Input clock frequency ($f_{clk}$).
2. **Prescaler (PSC)**: Integer divider to slow down clock ticks:
   $$f_{timer} = \\frac{f_{clk}}{PSC}$$
3. **Counter Register (CNT)**: Increments (or decrements) on each timer tick.
4. **Auto-Reload / TOP Register (ARR / ICR)**: Defines the period when the counter rolls over.
5. **Capture/Compare Register (CCR / OCR)**: Defines the compare match threshold for PWM duty cycle.

### 2. Edge-Aligned PWM Frequency Formula
$$f_{PWM} = \\frac{f_{clk}}{PSC \\times (TOP + 1)}$$
Duty cycle percentage is set by:
$$Duty\\% = \\frac{CCR}{TOP + 1} \\times 100$$`,
      fa: `### ۱. اجزای یک تایمر سخت‌افزاری
یک تایمر سخت‌افزاری شامل بخش‌های زیر است:
۱. **منبع کلاک**: فرکانس ساعت ورودی ($f_{clk}$).
۲. **تقسیم‌کننده فرکانس (Prescaler)**: کاهش فرکانس پالس ساعت ($f_{timer} = f_{clk} / PSC$).
۳. **شمارنده (CNT)**: شمارش پالس‌های تایمر به سمت بالا یا پایین.
۴. **ثبات مقدار بیشینه (TOP / ARR)**: مشخص‌کننده دوره تناوب و لحظه بازنشانی شمارنده.
۵. **ثبات مقایسه (CCR / OCR)**: مشخص‌کننده درصد سیکل کاری پالس PWM.

### ۲. فرمول فرکانس PWM در حالت Edge-Aligned
$$f_{PWM} = \\frac{f_{clk}}{PSC \\times (TOP + 1)}$$
درصد سیکل کاری (Duty Cycle) به صورت زیر محاسبه می‌شود:
$$Duty\\% = \\frac{CCR}{TOP + 1} \\times 100$$`,
    },
    quiz: [
      {
        id: 'q-tim-1',
        question: {
          en: 'If a 16 MHz microcontroller timer uses a Prescaler of 16 and a TOP of 999, what is the output PWM frequency?',
          fa: 'اگر در یک تایمر با ساعت ورودی ۱۶ مگاهرتز، مقدار تقسیم‌کننده ۱۶ و مقدار TOP برابر ۹۹۹ باشد، فرکانس خروجی PWM چقدر است؟',
        },
        options: {
          en: ['1 kHz (1,000 Hz)', '10 kHz', '100 Hz', '1 MHz'],
          fa: ['۱ کیلوهرتز (1,000 Hz)', '۱۰ کیلوهرتز', '۱۰۰ هرتز', '۱ مگاهرتز'],
        },
        correctIndex: 0,
        explanation: {
          en: 'f = 16,000,000 / (16 * (999 + 1)) = 16,000,000 / (16 * 1000) = 1,000 Hz.',
          fa: 'فرکانس برابر است با: 16,000,000 / (16 * 1000) = 1,000 Hz (یک کیلوهرتز).',
        },
      },
    ],
  },

  // 9. ADC and DAC
  {
    id: 'adc-dac',
    order: 9,
    category: 'mcu',
    estimatedMinutes: 10,
    interactiveWidgetId: 'adcdac-calc',
    interactiveWidgetTitle: {
      en: 'ADC & DAC Quantization Calculator',
      fa: 'محاسبه‌گر کوانتیزاسیون ADC و DAC',
    },
    title: {
      en: 'ADC & DAC: Quantization, LSB, and Reference Voltage',
      fa: 'مبدل‌های آنالوگ به دیجیتال و دیجیتال به آنالوگ (ADC/DAC)',
    },
    summary: {
      en: 'Successive Approximation Register (SAR) ADCs, Least Significant Bit (LSB) voltage step, quantization noise, theoretical SNR, and reference voltages.',
      fa: 'مبدل‌های تقریب متوالی (SAR)، ولتاژ کم‌ارزش‌ترین بیت (LSB)، نویز کوانتیزاسیون، نسبت سیگنال به نویز (SNR) و ولتاژ مرجع.',
    },
    markdownContent: {
      en: `### 1. The Analog-to-Digital Interface
Real-world physical quantities (temperature, pressure, audio) are continuous voltages. An Analog-to-Digital Converter (ADC) samples this continuous domain into discrete $N$-bit numbers.

### 2. Least Significant Bit (LSB) Step Size
The smallest analog voltage difference recognizable by an $N$-bit ADC with reference voltage $V_{ref}$:
$$V_{LSB} = \\frac{V_{ref}}{2^N}$$
- For a 10-bit ADC with $V_{ref} = 3.3\\text{ V}$:
  $$V_{LSB} = \\frac{3.3\\text{ V}}{1024} = 3.222\\text{ mV}$$
- For a 12-bit ADC with $V_{ref} = 3.3\\text{ V}$:
  $$V_{LSB} = \\frac{3.3\\text{ V}}{4096} = 0.805\\text{ mV}$$

### 3. Theoretical Signal-to-Quantization-Noise Ratio (SQNR)
Quantization introduces intrinsic quantization noise $e_q \\in [-\\frac{1}{2}LSB, +\\frac{1}{2}LSB]$. The theoretical maximum SNR for a sinusoidal signal is:
$$SNR_{max} = 6.02 \\times N + 1.76\\text{ dB}$$`,
      fa: `### ۱. رابط بین دنیای آنالوگ و دیجیتال
کمیت‌های فیزیکی مانند دما، صوت و فشار دارای ولتاژ پیوسته هستند. مبدل آنالوگ به دیجیتال (ADC) این دامنه پیوسته را به اعداد گسسته با تفکیک‌پذیری $N$ بیت تبدیل می‌کند.

### ۲. پله ولتاژ کم‌ارزش‌ترین بیت (LSB)
کوچک‌ترین تغییر ولتاژ آنالوگ قابل تشخیص توسط مبدل:
$$V_{LSB} = \\frac{V_{ref}}{2^N}$$
- در یک مبدل ۱۰ بیتی با ولتاژ مرجع ۳.۳ ولت:
  $$V_{LSB} = \\frac{3.3}{1024} = 3.222\\text{ mV}$$
- در یک مبدل ۱۲ بیتی با ولتاژ مرجع ۳.۳ ولت:
  $$V_{LSB} = \\frac{3.3}{4096} = 0.805\\text{ mV}$$

### ۳. نسبت سیگنال به نویز تئوری (SQNR)
فرایند کوانتیزاسیون خطایی ذاتی ایجاد می‌کند. حداکثر نسبت سیگنال به نویز برای سیگنال سینوسی:
$$SNR = 6.02 \\times N + 1.76\\text{ dB}$$`,
    },
    quiz: [
      {
        id: 'q-adc-1',
        question: {
          en: 'What is the voltage value represented by each LSB step in a 12-bit ADC with Vref = 4.096 V?',
          fa: 'در یک مبدل ADC دوازده بیتی با ولتاژ مرجع ۴.۰۹۶ ولت، هر پله LSB دقیقاً برابر چند میلی‌ولت است؟',
        },
        options: {
          en: ['1.0 mV', '4.0 mV', '0.5 mV', '2.0 mV'],
          fa: ['۱.۰ میلی‌ولت', '۴.۰ میلی‌ولت', '۰.۵ میلی‌ولت', '۲.۰ میلی‌ولت'],
        },
        correctIndex: 0,
        explanation: {
          en: 'V_LSB = 4.096 V / 4096 = 0.001 V = 1.0 mV.',
          fa: 'مقدار برابر است با: 4.096 / 4096 = 0.001 ولت معادل ۱.۰ میلی‌ولت.',
        },
      },
    ],
  },

  // 10. UART, SPI, and I2C
  {
    id: 'uart-spi-i2c',
    order: 10,
    category: 'protocols',
    estimatedMinutes: 14,
    interactiveWidgetId: 'protocol-visualizer',
    interactiveWidgetTitle: {
      en: 'Protocol Waveform Visualizer & Decoder',
      fa: 'تصویرساز شکل‌موج پروتکل و رمزگشا',
    },
    title: {
      en: 'Serial Communication: UART, SPI, and I2C',
      fa: 'ارتباطات سریال: پروتکل‌های UART، SPI و I2C',
    },
    summary: {
      en: 'Asynchronous vs synchronous protocols, baud framing, SPI clock polarity/phase (CPOL/CPHA), and I2C 2-wire open-drain addressing with ACK/NACK.',
      fa: 'مقایسه پروتکل‌های سنکرون و آسنکرون، فریم‌های بادریت، فاز و پولاریته ساعت در SPI و آدرس‌دهی دو سیمه اوپن‌درین در I2C.',
    },
    markdownContent: {
      en: `### 1. UART (Universal Asynchronous Receiver-Transmitter)
- **Asynchronous**: No shared clock wire. Sender and receiver must agree on baud rate beforehand.
- **Framing**: Line idles HIGH (Mark). A frame begins with **Start bit (LOW)**, followed by 5–8 data bits (LSB first), optional parity, and 1–2 **Stop bits (HIGH)**.
- **Timing Tolerance**: Receiver samples in the center of each bit. Maximum allowable clock drift between devices is typically $\\pm 2.5\\%$.

### 2. SPI (Serial Peripheral Interface)
- **Synchronous Master-Slave**: 4 wires: \`SCK\` (Clock), \`MOSI\` (Master Out), \`MISO\` (Master In), and \`CS/SS\` (Chip Select).
- **Full-Duplex & High Speed**: Can exceed 50+ MHz.
- **4 Modes (CPOL / CPHA)**:
  - Mode 0: CPOL=0 (Clock idles LOW), CPHA=0 (Sample on leading rising edge).
  - Mode 3: CPOL=1 (Clock idles HIGH), CPHA=1 (Sample on trailing rising edge).

### 3. I2C (Inter-Integrated Circuit)
- **2-Wire Bus**: \`SCL\` (Clock) and \`SDA\` (Data) with external pull-up resistors.
- **Multi-Drop Addressing**: Master initiates communication via a **START condition** (SDA falls while SCL is HIGH), sends a 7-bit slave address + R/W bit, and receives a hardware **ACK bit** (slave pulls SDA LOW on the 9th clock).`,
      fa: `### ۱. پروتکل UART (آسنکرون)
- **آسنکرون**: بدون سیم کلاک مشترک. هر دو طرف باید روی یک نرخ ارسال (Baud Rate) توافق داشته باشند.
- **ساختار فریم**: خط در حالت بیکار در سطح یک (HIGH) است. فریم با بیت شروع (صفر)، سپس داده‌ها (ابتدا کم‌ارزش‌ترین بیت)، بیت توازن اختیاری و بیت‌های توقف (یک) ارسال می‌شود.

### ۲. پروتکل SPI (سنکرون تمام‌دوطرفه)
- **۴ سیم ارتباطی**: خط کلاک (SCK)، داده رفت (MOSI)، داده برگشت (MISO) و انتخاب تراشه (CS).
- **سرعت بسیار بالا**: قابلیت کار در فرکانس‌های بالای ۵۰ مگاهرتز.
- **چهار مد کاری بر اساس فاز و پولاریته کلاک (CPOL / CPHA)**.

### ۳. پروتکل I2C (دو سیمه اوپن‌درین)
- **تنها ۲ سیم**: خط کلاک (SCL) و خط دیتا (SDA) با مقاومت‌های پول‌آپ خارجی.
- **آدرس‌دهی چند قطعه روی یک گذرگاه**: شروع ارتباط با شرط START (افت SDA در حالی که SCL یک است) و تایید دریافت داده توسط بیت سخت‌افزاری ACK (صفر شدن SDA در پالس نهم کلاک).`,
    },
    quiz: [
      {
        id: 'q-comm-1',
        question: {
          en: 'How does an I2C slave acknowledge successful reception of an address or data byte?',
          fa: 'یک قطعه پیرو (Slave) در پروتکل I2C چگونه دریافت موفقیت‌آمیز آدرس یا بایت داده را تایید (ACK) می‌کند؟',
        },
        options: {
          en: [
            'By pulling the SDA line LOW during the 9th clock pulse',
            'By releasing the SDA line HIGH',
            'By pulsing the SCL line twice',
            'By toggling the chip-select line',
          ],
          fa: [
            'با صفر کردن (کشیدن به سمت زمین) خط SDA در طول پالس نهم کلاک',
            'با رها کردن خط SDA در سطح ولتاژ بالا',
            'با ایجاد دو پالس متوالی روی خط SCL',
            'با تغییر وضعیت پایه انتخاب تراشه',
          ],
        },
        correctIndex: 0,
        explanation: {
          en: 'In I2C, ACK is an active-LOW signal: the receiver pulls SDA down to 0V during the 9th SCL pulse.',
          fa: 'در پروتکل I2C، تاییدیه دریافت (ACK) اکتیو-پایین است و گیرنده خط SDA را در پالس نهم به زمین وصل می‌کند.',
        },
      },
    ],
  },
];

export const DEFAULT_FLASHCARDS = [
  {
    id: 'fc-1',
    deckId: 'default',
    question: 'How do you compute the two\'s complement of an N-bit binary integer?',
    answer: 'Invert all bits (One\'s complement) and add 1.',
    category: 'Digital Logic',
  },
  {
    id: 'fc-2',
    deckId: 'default',
    question: 'What is De Morgan\'s Law for the NAND operation: ~(A · B)?',
    answer: '~(A · B) = ~A + ~B (NOT A or NOT B).',
    category: 'Boolean Algebra',
  },
  {
    id: 'fc-3',
    deckId: 'default',
    question: 'What is the key difference between a Latch and a Flip-Flop?',
    answer: 'A Latch is level-sensitive (transparent when enabled); a Flip-Flop is edge-triggered (samples only on clock transitions).',
    category: 'Sequential Logic',
  },
  {
    id: 'fc-4',
    deckId: 'default',
    question: 'Why do I2C bus lines require pull-up resistors?',
    answer: 'Because all I2C drivers are Open-Drain; the pull-up resistor pulls the line HIGH when no device is driving it LOW.',
    category: 'Protocols',
  },
  {
    id: 'fc-5',
    deckId: 'default',
    question: 'What is the Nyquist-Shannon sampling theorem requirement?',
    answer: 'The sampling frequency (f_s) must be at least twice the highest frequency component of the signal (f_s >= 2 * f_max).',
    category: 'Analog & ADC',
  },
  {
    id: 'fc-6',
    deckId: 'default',
    question: 'What does the timer Prescaler (PSC) do?',
    answer: 'It divides the high-speed input clock frequency to slow down the timer tick rate: f_timer = f_clk / PSC.',
    category: 'Microcontrollers',
  },
];
