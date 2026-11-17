#!/usr/bin/env bash
# Load the exported catalogue into PostgreSQL (LOCAL stack by default). Idempotent: upserts by id,
# never deletes, and never overwrites a product an admin has edited (seed_locked = true).
# Usage: scripts/catalog/load-seed.sh [database]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
STATE="${VELOX_STACK_DIR:-/tmp/velox-local-stack}"; DB="${1:-postgres}"
SEED="$ROOT/.cache/catalog-seed"
node "$HERE/export-seed.mjs" "$SEED"
chmod -R a+r "$ROOT/.cache"; chmod a+x "$ROOT/.cache" "$SEED"
PSQL="env PGOPTIONS=--client-min-messages=warning psql -h $STATE -p 54322 -U postgres -d $DB -v ON_ERROR_STOP=1 -q"

su postgres -c "$PSQL -1" <<SQL
create temp table s_brands (doc jsonb); create temp table s_products (doc jsonb);
create temp table s_sources (doc jsonb); create temp table s_variants (doc jsonb); create temp table s_offers (doc jsonb);
\copy s_brands   (doc) from '$SEED/brands.jsonl'   with (format csv, quote e'\x01', delimiter e'\x02')
\copy s_products (doc) from '$SEED/products.jsonl' with (format csv, quote e'\x01', delimiter e'\x02')
\copy s_sources  (doc) from '$SEED/sources.jsonl'  with (format csv, quote e'\x01', delimiter e'\x02')
\copy s_variants (doc) from '$SEED/variants.jsonl' with (format csv, quote e'\x01', delimiter e'\x02')
\copy s_offers   (doc) from '$SEED/offers.jsonl'   with (format csv, quote e'\x01', delimiter e'\x02')

-- countries referenced by brands (ISO code + name; region as used by VELOX)
insert into countries (code, name, region)
select distinct doc->>'country_code', doc->>'country_name',
       case when doc->>'country_code' = 'ID' then 'Indonesia' else 'International' end
from s_brands where doc->>'country_code' is not null
on conflict (code) do nothing;

insert into brands (id, name, country_code, founded, website, description, history, logo_url, mark_color, kinds, parent_company, headquarters,
                    status, confidence, original_manufacturer, reviewer_notes, is_demo, updated_at)
select doc->>'id', doc->>'name', doc->>'country_code', (doc->>'founded')::int, doc->>'website', coalesce(doc->>'description',''), doc->>'history',
       doc->>'logo_url', doc->>'mark_color', array(select jsonb_array_elements_text(doc->'kinds'))::brand_kind[], doc->>'parent_company', doc->>'headquarters',
       (doc->>'status')::verification_status, (doc->>'confidence')::confidence_level, doc->>'original_manufacturer', doc->>'reviewer_notes', (doc->>'is_demo')::boolean, now()
from s_brands
on conflict (id) do update set name = excluded.name, country_code = excluded.country_code, founded = excluded.founded, website = excluded.website,
  description = excluded.description, history = excluded.history, kinds = excluded.kinds, parent_company = excluded.parent_company,
  headquarters = excluded.headquarters, status = excluded.status, confidence = excluded.confidence, original_manufacturer = excluded.original_manufacturer,
  reviewer_notes = excluded.reviewer_notes, is_demo = excluded.is_demo, updated_at = now();

insert into products (id, kind, brand_id, name, model, family, model_year, year_basis, category_id, subcategory, description, specs, compat, weight_g,
                      material, official_url, primary_image, msrp_amount, msrp_currency, price_idr, price_basis, price_source_url, price_observed_on,
                      verification, identity_confidence, specs_confidence, manufacturer_confidence, last_verified_at, data_origin, details)
