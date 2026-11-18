-- =====================================================================
-- VELOX relational schema (PostgreSQL / Supabase)
-- Mirrors src/lib/types.ts. The app runs without this (local demo mode);
-- apply with:  supabase db push   or   psql -f supabase/schema.sql
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;   -- typo-tolerant search on names

-- ---------- enums ----------------------------------------------------
create type verification_status as enum ('verified-official', 'verified-distributor', 'cross-verified', 'community', 'unverified', 'historical', 'discontinued', 'archived');
create type source_type        as enum ('official-website', 'official-catalog', 'technical-manual', 'authorized-distributor', 'retailer', 'manufacturer-announcement', 'official-social', 'publication', 'community', 'standard', 'editorial-seed');
create type confidence_level   as enum ('high', 'medium', 'low');
create type brand_kind         as enum ('bicycles', 'frames', 'wheels', 'components', 'e-bikes', 'oem-manufacturer', 'private-label', 'distributor');
create type license_status     as enum ('Pexels License', 'Manufacturer press', 'Licensed', 'Admin upload', 'AI generated');
create type price_type         as enum ('msrp', 'distributor', 'retailer', 'estimated', 'historical');
create type image_source_type  as enum ('manufacturer', 'manufacturer-catalog', 'distributor', 'retailer', 'wikimedia-commons', 'licensed', 'admin-upload');
create type image_license_status as enum ('open-license', 'licensed', 'permission-required', 'unknown', 'rejected');
create type image_model_match  as enum ('exact', 'model', 'generation', 'family');
create type image_verification_status as enum ('verified', 'pending-review', 'rejected');
create type user_role          as enum ('user', 'admin');
create type subject_type       as enum ('brand', 'bike_model', 'component');
create type component_type     as enum ('frame','fork','groupset','shifters','front-derailleur','rear-derailleur','crankset','cassette','chain','brakes','wheelset','tires','handlebar','stem','saddle','seatpost','pedals','hub','bearing','accessory');
create type tier               as enum ('entry', 'mid', 'performance', 'pro');

-- ---------- reference data ------------------------------------------
create table countries (
  code   char(2) primary key,              -- ISO 3166-1 alpha-2
  name   text not null unique,
  region text not null check (region in ('Indonesia', 'International'))
);

create table categories (
  id          text primary key,            -- road | mtb | gravel | urban | electric | folding | bmx | other
  name        text not null,
  tagline     text,
  description text,
  sort_order  int not null default 0
);

create table subcategories (
  id          text not null,
  category_id text not null references categories(id) on delete cascade,
  name        text not null,
  primary key (category_id, id)
);

-- shared provenance columns are repeated per table for simple RLS and indexing
-- (status, is_demo, updated_at); sources live in data_sources.

-- ---------- brands ---------------------------------------------------
create table brands (
  id           text primary key,           -- slug, e.g. "polygon"
  name         text not null,
  country_code char(2) references countries(code),
  founded      int check (founded between 1800 and 2100),
  website      text,
  description  text not null default '',
  history      text,                       -- only when verified
  logo_url     text,
  mark_color   text,
  kinds        brand_kind[] not null default '{bicycles}',  -- what the company actually does
  parent_company text,
  headquarters text,
  status       verification_status not null default 'unverified',
  confidence   confidence_level not null default 'low',
  original_manufacturer text,
  reviewer_notes text,
  is_demo      boolean not null default false,
  updated_at   timestamptz not null default now()
);
create index brands_country_idx on brands(country_code);
create index brands_name_trgm on brands using gin (name gin_trgm_ops);

create table brand_categories (
  brand_id    text references brands(id) on delete cascade,
  category_id text references categories(id) on delete cascade,
  primary key (brand_id, category_id)
);

-- ---------- bicycle models ------------------------------------------
-- A family ("Strattos") groups model-year / trim records ("Strattos S4 2024").
create table bike_families (
  id       uuid primary key default gen_random_uuid(),
  brand_id text not null references brands(id) on delete cascade,
  name     text not null,
  unique (brand_id, name)
);

