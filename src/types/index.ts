export interface Option {
  id: string;
  name: string;
  price: number;
  swatchUrl?: string;
  promptDescriptor?: string;
  nudge?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  isVisual: boolean;
  options: Option[];
}

export interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

export interface SelectionState {
  selections: Record<string, string>; // subCategoryId → optionId
  generatedImageUrl: string | null;
  isGenerating: boolean;
  hasEverGenerated: boolean;
  visualSelectionsChangedSinceLastGenerate: boolean;
  error: string | null;
}

export type SelectionAction =
  | { type: "SELECT_OPTION"; subCategoryId: string; optionId: string }
  | { type: "START_GENERATING" }
  | { type: "GENERATION_COMPLETE"; imageUrl: string }
  | { type: "GENERATION_ERROR"; error: string };