select doc->>'id', doc->>'kind', doc->>'brand_id', doc->>'name', doc->>'model', doc->>'family', (doc->>'model_year')::int, doc->>'year_basis',
       doc->>'category_id', doc->>'subcategory', doc->>'description', doc->'specs', doc->'compat', (doc->>'weight_g')::int, doc->>'material',
       doc->>'official_url', doc->>'primary_image', (doc->>'msrp_amount')::numeric, doc->>'msrp_currency', (doc->>'price_idr')::bigint, doc->>'price_basis',
       doc->>'price_source_url', (doc->>'price_observed_on')::date, (doc->>'verification')::verification_status,
       (doc->>'identity_confidence')::confidence_level, (doc->>'specs_confidence')::confidence_level, (doc->>'manufacturer_confidence')::confidence_level,
       (doc->>'last_verified_at')::timestamptz, doc->>'data_origin', doc->'details'
from s_products
on conflict (id) do update set kind = excluded.kind, brand_id = excluded.brand_id, name = excluded.name, model = excluded.model, family = excluded.family,
  model_year = excluded.model_year, year_basis = excluded.year_basis, category_id = excluded.category_id, subcategory = excluded.subcategory,
  description = excluded.description, specs = excluded.specs, compat = excluded.compat, weight_g = excluded.weight_g, material = excluded.material,
  official_url = excluded.official_url, primary_image = excluded.primary_image, msrp_amount = excluded.msrp_amount, msrp_currency = excluded.msrp_currency,
  price_idr = excluded.price_idr, price_basis = excluded.price_basis, price_source_url = excluded.price_source_url, price_observed_on = excluded.price_observed_on,
  verification = excluded.verification, identity_confidence = excluded.identity_confidence, specs_confidence = excluded.specs_confidence,
  manufacturer_confidence = excluded.manufacturer_confidence, last_verified_at = excluded.last_verified_at, data_origin = excluded.data_origin, details = excluded.details
where not products.seed_locked;

insert into product_sources (product_id, field, label, url, source_type, retrieved_at)
select doc->>'product_id', doc->>'field', doc->>'label', doc->>'url', (doc->>'source_type')::source_type, (doc->>'retrieved_at')::date
from s_sources
on conflict do nothing;

insert into product_variants (product_id, label, mpn)
select doc->>'product_id', doc->>'label', doc->>'mpn' from s_variants
on conflict (product_id, label) do update set mpn = excluded.mpn;

-- offers found during VELOX's own research (a seller's listing, kept apart from the product record)
insert into providers (id, name, type, access_method, status, enabled, notes)
values ('velox-research', 'VELOX research', 'manual', 'manual research of public pages, recorded with source URL and date', 'manual-only', true,
        'Offers recorded by VELOX researchers. Observed prices, not live.')
on conflict (id) do nothing;
insert into sellers (id, name, kind, website)
select distinct on (doc->>'seller_id') doc->>'seller_id', doc->>'seller_name', doc->>'seller_kind', 'https://' || (doc->>'seller_id') from s_offers
on conflict (id) do nothing;
insert into offers (product_id, provider_id, seller_id, url, title_as_listed, price, currency, condition, observed_at, price_confidence)
select doc->>'product_id', doc->>'provider_id', doc->>'seller_id', doc->>'url', doc->>'title_as_listed', (doc->>'price')::numeric, doc->>'currency',
       doc->>'condition', coalesce((doc->>'observed_at')::timestamptz, now()), 'medium'
from s_offers
on conflict (provider_id, url) do update set price = excluded.price, currency = excluded.currency, observed_at = excluded.observed_at, title_as_listed = excluded.title_as_listed;
insert into price_observations (offer_id, observed_at, price, currency)
select id, observed_at, price, currency from offers where provider_id = 'velox-research' and price is not null
on conflict do nothing;
SQL

su postgres -c "$PSQL -tA" <<'SQL'
select 'brands ' || count(*) from brands;
select 'products ' || count(*) || ' (bikes ' || count(*) filter (where kind='bike') || ', parts ' || count(*) filter (where kind<>'bike') || ')' from products;
select 'with image ' || count(*) filter (where primary_image is not null) || ', priced ' || count(*) filter (where price_idr is not null) from products;
select 'sources ' || count(*) from product_sources;
select 'variants ' || count(*) from product_variants;
select 'offers ' || count(*) || ' (sellers ' || (select count(*) from sellers) || ')' from offers;
SQL
