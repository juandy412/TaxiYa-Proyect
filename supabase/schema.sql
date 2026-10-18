create table if not exists public.rides (
  id uuid primary key,
  origin text not null,
  destination text not null,
  offer integer not null check (offer > 0),
  status text not null check (
    status in ('requested', 'accepted', 'enroute', 'arrived', 'in_trip', 'finished', 'cancelled')
  ),
  driver_name text not null default '',
  plate text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rides enable row level security;

drop policy if exists "TaxiYa demo can read rides" on public.rides;
create policy "TaxiYa demo can read rides"
  on public.rides for select to anon, authenticated using (true);

drop policy if exists "TaxiYa demo can create rides" on public.rides;
create policy "TaxiYa demo can create rides"
  on public.rides for insert to anon, authenticated with check (true);

drop policy if exists "TaxiYa demo can update rides" on public.rides;
create policy "TaxiYa demo can update rides"
  on public.rides for update to anon, authenticated using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rides'
  ) then
    execute 'alter publication supabase_realtime add table public.rides';
  end if;
end $$;
