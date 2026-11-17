-- Search performance (measured on 50k synthetic rows in a separate database, scripts/catalog/perf-synthetic.sh):
--  * "(q is null OR vector @@ q)" with a run-time q cannot use the GIN indexes → full scans (~1.1–1.7 s).
--  * trigram "<%" evaluated row by row is expensive when a broad query makes the planner choose a scan.
-- These versions build only the conditions a call needs and search in two passes:
--   1. full-text (indexed words and prefixes, ranked with ts_rank)
--   2. only if pass 1 finds nothing: typo-tolerant word similarity ("polgon" → Polygon)
-- The page is cut on ids + sort keys before the wide columns are fetched.
-- Signatures and result columns are unchanged. All values are bound parameters ($n), never concatenated.

-- nearest-neighbour index for the typo pass: "order by q <<-> name_search limit n" reads only the closest names
create index if not exists products_name_gist on products using gist (name_search gist_trgm_ops);

create or replace function velox_search_sql(
  select_cols  text,     -- final column list (uses p. and page.)
  key_cols     text,     -- sort keys kept in the ranking step
  text_cond    text,     -- null = no text condition
  rank_expr    text,
  conds        text[],
  order_keys   text,     -- ORDER BY over the key columns (no table prefix)
  limit_param  text,
  offset_param text
) returns text language sql immutable as $$
  select format(
    'with hits as (select p.id, %s, %s as rank from products p where %s),
          page as (select h.*, count(*) over () as total from hits h order by %s limit %s offset %s)
     select %s from page join products p on p.id = page.id order by %s',
    key_cols, rank_expr, array_to_string(conds || coalesce(text_cond, 'true'), ' and '), order_keys, limit_param, offset_param,
    select_cols, regexp_replace(order_keys, '\m(price_idr|model_year|name_search|weight_g|rank|id)\M', 'page.\1', 'g'))
$$;

create or replace function search_products(
  p_q          text    default null,
  p_kind       text    default null,
  p_category   text    default null,
  p_brands     text[]  default null,
  p_min_idr    bigint  default null,
  p_max_idr    bigint  default null,
  p_year_min   int     default null,
  p_verified_only boolean default false,
  p_sort       text    default 'relevance',
  p_limit      int     default 24,
  p_offset     int     default 0
) returns table (
  id text, kind text, brand_id text, brand_name text, name text, model_year int, year_basis text,
  category_id text, subcategory text, material text, weight_g int, price_idr bigint, price_basis text,
  msrp_amount numeric, msrp_currency char(3), verification verification_status, primary_image text,
  official_url text, rank real, total bigint
) language plpgsql stable set pg_trgm.word_similarity_threshold = 0.5 as $fn$
declare
  tsq tsquery := velox_prefix_query(p_q);
  raw text := lower(coalesce(trim(p_q), ''));
  conds text[] := array['true'::text];
  order_keys text;
  n bigint;
  seqscan text;
  cols constant text := 'p.id, p.kind, p.brand_id, p.brand_name, p.name, p.model_year, p.year_basis, p.category_id, p.subcategory, p.material, p.weight_g,
     p.price_idr, p.price_basis, p.msrp_amount, p.msrp_currency, p.verification, p.primary_image, p.official_url, page.rank, page.total';
  keys constant text := 'p.price_idr, p.model_year, p.name_search';
  lim int := least(greatest(coalesce(p_limit, 24), 1), 100);
  off int := greatest(coalesce(p_offset, 0), 0);
