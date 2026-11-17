-- Typo tolerance: match a short query against long names by WORD similarity ("polgon" ~ "polygon bend r2").
-- Threshold 0.5 (measured): catches "polgon"→polygon (0.50), "shimno"→shimano (0.57); rejects "polgon"→polo (0.43).
-- Replaces the two search functions; signatures unchanged. Uses the existing trigram index on name_search.
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
) language sql stable set pg_trgm.word_similarity_threshold = 0.5 as $$
  with q as (select velox_prefix_query(p_q) as tsq, lower(coalesce(p_q, '')) as raw),
  hits as (
    select p.*,
      case when q.tsq is null then 0
           else ts_rank(p.search_vector, q.tsq) + word_similarity(q.raw, p.name_search) end as rank_
    from products p, q
    where (q.tsq is null or p.search_vector @@ q.tsq or q.raw <% p.name_search)
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

create or replace function search_components(
  p_q          text    default null,
  p_types      text[]  default null,   -- VELOX component types, e.g. {wheelset,rim}
  p_brand      text    default null,
  p_discipline text    default null,   -- matches the discipline or "universal"
  p_tier       text    default null,
  p_sort       text    default 'relevance',  -- relevance | price-asc | price-desc | weight
  p_limit      int     default 50,
  p_offset     int     default 0
) returns table (
  id text, brand_id text, brand_name text, name text, type text, discipline jsonb, tier text, material text, weight_g int,
  price_idr bigint, price_entry jsonb, verification verification_status, rank real, total bigint
) language sql stable set pg_trgm.word_similarity_threshold = 0.5 as $$
  with q as (select velox_prefix_query(p_q) as tsq, lower(coalesce(p_q, '')) as raw),
  hits as (
    select p.*,
      case when q.tsq is null then 0 else ts_rank(p.search_vector, q.tsq) + word_similarity(q.raw, p.name_search) end as rank_
    from products p, q
    where p.kind <> 'bike' and p.verification <> 'archived'
      and (q.tsq is null or p.search_vector @@ q.tsq or q.raw <% p.name_search)
      and (p_types is null or p.details->>'type' = any(p_types))
      and (p_brand is null or p.brand_id = p_brand)
      and (p_discipline is null or p.details->'discipline' ? p_discipline or p.details->'discipline' ? 'universal')
      and (p_tier is null or p.details->>'tier' = p_tier)
  )
  select h.id, h.brand_id, h.brand_name, h.name, h.details->>'type', h.details->'discipline', h.details->>'tier', h.material, h.weight_g,
         h.price_idr, h.details->'priceEntry', h.verification, h.rank_::real, count(*) over ()
  from hits h
  order by
    case when p_sort = 'price-asc'  then h.price_idr end asc nulls last,
    case when p_sort = 'price-desc' then h.price_idr end desc nulls last,
    case when p_sort = 'weight'     then h.weight_g end asc nulls last,
    h.rank_ desc, h.name_search asc, h.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
$$;

