-- Stage 9: Public launch safeguards. Non-destructive.
create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
grant select on public.platform_settings to anon, authenticated;
drop policy if exists "Public launch settings are readable" on public.platform_settings;
create policy "Public launch settings are readable" on public.platform_settings for select to anon, authenticated using (true);
insert into public.platform_settings (key, value) values ('public_launch_status', 'prelaunch') on conflict (key) do nothing;