create table bike_models (
  id                text primary key,       -- slug incl. year, e.g. "polygon-strattos-s4-2024"
  family_id         uuid references bike_families(id) on delete set null,
  brand_id          text not null references brands(id) on delete restrict,
  name              text not null,
  model_year        int not null check (model_year between 1900 and 2100),
  -- 'listed-in-range': manufacturer publishes no model year; model_year = year confirmed in the official range
  year_basis        text not null default 'model-year' check (year_basis in ('model-year', 'listed-in-range')),
  generation        text,
  category_id       text not null references categories(id),
  subcategory_id    text,
  frame_material    text,
  geometry          jsonb,                  -- stack/reach/angles per size
  groupset          text,
  drivetrain        text,
  brakes            text,
  brake_type        text,
  wheelset          text,
  tires             text,
  wheel_size        text,
  tire_clearance_mm int,
  suspension        text not null default 'rigid' check (suspension in ('rigid','front','full')),
  travel            text,
  weight_kg         numeric(5,2),
  sizes             text[] not null default '{}',
  riding_style      text,
  usage             text[] not null default '{}',
  experience        text[] not null default '{}',
  highlights        text[] not null default '{}',
  drawbacks         text[] not null default '{}',
  electric          jsonb,                  -- { motor, batteryWh }
  compat            jsonb not null default '{}',  -- CompatAttrs used by the compatibility engine
  official_url      text,
  variant           text,                    -- trim / configuration within a model year
  status            verification_status not null default 'unverified',
  confidence        confidence_level not null default 'low',
  original_manufacturer text,
  reviewer_notes text,
  is_demo      boolean not null default false,
  updated_at   timestamptz not null default now(),
  foreign key (category_id, subcategory_id) references subcategories(category_id, id)
);
-- duplicate guard: one record per brand + model + year + variant
create unique index bike_models_identity on bike_models (brand_id, lower(name), model_year, coalesce(lower(variant), ''));
create index bike_models_brand_idx on bike_models(brand_id);
create index bike_models_category_idx on bike_models(category_id, subcategory_id);
create index bike_models_year_idx on bike_models(model_year desc);

-- ---------- components ----------------------------------------------
create table component_manufacturers (
  id           text primary key,            -- slug, e.g. "shimano"
  name         text not null,
  country_code char(2) references countries(code),
  website      text
);

create table components (
  id              text primary key,
  manufacturer_id text not null references component_manufacturers(id),
  type            component_type not null,
  name            text not null,
  series          text,
  tier            tier not null default 'mid',
  disciplines     text[] not null default '{universal}',
  weight_g        int,
  material        text,
  specs           jsonb not null default '{}',
  compat          jsonb not null default '{}',   -- CompatAttrs
  benefits        text[] not null default '{}',
  official_url    text,
  product_id      text,                      -- SKU / MPN / GTIN for duplicate detection
  model_year      int,
  status       verification_status not null default 'unverified',
  confidence   confidence_level not null default 'low',
  original_manufacturer text,
  reviewer_notes text,
  is_demo      boolean not null default false,
  updated_at   timestamptz not null default now()
);
create unique index components_product_id on components (manufacturer_id, lower(product_id)) where product_id is not null;
create index components_type_idx on components(type);
create index components_mfr_idx on components(manufacturer_id);
create index components_compat_gin on components using gin (compat);

-- extended wheelset specification (one row per wheelset component)
create table wheelset_specs (
  component_id        text primary key references components(id) on delete cascade,
  rim_material        text,
  rim_depth_mm        text,                  -- text to allow staggered "50/56"
  internal_width_mm   numeric(4,1),
  external_width_mm   numeric(4,1),
  hub_manufacturer    text,
  hub_model           text,
  spoke_count         text,
  spoke_type          text,
  bearings            text,
  max_system_weight_kg numeric(5,1),
  warranty            text
);

-- bearing reference data (ISO / industry dimensions)
create table bearings (
  component_id  text primary key references components(id) on delete cascade,
  designation   text not null,
  inner_mm      numeric(6,2) not null,
  outer_mm      numeric(6,2) not null,
  width_mm      numeric(5,2) not null,
  kind          text not null check (kind in ('deep-groove','angular-contact','headset-acb','needle')),
  contact_angle text,
  sealing       text,
  typical_use   text[] not null default '{}'
);
create index bearings_dims_idx on bearings (inner_mm, outer_mm, width_mm);

-- groupset kits: which parts a groupset installs
create table groupset_parts (
  groupset_id  text references components(id) on delete cascade,
  part_id      text references components(id) on delete cascade,
  slot         component_type not null,
  primary key (groupset_id, slot)
);

-- documented compatibility rules (engine logic lives in src/lib/compat.ts; rows allow enabling/annotating)
create table compatibility_rules (
  key         text primary key,             -- e.g. "bottom-bracket", "freehub", "udh"
  label       text not null,
  description text,
  enabled     boolean not null default true
);

-- ---------- prices, images, sources (polymorphic by subject) --------
create table prices (
  id           uuid primary key default gen_random_uuid(),
  subject      subject_type not null,
  subject_id   text not null,
  amount_idr   bigint not null check (amount_idr >= 0),
  price_type   price_type not null,
  source       text,
  source_url   text,
  observed_on  date not null default current_date,
  note         text,
  -- price exactly as published when not in IDR; amount_idr is then a labelled conversion
  original_amount   numeric(12,2),
  original_currency char(3),
  conversion_rate   numeric(12,4),
  is_current   boolean not null default true,
  check ((original_amount is null) = (original_currency is null) and (original_amount is null) = (conversion_rate is null)),
  check (price_type = 'estimated' or source_url is not null)
);
create index prices_subject_idx on prices(subject, subject_id, is_current);

-- centralised image management: every image carries licence and attribution
create table media_assets (
  id            uuid primary key default gen_random_uuid(),
  subject       subject_type,                -- null for editorial / category imagery
  subject_id    text,
  url           text not null,               -- Supabase Storage URL
  alt           text not null,
  width         int,
  height        int,
  source        text not null,
  source_url    text,
  photographer  text,
  license       license_status not null,
  license_url   text,
  quality       text check (quality in ('hero','high','standard')),
  representative boolean not null default true,  -- never presented as the specific product
  verified_at   date not null default current_date,
  sort_order    int not null default 0
);