begin
  if p_kind is not null then conds := array_append(conds, 'p.kind = $3'::text); end if;
  if p_category is not null then conds := array_append(conds, 'p.category_id in (select c.id from product_categories c where $4 = any(c.path))'::text); end if;
  if p_brands is not null then conds := array_append(conds, 'p.brand_id = any($5)'::text); end if;
  if p_min_idr is not null then conds := array_append(conds, 'p.price_idr >= $6'::text); end if;
  if p_max_idr is not null then conds := array_append(conds, 'p.price_idr <= $7'::text); end if;
  if p_year_min is not null then conds := array_append(conds, 'p.model_year >= $8'::text); end if;
  if p_verified_only then conds := array_append(conds, $c$p.verification in ('verified-official','verified-distributor','cross-verified')$c$::text); end if;
  order_keys := case p_sort
    when 'price-asc'  then 'price_idr asc nulls last, '
    when 'price-desc' then 'price_idr desc nulls last, '
    when 'newest'     then 'model_year desc nulls last, '
    when 'name'       then 'name_search asc, '
    else '' end || 'rank desc, name_search asc, id';

  if tsq is null then
    return query execute velox_search_sql(cols, keys, null, '0::real', conds, order_keys, '$9', '$10')
      using tsq, raw, p_kind, p_category, p_brands, p_min_idr, p_max_idr, p_year_min, lim, off;
    return;
  end if;
  return query execute velox_search_sql(cols, keys, 'p.search_vector @@ $1', 'ts_rank(p.search_vector, $1)::real', conds, order_keys, '$9', '$10')
    using tsq, raw, p_kind, p_category, p_brands, p_min_idr, p_max_idr, p_year_min, lim, off;
  get diagnostics n = row_count;
  if n > 0 or off > 0 then return; end if;
  -- the words exist in the catalogue but the filters exclude them: no typo guessing
  if exists (select 1 from products x where x.search_vector @@ tsq) then return; end if;
  -- nothing matched the words as typed: typo-tolerant pass over the 500 closest names (GiST nearest-neighbour),
  -- so its cost stays bounded however many products share a misspelt word. The planner tends to choose a full
  -- scan here, which is far slower (measured), so sequential scans are off for this query only.
  seqscan := current_setting('enable_seqscan');
  perform set_config('enable_seqscan', 'off', true);
  return query execute velox_search_sql(cols, keys, 'p.id in (select x.id from products x order by $2 <<-> x.name_search limit 500) and $2 <% p.name_search', 'word_similarity($2, p.name_search)::real', conds, order_keys, '$9', '$10')
    using tsq, raw, p_kind, p_category, p_brands, p_min_idr, p_max_idr, p_year_min, lim, off;
  perform set_config('enable_seqscan', seqscan, true);
end $fn$;

create or replace function search_components(
  p_q          text    default null,
  p_types      text[]  default null,
  p_brand      text    default null,
  p_discipline text    default null,
  p_tier       text    default null,
  p_sort       text    default 'relevance',
  p_limit      int     default 50,
  p_offset     int     default 0
) returns table (
  id text, brand_id text, brand_name text, name text, type text, discipline jsonb, tier text, material text, weight_g int,
  price_idr bigint, price_entry jsonb, verification verification_status, rank real, total bigint
) language plpgsql stable set pg_trgm.word_similarity_threshold = 0.5 as $fn$
declare
  tsq tsquery := velox_prefix_query(p_q);
  raw text := lower(coalesce(trim(p_q), ''));
  conds text[] := array[$c$p.kind <> 'bike'$c$::text, $c$p.verification <> 'archived'$c$::text];
  order_keys text;
  n bigint;
  seqscan text;
  cols constant text := $c$p.id, p.brand_id, p.brand_name, p.name, p.details->>'type', p.details->'discipline', p.details->>'tier', p.material, p.weight_g,
     p.price_idr, p.details->'priceEntry', p.verification, page.rank, page.total$c$;
  keys constant text := 'p.price_idr, p.weight_g, p.name_search';
  lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
  off int := greatest(coalesce(p_offset, 0), 0);
begin
  if p_types is not null then conds := array_append(conds, $c$p.details->>'type' = any($3)$c$::text); end if;
  if p_brand is not null then conds := array_append(conds, 'p.brand_id = $4'::text); end if;
  if p_discipline is not null then conds := array_append(conds, $c$(p.details->'discipline' ? $5 or p.details->'discipline' ? 'universal')$c$::text); end if;
  if p_tier is not null then conds := array_append(conds, $c$p.details->>'tier' = $6$c$::text); end if;
  order_keys := case p_sort
    when 'price-asc'  then 'price_idr asc nulls last, '
    when 'price-desc' then 'price_idr desc nulls last, '
    when 'weight'     then 'weight_g asc nulls last, '
    else '' end || 'rank desc, name_search asc, id';

  if tsq is null then
    return query execute velox_search_sql(cols, keys, null, '0::real', conds, order_keys, '$7', '$8')
      using tsq, raw, p_types, p_brand, p_discipline, p_tier, lim, off;
    return;
  end if;
  return query execute velox_search_sql(cols, keys, 'p.search_vector @@ $1', 'ts_rank(p.search_vector, $1)::real', conds, order_keys, '$7', '$8')
    using tsq, raw, p_types, p_brand, p_discipline, p_tier, lim, off;
  get diagnostics n = row_count;
  if n > 0 or off > 0 then return; end if;
  if exists (select 1 from products x where x.search_vector @@ tsq) then return; end if;
  seqscan := current_setting('enable_seqscan');
  perform set_config('enable_seqscan', 'off', true);
  return query execute velox_search_sql(cols, keys, 'p.id in (select x.id from products x order by $2 <<-> x.name_search limit 500) and $2 <% p.name_search', 'word_similarity($2, p.name_search)::real', conds, order_keys, '$7', '$8')
    using tsq, raw, p_types, p_brand, p_discipline, p_tier, lim, off;
  perform set_config('enable_seqscan', seqscan, true);
end $fn$;

-- pure string builder (no data access); callers run it with their own rights
grant execute on function velox_search_sql(text, text, text, text, text[], text, text, text) to anon, authenticated;
