-- =============================================================================
-- FixItLocal — Supabase / PostgreSQL Schema
-- Run this in the Supabase SQL Editor to set up your database.
-- =============================================================================

-- ENUMS
do $$ begin create type user_role as enum ('admin', 'triage', 'dispatcher', 'road_maintenance', 'sanitation', 'safety', 'electrical', 'animal_control', 'drainage', 'water_services'); exception when duplicate_object then null; end $$;
do $$ begin create type report_severity as enum ('High', 'Medium', 'Low'); exception when duplicate_object then null; end $$;
do $$ begin create type report_status as enum ('Open', 'In Progress', 'Resolved', 'Rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type assignment_status as enum ('pending', 'in-progress', 'completed'); exception when duplicate_object then null; end $$;
do $$ begin create type assignment_priority as enum ('High', 'Medium', 'Low'); exception when duplicate_object then null; end $$;
do $$ begin create type report_source as enum ('web', 'mobile', 'ai'); exception when duplicate_object then null; end $$;

-- DEPARTMENTS
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text,
  created_at  timestamptz not null default now()
);

-- PROFILES
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null,
  department_id uuid references public.departments(id) on delete set null,
  role          user_role not null default 'road_maintenance',
  avatar_url    text,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- REPORT CLUSTERS
create table if not exists public.report_clusters (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'General',
  centroid    double precision[] check (centroid is null or array_length(centroid, 1) = 2),
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- REPORTS
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  cluster_id    uuid references public.report_clusters(id) on delete set null,
  title         text not null,
  description   text,
  location      text,
  category      text not null default 'General',
  severity      report_severity not null default 'Medium',
  status        report_status   not null default 'Open',
  source        report_source   not null default 'mobile',
  views         integer not null default 0,
  image_url     text,
  coordinates   double precision[] check (coordinates is null or array_length(coordinates, 1) = 2),
  weight        double precision default 0.5,
  ai_analysis   jsonb,
  reporter_id   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- REPORT RESPONSES
create table if not exists public.report_responses (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- USER SETTINGS
create table if not exists public.user_settings (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  email_notif    boolean not null default true,
  push_notif     boolean not null default true,
  sms_alert      boolean not null default false,
  dark_mode      boolean not null default false,
  two_factor     boolean not null default false,
  public_profile boolean not null default false,
  sound_enabled  boolean not null default true,
  language       text    not null default 'English',
  updated_at     timestamptz not null default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text,
  type        text default 'info',
  is_read     boolean not null default false,
  related_id  uuid,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Touch updated_at on reports
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at
  before update on public.reports
  for each row execute procedure public.touch_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

-- Increment view count (called from mobile app)
create or replace function public.increment_report_views(report_id uuid)
returns void language sql security definer as $$
  update public.reports set views = views + 1 where id = report_id;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_responses enable row level security;
alter table public.user_settings enable row level security;
alter table public.notifications enable row level security;

-- Profiles: readable by all authenticated users, writable by owner
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Reports: fully readable by authenticated, insertable by authenticated
create policy "reports_select" on public.reports for select to authenticated using (true);
create policy "reports_insert" on public.reports for insert to authenticated with check (true);

-- Report responses: readable by all, insertable by authenticated
create policy "responses_select" on public.report_responses for select to authenticated using (true);
create policy "responses_insert" on public.report_responses for insert to authenticated with check (auth.uid() = user_id);

-- User settings: owner only
create policy "settings_select" on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy "settings_all" on public.user_settings for all to authenticated using (auth.uid() = user_id);

-- Notifications: owner only
create policy "notifications_select" on public.notifications for select to authenticated using (auth.uid() = user_id);

-- =============================================================================
-- STORAGE
-- =============================================================================

-- Run this in Storage settings or via SQL:
-- insert into storage.buckets (id, name, public) values ('report-images', 'report-images', true);

-- Storage policy: authenticated users can upload
-- create policy "upload_report_images" on storage.objects for insert to authenticated with check (bucket_id = 'report-images');
-- create policy "public_report_images" on storage.objects for select using (bucket_id = 'report-images');

-- Enable realtime on reports table
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.report_responses;
