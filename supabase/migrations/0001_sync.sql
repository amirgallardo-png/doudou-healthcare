-- Doudou Healthcare : stockage synchronisé, sécurité par ligne (RLS), photos privées.
-- Rejouable sans risque (idempotent). Appliqué par tools/supabase-setup.mjs.

-- 1. Une table générique : chaque ligne locale (journal, dossier, repas…) y est rangée en JSON.
create table if not exists public.rows (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  tbl        text        not null check (tbl ~ '^[a-z_]{2,32}$'),
  id         uuid        not null,
  data       jsonb       not null,
  updated_at timestamptz not null,               -- heure de la modification sur l'appareil (« le plus récent gagne »)
  deleted_at timestamptz,                         -- suppression douce
  server_at  timestamptz not null default clock_timestamp(),  -- heure de réception par le serveur (curseur de synchro)
  primary key (user_id, tbl, id)
);
create index if not exists rows_user_server_at on public.rows (user_id, server_at);

-- 2. Sécurité par ligne : chacun ne voit que ses lignes. Aucune écriture directe : uniquement via push_rows().
alter table public.rows enable row level security;
drop policy if exists "rows: lecture de ses lignes" on public.rows;
create policy "rows: lecture de ses lignes" on public.rows for select to authenticated using (user_id = auth.uid());
revoke all on public.rows from anon, authenticated;
grant select on public.rows to authenticated;

-- 3. Envoi d'un lot : une ligne n'est écrite que si elle est PLUS RÉCENTE que celle du serveur.
create or replace function public.push_rows(items jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'non connecté' using errcode = '28000'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 500 then raise exception 'lot invalide'; end if;
  insert into public.rows as r (user_id, tbl, id, data, updated_at, deleted_at, server_at)
  select auth.uid(), x.tbl, x.id, x.data, x.updated_at, x.deleted_at, clock_timestamp()
  from jsonb_to_recordset(items) as x(tbl text, id uuid, data jsonb, updated_at timestamptz, deleted_at timestamptz)
  on conflict (user_id, tbl, id) do update
    set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, server_at = clock_timestamp()
    where r.updated_at < excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.push_rows(jsonb) from public, anon;
grant execute on function public.push_rows(jsonb) to authenticated;

-- 4. Temps réel : l'autre appareil est prévenu dès qu'une ligne change (la RLS s'applique).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rows') then
    alter publication supabase_realtime add table public.rows;
  end if;
end $$;

-- 5. Photos : espace privé, un dossier par utilisateur (<user_id>/<photo_id>.webp), images de 5 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos: lecture" on storage.objects;
drop policy if exists "photos: ajout" on storage.objects;
drop policy if exists "photos: remplacement" on storage.objects;
drop policy if exists "photos: suppression" on storage.objects;
create policy "photos: lecture" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
