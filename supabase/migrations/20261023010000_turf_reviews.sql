-- Player reviews for turfs: one review per player per turf, editable by its author.
create table if not exists public.turf_reviews (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reviewer_name text not null default 'Player',
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (turf_id, user_id)
);

create index if not exists turf_reviews_turf_id_idx on public.turf_reviews (turf_id, created_at desc);

-- Reviewer name always comes from the author's profile, so it can't be faked from the client.
create or replace function public.set_turf_review_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.reviewer_name := coalesce(
    nullif(trim((select full_name from public.profiles where id = auth.uid())), ''),
    'Player'
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists turf_reviews_set_author on public.turf_reviews;
create trigger turf_reviews_set_author
  before insert or update on public.turf_reviews
  for each row execute function public.set_turf_review_author();

alter table public.turf_reviews enable row level security;

drop policy if exists "Reviews are visible to signed-in users" on public.turf_reviews;
create policy "Reviews are visible to signed-in users"
  on public.turf_reviews for select
  to authenticated
  using (true);

-- Owners can't review their own turf.
drop policy if exists "Players add their own review" on public.turf_reviews;
create policy "Players add their own review"
  on public.turf_reviews for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.turfs t where t.id = turf_id and t.owner_id = auth.uid())
  );

drop policy if exists "Players edit their own review" on public.turf_reviews;
create policy "Players edit their own review"
  on public.turf_reviews for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Players delete their own review" on public.turf_reviews;
create policy "Players delete their own review"
  on public.turf_reviews for delete
  to authenticated
  using (user_id = auth.uid());

-- Average rating and review count per turf, for listing cards.
create or replace view public.turf_ratings
with (security_invoker = true) as
select
  turf_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*)::int as review_count
from public.turf_reviews
group by turf_id;

grant select on public.turf_ratings to authenticated;

notify pgrst, 'reload schema';
