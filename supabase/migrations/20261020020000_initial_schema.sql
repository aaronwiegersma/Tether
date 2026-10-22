-- Toolbox initial schema
-- Purpose: multi-tenant tool and asset tracking with RLS, public tag tokens,
-- plan limits, and room for Bluetooth/GPS devices later.
-- Affected: organizations, profiles, memberships, invitations, plans,
-- subscriptions, locations, categories, assets, financials, assignments,
-- movements, requests, activity, tracking_devices, storage.objects.
-- Service-role access is reserved for migrations, dashboard, and the explicit
-- development seed script. Application code uses the signed-in user.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'manager', 'employee');

create type public.asset_status as enum (
  'available',
  'checked_out',
  'in_use',
  'missing',
  'under_repair',
  'retired'
);

create type public.tracking_method as enum (
  'standard_label',
  'qr',
  'nfc',
  'bluetooth',
  'gps'
);

create type public.request_type as enum ('existing_tool', 'new_tool');

create type public.request_status as enum (
  'pending',
  'approved',
  'rejected',
  'fulfilled'
);

create type public.plan_tier as enum ('free', 'starter', 'business', 'enterprise');

create type public.device_type as enum ('bluetooth', 'gps');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for each auth user. One row per person, shared across organizations they join.';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  public_return_location boolean not null default true,
  next_asset_number integer not null default 1,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(trim(name)) between 2 and 80)
);

comment on table public.organizations is
  'A tenant. All business data hangs off organization_id. public_return_location controls the public tag page.';

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'employee',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Membership and role for a user inside one organization.';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.member_role not null default 'employee',
  token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  invited_by uuid references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_not_owner check (role <> 'owner'),
  constraint invitations_email_present check (char_length(trim(email)) > 3)
);

comment on table public.invitations is
  'Email invitations. The token is the secret. Accepting requires the signed-in email to match.';

create table public.plan_definitions (
  tier public.plan_tier primary key,
  name text not null,
  asset_limit integer not null,
  description text not null,
  constraint plan_definitions_limit_positive check (asset_limit > 0)
);

comment on table public.plan_definitions is
  'Catalog of plans. Asset limits are configurable here. Stripe is not connected yet.';

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan public.plan_tier not null default 'free',
  asset_limit integer not null default 10,
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_known check (
    status in ('active', 'trialing', 'past_due', 'canceled')
  ),
  constraint subscriptions_limit_positive check (asset_limit > 0)
);

comment on table public.subscriptions is
  'Per-organization plan. asset_limit is enforced on the server. Stripe ids are reserved for later.';

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  description text,
  color text not null default '#2563eb',
  icon text not null default 'circle',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_name_length check (char_length(trim(name)) between 1 and 80),
  constraint locations_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

comment on table public.locations is
  'Logical places such as a workshop, warehouse, truck, or job site. Colour and icon appear on labels.';

create table public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  constraint asset_categories_name_length check (char_length(trim(name)) between 1 and 60)
);

comment on table public.asset_categories is 'Organization-specific asset categories.';

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_code text not null,
  public_token text not null unique,
  name text not null,
  category_id uuid references public.asset_categories (id) on delete set null,
  description text,
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  photo_path text,
  home_location_id uuid references public.locations (id) on delete set null,
  current_location_id uuid references public.locations (id) on delete set null,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  status public.asset_status not null default 'available',
  tracking_method public.tracking_method not null default 'qr',
  notes text,
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  away_from_home boolean generated always as (
    status <> 'retired'::public.asset_status
    and current_location_id is distinct from home_location_id
  ) stored,
  unique (organization_id, asset_code),
  constraint assets_name_length check (char_length(trim(name)) between 1 and 120)
);

comment on table public.assets is
  'A tracked tool or piece of equipment. Home location is permanent. Current location is where it is now. public_token is the unguessable QR/NFC id.';

comment on column public.assets.away_from_home is
  'True when the tool is not retired and its current location differs from its home, including when the current location is unknown.';

