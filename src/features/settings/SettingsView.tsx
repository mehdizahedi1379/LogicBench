import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Monitor, Languages, HardDrive, Trash2, Download, Upload, Check, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { db, StoreName } from '../../lib/db';
import { seedDefaultsIfEmpty } from '../../lib/seedData';
import { exportFullJsonBackup, restoreJsonBackup } from '../../lib/fileSystemHelper';
import { FeatureContextProps } from '../types';

export const SettingsView: React.FC<FeatureContextProps> = () => {
  const { t, language, setLanguage } = useI18n();

  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('logicbench_theme') as any) || 'dark';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('logicbench_reduced_motion') === 'true';
  });

  const [showGraticule, setShowGraticule] = useState<boolean>(() => {
    const stored = localStorage.getItem('logicbench_graticule');
    return stored !== null ? stored === 'true' : true;
  });

  const [storageStats, setStorageStats] = useState<Record<StoreName, number>>({
    notes: 0,
    chips: 0,
    snippets: 0,
    flashcards: 0,
    progress: 0,
    settings: 0,
    projects: 0,
  });

  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [clearedNotice, setClearedNotice] = useState<boolean>(false);

  // Apply theme to DOM
  useEffect(() => {
    localStorage.setItem('logicbench_theme', theme);
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Apply motion preference
  useEffect(() => {
    localStorage.setItem('logicbench_reduced_motion', String(reducedMotion));
    document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion));
  }, [reducedMotion]);

  // Apply graticule preference
  useEffect(() => {
    localStorage.setItem('logicbench_graticule', String(showGraticule));
    const benchContainer = document.getElementById('workbench-viewport');
    if (benchContainer) {
      if (showGraticule) {
        benchContainer.classList.add('bg-graticule');
      } else {
        benchContainer.classList.remove('bg-graticule');
      }
    }
  }, [showGraticule]);

  // Fetch DB counts
  const loadStats = async () => {
    try {
      const stats = await db.getStorageStats();
      setStorageStats(stats);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearStores = async () => {
    const stores: StoreName[] = ['notes', 'chips', 'snippets', 'flashcards', 'progress', 'settings', 'projects'];
    for (const s of stores) {
      await db.clear(s);
    }
    setConfirmClear(false);
    setClearedNotice(true);
    await loadStats();
    setTimeout(() => setClearedNotice(false), 3000);
  };

  const handleSeedDefaults = async () => {
    await seedDefaultsIfEmpty();
    await loadStats();
  };

  const handleExportJSON = async () => {
    try {
      await exportFullJsonBackup();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await restoreJsonBackup(text);
        await loadStats();
      } catch (err: any) {
        alert(`Restore failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div className="border-b border-subtle pb-4">
        <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>{t.settings.title}</span>
        </h2>
        <p className="text-xs text-secondary mt-1">{t.settings.description}</p>
      </div>

      {/* Appearance Section */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-6">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{t.settings.appearance}</span>
        </h3>

        {/* Theme Picker */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-secondary">{t.settings.theme}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-950/20 text-primary'
                  : 'border-subtle bg-canvas/60 text-secondary hover:border-secondary hover:text-primary'
              }`}
            >
              <Moon className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">{t.settings.themeDark}</div>
                <div className="text-[11px] text-muted">Deep slate &amp; phosphor</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-950/20 text-primary'
                  : 'border-subtle bg-canvas/60 text-secondary hover:border-secondary hover:text-primary'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold">{t.settings.themeLight}</div>
                <div className="text-[11px] text-muted">Instrument paper bench</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                theme === 'system'
                  ? 'border-emerald-500 bg-emerald-950/20 text-primary'
                  : 'border-subtle bg-canvas/60 text-secondary hover:border-secondary hover:text-primary'
              }`}
            >
              <Monitor className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">{t.settings.themeSystem}</div>
                <div className="text-[11px] text-muted">Auto-match desktop OS</div>
              </div>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-3 pt-2 border-t border-subtle">
          <div className="text-xs font-medium text-secondary flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-emerald-400" />
            <span>{t.settings.language}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`p-3.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                language === 'en'
                  ? 'border-emerald-500 bg-emerald-950/20 text-primary'
                  : 'border-subtle bg-canvas/60 text-secondary hover:border-secondary hover:text-primary'
              }`}
            >
              <div>
                <div className="text-xs font-semibold">English (US)</div>
                <div className="text-[11px] text-muted">Left-to-right (LTR)</div>
              </div>
              {language === 'en' && <Check className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => setLanguage('fa')}
              className={`p-3.5 rounded-lg border text-right flex items-center justify-between transition-colors ${
                language === 'fa'
                  ? 'border-emerald-500 bg-emerald-950/20 text-primary'
                  : 'border-subtle bg-canvas/60 text-secondary hover:border-secondary hover:text-primary'
              }`}
            >
              {language === 'fa' && <Check className="w-4 h-4 text-emerald-400" />}
              <div>
                <div className="text-xs font-semibold font-fa">فارسی (Persian)</div>
                <div className="text-[11px] text-muted">راست‌به‌چپ (RTL) با حفظ LTR برای کد و اعداد</div>
              </div>
            </button>
          </div>
        </div>

        {/* Graticule & Motion Toggles */}
        <div className="space-y-4 pt-2 border-t border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-primary">{t.settings.graticule}</div>
              <div className="text-[11px] text-muted">{t.settings.graticuleDesc}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowGraticule(!showGraticule)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                showGraticule ? 'bg-emerald-600' : 'bg-surface-subtle'
              }`}
              role="switch"
              aria-checked={showGraticule}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showGraticule ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-primary">{t.settings.motion}</div>
              <div className="text-[11px] text-muted">{t.settings.motionReduced}</div>
            </div>
            <button
              type="button"
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                reducedMotion ? 'bg-amber-600' : 'bg-surface-subtle'
              }`}
              role="switch"
              aria-checked={reducedMotion}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  reducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* IndexedDB Local Persistence Management */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>{t.settings.storage}</span>
          </h3>
          <span className="text-xs text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800">
            LOCAL_FIRST_ACTIVE
          </span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">{t.settings.storageDesc}</p>

        {/* Database Stores Summary Cards */}
        <div className="code-ltr grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2" dir="ltr">
          {(Object.keys(storageStats) as StoreName[]).map((store) => (
            <div key={store} className="bg-canvas p-2.5 rounded border border-subtle text-center">
              <div className="text-[10px] text-muted font-mono uppercase truncate">{store}</div>
              <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                {storageStats[store]}
              </div>
            </div>
          ))}
        </div>

        {/* Storage Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-subtle">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.settings.exportBackup}</span>
          </button>

          <label className="px-3 py-1.5 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore Backup JSON</span>
            <input type="file" accept=".json" onChange={handleRestoreUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleSeedDefaults}
            className="px-3 py-1.5 text-xs rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Load Sample Data</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 text-xs rounded bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.settings.clearStorage}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 p-1.5 rounded">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-300 font-medium">{t.settings.clearStorageConfirm}</span>
              <button
                type="button"
                onClick={handleClearStores}
                className="px-2 py-0.5 text-xs rounded bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
              >
                Yes, Purge
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2 py-0.5 text-xs rounded bg-surface-subtle text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {clearedNotice && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{t.settings.clearSuccess}</span>
            </span>
          )}
        </div>
      </div>

      {/* About Box */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-2 text-xs text-secondary leading-relaxed">
        <h4 className="font-semibold text-primary">{t.settings.about}</h4>
        <p>{t.settings.aboutText}</p>
        <div className="code-ltr text-[11px] text-muted font-mono pt-2 border-t border-subtle flex flex-wrap gap-4" dir="ltr">
          <span>ARCH: Desktop-Class Web SPA</span>
          <span>PERSISTENCE: IndexedDB API</span>
          <span>I18N: EN + FA (Bidi-Compliant)</span>
          <span>STATUS: Stable Foundation v0.1.0</span>
        </div>
      </div>
    </div>
  );
};
