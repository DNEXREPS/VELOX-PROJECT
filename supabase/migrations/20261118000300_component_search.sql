-- Component explorer search (paged) + manufacturer facets. Additive.
-- details->>'type' / 'tier' / 'discipline' carry VELOX's component classification.

create index if not exists products_details_type on products ((details->>'type')) where kind <> 'bike';
create index if not exists products_weight_idx on products (weight_g) where weight_g is not null;

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
) language sql stable as $$
  with q as (select velox_prefix_query(p_q) as tsq, lower(coalesce(p_q, '')) as raw),
  hits as (
    select p.*,
      case when q.tsq is null then 0 else ts_rank(p.search_vector, q.tsq) + similarity(p.name_search, q.raw) end as rank_
    from products p, q
    where p.kind <> 'bike' and p.verification <> 'archived'
      and (q.tsq is null or p.search_vector @@ q.tsq or p.name_search % q.raw)
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

create or replace function component_brand_facets(p_types text[] default null)
returns table (brand_id text, brand_name text, n bigint) language sql stable as $$
  select p.brand_id, min(p.brand_name), count(*) from products p
  where p.kind <> 'bike' and p.verification <> 'archived' and (p_types is null or p.details->>'type' = any(p_types))
  group by p.brand_id order by min(p.brand_name)
$$;

grant execute on function search_components(text, text[], text, text, text, text, int, int) to anon, authenticated;
grant execute on function component_brand_facets(text[]) to anon, authenticated;
