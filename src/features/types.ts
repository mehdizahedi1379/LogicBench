import React from 'react';
import { TranslationDictionary } from '../i18n/types';

export type FeatureCategory = 
  | 'tools'
  | 'microcontrollers'
  | 'learn'
  | 'notes'
  | 'library'
  | 'settings';

export interface FeatureContextProps {
  tabId: string;
  isDirty?: boolean;
  markDirty?: (dirty: boolean) => void;
  updateTitle?: (title: string) => void;
}

export interface FeatureDefinition {
  id: string;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  category: FeatureCategory;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<FeatureContextProps>;
  shortcut?: string;
  keywords?: string[];
  badge?: string;
  singleton?: boolean; // If true, only one tab of this feature can be open at a time
}

export type I18nKeyAccessor = (t: TranslationDictionary) => string;
