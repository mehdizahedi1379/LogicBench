/**
 * IndexedDB Wrapper for LogicBench
 * Provides typed, promise-based local persistence with versioned schema & migrations.
 * Stores: notes, chips, snippets, flashcards, progress, settings
 */

export const DB_NAME = 'logicbench_db';
export const CURRENT_DB_VERSION = 2;

export interface DBNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DBChip {
  id: string;
  partNumber: string;
  manufacturer: string;
  architecture: string; // e.g. 74xx, AVR, ARM Cortex-M4, ESP32, RP2040, Analog, Sensor
  category: 'mcu' | 'logic_ic' | 'memory' | 'sensor' | 'interface' | 'analog' | 'power';
  pinCount: number;
  description: string;
  keySpecs: string; // e.g. "8-bit AVR, 20MHz, 32KB Flash, 2KB SRAM, 23 GPIOs, 10-bit ADC"
  pinoutNotes: string; // text or markdown description of pinout
  datasheetUrl?: string;
  stockQuantity: number;
  voltageMin?: number;
  voltageMax?: number;
  updatedAt: number;
}

export interface DBSnippet {
  id: string;
  title: string;
  language: 'c' | 'cpp' | 'rust' | 'assembly' | 'verilog' | 'python';
  code: string;
  category: string;
  description: string;
  tags: string[];
  linkedNoteId?: string;
  updatedAt: number;
}

export interface DBProjectBomItem {
  id: string;
  designator: string; // e.g. "R1, R2", "U1"
  partNumber: string;
  description?: string;
  quantity: number;
  unitCost: number;
  supplierUrl?: string;
  notes?: string;
}

export interface DBProjectChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface DBProject {
  id: string;
  title: string;
  description: string;
  goals: string;
  targetMcu?: string;
  pinMap: Record<string, string>; // pin name -> assigned function / signal
  bom: DBProjectBomItem[];
  checklist: DBProjectChecklistItem[];
  linkedNoteIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DBFlashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  category: string;
  difficulty?: number;
  lastReviewed?: number;
  interval?: number;
  repetition?: number;
  easeFactor?: number;
  nextReviewDate?: number;
  tags?: string[];
  updatedAt: number;
}

export interface DBProgress {
  id: string;
  moduleId: string;
  completedLessons: string[];
  score: number;
  lastAccessed: number;
}

export interface DBSettings {
  key: string;
  value: any;
  updatedAt: number;
}

export interface StoreMap {
  notes: DBNote;
  chips: DBChip;
  snippets: DBSnippet;
  flashcards: DBFlashcard;
  progress: DBProgress;
  settings: DBSettings;
  projects: DBProject;
}

export type StoreName = keyof StoreMap;

class LogicBenchDB {
  private dbInstance: IDBDatabase | null = null;
  private openingPromise: Promise<IDBDatabase> | null = null;

  public async getDB(): Promise<IDBDatabase> {
    if (this.dbInstance) {
      return this.dbInstance;
    }

    if (this.openingPromise) {
      return this.openingPromise;
    }

    this.openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, CURRENT_DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;
        const oldVersion = event.oldVersion;
        this.runMigrations(db, oldVersion, CURRENT_DB_VERSION);
      };

      request.onsuccess = () => {
        this.dbInstance = request.result;
        resolve(this.dbInstance);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.openingPromise;
  }

  /**
   * Versioned migration pipeline
   */
  private runMigrations(db: IDBDatabase, oldVersion: number, newVersion: number) {
    // Migration for Version 1
    if (oldVersion < 1) {
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }

      if (!db.objectStoreNames.contains('chips')) {
        const store = db.createObjectStore('chips', { keyPath: 'id' });
        store.createIndex('partNumber', 'partNumber', { unique: true });
        store.createIndex('architecture', 'architecture', { unique: false });
      }

      if (!db.objectStoreNames.contains('snippets')) {
        const store = db.createObjectStore('snippets', { keyPath: 'id' });
        store.createIndex('language', 'language', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }

      if (!db.objectStoreNames.contains('flashcards')) {
        const store = db.createObjectStore('flashcards', { keyPath: 'id' });
        store.createIndex('deckId', 'deckId', { unique: false });
      }

      if (!db.objectStoreNames.contains('progress')) {
        const store = db.createObjectStore('progress', { keyPath: 'id' });
        store.createIndex('moduleId', 'moduleId', { unique: true });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }

    // Migration for Version 2 (Projects store)
    if (oldVersion < 2) {
      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    }
  }

  public async get<K extends StoreName>(storeName: K, key: string): Promise<StoreMap[K] | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAll<K extends StoreName>(storeName: K): Promise<StoreMap[K][]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async put<K extends StoreName>(storeName: K, value: StoreMap[K]): Promise<string> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(String(req.result));
      req.onerror = () => reject(req.error);
    });
  }

  public async delete<K extends StoreName>(storeName: K, key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clear<K extends StoreName>(storeName: K): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async count<K extends StoreName>(storeName: K): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async getStorageStats(): Promise<Record<StoreName, number>> {
    const stores: StoreName[] = ['notes', 'chips', 'snippets', 'flashcards', 'progress', 'settings', 'projects'];
    const stats: Partial<Record<StoreName, number>> = {};
    for (const s of stores) {
      stats[s] = await this.count(s);
    }
    return stats as Record<StoreName, number>;
  }
}

export const db = new LogicBenchDB();
