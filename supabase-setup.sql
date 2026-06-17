-- Run this in Supabase SQL Editor
-- Go to: Supabase dashboard → SQL Editor → New query → paste → Run

-- Drop existing table if starting fresh (comment out if you have data to keep)
-- drop table if exists contacts;

-- Create towns table
create table if not exists towns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  province text,
  region text,
  population integer,
  seeded boolean default false,
  created_at timestamptz default now()
);

-- Create contacts table with town support
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  town_slug text not null references towns(slug),
  category text,
  type text,
  phone text,
  email text,
  website text,
  address text,
  description text,
  tags text[],
  mentions integer default 0,
  sentiment text,
  photo_url text,
  hours jsonb,
  instagram text,
  is_subscriber boolean default false,
  source text default 'wa_export',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(slug, town_slug)
);

-- Seed initial towns
insert into towns (slug, name, province, region) values
  ('plett', 'Plettenberg Bay', 'Western Cape', 'Garden Route'),
  ('knysna', 'Knysna', 'Western Cape', 'Garden Route'),
  ('george', 'George', 'Western Cape', 'Garden Route'),
  ('hermanus', 'Hermanus', 'Western Cape', 'Overberg'),
  ('stellenbosch', 'Stellenbosch', 'Western Cape', 'Winelands'),
  ('franschhoek', 'Franschhoek', 'Western Cape', 'Winelands'),
  ('paarltown', 'Paarl', 'Western Cape', 'Winelands'),
  ('worcester', 'Worcester', 'Western Cape', 'Breede Valley'),
  ('mossel-bay', 'Mossel Bay', 'Western Cape', 'Garden Route'),
  ('wilderness', 'Wilderness', 'Western Cape', 'Garden Route'),
  ('sedgefield', 'Sedgefield', 'Western Cape', 'Garden Route'),
  ('jeffreys-bay', 'Jeffreys Bay', 'Eastern Cape', 'Sunshine Coast'),
  ('grahamstown', 'Makhanda', 'Eastern Cape', 'Makana'),
  ('port-elizabeth', 'Gqeberha', 'Eastern Cape', 'Nelson Mandela Bay'),
  ('east-london', 'East London', 'Eastern Cape', 'Buffalo City'),
  ('durban', 'Durban', 'KwaZulu-Natal', 'eThekwini'),
  ('ballito', 'Ballito', 'KwaZulu-Natal', 'KwaDukuza'),
  ('umhlanga', 'Umhlanga', 'KwaZulu-Natal', 'eThekwini'),
  ('johannesburg', 'Johannesburg', 'Gauteng', 'City of Joburg'),
  ('pretoria', 'Pretoria', 'Gauteng', 'City of Tshwane'),
  ('sandton', 'Sandton', 'Gauteng', 'City of Joburg'),
  ('cape-town', 'Cape Town', 'Western Cape', 'City of Cape Town'),
  ('sea-point', 'Sea Point', 'Western Cape', 'City of Cape Town'),
  ('constantia', 'Constantia', 'Western Cape', 'City of Cape Town'),
  ('noordhoek', 'Noordhoek', 'Western Cape', 'City of Cape Town')
on conflict (slug) do nothing;

-- Enable RLS
alter table towns enable row level security;
alter table contacts enable row level security;

-- Public read for both tables
create policy "Public read towns" on towns for select to anon using (true);
create policy "Public read contacts" on contacts for select to anon using (true);
create policy "Public insert contacts" on contacts for insert to anon with check (true);
create policy "Public update contacts" on contacts for update to anon using (true);
create policy "Public insert towns" on towns for insert to anon with check (true);
