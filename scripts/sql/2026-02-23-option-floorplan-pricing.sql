-- Per-floorplan pricing overrides for options.
-- Allows the same option catalog to have different prices per floorplan.
-- Apply in Supabase SQL editor. Re-runnable (idempotent).

create table if not exists public.option_floorplan_pricing (
  option_id uuid not null references public.options(id) on delete cascade,
  floorplan_id uuid not null references public.floorplans(id) on delete cascade,
  price integer not null check (price >= 0),
  primary key (option_id, floorplan_id)
);

create index if not exists option_floorplan_pricing_floorplan_idx
  on public.option_floorplan_pricing (floorplan_id);

-- RLS: service role bypasses (buyer-facing reads), admin write via org_users join.
-- Both floorplan AND option must belong to the admin's org.
alter table public.option_floorplan_pricing enable row level security;

drop policy if exists "Admin can read pricing overrides" on public.option_floorplan_pricing;
create policy "Admin can read pricing overrides"
  on public.option_floorplan_pricing for select
  using (
    exists (
      select 1 from public.floorplans f
      join public.org_users ou on ou.org_id = f.org_id
      where f.id = floorplan_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
    and exists (
      select 1 from public.options o
      where o.id = option_id
        and o.org_id = (select f2.org_id from public.floorplans f2 where f2.id = floorplan_id)
    )
  );

drop policy if exists "Admin can insert pricing overrides" on public.option_floorplan_pricing;
create policy "Admin can insert pricing overrides"
  on public.option_floorplan_pricing for insert
  with check (
    exists (
      select 1 from public.floorplans f
      join public.org_users ou on ou.org_id = f.org_id
      where f.id = floorplan_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
    and exists (
      select 1 from public.options o
      where o.id = option_id
        and o.org_id = (select f2.org_id from public.floorplans f2 where f2.id = floorplan_id)
    )
  );

drop policy if exists "Admin can update pricing overrides" on public.option_floorplan_pricing;
create policy "Admin can update pricing overrides"
  on public.option_floorplan_pricing for update
  using (
    exists (
      select 1 from public.floorplans f
      join public.org_users ou on ou.org_id = f.org_id
      where f.id = floorplan_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
    and exists (
      select 1 from public.options o
      where o.id = option_id
        and o.org_id = (select f2.org_id from public.floorplans f2 where f2.id = floorplan_id)
    )
  );

drop policy if exists "Admin can delete pricing overrides" on public.option_floorplan_pricing;
create policy "Admin can delete pricing overrides"
  on public.option_floorplan_pricing for delete
  using (
    exists (
      select 1 from public.floorplans f
      join public.org_users ou on ou.org_id = f.org_id
      where f.id = floorplan_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
    and exists (
      select 1 from public.options o
      where o.id = option_id
        and o.org_id = (select f2.org_id from public.floorplans f2 where f2.id = floorplan_id)
    )
  );
