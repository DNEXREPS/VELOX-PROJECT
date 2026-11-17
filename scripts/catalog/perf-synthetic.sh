#!/usr/bin/env bash
# Search performance test on SYNTHETIC data in a SEPARATE database (velox_perf_synthetic).
# Never touches the real catalogue database. Every row is named "SYNTHETIC TEST …" and has
# data_origin = 'synthetic-test'. Usage: scripts/catalog/perf-synthetic.sh [rows] (default 50000)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
STATE="${VELOX_STACK_DIR:-/tmp/velox-local-stack}"; DB=velox_perf_synthetic; ROWS="${1:-50000}"
PSQL="env PGOPTIONS=--client-min-messages=warning psql -h $STATE -p 54322 -U postgres -v ON_ERROR_STOP=1 -q"

su postgres -c "$PSQL -d postgres -c 'drop database if exists $DB' -c 'create database $DB'"
# the baseline schema references Supabase's auth schema; a minimal stand-in is enough for search tests
su postgres -c "$PSQL -d $DB" <<'SQL'
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as 'select null::uuid';
SQL
su postgres -c "$PSQL -d $DB -f $ROOT/supabase/schema.sql" >/dev/null
bash "$ROOT/scripts/local-supabase/migrate.sh" "$DB" >/dev/null

su postgres -c "$PSQL -d $DB" <<SQL
-- allow the synthetic origin in THIS database only
alter table products drop constraint products_no_synthetic;
alter table products drop constraint products_data_origin_check;
alter table products add constraint products_data_origin_synthetic check (data_origin = 'synthetic-test');

insert into brands (id, name, description, status, kinds)
select 'synthetic-brand-' || g, 'SYNTHETIC TEST BRAND ' || g, 'Synthetic performance-test record — not a real company.', 'unverified', '{components}'
from generate_series(1, 1500) g;

with words as (select array['Aero','Carbon','Alloy','Gravel','Road','Trail','Enduro','Climb','Disc','Tubeless','Light','Race','Pro','Comp','Sport','Elite','Ultra','Endurance','Urban','Track'] w),
     cats as (select array_agg(id) c from product_categories where parent_id is not null),
     types as (select array['wheelset','groupset','crankset','cassette','chain','tires','handlebar','stem','saddle','seatpost','pedals','hub','bearing','brakes','rear-derailleur','shifters','fork','rim','accessory'] t)
insert into products (id, kind, brand_id, name, model, model_year, year_basis, category_id, subcategory, description, specs, compat, weight_g,
                      material, price_idr, price_basis, verification, data_origin, details)
select 'synthetic-' || g,
       case when g % 10 = 0 then 'bike' else 'component' end,
       'synthetic-brand-' || (1 + g % 1500),
       'SYNTHETIC TEST ' || w[1 + (g * 7) % 20] || ' ' || w[1 + (g * 13) % 20] || ' ' || g,
       case when g % 3 = 0 then 'V' || (g % 5) end,
       2015 + g % 12, 'model-year',
       c[1 + g % array_length(c, 1)],
       t[1 + g % array_length(t, 1)],
       'Synthetic performance-test record ' || g || '. Not a real product.',
       jsonb_build_object('Speeds', 8 + g % 6, 'Axle', case when g % 2 = 0 then '12x142' else '12x100' end),
       jsonb_build_object('speeds', 8 + g % 6),
       200 + (g * 37) % 3000,
       (array['Carbon','Aluminium','Steel','Titanium'])[1 + g % 4],
       case when g % 7 = 0 then null else 50000 + ((g::bigint * 7919) % 400) * 125000 end,
       'estimate',
       'unverified', 'synthetic-test',
       jsonb_build_object('type', t[1 + g % array_length(t, 1)], 'tier', (array['entry','mid','performance','pro'])[1 + g % 4],
                          'discipline', jsonb_build_array((array['road','gravel','mtb','urban','universal'])[1 + g % 5]))
from generate_series(1, $ROWS) g, words, cats, types;
analyze;
SQL

echo "Synthetic rows: $(su postgres -c "$PSQL -d $DB -tAc 'select count(*) from products'") products (all data_origin=synthetic-test) in database $DB"

# timing: each query runs 7 times; report the median and the slowest (ms)
su postgres -c "$PSQL -d $DB -tA" <<'SQL'
create temp table q (label text, sql text);
insert into q values
 ('text: "carbon aero"',          $$select count(*) from search_products(p_q => 'carbon aero', p_limit => 24)$$),
 ('prefix: "endur"',              $$select count(*) from search_products(p_q => 'endur', p_limit => 24)$$),
 ('category tree: wheels',        $$select count(*) from search_products(p_category => 'wheels', p_limit => 24)$$),
 ('budget + sort price',          $$select count(*) from search_products(p_max_idr => 5000000, p_sort => 'price-asc', p_limit => 24)$$),
 ('text + category + budget',     $$select count(*) from search_products(p_q => 'race', p_category => 'drivetrain', p_max_idr => 10000000, p_limit => 24)$$),
 ('deep page (offset 2400)',      $$select count(*) from search_products(p_q => 'pro', p_limit => 24, p_offset => 2400)$$),
 ('components: type + tier',      $$select count(*) from search_components(p_types => array['wheelset','rim'], p_tier => 'mid', p_limit => 50)$$),
 ('components: text + weight',    $$select count(*) from search_components(p_q => 'light', p_sort => 'weight', p_limit => 50)$$),
 ('typo: "carbn gravle" (none)', $$select count(*) from search_products(p_q => 'carbn gravle', p_limit => 24)$$),
 ('typo: "synthetik"',            $$select count(*) from search_products(p_q => 'synthetik', p_limit => 24)$$),
 ('components typo "endurnce"',   $$select count(*) from search_components(p_q => 'endurnce', p_limit => 50)$$),
 ('facets: wheelset brands',      $$select count(*) from component_brand_facets(array['wheelset'])$$);
do $$
declare r record; i int; t0 timestamptz; times numeric[];
begin
  for r in select * from q loop
    times := '{}';
    for i in 1..7 loop
      t0 := clock_timestamp(); execute r.sql; times := times || (extract(epoch from clock_timestamp() - t0) * 1000)::numeric;
    end loop;
    raise warning '%', rpad(r.label, 30) || ' median ' || lpad(round((select percentile_cont(0.5) within group (order by x) from unnest(times) x)::numeric, 1)::text, 7) || ' ms   max ' || lpad(round((select max(x) from unnest(times) x), 1)::text, 7) || ' ms';
  end loop;
end $$;
SQL
