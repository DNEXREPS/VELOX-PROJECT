-- =====================================================================
-- VELOX relational schema (PostgreSQL / Supabase)
-- Mirrors src/lib/types.ts. The app runs without this (local demo mode);
-- apply with:  supabase db push   or   psql -f supabase/schema.sql
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;   -- typo-tolerant search on names

-- ---------- enums ----------------------------------------------------
create type verification_status as enum ('verified', 'community', 'unverified', 'discontinued', 'archived');
create type price_type         as enum ('msrp', 'distributor', 'retailer', 'estimated', 'historical');
create type user_role          as enum ('user', 'admin');
create type subject_type       as enum ('brand', 'bike_model', 'component');
create type component_type     as enum ('frame','fork','groupset','shifters','front-derailleur','rear-derailleur','crankset','cassette','chain','brakes','wheelset','tires','handlebar','stem','saddle','seatpost','pedals','accessory');
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
  status       verification_status not null default 'unverified',
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
  status            verification_status not null default 'unverified',
  is_demo           boolean not null default false,
  updated_at        timestamptz not null default now(),
  foreign key (category_id, subcategory_id) references subcategories(category_id, id)
);
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
  status          verification_status not null default 'unverified',
  is_demo         boolean not null default false,
  updated_at      timestamptz not null default now()
);
create index components_type_idx on components(type);
create index components_mfr_idx on components(manufacturer_id);
create index components_compat_gin on components using gin (compat);

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
  observed_on  date not null default current_date,
  note         text,
  is_current   boolean not null default true
);
create index prices_subject_idx on prices(subject, subject_id, is_current);

create table images (
  id         uuid primary key default gen_random_uuid(),
  subject    subject_type not null,
  subject_id text not null,
  url        text not null,                 -- Supabase Storage public URL
  alt        text,
  sort_order int not null default 0
);

create table data_sources (
  id           uuid primary key default gen_random_uuid(),
  subject      subject_type not null,
  subject_id   text not null,
  label        text not null,
  url          text,
  retrieved_at date
);
create index data_sources_subject_idx on data_sources(subject, subject_id);

-- ---------- users & personal data ------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         user_role not null default 'user',
  created_at   timestamptz not null default now()
);

create table builds (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  discipline  text not null,
  selection   jsonb not null default '{}',  -- { slot: component_id }
  accessories text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table garage_bikes (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references profiles(id) on delete cascade,
  nickname           text not null,
  model_id           text references bike_models(id) on delete set null,
  build_id           uuid references builds(id) on delete set null,
  manual             jsonb,                  -- unlisted bike details
  purchase_year      int,
  purchase_price_idr bigint,
  odometer_km        int,
  created_at         timestamptz not null default now()
);

create table garage_log (
  id        uuid primary key default gen_random_uuid(),
  bike_id   uuid not null references garage_bikes(id) on delete cascade,
  logged_on date not null default current_date,
  kind      text not null check (kind in ('modification','component-change','maintenance','note')),
  title     text not null,
  detail    text,
  cost_idr  bigint
);

create table wishlist (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  subject  subject_type not null,
  subject_id text not null,
  added_at timestamptz not null default now(),
  unique (owner_id, subject, subject_id)
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
create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

do $$
declare t text;
begin
  -- catalogue: public read, admin-only write (regular users can never modify manufacturer data)
  foreach t in array array['countries','categories','subcategories','brands','brand_categories','bike_families','bike_models',
                           'component_manufacturers','components','groupset_parts','compatibility_rules','prices','images','data_sources']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s public read" on %I for select using (true)', t, t);
    execute format('create policy "%s admin write" on %I for all using (is_admin()) with check (is_admin())', t, t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile (not role)" on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

alter table builds enable row level security;
create policy "own builds" on builds for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table garage_bikes enable row level security;
create policy "own garage" on garage_bikes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table garage_log enable row level security;
create policy "own garage log" on garage_log for all using (exists (select 1 from garage_bikes g where g.id = bike_id and g.owner_id = auth.uid()));
alter table wishlist enable row level security;
create policy "own wishlist" on wishlist for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table submissions enable row level security;
create policy "submit when signed in" on submissions for insert with check (auth.uid() is not null and submitted_by = auth.uid() and state = 'pending');
create policy "read own submissions" on submissions for select using (submitted_by = auth.uid() or is_admin());
create policy "admin review" on submissions for update using (is_admin()) with check (is_admin());

