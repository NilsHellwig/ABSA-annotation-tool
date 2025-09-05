// Type definitions for ABSA Annotation Tool

export interface AspectItem {
  aspect_term: string;
  aspect_category: string;
  sentiment_polarity: string;
  opinion_term: string;
  at_start?: number;
  at_end?: number;
  ot_start?: number;
  ot_end?: number;
}

export interface NewAspect {
  aspect_term: string;
  aspect_category: string;
  sentiment_polarity: string;
  opinion_term: string;
  at_start?: number;
  at_end?: number;
  ot_start?: number;
  ot_end?: number;
}

export interface AnnotationData {
  text: string;
  translation?: string;
  label?: AspectItem[];
}

export interface Settings {
  current_index: number;
  max_index: number;
  total_count: number;
  session_id: string | null;
  sentiment_elements: string[];
  sentiment_polarity_options: string[];
  aspect_categories: string[];
  implicit_aspect_term_allowed: boolean;
  implicit_opinion_term_allowed: boolean;
  auto_clean_phrases: boolean;
  save_phrase_positions: boolean;
  click_on_token: boolean;
}

export interface ColorClasses {
  bg: string;
  text: string;
  border: string;
}

export interface CleanedPositions {
  start: number;
  end: number;
}

// Vite env types
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Field types for forms
export type FieldType = 'aspect_term' | 'opinion_term' | 'aspect_category' | 'sentiment_polarity';

// Position interface for text selection
export interface TextPosition {
  startChar: number | null;
  endChar: number | null;
}
