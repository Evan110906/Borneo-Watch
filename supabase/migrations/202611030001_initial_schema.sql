create extension if not exists pgcrypto;

create type public.report_category as enum (
  'Forest degradation',
  'Waste pollution',
  'Wildlife sighting',
  'River pollution',
  'Other'
);

create type public.report_status as enum (
  'Pending Review',
  'Under Review',
  'Verified',
  'Rejected'
);

create type public.profile_role as enum ('visitor', 'registered_user', 'administrator');
create type public.species_group as enum ('Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Plants');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'BorneoWatch member',
  role public.profile_role not null default 'registered_user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.environmental_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 4 and 100),
  category public.report_category not null,
  description text not null check (char_length(description) between 20 and 3000),
  location_text text not null check (char_length(location_text) between 2 and 160),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status public.report_status not null default 'Pending Review',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.biodiversity_species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text not null unique,
  species_group public.species_group not null,
  habitat text not null,
  distribution text not null,
  conservation_status text not null,
  description text not null,
  image_url text,
  source_name text not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.educational_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  summary text not null,
  content text not null,
  source_name text not null,
  source_url text not null,
  is_editorial boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id uuid not null references public.educational_articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table public.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.environmental_reports (id) on delete cascade,
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  created_at timestamptz not null default now()
);

create index environmental_reports_created_at_idx on public.environmental_reports (created_at desc);
create index environmental_reports_status_created_idx on public.environmental_reports (status, created_at desc);
create index environmental_reports_category_idx on public.environmental_reports (category);
create index environmental_reports_user_id_idx on public.environmental_reports (user_id, created_at desc);
create index biodiversity_species_group_idx on public.biodiversity_species (species_group, common_name);
create index educational_articles_category_idx on public.educational_articles (category, title);
create index article_bookmarks_user_id_idx on public.article_bookmarks (user_id, created_at desc);
create index report_images_report_id_idx on public.report_images (report_id);

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'administrator'
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'BorneoWatch member'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_reports_updated_at before update on public.environmental_reports
  for each row execute procedure public.set_updated_at();
create trigger set_species_updated_at before update on public.biodiversity_species
  for each row execute procedure public.set_updated_at();
create trigger set_articles_updated_at before update on public.educational_articles
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.environmental_reports enable row level security;
alter table public.biodiversity_species enable row level security;
alter table public.educational_articles enable row level security;
alter table public.article_bookmarks enable row level security;
alter table public.report_images enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id or public.is_administrator());
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and role <> 'administrator');
create policy "Administrators manage profiles" on public.profiles
  for all to authenticated using (public.is_administrator())
  with check (public.is_administrator());

create policy "Public read verified reports and owners read own" on public.environmental_reports
  for select to anon, authenticated
  using (status = 'Verified' or user_id = (select auth.uid()) or public.is_administrator());
create policy "Signed-in users submit own reports" on public.environmental_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'Pending Review' and reviewed_by is null and reviewed_at is null);
create policy "Administrators update reports" on public.environmental_reports
  for update to authenticated using (public.is_administrator())
  with check (public.is_administrator());
insert into public.biodiversity_species
  (common_name, scientific_name, species_group, habitat, distribution, conservation_status, description, source_name, source_url)
values
  ('Bornean orangutan', 'Pongo pygmaeus', 'Mammals', 'Lowland and peat-swamp forests', 'Borneo', 'Critically Endangered', 'Great ape native to Borneo; consult the linked assessment for current population and threat details.', 'IUCN Red List', 'https://www.iucnredlist.org/species/17975/123809220'),
  ('Proboscis monkey', 'Nasalis larvatus', 'Mammals', 'Mangroves and riverine forests', 'Borneo', 'Endangered', 'Leaf-eating primate endemic to Borneo; consult the linked assessment for current population and threat details.', 'IUCN Red List', 'https://www.iucnredlist.org/species/14352/17945165'),
  ('Bornean pygmy elephant', 'Elephas maximus borneensis', 'Mammals', 'Lowland forests of northeastern Borneo', 'Northeastern Borneo', 'Endangered', 'An Asian elephant population on Borneo; consult the linked assessment for taxonomy and current conservation details.', 'IUCN Red List', 'https://www.iucnredlist.org/species/7140/45818198'),
  ('Rhinoceros hornbill', 'Buceros rhinoceros', 'Birds', 'Mature lowland and hill forests', 'Sundaland', 'Vulnerable', 'Large forest hornbill; consult the linked assessment for current distribution and threat details.', 'IUCN Red List', 'https://www.iucnredlist.org/species/22682464/92948145'),
  ('Bornean flat-headed frog', 'Barbourula kalimantanensis', 'Amphibians', 'Fast-flowing forest streams', 'Kalimantan, Borneo', 'Endangered', 'Aquatic frog described from Kalimantan; consult the linked assessment for current records and conservation details.', 'IUCN Red List', 'https://www.iucnredlist.org/species/54499/11153304'),
  ('Borneo ironwood', 'Eusideroxylon zwageri', 'Plants', 'Lowland mixed dipterocarp forests', 'Borneo and nearby islands', 'Vulnerable', 'Slow-growing timber tree native to Borneo and nearby islands; consult the linked assessment for current details.', 'IUCN Red List', 'https://www.iucnredlist.org/species/31316/2805329')