create table public.asset_financials (
  asset_id uuid primary key references public.assets (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_price numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_financials_price_nonnegative check (
    purchase_price is null or purchase_price >= 0
  )
);

comment on table public.asset_financials is
  'Purchase price, separated so employees and the public tag cannot read it through row level security.';

create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  checked_out_at timestamptz not null default now(),
  checked_in_at timestamptz,
  location_id uuid references public.locations (id) on delete set null,
  returned_location_id uuid references public.locations (id) on delete set null,
  notes text
);

comment on table public.asset_assignments is
  'Checkout history. An open assignment has checked_in_at null.';

create table public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  from_location_id uuid references public.locations (id) on delete set null,
  to_location_id uuid references public.locations (id) on delete set null,
  moved_by uuid references public.profiles (id),
  movement_type text not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint asset_movements_type_known check (
    movement_type in ('created', 'checkout', 'return', 'move', 'status_change')
  )
);

comment on table public.asset_movements is
  'Location history. Moving a tool never changes its home location.';

create table public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  request_type public.request_type not null,
  asset_id uuid references public.assets (id) on delete set null,
  tool_name text,
  description text,
  quantity integer not null default 1,
  location_id uuid references public.locations (id) on delete set null,
  reason text,
  product_url text,
  estimated_cost numeric(12, 2),
  status public.request_status not null default 'pending',
  requested_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_requests_quantity_positive check (quantity > 0),
  constraint asset_requests_cost_nonnegative check (
    estimated_cost is null or estimated_cost >= 0
  )
);

comment on table public.asset_requests is
  'Requests for an existing tool or for purchasing a new one.';

