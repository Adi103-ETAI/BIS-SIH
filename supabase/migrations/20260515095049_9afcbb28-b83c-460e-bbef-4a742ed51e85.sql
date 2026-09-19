
create type public.app_role as enum ('admin', 'user');
create type public.plan_tier as enum ('free', 'pro');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  specialty text,
  avatar_url text,
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);
alter table public.collections enable row level security;
create policy "collections_all_own" on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.query_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  title text,
  response jsonb,
  sources_used text[],
  model text,
  created_at timestamptz not null default now()
);
alter table public.query_history enable row level security;
create policy "history_all_own" on public.query_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index query_history_user_created_idx on public.query_history(user_id, created_at desc);

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  title text not null,
  source_type text not null,
  chunk_text text not null,
  score numeric,
  mongo_id text,
  query_context text,
  notes text,
  tags text[],
  saved_at timestamptz not null default now()
);
alter table public.vault_items enable row level security;
create policy "vault_all_own" on public.vault_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index vault_items_user_saved_idx on public.vault_items(user_id, saved_at desc);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.api_keys enable row level security;
create policy "api_keys_all_own" on public.api_keys for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan public.plan_tier not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subs_select_own" on public.subscriptions for select using (auth.uid() = user_id);
create trigger subs_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  query_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, period_start)
);
alter table public.usage_counters enable row level security;
create policy "usage_select_own" on public.usage_counters for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'active');
  return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_owner_update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_owner_delete" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