on conflict (scientific_name) do update set
  common_name = excluded.common_name,
  species_group = excluded.species_group,
  habitat = excluded.habitat,
  distribution = excluded.distribution,
  conservation_status = excluded.conservation_status,
  description = excluded.description,
  source_name = excluded.source_name,
  source_url = excluded.source_url;

insert into public.educational_articles (slug, title, category, summary, content, source_name, source_url)
values
  ('peatlands-of-borneo', 'Why peatlands matter to Borneo', 'Ecosystems', 'An editorial introduction to the waterlogged landscapes that store carbon, regulate water, and support distinctive wildlife.', 'Peatlands are waterlogged ecosystems where partially decomposed plant material accumulates over long periods. Their hydrology, vegetation, and carbon stores are connected. This introductory article is editorial and is not field guidance. Consult the cited source for scientific background.', 'CIFOR-ICRAF', 'https://www.cifor-icraf.org/knowledge/publication/'),
  ('living-alongside-orangutans', 'Living alongside orangutans', 'Wildlife', 'An introduction to habitat connectivity and the communities sharing forest landscapes.', 'Orangutan habitat is part of a larger landscape of forests, rivers, farms, and settlements. Conservation responses depend on local context and current scientific evidence. This sample text is editorial and is not field guidance.', 'IUCN Red List', 'https://www.iucnredlist.org/species/17975/123809220'),
  ('reading-a-river-ecosystem', 'Reading a river ecosystem', 'Waterways', 'Ways to notice change in a river and document an observation responsibly.', 'A community observation can describe what was seen, where, and when, while avoiding unsupported claims about its cause. Water quality measurements require appropriate methods and interpretation. This sample text is editorial, not a monitoring protocol.', 'UNEP Freshwater', 'https://www.unep.org/explore-topics/water'),
  ('community-forest-stewardship', 'Community forest stewardship', 'Conservation', 'Local knowledge and long-term care are central to forest landscape resilience.', 'Community stewardship includes diverse local institutions, knowledge, and priorities. This sample introduction is editorial and should be read alongside work by local communities and researchers.', 'CIFOR-ICRAF', 'https://www.cifor-icraf.org/knowledge/publication/')
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-images', 'report-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = 5242880;

create policy "Users upload report images to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners and administrators read report images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'report-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_administrator())
  );
create policy "Owners delete own report images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Public read images for verified reports" on public.report_images
  for select to anon, authenticated using (
    exists (select 1 from public.environmental_reports r where r.id = report_id and r.status = 'Verified')
    or exists (select 1 from public.environmental_reports r where r.id = report_id and r.user_id = (select auth.uid()))
    or public.is_administrator()
  );
create policy "Report owners attach images" on public.report_images
  for insert to authenticated with check (
    exists (select 1 from public.environmental_reports r where r.id = report_id and r.user_id = (select auth.uid()) and r.status = 'Pending Review')
    and (storage_path like (select auth.uid())::text || '/%')
  );
create policy "Administrators manage report images" on public.report_images
  for all to authenticated using (public.is_administrator()) with check (public.is_administrator());

create policy "Public read species directory" on public.biodiversity_species
  for select to anon, authenticated using (true);
create policy "Administrators manage species directory" on public.biodiversity_species
  for all to authenticated using (public.is_administrator()) with check (public.is_administrator());
create policy "Public read educational articles" on public.educational_articles
  for select to anon, authenticated using (true);
create policy "Administrators manage articles" on public.educational_articles
  for all to authenticated using (public.is_administrator()) with check (public.is_administrator());

create policy "Users read own bookmarks" on public.article_bookmarks
  for select to authenticated using (user_id = (select auth.uid()) or public.is_administrator());
create policy "Users add own bookmarks" on public.article_bookmarks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own bookmarks" on public.article_bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));
