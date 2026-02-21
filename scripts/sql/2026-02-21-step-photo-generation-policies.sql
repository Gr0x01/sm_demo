-- Internal-only per-photo generation policies.
-- Apply in Supabase SQL editor (or your migration pipeline).

create table if not exists public.step_photo_generation_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  step_photo_id uuid not null references public.step_photos(id) on delete cascade,
  policy_key text not null,
  is_active boolean not null default true,
  policy_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_photo_generation_policies_unique unique (org_id, step_photo_id, policy_key),
  constraint step_photo_generation_policies_policy_json_object check (jsonb_typeof(policy_json) = 'object')
);

create index if not exists step_photo_generation_policies_org_photo_idx
  on public.step_photo_generation_policies (org_id, step_photo_id);

create index if not exists step_photo_generation_policies_active_idx
  on public.step_photo_generation_policies (is_active);
