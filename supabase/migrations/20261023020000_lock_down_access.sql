-- Security fixes from the app review.
-- The server (registerAccount, payments) uses the service-role key, which bypasses
-- row level security, so none of these rules affect sign-up or payment confirmation.

-- 1. profiles: had RLS off, so anyone could read every user's name, email and phone.
alter table public.profiles enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- 2. user_roles: had RLS off, so anyone could give themselves the admin role.
alter table public.user_roles enable row level security;

drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- 3. admin_codes: had RLS off, so anyone could read the turf owner code.
-- No policies: only the server (service role) can read it.
alter table public.admin_codes enable row level security;

-- 4. bookings: "players update own bookings" let a player change any column of their
-- booking, including setting status = 'confirmed' without paying.
-- Players may now only create pending bookings and cancel their own; turf owners
-- and the server keep full control.
create or replace function public.guard_player_booking_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Server (service role) and SQL editor: no restrictions. Anonymous users are
  -- already blocked by the bookings RLS policies.
  if auth.uid() is null then
    return new;
  end if;

  -- Turf owners manage bookings on their own turfs (walk-ins, etc.).
  if exists (select 1 from public.turfs where id = new.turf_id and owner_id = auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.created_by_admin := false;
    new.razorpay_order_id := null;
    new.razorpay_payment_id := null;
    return new;
  end if;

  -- UPDATE by a player: only pending/confirmed -> cancelled, nothing else changed.
  if new.status is distinct from 'cancelled'
     or old.status = 'cancelled'
     or (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at')
  then
    raise exception 'You can only cancel your booking.';
  end if;
  return new;
end;
$$;

-- Named to fire before the other booking triggers (BEFORE triggers run in name order),
-- so it only sees the changes the player actually sent.
drop trigger if exists a_guard_player_booking_changes on public.bookings;
create trigger a_guard_player_booking_changes
  before insert or update on public.bookings
  for each row execute function public.guard_player_booking_changes();

notify pgrst, 'reload schema';

-- After running, this should list no public tables with RLS off (rowsecurity = false):
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
