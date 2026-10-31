/**
 * Keyboard shortcuts utility and listener definitions
 */

export interface ShortcutItem {
  id: string;
  keyCombo: string;
  displayCombo: string;
  category: 'general' | 'tabs' | 'editor';
  descriptionKey: string;
  handlerName: string;
}

export const SHORTCUT_REGISTRY: ShortcutItem[] = [
  {
    id: 'command-palette',
    keyCombo: 'ctrl+k',
    displayCombo: 'Ctrl + K',
    category: 'general',
    descriptionKey: 'shortcuts.keyCommandPalette',
    handlerName: 'toggleCommandPalette',
  },
  {
    id: 'new-note',
    keyCombo: 'ctrl+n',
    displayCombo: 'Ctrl + N',
    category: 'editor',
    descriptionKey: 'shortcuts.keyNewNote',
    handlerName: 'newDocument',
  },
  {
    id: 'save',
    keyCombo: 'ctrl+s',
    displayCombo: 'Ctrl + S',
    category: 'editor',
    descriptionKey: 'shortcuts.keySave',
    handlerName: 'saveActiveTab',
  },
  {
    id: 'find',
    keyCombo: 'ctrl+f',
    displayCombo: 'Ctrl + F',
    category: 'editor',
    descriptionKey: 'shortcuts.keyFind',
    handlerName: 'findInTool',
  },
  {
    id: 'next-tab',
    keyCombo: 'ctrl+tab',
    displayCombo: 'Ctrl + Tab',
    category: 'tabs',
    descriptionKey: 'shortcuts.keyNextTab',
    handlerName: 'nextTab',
  },
  {
    id: 'prev-tab',
    keyCombo: 'ctrl+shift+tab',
    displayCombo: 'Ctrl + Shift + Tab',
    category: 'tabs',
    descriptionKey: 'shortcuts.keyPrevTab',
    handlerName: 'prevTab',
  },
  {
    id: 'close-tab',
    keyCombo: 'ctrl+w',
    displayCombo: 'Ctrl + W',
    category: 'tabs',
    descriptionKey: 'shortcuts.keyCloseTab',
    handlerName: 'closeActiveTab',
  },
  {
    id: 'toggle-sidebar',
    keyCombo: 'ctrl+b',
    displayCombo: 'Ctrl + B',
    category: 'general',
    descriptionKey: 'shortcuts.keyToggleSidebar',
    handlerName: 'toggleSidebar',
  },
  {
    id: 'shortcuts-help',
    keyCombo: 'ctrl+/',
    displayCombo: 'Ctrl + /',
    category: 'general',
    descriptionKey: 'shortcuts.keyShortcutsHelp',
    handlerName: 'toggleShortcutsHelp',
  },
];
