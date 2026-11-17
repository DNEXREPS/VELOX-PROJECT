-- =====================================================================
-- VELOX master catalogue (Phase 2) — additive migration on top of supabase/schema.sql
--   products (identity) ≠ offers (a seller's listing)
-- Never drops or rewrites existing tables. The unused bike_models / components tables from the
-- baseline stay in place (deprecated: superseded by products).
-- =====================================================================

comment on table bike_models is 'DEPRECATED (Phase 2): superseded by products(kind=bike). Kept, not dropped.';
comment on table components  is 'DEPRECATED (Phase 2): superseded by products(kind=component). Kept, not dropped.';

-- ---------- taxonomy --------------------------------------------------------------------------
create table if not exists product_categories (
  id         text primary key,                -- e.g. "drivetrain/cassettes"
  parent_id  text references product_categories(id) on delete restrict,
  kind       text not null check (kind in ('bike','component','accessory','apparel','tool','consumable')),
  name_en    text not null,
  name_id    text not null,
  path       text[] not null,                 -- ancestors + self, for "category and everything below it"
  sort_order int not null default 0
);
create index if not exists product_categories_path_gin on product_categories using gin (path);

-- ---------- manufacturers = brands (extended, not duplicated) -----------------------------------
alter table brands add column if not exists aliases text[] not null default '{}';
alter table brands add column if not exists market_segments text[] not null default '{}';  -- e.g. {budget,mid,premium}: descriptive only, never used for ranking

-- ---------- products ----------------------------------------------------------------------------
create table if not exists products (
  id               text primary key,          -- keeps existing VELOX ids (bike model id / component id)
  kind             text not null check (kind in ('bike','component','accessory','apparel','tool','consumable')),
  brand_id         text not null references brands(id) on delete restrict,
  brand_name       text not null default '',  -- denormalised for search; kept in sync by trigger
  name             text not null,
  model            text,
  family           text,
  model_year       int check (model_year between 1900 and 2100),
  year_basis       text not null default 'model-year' check (year_basis in ('model-year','listed-in-range','undated')),
  category_id      text not null references product_categories(id),
  subcategory      text,
  description      text,
  specs            jsonb not null default '{}',   -- manufacturer-published specifications (label → value)
  compat           jsonb not null default '{}',   -- structured attributes for the compatibility engine
  weight_g         int check (weight_g is null or weight_g > 0),
  material         text,
  official_url     text,
  primary_image    text,                      -- interim pointer; Phase 6 moves images to their own tables
  -- price as published by the manufacturer (MSRP), with an IDR value only from a cited conversion
  msrp_amount      numeric(14,2),
  msrp_currency    char(3),
  price_idr        bigint check (price_idr is null or price_idr >= 0),
  price_basis      text not null default 'unavailable' check (price_basis in ('msrp','converted-msrp','estimate','unavailable')),
  price_source_url text,
  price_observed_on date,
  -- verification, per dimension (never one combined score)
  verification     verification_status not null default 'unverified',
  identity_confidence     confidence_level not null default 'low',
  specs_confidence        confidence_level not null default 'low',
  manufacturer_confidence confidence_level not null default 'low',
  last_verified_at timestamptz,
  seed_locked      boolean not null default false,  -- set when an admin edits a record: re-running the seed loader never overwrites it
  data_origin      text not null default 'admin' check (data_origin in ('velox-seed','official-import','researched','admin','promoted-discovery','feed-import')),
  details          jsonb not null default '{}',   -- type-specific extras (bike geometry, wheel/bearing spec, kit…)
  search_vector    tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(model,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(brand_name,'') || ' ' || coalesce(family,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(subcategory,'') || ' ' || coalesce(material,'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'D')
  ) stored,
  name_search      text generated always as (lower(coalesce(brand_name,'') || ' ' || name || coalesce(' ' || model, ''))) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((msrp_amount is null) = (msrp_currency is null)),
  check (price_basis in ('unavailable','estimate') or price_source_url is not null)
);
-- duplicate guard: one product per brand + kind + name + model/trim + year (sizes/colours live in product_variants)
create unique index if not exists products_identity on products (brand_id, kind, lower(name), coalesce(lower(model), ''), coalesce(model_year, 0));
create index if not exists products_search_idx   on products using gin (search_vector);
create index if not exists products_name_trgm    on products using gin (name_search gin_trgm_ops);
create index if not exists products_kind_cat_idx on products (kind, category_id);
create index if not exists products_brand_idx    on products (brand_id);
create index if not exists products_price_idx    on products (price_idr) where price_idr is not null;
create index if not exists products_year_idx     on products (model_year desc nulls last);
create index if not exists products_compat_gin   on products using gin (compat);

create or replace function products_sync_brand_name() returns trigger language plpgsql as $$
begin
  new.brand_name := coalesce((select name from brands where id = new.brand_id), new.brand_name, '');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists products_brand_name on products;
create trigger products_brand_name before insert or update of brand_id, name, model, specs, compat, description, price_idr, verification on products
  for each row execute function products_sync_brand_name();

create or replace function brands_propagate_name() returns trigger language plpgsql as $$
begin
  if new.name is distinct from old.name then update products set brand_name = new.name where brand_id = new.id; end if;
  return new;
end $$;
drop trigger if exists brands_name_to_products on brands;
create trigger brands_name_to_products after update of name on brands for each row execute function brands_propagate_name();

-- ---------- variants ------------------------------------------------------------------------------
create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  label       text not null,                  -- "54 cm / Black", "700c rear, XDR"
  size        text,
  color       text,
  mpn         text,                           -- manufacturer part number
  gtin        text check (gtin is null or gtin ~ '^[0-9]{8,14}$'),
  sku         text,
  weight_g    int check (weight_g is null or weight_g > 0),
  specs       jsonb not null default '{}',    -- only what differs from the product
  unique (product_id, label)
);
create unique index if not exists product_variants_gtin on product_variants (gtin) where gtin is not null;
create index if not exists product_variants_mpn on product_variants (lower(mpn)) where mpn is not null;

-- ---------- evidence ------------------------------------------------------------------------------
create table if not exists product_sources (
  id           uuid primary key default gen_random_uuid(),
  product_id   text not null references products(id) on delete cascade,
  field        text,                          -- null = the record as a whole; else e.g. "specs.weight"
  label        text not null,
  url          text,
  source_type  source_type not null,
  retrieved_at date,
  note         text
);
create index if not exists product_sources_product_idx on product_sources (product_id);
create unique index if not exists product_sources_uniq on product_sources (product_id, coalesce(field,''), coalesce(url, label));

-- ---------- providers, sellers, offers ------------------------------------------------------------
create table if not exists providers (
  id                 text primary key,        -- "velox-catalog", "shopify:icancycling.com", "ebay-browse"
  name               text not null,
  type               text not null check (type in ('internal-catalog','manufacturer-store','distributor-feed','retailer-feed','marketplace-api','web-search','social-api','industry-data','compatibility-api','manual')),
  access_method      text not null,           -- "public storefront JSON", "OAuth client credentials", "CSV feed", "manual URL submission"
  status             text not null default 'disabled' check (status in ('active','disabled','needs-credentials','needs-agreement','manual-only','unavailable')),
  enabled            boolean not null default false,
  categories         text[] not null default '{}',
  manufacturers      text[] not null default '{}',
  countries          text[] not null default '{}',
  data_format        text,
  auth               text,                    -- description only ("API key in VELOX_BRAVE_KEY"); never the secret
  cost               text,
  display_permission text,                    -- what may be shown publicly
  image_permission   text,
  rate_limit         text,
  update_frequency   text,
  docs_url           text,
  config             jsonb not null default '{}',  -- non-secret settings only
  last_success_at    timestamptz,
  last_error         text,
  last_error_at      timestamptz,
  notes              text,
  updated_at         timestamptz not null default now(),
  check (not (config ?| array['key','secret','token','password','api_key','client_secret']))
);

create table if not exists sellers (
  id          text primary key,               -- "icancycling.com", "tokopedia:shop-name"
  name        text not null,
  kind        text not null check (kind in ('official-manufacturer','authorized-distributor','retailer','marketplace-seller','community')),
  platform    text,                           -- marketplace / platform name when kind = marketplace-seller
  country     char(2),
  website     text,
  notes       text
);

create table if not exists offers (
  id               uuid primary key default gen_random_uuid(),
  product_id       text references products(id) on delete set null,   -- null = discovered, not yet matched
  variant_id       uuid references product_variants(id) on delete set null,
  provider_id      text not null references providers(id),
  seller_id        text references sellers(id),
  url              text not null,
  title_as_listed  text not null,
  price            numeric(14,2) check (price is null or price >= 0),
  currency         char(3),
  list_price       numeric(14,2),
  condition        text not null default 'unknown' check (condition in ('new','used','refurbished','open-box','unknown')),
  authenticity     text not null default 'unknown' check (authenticity in ('official','authorized','unknown','counterfeit-risk','unbranded')),
  availability     text not null default 'unknown' check (availability in ('in-stock','out-of-stock','preorder','unknown')),
  shipping         jsonb,                     -- only as stated by the source; never estimated
  observed_at      timestamptz not null,      -- when VELOX last saw this price / availability
  first_seen_at    timestamptz not null default now(),
  price_confidence        confidence_level not null default 'low',
  availability_confidence confidence_level not null default 'low',
  affiliate        boolean not null default false,
  sponsored        boolean not null default false,
  active           boolean not null default true,
  raw              jsonb,                     -- extracted listing facts (not copied descriptions)
  check ((price is null) = (currency is null)),
  unique (provider_id, url)
);
create index if not exists offers_product_idx  on offers (product_id) where product_id is not null;
create index if not exists offers_unmatched_idx on offers (provider_id, observed_at desc) where product_id is null;
create index if not exists offers_observed_idx on offers (observed_at desc);

create table if not exists price_observations (
  offer_id    uuid not null references offers(id) on delete cascade,
  observed_at timestamptz not null,
  price       numeric(14,2) not null,
  currency    char(3) not null,
  primary key (offer_id, observed_at)
);

create table if not exists fx_rates (
  currency     char(3) not null,
  idr_per_unit numeric(14,4) not null check (idr_per_unit > 0),
  rate_date    date not null,
  source       text not null,                 -- e.g. "Bank Indonesia JISDOR"
  source_url   text,
  primary key (currency, rate_date)
);

-- ---------- row-level security ------------------------------------------------------------------
alter table product_categories enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table product_sources    enable row level security;
alter table providers          enable row level security;
alter table sellers            enable row level security;
alter table offers             enable row level security;
alter table price_observations enable row level security;
alter table fx_rates           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['product_categories','products','product_variants','product_sources','providers','sellers','offers','price_observations','fx_rates'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

grant select on product_categories, products, product_variants, product_sources, providers, sellers, offers, price_observations, fx_rates to anon, authenticated;
grant insert, update, delete on product_categories, products, product_variants, product_sources, providers, sellers, offers, price_observations, fx_rates to authenticated;

-- ---------- search ---------------------------------------------------------------------------------
-- prefix query from free text: "carb road wheel" -> 'carb':* & 'road':* & 'wheel':*
create or replace function velox_prefix_query(q text) returns tsquery language sql immutable as $$
  select case when coalesce(trim(q), '') = '' then null else
    to_tsquery('simple', (
      select string_agg(quote_literal(lower(tok)) || ':*', ' & ')
      from regexp_split_to_table(regexp_replace(q, '[^[:alnum:][:space:].-]', ' ', 'g'), '\s+') as tok
      where tok <> ''
    )) end
$$;

create or replace function search_products(
  p_q          text    default null,
  p_kind       text    default null,
  p_category   text    default null,       -- matches the category and all its descendants
  p_brands     text[]  default null,
  p_min_idr    bigint  default null,
  p_max_idr    bigint  default null,
  p_year_min   int     default null,
  p_verified_only boolean default false,
  p_sort       text    default 'relevance', -- relevance | price-asc | price-desc | newest | name
  p_limit      int     default 24,
  p_offset     int     default 0
) returns table (
  id text, kind text, brand_id text, brand_name text, name text, model_year int, year_basis text,
  category_id text, subcategory text, material text, weight_g int, price_idr bigint, price_basis text,
  msrp_amount numeric, msrp_currency char(3), verification verification_status, primary_image text,
  official_url text, rank real, total bigint
) language sql stable as $$
  with q as (select velox_prefix_query(p_q) as tsq, lower(coalesce(p_q, '')) as raw),
  hits as (
    select p.*,
      case when q.tsq is null then 0
           else ts_rank(p.search_vector, q.tsq) + similarity(p.name_search, q.raw) end as rank_
    from products p, q
    where (q.tsq is null or p.search_vector @@ q.tsq or p.name_search % q.raw)
      and (p_kind is null or p.kind = p_kind)
      and (p_category is null or p.category_id in (select c.id from product_categories c where p_category = any(c.path)))
      and (p_brands is null or p.brand_id = any(p_brands))
      and (p_min_idr is null or p.price_idr >= p_min_idr)
      and (p_max_idr is null or p.price_idr <= p_max_idr)
      and (p_year_min is null or p.model_year >= p_year_min)
      and (not p_verified_only or p.verification in ('verified-official','verified-distributor','cross-verified'))
  )
  select h.id, h.kind, h.brand_id, h.brand_name, h.name, h.model_year, h.year_basis, h.category_id, h.subcategory, h.material, h.weight_g,
         h.price_idr, h.price_basis, h.msrp_amount, h.msrp_currency, h.verification, h.primary_image, h.official_url,
         h.rank_::real, count(*) over () as total
  from hits h
  order by
    case when p_sort = 'price-asc'  then h.price_idr end asc nulls last,
    case when p_sort = 'price-desc' then h.price_idr end desc nulls last,
    case when p_sort = 'newest'     then h.model_year end desc nulls last,
    case when p_sort = 'name'       then h.name_search end asc,
    h.rank_ desc, h.name_search asc, h.id
  limit least(greatest(coalesce(p_limit, 24), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
$$;
grant execute on function search_products(text, text, text, text[], bigint, bigint, int, boolean, text, int, int) to anon, authenticated;
grant execute on function velox_prefix_query(text) to anon, authenticated;

-- synthetic performance data never enters the real catalogue (it lives in a separate database)
alter table products drop constraint if exists products_no_synthetic;
alter table products add constraint products_no_synthetic check (data_origin <> 'synthetic-test');
