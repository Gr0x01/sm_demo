export interface Option {
  id: string;
  name: string;
  price: number;
  swatchUrl?: string;
  swatchColor?: string;
  promptDescriptor?: string;
  nudge?: string;
  generationRules?: string[];
  isDefault?: boolean;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  isVisual: boolean;
  isAdditive?: boolean;   // quantity selector instead of radio (e.g. outlets)
  unitLabel?: string;      // e.g. "outlet", "pack", "sq ft"
  maxQuantity?: number;    // cap the stepper (default 10)
  generationHint?: 'default' | 'skip' | 'always_send';
  generationRules?: string[];
  isAppliance?: boolean;
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
  generatedImageUrls: Record<string, string>; // photoKey → imageUrl (photoKey = stepPhoto.id for multi-tenant, step.id for SM)
  generatingPhotoKeys: Set<string>; // multi-tenant: photoKeys currently generating
  hasEverGenerated: boolean;
  generatedWithSelections: Record<string, string>; // photoKey → fingerprint (JSON snapshot of visual selections at generation time)
  generatedImageIds: Record<string, string>; // photoKey → generated_image UUID/bigint from DB
  generationCredits: { used: number; total: number } | null;
  errors: Record<string, string>; // photoKey → error message
}

// ---------- Admin types ----------

export interface OrgUser {
  id: string;
  userId: string;
  orgId: string;
  role: "admin" | "viewer";
}

export interface AdminOption {
  id: string;
  slug: string;
  subcategory_id: string;
  org_id: string;
  name: string;
  price: number;
  description: string | null;
  prompt_descriptor: string | null;
  swatch_url: string | null;
  swatch_color: string | null;
  nudge: string | null;
  is_default: boolean;
  sort_order: number;
  floorplan_ids: string[];
}

export interface AdminSubcategory {
  id: string;
  slug: string;
  category_id: string;
  org_id: string;
  name: string;
  is_visual: boolean;
  is_additive: boolean;
  unit_label: string | null;
  max_quantity: number | null;
  sort_order: number;
  floorplan_ids: string[];
  options: AdminOption[];
}

export interface AdminCategory {
  id: string;
  slug: string;
  org_id: string;
  name: string;
  sort_order: number;
  subcategories: AdminSubcategory[];
}

// ---------- Admin floorplan/step/photo types ----------

export interface AdminFloorplan {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  community: string | null;
  price_sheet_label: string | null;
  is_active: boolean;
  cover_image_path: string | null;
}

export interface AdminStepSection {
  title: string;
  subcategory_ids: string[];
  sort_order: number;
}

export interface AdminStepPhoto {
  id: string;
  step_id: string;
  org_id: string;
  image_path: string;
  label: string;
  is_hero: boolean;
  sort_order: number;
  subcategory_ids: string[] | null;
  check_result: "pass" | "warn" | "fail" | null;
  check_feedback: string | null;
  check_raw_response: Record<string, unknown> | null;
  checked_at: string | null;
  spatial_hint: string | null;
  photo_baseline: string | null;
  created_at: string;
}

export interface AdminStep {
  id: string;
  slug: string;
  org_id: string;
  floorplan_id: string;
  number: number;
  name: string;
  subtitle: string | null;
  hero_image: string | null;
  hero_variant: string | null;
  show_generate_button: boolean;
  scene_description: string | null;
  also_include_ids: string[];
  photo_baseline: Record<string, string> | null;
  spatial_hints: Record<string, string> | null;
  sort_order: number;
  sections: AdminStepSection[];
  step_photos?: AdminStepPhoto[];
  photo_count?: number;
}

// ---------- Selection types ----------

export type SelectionAction =
  | { type: "SELECT_OPTION"; subCategoryId: string; optionId: string }
  | { type: "SET_QUANTITY"; subCategoryId: string; quantity: number; addOptionId: string; noUpgradeOptionId: string }
  | { type: "LOAD_SELECTIONS"; selections: Record<string, string>; quantities: Record<string, number> }
  | { type: "CLEAR_SELECTIONS" }
  | { type: "START_GENERATING_PHOTO"; photoKey: string }
  | { type: "PHOTO_GENERATION_COMPLETE"; photoKey: string; imageUrl: string; selectionsSnapshot: string; generatedImageId: string }
  | { type: "PHOTO_GENERATION_ERROR"; photoKey: string; error: string }
  | { type: "REMOVE_GENERATED_IMAGE"; photoKey: string }
  | { type: "SET_CREDITS"; used: number; total: number };

// ---------- Buyer session types ----------

export interface BuyerSession {
  id: string;
  orgId: string;
  floorplanId: string;
  buyerEmail: string | null;
  resumeToken: string | null;
  selections: Record<string, string>;
  quantities: Record<string, number>;
  totalPrice: number;
  generationCount: number;
  status: 'in_progress' | 'submitted';
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerSessionSummary {
  id: string;
  buyerEmail: string | null;
  floorplanName: string;
  totalPrice: number;
  selectionCount: number;
  generationCount: number;
  status: 'in_progress' | 'submitted';
  updatedAt: string;
}
