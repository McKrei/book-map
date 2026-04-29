-- BookMap Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Books table
create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null default '',
  file_url text,
  created_at timestamptz not null default now()
);

-- Chapters table
create table if not exists chapters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  order_index integer not null,
  title text not null,
  summary text
);

-- Characters table
create table if not exists characters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  name text not null,
  description text not null default '',
  first_appearance_chapter integer not null default 1,
  color text not null default '#6366f1'
);

-- Plot events table
create table if not exists plot_events (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references books(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  order_index integer not null,
  title text not null,
  description text not null default '',
  event_type text not null default 'plot'
    check (event_type in ('plot', 'character_intro', 'character_change', 'climax', 'resolution'))
);

-- Character events (changes per event)
create table if not exists character_events (
  id uuid primary key default uuid_generate_v4(),
  character_id uuid not null references characters(id) on delete cascade,
  event_id uuid not null references plot_events(id) on delete cascade,
  change_description text not null default '',
  change_type text not null default 'development'
    check (change_type in ('development', 'death', 'transformation', 'revelation', 'relationship'))
);

-- Indexes
create index if not exists idx_chapters_book on chapters(book_id, order_index);
create index if not exists idx_characters_book on characters(book_id);
create index if not exists idx_plot_events_chapter on plot_events(chapter_id, order_index);
create index if not exists idx_character_events_event on character_events(event_id);
create index if not exists idx_character_events_char on character_events(character_id);

-- Row Level Security (optional, enable if needed)
alter table books enable row level security;
alter table chapters enable row level security;
alter table characters enable row level security;
alter table plot_events enable row level security;
alter table character_events enable row level security;

-- Allow anonymous access for now (adjust for production)
create policy "Allow all access to books" on books for all using (true) with check (true);
create policy "Allow all access to chapters" on chapters for all using (true) with check (true);
create policy "Allow all access to characters" on characters for all using (true) with check (true);
create policy "Allow all access to plot_events" on plot_events for all using (true) with check (true);
create policy "Allow all access to character_events" on character_events for all using (true) with check (true);
