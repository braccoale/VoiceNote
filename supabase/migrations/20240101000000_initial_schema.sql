-- ============================================================
-- VoiceOrder — Schema iniziale
-- ============================================================

-- Estensioni utili
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- per ricerca full-text

-- ─────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null default 'Diario di Lavoro',
  address      text not null default 'Generale',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                timestamptz not null default now(),
  template_type       text not null default 'cantiere'
                        check (template_type in ('cantiere','sopralluogo','verbale','manutenzione')),
  raw_transcription   text,
  title               text,
  weather             text,
  personnel           text,
  activities          text,
  issues              text,
  directives          text,
  signature           text,  -- base64 PNG
  photos              jsonb not null default '[]',  -- array di {uri, base64, caption}
  synced_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indice full-text per ricerca
create index if not exists reports_fts_idx
  on public.reports using gin (
    to_tsvector('italian',
      coalesce(title,'') || ' ' ||
      coalesce(activities,'') || ' ' ||
      coalesce(raw_transcription,'') || ' ' ||
      coalesce(issues,'')
    )
  );

-- Indice trigram per ILIKE veloce
create index if not exists reports_trgm_idx
  on public.reports using gin (activities gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- OFFLINE QUEUE
-- ─────────────────────────────────────────────────────────────
create table if not exists public.offline_queue (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  audio_uri    text not null,
  template     text not null default 'cantiere',
  created_at   timestamptz not null default now(),
  processed    boolean not null default false
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
alter table public.projects enable row level security;
alter table public.reports enable row level security;
alter table public.offline_queue enable row level security;

-- Projects: solo il proprietario
create policy "projects_owner" on public.projects
  for all using (auth.uid() = user_id);

-- Reports: solo il proprietario
create policy "reports_owner" on public.reports
  for all using (auth.uid() = user_id);

-- Queue: solo il proprietario
create policy "queue_owner" on public.offline_queue
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: aggiorna updated_at automaticamente
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();
