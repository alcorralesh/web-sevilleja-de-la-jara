-- Esquema inicial para el portal de Sevilleja de la Jara.
-- Ejecutar una vez en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  event_date date not null,
  event_time time not null,
  place text not null check (char_length(place) between 2 and 160),
  capacity integer not null check (capacity > 0),
  registered_count integer not null default 0 check (registered_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 2 and 100),
  last_name text not null check (char_length(last_name) between 2 and 160),
  birth_date date not null check (birth_date <= current_date),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  email text not null check (char_length(email) between 5 and 254),
  message text not null check (char_length(message) between 3 and 5000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  concept text not null check (char_length(concept) between 2 and 240),
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at before update on public.events
for each row execute function public.touch_updated_at();

create or replace function public.adjust_event_registration_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.events set registered_count = registered_count + 1 where id = new.event_id;
    return new;
  end if;
  update public.events set registered_count = greatest(registered_count - 1, 0) where id = old.event_id;
  return old;
end;
$$;

drop trigger if exists registrations_adjust_count on public.event_registrations;
create trigger registrations_adjust_count after insert or delete on public.event_registrations
for each row execute function public.adjust_event_registration_count();

create or replace function public.register_for_event(
  p_event_id uuid,
  p_first_name text,
  p_last_name text,
  p_birth_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event public.events%rowtype;
  registration_id uuid;
begin
  if char_length(trim(p_first_name)) < 2 or char_length(trim(p_last_name)) < 2 then
    raise exception 'INVALID_NAME';
  end if;
  if p_birth_date is null or p_birth_date > current_date then
    raise exception 'INVALID_BIRTH_DATE';
  end if;

  select * into selected_event from public.events where id = p_event_id for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if selected_event.registered_count >= selected_event.capacity then
    raise exception 'EVENT_FULL';
  end if;

  insert into public.event_registrations(event_id, first_name, last_name, birth_date)
  values (p_event_id, trim(p_first_name), trim(p_last_name), p_birth_date)
  returning id into registration_id;
  return registration_id;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.messages enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Public can read events" on public.events;
create policy "Public can read events" on public.events for select to anon, authenticated using (true);
drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events" on public.events for all to authenticated
using ((select public.is_current_user_admin())) with check ((select public.is_current_user_admin()));

drop policy if exists "Admins read registrations" on public.event_registrations;
create policy "Admins read registrations" on public.event_registrations for select to authenticated using ((select public.is_current_user_admin()));
drop policy if exists "Admins delete registrations" on public.event_registrations;
create policy "Admins delete registrations" on public.event_registrations for delete to authenticated using ((select public.is_current_user_admin()));

drop policy if exists "Public sends messages" on public.messages;
create policy "Public sends messages" on public.messages for insert to anon, authenticated
with check (char_length(name) between 2 and 160 and char_length(email) between 5 and 254 and char_length(message) between 3 and 5000 and is_read = false);
drop policy if exists "Admins manage messages" on public.messages;
create policy "Admins manage messages" on public.messages for all to authenticated
using ((select public.is_current_user_admin())) with check ((select public.is_current_user_admin()));

drop policy if exists "Public can read transactions" on public.transactions;
create policy "Public can read transactions" on public.transactions for select to anon, authenticated using (true);
drop policy if exists "Admins manage transactions" on public.transactions;
create policy "Admins manage transactions" on public.transactions for all to authenticated
using ((select public.is_current_user_admin())) with check ((select public.is_current_user_admin()));

drop policy if exists "Admins see their role" on public.admin_users;
create policy "Admins see their role" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.admin_users, public.events, public.event_registrations, public.messages, public.transactions from anon, authenticated;
grant select on public.events, public.transactions to anon, authenticated;
grant insert on public.messages to anon, authenticated;
grant select, insert, update, delete on public.events, public.messages, public.transactions to authenticated;
grant select, delete on public.event_registrations to authenticated;
grant select on public.admin_users to authenticated;
revoke all on function public.register_for_event(uuid,text,text,date) from public;
grant execute on function public.register_for_event(uuid,text,text,date) to anon, authenticated;
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- Datos iniciales: se insertan únicamente si las tablas están vacías.
insert into public.events(title, description, event_date, event_time, place, capacity)
select * from (values
  ('Ruta por los molinos de La Jara','Paseo guiado para todas las edades.','2026-08-15'::date,'09:00'::time,'Plaza Mayor',40),
  ('Noche de música en la plaza','Música al aire libre y encuentro vecinal.','2026-08-22'::date,'22:00'::time,'Plaza Mayor',120),
  ('Taller de memoria y fotografías','Trae tus fotos antiguas y comparte su historia.','2026-09-05'::date,'11:00'::time,'Centro social',25)
) as seed(title,description,event_date,event_time,place,capacity)
where not exists (select 1 from public.events);

insert into public.transactions(type, concept, amount, transaction_date)
select * from (values
  ('income','Aportaciones actividades',2450.00,'2026-03-01'::date),
  ('income','Subvención cultural',1800.00,'2026-04-12'::date),
  ('expense','Material para talleres',760.00,'2026-04-20'::date),
  ('expense','Sonido y escenario',940.00,'2026-05-18'::date)
) as seed(type,concept,amount,transaction_date)
where not exists (select 1 from public.transactions);

-- Tras crear el usuario en Authentication > Users, convertirlo en administrador:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email = 'correo-del-administrador@ejemplo.com';