create table public.asset_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid references public.assets (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action_type text not null,
  summary text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

comment on table public.asset_activity is
  'Audit timeline. Employees do not see team, billing, or organization admin events.';

create table public.tracking_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_id uuid references public.assets (id) on delete set null,
  device_type public.device_type not null,
  manufacturer text,
  device_identifier text,
  battery_status text,
  last_seen timestamptz,
  last_latitude double precision,
  last_longitude double precision,
  external_provider_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tracking_devices is
  'Reserved for future Bluetooth tags and GPS devices. The app does not write this table and does not simulate hardware.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index organization_members_user_idx
  on public.organization_members (user_id);

create index locations_org_idx
  on public.locations (organization_id);

create index asset_categories_org_idx
  on public.asset_categories (organization_id);

create index assets_org_idx
  on public.assets (organization_id);

create index assets_org_status_idx
  on public.assets (organization_id, status);

create index assets_home_location_idx
  on public.assets (home_location_id);

create index assets_current_location_idx
  on public.assets (current_location_id);

create index assets_assigned_user_idx
  on public.assets (assigned_user_id);

create index assets_away_idx
  on public.assets (organization_id)
  where away_from_home and archived_at is null;

create index asset_financials_org_idx
  on public.asset_financials (organization_id);

create index asset_assignments_asset_idx
  on public.asset_assignments (asset_id, checked_out_at desc);

create index asset_movements_asset_idx
  on public.asset_movements (asset_id, created_at desc);

create index asset_requests_org_status_idx
  on public.asset_requests (organization_id, status, created_at desc);

create index asset_activity_org_idx
  on public.asset_activity (organization_id, created_at desc);

create index asset_activity_asset_idx
  on public.asset_activity (asset_id, created_at desc);

create index invitations_org_idx
  on public.invitations (organization_id);

create index tracking_devices_asset_idx
  on public.tracking_devices (asset_id);

create index tracking_devices_org_idx
  on public.tracking_devices (organization_id);

-- ---------------------------------------------------------------------------
-- Auth helpers
-- security definer so policies can read membership without recursive RLS.
-- auth.uid() is wrapped in a subquery so Postgres can cache it per statement.
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role(target_org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role::text
  from public.organization_members as m
  where m.organization_id = target_org
    and m.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role(target_org) is not null;
$$;

create or replace function public.can_manage(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role(target_org) in ('owner', 'manager');
$$;

create or replace function public.is_owner(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role(target_org) = 'owner';
$$;

-- ---------------------------------------------------------------------------
-- Profile bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Organization lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(org_name text, owner_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  new_id uuid := gen_random_uuid();
  base_slug text;
  final_slug text;
  suffix integer := 0;
  free_limit integer;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  if org_name is null or char_length(trim(org_name)) < 2 or char_length(trim(org_name)) > 80 then
    raise exception 'invalid_name';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(trim(coalesce(owner_name, '')), ''), full_name),
    updated_at = now()
  where id = actor;

  base_slug := trim(both '-' from regexp_replace(lower(trim(org_name)), '[^a-z0-9]+', '-', 'g'));
  if base_slug is null or base_slug = '' then
    base_slug := 'company';
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.organizations as o where o.slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  select p.asset_limit
  into free_limit
  from public.plan_definitions as p
  where p.tier = 'free';

  if free_limit is null then
    free_limit := 10;
  end if;

  insert into public.organizations (id, name, slug, created_by)
  values (new_id, trim(org_name), final_slug, actor);

  insert into public.organization_members (organization_id, user_id, role)
  values (new_id, actor, 'owner');

  insert into public.subscriptions (organization_id, plan, asset_limit, status)
  values (new_id, 'free', free_limit, 'active');

  insert into public.asset_activity (
    organization_id,
    actor_id,
    action_type,
    summary,
    new_value
  )
  values (
    new_id,
    actor,
    'organization_created',
    'Company created',
    jsonb_build_object('name', trim(org_name))
  );

  return new_id;
end;
$$;

create or replace function public.update_organization(
  target_org uuid,
  org_name text,
  show_return_location boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  previous jsonb;
begin
  if actor is null or not public.is_owner(target_org) then
    raise exception 'forbidden';
  end if;

  if org_name is null or char_length(trim(org_name)) < 2 or char_length(trim(org_name)) > 80 then
    raise exception 'invalid_name';
  end if;

  select jsonb_build_object(
    'name', o.name,
    'public_return_location', o.public_return_location
  )
  into previous
  from public.organizations as o
  where o.id = target_org;

  update public.organizations
  set
    name = trim(org_name),
    public_return_location = coalesce(show_return_location, public_return_location),
    updated_at = now()
  where id = target_org;

  insert into public.asset_activity (
    organization_id,
    actor_id,
    action_type,
    summary,
    previous_value,
    new_value
  )
  values (
    target_org,
    actor,
    'organization_updated',
    'Company settings updated',
    previous,
    jsonb_build_object(
      'name', trim(org_name),
      'public_return_location', show_return_location
    )
  );
end;
$$;

create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  invite public.invitations;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into invite
  from public.invitations
  where token = invite_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'invalid_invitation';
  end if;

  select email into actor_email from public.profiles where id = actor;

  if actor_email is null or lower(actor_email) <> lower(invite.email) then
    raise exception 'email_mismatch';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invite.organization_id, actor, invite.role)
  on conflict (organization_id, user_id) do update
    set role = excluded.role;

  update public.invitations
  set accepted_at = now()
  where id = invite.id;

  insert into public.asset_activity (
    organization_id,
    actor_id,
    action_type,
    summary,
    new_value
  )
  values (
    invite.organization_id,
    actor,
    'team_member_joined',
    'Invitation accepted',
    jsonb_build_object('role', invite.role)
  );

  return invite.organization_id;
end;
$$;

create or replace function public.update_member_role(target_member uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  member public.organization_members;
  owner_count integer;
  next_role public.member_role;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  if new_role not in ('owner', 'manager', 'employee') then
    raise exception 'invalid_role';
  end if;

  next_role := new_role::public.member_role;

  select *
  into member
  from public.organization_members
  where id = target_member;

  if not found or not public.is_owner(member.organization_id) then
    raise exception 'forbidden';
  end if;

  if member.role = 'owner' and next_role <> 'owner' then
    select count(*)
    into owner_count
    from public.organization_members
    where organization_id = member.organization_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'last_owner';
    end if;
  end if;

  update public.organization_members
  set role = next_role
  where id = member.id;

  insert into public.asset_activity (
    organization_id,
    actor_id,
    action_type,
    summary,
    previous_value,
    new_value
  )
  values (
    member.organization_id,
    actor,
    'team_role_changed',
    'Team role updated',
    jsonb_build_object('user_id', member.user_id, 'role', member.role),
    jsonb_build_object('user_id', member.user_id, 'role', next_role)
  );
end;
$$;

create or replace function public.remove_member(target_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  member public.organization_members;
  owner_count integer;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into member
  from public.organization_members
  where id = target_member;

  if not found or not public.is_owner(member.organization_id) then
    raise exception 'forbidden';
  end if;

  if member.user_id = actor then
    raise exception 'cannot_remove_self';
  end if;

  if member.role = 'owner' then
    select count(*)
    into owner_count
    from public.organization_members
    where organization_id = member.organization_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'last_owner';
    end if;
  end if;

  delete from public.organization_members
  where id = member.id;

  insert into public.asset_activity (
    organization_id,
    actor_id,
    action_type,
    summary,
    previous_value
  )
  values (
    member.organization_id,
    actor,
    'team_member_removed',
    'Team member removed',
    jsonb_build_object('user_id', member.user_id, 'role', member.role)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------

create or replace function public.assets_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number integer;
  plan_limit integer;
  active_count integer;
  related_org uuid;
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'organization_immutable';
  end if;

  if tg_op = 'INSERT' then
    if new.public_token is null or char_length(trim(new.public_token)) < 20 then
      new.public_token :=
        replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    end if;

    if new.asset_code is null or char_length(trim(new.asset_code)) = 0 then
      update public.organizations
      set next_asset_number = next_asset_number + 1
      where id = new.organization_id
      returning next_asset_number - 1 into next_number;

      if next_number is null then
        raise exception 'invalid_organization';
      end if;

      new.asset_code := 'AST-' || lpad(next_number::text, 4, '0');
    end if;

    if new.created_by is null then
      new.created_by := (select auth.uid());
    end if;
  end if;

  if new.home_location_id is not null then
    select organization_id into related_org
    from public.locations
    where id = new.home_location_id;

    if related_org is distinct from new.organization_id then
      raise exception 'invalid_location';
    end if;
  end if;

  if new.current_location_id is not null then
    select organization_id into related_org
    from public.locations
    where id = new.current_location_id;

    if related_org is distinct from new.organization_id then
      raise exception 'invalid_location';
    end if;
  end if;

  if new.category_id is not null then
    select organization_id into related_org
    from public.asset_categories
    where id = new.category_id;

    if related_org is distinct from new.organization_id then
      raise exception 'invalid_category';
    end if;
  end if;

  if new.assigned_user_id is not null then
    if not exists (
      select 1
      from public.organization_members
      where organization_id = new.organization_id
        and user_id = new.assigned_user_id
    ) then
      raise exception 'invalid_assignee';
    end if;
  end if;

  if tg_op = 'INSERT'
    or (tg_op = 'UPDATE' and old.archived_at is not null and new.archived_at is null) then
    select s.asset_limit
    into plan_limit
    from public.subscriptions as s
    where s.organization_id = new.organization_id;

    if plan_limit is null then
      plan_limit := 10;
    end if;

    select count(*)
    into active_count
    from public.assets as a
    where a.organization_id = new.organization_id
      and a.archived_at is null;

    if active_count >= plan_limit then
      raise exception 'asset_limit_reached';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger assets_before_write
  before insert or update on public.assets
  for each row
  execute function public.assets_before_write();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger locations_touch_updated_at
  before update on public.locations
  for each row
  execute function public.touch_updated_at();

create trigger organizations_touch_updated_at
  before update on public.organizations
  for each row
  execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row
  execute function public.touch_updated_at();

create trigger financials_touch_updated_at
  before update on public.asset_financials
  for each row
  execute function public.touch_updated_at();

create trigger requests_touch_updated_at
  before update on public.asset_requests
  for each row
  execute function public.touch_updated_at();

create trigger devices_touch_updated_at
  before update on public.tracking_devices
  for each row
  execute function public.touch_updated_at();

create or replace function public.reject_organization_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_immutable';
  end if;
  return new;
end;
$$;

create trigger locations_org_immutable
  before update on public.locations
  for each row
  execute function public.reject_organization_change();

create trigger categories_org_immutable
  before update on public.asset_categories
  for each row
  execute function public.reject_organization_change();

create trigger requests_org_immutable
  before update on public.asset_requests
  for each row
  execute function public.reject_organization_change();

create or replace function public.requests_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  related_org uuid;
begin
  if new.asset_id is not null then
    select organization_id into related_org
    from public.assets
    where id = new.asset_id;

    if related_org is distinct from new.organization_id then
      raise exception 'invalid_asset';
    end if;
  end if;

  if new.location_id is not null then
    select organization_id into related_org
    from public.locations
    where id = new.location_id;

    if related_org is distinct from new.organization_id then
      raise exception 'invalid_location';
    end if;
  end if;

  if new.request_type = 'existing_tool' and new.asset_id is null then
    raise exception 'asset_required';
  end if;

  if new.request_type = 'new_tool'
    and (new.tool_name is null or char_length(trim(new.tool_name)) = 0) then
    raise exception 'name_required';
  end if;

  if new.requested_by is null then
    new.requested_by := (select auth.uid());
  end if;

  return new;
end;
$$;

create trigger requests_before_write
  before insert or update on public.asset_requests
  for each row
  execute function public.requests_before_write();

create or replace function public.financials_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset_org uuid;
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'organization_immutable';
  end if;

  select organization_id
  into asset_org
  from public.assets
  where id = new.asset_id;

  if asset_org is distinct from new.organization_id then
    raise exception 'invalid_asset';
  end if;

  return new;
end;
$$;

create trigger financials_before_write
  before insert or update on public.asset_financials
  for each row
  execute function public.financials_before_write();

create or replace function public.requests_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.asset_activity (
      organization_id,
      asset_id,
      actor_id,
      action_type,
      summary,
      new_value
    )
    values (
      new.organization_id,
      new.asset_id,
      new.requested_by,
      'request_submitted',
      case
        when new.request_type = 'new_tool' then 'Requested a new tool'
        else 'Requested an existing tool'
      end,
      jsonb_build_object('request_id', new.id, 'status', new.status)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.asset_activity (
      organization_id,
      asset_id,
      actor_id,
      action_type,
      summary,
      previous_value,
      new_value
    )
    values (
      new.organization_id,
      new.asset_id,
      (select auth.uid()),
      'request_' || new.status::text,
      'Request ' || new.status::text,
      jsonb_build_object('status', old.status),
      jsonb_build_object('request_id', new.id, 'status', new.status)
    );
  end if;

  return new;
end;
$$;

create trigger requests_after_write
  after insert or update on public.asset_requests
  for each row
  execute function public.requests_after_write();

-- Shared lookup used by checkout, return, move, and problem reports.
create or replace function public.lock_member_asset(target_asset uuid)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  asset public.assets;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into asset
  from public.assets
  where id = target_asset
    and archived_at is null
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if public.current_user_role(asset.organization_id) is null then
    raise exception 'forbidden';
  end if;

  return asset;
end;
$$;

create or replace function public.location_in_org(target_location uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locations
    where id = target_location
      and organization_id = target_org
      and archived_at is null
  );
$$;

create or replace function public.checkout_asset(
  target_asset uuid,
  assignee uuid,
  at_location uuid,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  asset public.assets;
  clean_note text := nullif(trim(coalesce(note, '')), '');
begin
  asset := public.lock_member_asset(target_asset);
  actor_role := public.current_user_role(asset.organization_id);

  if asset.status = 'retired' then
    raise exception 'retired_asset';
  end if;

  if assignee is null then
    assignee := actor;
  end if;

  if actor_role = 'employee' and assignee is distinct from actor then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = asset.organization_id
      and user_id = assignee
  ) then
    raise exception 'invalid_assignee';
  end if;

  if at_location is not null and not public.location_in_org(at_location, asset.organization_id) then
    raise exception 'invalid_location';
  end if;

  update public.asset_assignments
  set
    checked_in_at = now(),
    returned_location_id = coalesce(at_location, asset.current_location_id)
  where asset_id = asset.id
    and checked_in_at is null;

  insert into public.asset_assignments (
    organization_id,
    asset_id,
    user_id,
    location_id,
    notes
  )
  values (
    asset.organization_id,
    asset.id,
    assignee,
    coalesce(at_location, asset.current_location_id),
    clean_note
  );

  insert into public.asset_movements (
    organization_id,
    asset_id,
    from_location_id,
    to_location_id,
    moved_by,
    movement_type,
    notes
  )
  values (
    asset.organization_id,
    asset.id,
    asset.current_location_id,
    coalesce(at_location, asset.current_location_id),
    actor,
    'checkout',
    clean_note
  );

  update public.assets
  set
    assigned_user_id = assignee,
    status = 'checked_out',
    current_location_id = coalesce(at_location, current_location_id)
  where id = asset.id;

  insert into public.asset_activity (
    organization_id,
    asset_id,
    actor_id,
    action_type,
    summary,
    previous_value,
    new_value
  )
  values (
    asset.organization_id,
    asset.id,
    actor,
    'asset_checked_out',
    'Checked out',
    jsonb_build_object(
      'status', asset.status,
      'assigned_user_id', asset.assigned_user_id,
      'current_location_id', asset.current_location_id
    ),
    jsonb_build_object(
      'status', 'checked_out',
      'assigned_user_id', assignee,
      'current_location_id', coalesce(at_location, asset.current_location_id),
      'note', clean_note
    )
  );

  return asset.id;
end;
$$;

create or replace function public.return_asset(
  target_asset uuid,
  to_location uuid,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  asset public.assets;
  clean_note text := nullif(trim(coalesce(note, '')), '');
  away boolean;
begin
  asset := public.lock_member_asset(target_asset);

  if to_location is null or not public.location_in_org(to_location, asset.organization_id) then
    raise exception 'invalid_location';
  end if;

  away := asset.home_location_id is distinct from to_location;

  update public.asset_assignments
  set
    checked_in_at = now(),
    returned_location_id = to_location,
    notes = coalesce(clean_note, notes)
  where asset_id = asset.id
    and checked_in_at is null;

  insert into public.asset_movements (
    organization_id,
    asset_id,
    from_location_id,
    to_location_id,
    moved_by,
    movement_type,
    notes
  )
  values (
    asset.organization_id,
    asset.id,
    asset.current_location_id,
    to_location,
    actor,
    'return',
    clean_note
  );

  update public.assets
  set
    assigned_user_id = null,
    status = 'available',
    current_location_id = to_location
  where id = asset.id;

  insert into public.asset_activity (
    organization_id,
    asset_id,
    actor_id,
    action_type,
    summary,
    previous_value,
    new_value
  )
  values (
    asset.organization_id,
    asset.id,
    actor,
    'asset_returned',
    case
      when away then 'Returned away from home'
      else 'Returned home'
    end,
    jsonb_build_object(
      'status', asset.status,
      'assigned_user_id', asset.assigned_user_id,
      'current_location_id', asset.current_location_id
    ),
    jsonb_build_object(
      'status', 'available',
      'assigned_user_id', null,
      'current_location_id', to_location,
      'away_from_home', away,
      'note', clean_note
    )
  );

  return asset.id;
end;
$$;

create or replace function public.move_asset(
  target_asset uuid,
  to_location uuid,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  asset public.assets;
  clean_note text := nullif(trim(coalesce(note, '')), '');
begin
  asset := public.lock_member_asset(target_asset);

  if to_location is null or not public.location_in_org(to_location, asset.organization_id) then
    raise exception 'invalid_location';
  end if;

  if asset.home_location_id is distinct from (
    select home_location_id from public.assets where id = asset.id
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.asset_movements (
    organization_id,
    asset_id,
    from_location_id,
    to_location_id,
    moved_by,
    movement_type,
    notes
  )
  values (
    asset.organization_id,
    asset.id,
    asset.current_location_id,
    to_location,
    actor,
    'move',
    clean_note
  );

  -- Home location is intentionally left unchanged.
  update public.assets
  set current_location_id = to_location
  where id = asset.id;

  insert into public.asset_activity (
    organization_id,
    asset_id,
    actor_id,
    action_type,
    summary,
    previous_value,
    new_value
  )
  values (
    asset.organization_id,
    asset.id,
    actor,
    'asset_moved',
    'Current location changed',
    jsonb_build_object(
      'current_location_id', asset.current_location_id,
      'home_location_id', asset.home_location_id
    ),
    jsonb_build_object(
      'current_location_id', to_location,
      'home_location_id', asset.home_location_id,
      'note', clean_note
    )
  );

  return asset.id;
end;
$$;

create or replace function public.report_asset_problem(
  target_asset uuid,
  problem text,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  asset public.assets;
  clean_note text := nullif(trim(coalesce(note, '')), '');
  next_status public.asset_status;
begin
  asset := public.lock_member_asset(target_asset);

  if problem = 'missing' then
    next_status := 'missing';
  elsif problem = 'under_repair' then
    next_status := 'under_repair';
  else
    raise exception 'invalid_problem';
  end if;

  update public.assets
  set status = next_status
  where id = asset.id;

  insert into public.asset_movements (
    organization_id,
    asset_id,
    from_location_id,
    to_location_id,
    moved_by,
    movement_type,
    notes
  )
  values (
    asset.organization_id,
    asset.id,
    asset.current_location_id,
    asset.current_location_id,
    actor,
    'status_change',
    clean_note
  );

  insert into public.asset_activity (
    organization_id,
    asset_id,
    actor_id,
    action_type,
    summary,
    previous_value,
    new_value
  )
  values (
    asset.organization_id,
    asset.id,
    actor,
    case when problem = 'missing' then 'missing_reported' else 'repair_reported' end,
    case
      when problem = 'missing' then 'Reported missing'
      else 'Reported under repair'
    end,
    jsonb_build_object('status', asset.status),
    jsonb_build_object('status', next_status, 'note', clean_note)
  );

  return asset.id;
end;
$$;

-- Public tag lookup. Returns only fields that are safe to show without a login.
create or replace function public.get_public_tag(tag_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'asset_name', a.name,
    'asset_code', a.asset_code,
    'organization_name', o.name,
    'status', a.status,
    'show_return_location', o.public_return_location,
    'home_location',
      case
        when o.public_return_location and l.id is not null then jsonb_build_object(
          'name', l.name,
          'color', l.color,
          'icon', l.icon
        )
        else null
      end
  )
  into result
  from public.assets as a
  join public.organizations as o on o.id = a.organization_id
  left join public.locations as l on l.id = a.home_location_id
  where a.public_token = tag_token
    and a.archived_at is null;

  return result;
end;
$$;

create or replace function public.resolve_tag_for_member(tag_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  asset_id uuid;
begin
  if actor is null then
    return null;
  end if;

  select a.id
  into asset_id
  from public.assets as a
  join public.organization_members as m
    on m.organization_id = a.organization_id
    and m.user_id = actor
  where a.public_token = tag_token
    and a.archived_at is null
  limit 1;

  return asset_id;
end;
$$;

create or replace function public.preview_invitation(invite_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'organization_name', o.name,
    'email', i.email,
    'role', i.role,
    'expired', i.expires_at <= now() or i.accepted_at is not null
  )
  from public.invitations as i
  join public.organizations as o on o.id = i.organization_id
  where i.token = invite_token;
$$;

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------

insert into public.plan_definitions (tier, name, asset_limit, description)
values
  ('free', 'Free', 10, 'Track a small set of tools while you try Toolbox.'),
  ('starter', 'Starter', 100, 'For a small crew that shares tools across a few places.'),
  ('business', 'Business', 1000, 'For shops, fleets, and growing contractors.'),
  ('enterprise', 'Enterprise', 100000, 'Custom asset limits for large operations.');

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.plan_definitions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.locations enable row level security;
alter table public.asset_categories enable row level security;
alter table public.assets enable row level security;
alter table public.asset_financials enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.asset_movements enable row level security;
alter table public.asset_requests enable row level security;
alter table public.asset_activity enable row level security;
alter table public.tracking_devices enable row level security;

create policy "Read own and coworker profiles"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.organization_members as mine
      join public.organization_members as theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
  );

create policy "Update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Members read their organizations"
  on public.organizations
  for select
  to authenticated
  using (public.is_org_member(id));

create policy "Members read memberships in their organizations"
  on public.organization_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_org_member(organization_id)
  );

create policy "Owners read invitations"
  on public.invitations
  for select
  to authenticated
  using (public.is_owner(organization_id));

create policy "Owners create invitations"
  on public.invitations
  for insert
  to authenticated
  with check (
    public.is_owner(organization_id)
    and invited_by = (select auth.uid())
    and role in ('manager', 'employee')
  );

create policy "Owners delete invitations"
  on public.invitations
  for delete
  to authenticated
  using (public.is_owner(organization_id));

create policy "Authenticated users read plan catalog"
  on public.plan_definitions
  for select
  to authenticated
  using (true);

create policy "Members read their subscription"
  on public.subscriptions
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Members read locations"
  on public.locations
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Managers create locations"
  on public.locations
  for insert
  to authenticated
  with check (public.can_manage(organization_id));

create policy "Managers update locations"
  on public.locations
  for update
  to authenticated
  using (public.can_manage(organization_id))
  with check (public.can_manage(organization_id));

create policy "Members read categories"
  on public.asset_categories
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Managers create categories"
  on public.asset_categories
  for insert
  to authenticated
  with check (public.can_manage(organization_id));

create policy "Managers update categories"
  on public.asset_categories
  for update
  to authenticated
  using (public.can_manage(organization_id))
  with check (public.can_manage(organization_id));

create policy "Members read assets"
  on public.assets
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Managers create assets"
  on public.assets
  for insert
  to authenticated
  with check (public.can_manage(organization_id));

create policy "Managers update assets"
  on public.assets
  for update
  to authenticated
  using (public.can_manage(organization_id))
  with check (public.can_manage(organization_id));

create policy "Managers read financials"
  on public.asset_financials
  for select
  to authenticated
  using (public.can_manage(organization_id));

create policy "Managers create financials"
  on public.asset_financials
  for insert
  to authenticated
  with check (public.can_manage(organization_id));

create policy "Managers update financials"
  on public.asset_financials
  for update
  to authenticated
  using (public.can_manage(organization_id))
  with check (public.can_manage(organization_id));

create policy "Members read assignments"
  on public.asset_assignments
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Members read movements"
  on public.asset_movements
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Managers record movements"
  on public.asset_movements
  for insert
  to authenticated
  with check (
    public.can_manage(organization_id)
    and moved_by = (select auth.uid())
  );

create policy "Members read permitted requests"
  on public.asset_requests
  for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.can_manage(organization_id)
      or requested_by = (select auth.uid())
    )
  );

create policy "Members create their own requests"
  on public.asset_requests
  for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and requested_by = (select auth.uid())
    and status = 'pending'
  );

create policy "Managers review requests"
  on public.asset_requests
  for update
  to authenticated
  using (public.can_manage(organization_id))
  with check (public.can_manage(organization_id));

create policy "Members read permitted activity"
  on public.asset_activity
  for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.can_manage(organization_id)
      or (
        action_type not like 'team_%'
        and action_type not like 'billing_%'
        and action_type not like 'organization_%'
      )
    )
  );

create policy "Managers record activity"
  on public.asset_activity
  for insert
  to authenticated
  with check (
    public.can_manage(organization_id)
    and actor_id = (select auth.uid())
  );

create policy "Managers read tracking device records"
  on public.tracking_devices
  for select
  to authenticated
  using (public.can_manage(organization_id));

-- No insert/update/delete policies on tracking_devices.
-- Hardware integrations do not exist yet, so users cannot invent device state.

-- ---------------------------------------------------------------------------
-- Privileges
-- RLS still applies to authenticated. Anon has no table access.
-- Security definer functions do the privileged writes (checkout, orgs, tags).
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.current_user_role(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_manage(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.update_organization(uuid, text, boolean) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.update_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.checkout_asset(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.return_asset(uuid, uuid, text) to authenticated;
grant execute on function public.move_asset(uuid, uuid, text) to authenticated;
grant execute on function public.report_asset_problem(uuid, text, text) to authenticated;
grant execute on function public.get_public_tag(text) to anon, authenticated;
grant execute on function public.preview_invitation(text) to anon, authenticated;
grant execute on function public.resolve_tag_for_member(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Private photo storage
-- Path format: {organization_id}/{asset_id}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asset-photos',
  'asset-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members read asset photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'asset-photos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Managers upload asset photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'asset-photos'
    and public.can_manage(((storage.foldername(name))[1])::uuid)
  );

create policy "Managers update asset photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'asset-photos'
    and public.can_manage(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'asset-photos'
    and public.can_manage(((storage.foldername(name))[1])::uuid)
  );

create policy "Managers delete asset photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'asset-photos'
    and public.can_manage(((storage.foldername(name))[1])::uuid)
  );
