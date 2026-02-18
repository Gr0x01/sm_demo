export interface Option {
  id: string;
  name: string;
  price: number;
  swatchUrl?: string;
  swatchColor?: string;
  promptDescriptor?: string;
  nudge?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  isVisual: boolean;
  isAdditive?: boolean;   // quantity selector instead of radio (e.g. outlets)
  unitLabel?: string;      // e.g. "outlet", "pack", "sq ft"
  maxQuantity?: number;    // cap the stepper (default 10)
  options: Option[];
}

export interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

export interface SelectionState {
  selections: Record<string, string>; // subCategoryId → optionId
  quantities: Record<string, number>; // subCategoryId → quantity (additive items only)
  generatedImageUrls: Record<string, string>; // stepId → imageUrl
  generatingStepId: string | null; // which step is currently generating (null = idle)
  hasEverGenerated: boolean;
  generatedWithSelections: Record<string, string>; // stepId → JSON snapshot of visual selections at generation time
  error: string | null;
}

export type SelectionAction =
  | { type: "SELECT_OPTION"; subCategoryId: string; optionId: string }
  | { type: "SET_QUANTITY"; subCategoryId: string; quantity: number; addOptionId: string; noUpgradeOptionId: string }
  | { type: "LOAD_SELECTIONS"; selections: Record<string, string>; quantities: Record<string, number> }
  | { type: "START_GENERATING"; stepId: string }
  | { type: "GENERATION_COMPLETE"; stepId: string; imageUrl: string; selectionsSnapshot: string }
  | { type: "GENERATION_ERROR"; error: string }
  | { type: "CLEAR_SELECTIONS" };
