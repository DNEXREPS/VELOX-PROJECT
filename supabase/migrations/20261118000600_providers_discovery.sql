-- Phase 3: provider registry details, run history (health), and the discovery / research queue.
-- Additive. Discovery records are an internal review queue: never public, never auto-promoted.

-- ---------- provider registry: permissions, schedule, adapter ----------
alter table providers add column if not exists adapter text;                    -- implementation id in src/lib/providers
alter table providers add column if not exists permission_status text not null default 'unknown'
  check (permission_status in ('permitted','public-endpoint','requires-credentials','requires-agreement','manual-only','not-permitted','unknown'));
alter table providers add column if not exists terms_url text;
alter table providers add column if not exists robots_checked_at timestamptz;
alter table providers add column if not exists schedule text;                   -- e.g. 'daily', 'weekly', 'on demand'
alter table providers add column if not exists next_sync_at timestamptz;
alter table providers add column if not exists credentials_env text[] not null default '{}';  -- NAMES of server env vars; never values

-- ---------- run history (health monitoring, error log) ----------
create table if not exists provider_runs (
  id            uuid primary key default gen_random_uuid(),
  provider_id   text not null references providers(id) on delete cascade,
  kind          text not null check (kind in ('search','sync','test')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null check (status in ('ok','partial','error','timeout','skipped','not-configured')),
  items_seen    int not null default 0,
  items_upserted int not null default 0,
  http_requests int not null default 0,
  error         text,
  details       jsonb not null default '{}'
);
create index if not exists provider_runs_recent on provider_runs (provider_id, started_at desc);

-- ---------- discovery / research queue ----------
create table if not exists discovery_records (
  id               uuid primary key default gen_random_uuid(),
  source_url       text not null unique,
  source_kind      text not null check (source_kind in ('official-manufacturer','authorized-distributor','retailer','marketplace','social','community','publication','web')),
  platform         text,                       -- "Shopify store", "YouTube", "Tokopedia", "Instagram"…
  provider_id      text references providers(id),
  method           text not null check (method in ('automated','feed','manual-url','manual-form')),
  retrieval_status text not null check (retrieval_status in ('extracted','partial','manual-required','not-permitted','blocked','failed')),
  retrieval_note   text,
  -- identification (as stated by the source; never treated as fact without verification)
  title            text,
  brand_text       text,
  model_text       text,
  mpn              text,
  gtin             text,
  category_id      text references product_categories(id),
  model_year       int,
  extracted        jsonb not null default '{}',   -- facts extracted (specs, variants, structured-data fields)
  image_refs       text[] not null default '{}',  -- URLs only: discovered images are NOT copied into VELOX storage
  price            numeric(14,2),
  currency         char(3),
  condition        text not null default 'unknown' check (condition in ('new','used','refurbished','open-box','unknown')),
  authenticity     text not null default 'unknown' check (authenticity in ('official','authorized','unknown','counterfeit-risk','unbranded')),
  availability     text not null default 'unknown' check (availability in ('in-stock','out-of-stock','preorder','unknown')),
  publisher        text,
  published_at     timestamptz,
  language         text,
  retrieved_at     timestamptz not null default now(),
  matched_product_id text references products(id) on delete set null,
  match_basis      text check (match_basis in ('gtin','mpn','brand+title','admin')),
  -- verification ladder and separate confidences (no combined score)
  verification     text not null default 'unverified' check (verification in ('officially-verified','multi-source-verified','seller-listing-verified','community-reported','unverified','suspected-misrepresentation')),
  identity_confidence     confidence_level not null default 'low',
  specs_confidence        confidence_level not null default 'low',
  price_confidence        confidence_level not null default 'low',
  availability_confidence confidence_level not null default 'low',
  image_confidence        confidence_level not null default 'low',
  manufacturer_confidence confidence_level not null default 'low',
  review_state     text not null default 'new' check (review_state in ('new','in-review','approved','rejected','needs-correction')),
  submitted_by     uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((price is null) = (currency is null))
);
create index if not exists discovery_review_idx on discovery_records (review_state, created_at desc);
create index if not exists discovery_match_idx on discovery_records (matched_product_id) where matched_product_id is not null;

create table if not exists discovery_notes (
  id           uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references discovery_records(id) on delete cascade,
  author       uuid references profiles(id) on delete set null,
  kind         text not null check (kind in ('identification','conflict','seller','reference','authenticity','image-permission','general')),
  body         text not null check (char_length(body) between 1 and 4000),
  reference_url text,
  created_at   timestamptz not null default now()
);
create index if not exists discovery_notes_idx on discovery_notes (discovery_id, created_at);

-- ---------- row-level security: admin only (internal queue and logs) ----------
alter table provider_runs     enable row level security;
alter table discovery_records enable row level security;
alter table discovery_notes   enable row level security;
do $$
declare t text;
begin
  foreach t in array array['provider_runs','discovery_records','discovery_notes'] loop
    execute format('drop policy if exists "admin all" on %I', t);
    execute format('create policy "admin all" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
grant select, insert, update, delete on provider_runs, discovery_records, discovery_notes to authenticated;
