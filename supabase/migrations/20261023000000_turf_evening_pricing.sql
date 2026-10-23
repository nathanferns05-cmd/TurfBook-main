-- Admin turf form saves evening_price and evening_start_hour; add the missing columns.
alter table public.turfs
  add column if not exists evening_price numeric,
  add column if not exists evening_start_hour integer
    check (evening_start_hour is null or evening_start_hour between 1 and 23);

-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';