-- model-specific product photography: one file belongs to one catalogue record
create table product_images (
  id                         text primary key,
  subject                    subject_type not null,
  subject_id                 text not null,
  primary_image_url          text not null,          -- stable Storage copy, never a hot-linked URL
  gallery_images             text[] not null default '{}',
  width                      int not null check (width > 0),
  height                     int not null check (height > 0),
  alt                        text not null,
  image_source_url           text not null,
  original_file_url          text,
  image_source_type          image_source_type not null,
  image_license_status       image_license_status not null,
  license                    text not null,
  license_url                text,
  author                     text,
  image_verification_status  image_verification_status not null default 'pending-review',
  image_model_match          image_model_match not null,
  match_notes                text not null,
  view                       text check (view in ('side-profile','three-quarter','detail','in-use')),
  last_image_verified_at     date not null default current_date,
  sha256                     char(64) not null,
  -- displayable only when licensed, verified and the same model or frame generation
  displayable boolean generated always as (
    image_license_status in ('open-license','licensed') and image_verification_status = 'verified' and image_model_match <> 'family'
  ) stored
);
create unique index product_images_file_uniq on product_images(sha256);           -- same file never on two records
create unique index product_images_url_uniq on product_images(primary_image_url);
create unique index product_images_source_uniq on product_images(image_source_url);
create index product_images_subject_idx on product_images(subject, subject_id) where displayable;

create table data_sources (
  id           uuid primary key default gen_random_uuid(),
  subject      subject_type not null,
  subject_id   text not null,
  label        text not null,
  url          text,
  type         source_type not null default 'editorial-seed',
  retrieved_at date
);

create index data_sources_subject_idx on data_sources(subject, subject_id);

-- ---------- users & personal data ------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url   text,
  role         user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Personal data, one row per user per collection. The app's data shapes (garage bikes with their log,
-- builds, favourites, compare list, upgrade plans, AI Mechanic history, preferences) are stored as JSON
-- documents because the catalogue they reference ships as versioned static data, not database rows.
create table user_collections (
  owner_id    uuid not null references profiles(id) on delete cascade,
  collection  text not null check (collection in ('garage','builds','wishlist','compare','upgrade_plans','mechanic_history','settings')),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, collection),
  check (pg_column_size(data) < 2000000)
);

-- profile row for every new auth user (email or Google)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 80), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- self-service account deletion: removes the caller's auth user; profile and personal data cascade.
create or replace function delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function delete_my_account() from public;

-- ingestion staging: nothing enters the catalogue without review
create table ingest_staging (
  id           uuid primary key default gen_random_uuid(),
  kind         subject_type not null,
  adapter      text not null,                -- csv | json | schema-org | manual | ...
  record       jsonb not null,               -- normalised record
  source_url   text,
  duplicates   jsonb not null default '[]',  -- [{existing_id, reason, certainty}]
  state        text not null default 'pending' check (state in ('pending','approved','rejected','merged')),
  staged_by    uuid references profiles(id),
  staged_at    timestamptz not null default now(),
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  reviewer_notes text
);

create table submissions (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('brand','bike','component','correction')),
  payload      jsonb not null,
  note         text,
  submitted_by uuid references profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  state        text not null default 'pending' check (state in ('pending','approved','rejected')),
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz
);

-- ---------- row-level security ----------------------------------------
-- security definer: reads the caller's role without re-entering the profiles RLS policy (which calls is_admin())
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

do $$
declare t text;
begin
  -- catalogue: public read, admin-only write (regular users can never modify manufacturer data)
  foreach t in array array['countries','categories','subcategories','brands','brand_categories','bike_families','bike_models',
                           'component_manufacturers','components','wheelset_specs','bearings','groupset_parts','compatibility_rules','prices','media_assets','product_images','data_sources']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s public read" on %I for select using (true)', t, t);
    execute format('create policy "%s admin write" on %I for all using (is_admin()) with check (is_admin())', t, t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
-- a signed-in user may edit their own name/avatar but never their role
create policy "update own profile (not role)" on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

alter table user_collections enable row level security;
create policy "own collections" on user_collections for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table ingest_staging enable row level security;
create policy "admin only staging" on ingest_staging for all using (is_admin()) with check (is_admin());

alter table submissions enable row level security;
create policy "submit when signed in" on submissions for insert with check (auth.uid() is not null and submitted_by = auth.uid() and state = 'pending');
create policy "read own submissions" on submissions for select using (submitted_by = auth.uid() or is_admin());
create policy "admin review" on submissions for update using (is_admin()) with check (is_admin());

-- ---------- grants (Supabase roles: anon = visitors, authenticated = signed-in users) ----------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant select, update on profiles to authenticated;
grant select, insert, update, delete on user_collections to authenticated;
grant insert on submissions to authenticated;
grant execute on function delete_my_account() to authenticated;
revoke select on ingest_staging from anon;
