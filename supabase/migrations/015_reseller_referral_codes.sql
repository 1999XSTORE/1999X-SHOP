alter table public.reseller_accounts
add column if not exists referral_code text;

create unique index if not exists reseller_accounts_referral_code_idx
on public.reseller_accounts (lower(referral_code))
where referral_code is not null and btrim(referral_code) <> '';

update public.reseller_accounts
set referral_code = lower(
  regexp_replace(
    split_part(email, '@', 1) || '-' || left(replace(id::text, '-', ''), 6),
    '[^a-z0-9_-]',
    '',
    'g'
  )
)
where referral_code is null or btrim(referral_code) = '';

create or replace function public.resolve_referral(p_ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_ref text;
  resolved_email text;
begin
  clean_ref := lower(trim(coalesce(p_ref, '')));
  if clean_ref = '' then
    return '';
  end if;

  select lower(email)
  into resolved_email
  from public.reseller_accounts
  where is_active = true
    and (
      lower(email) = clean_ref
      or lower(coalesce(referral_code, '')) = clean_ref
    )
  limit 1;

  return coalesce(resolved_email, '');
end;
$$;

create or replace function public.set_reseller_referral_code(p_code text)
returns public.reseller_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text;
  clean_code text;
  target_row public.reseller_accounts;
begin
  jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if jwt_email = '' then
    raise exception 'Unauthorized';
  end if;

  clean_code := lower(trim(coalesce(p_code, '')));
  clean_code := regexp_replace(clean_code, '[^a-z0-9_-]', '', 'g');

  if length(clean_code) < 3 then
    raise exception 'Referral code must be at least 3 characters';
  end if;

  if length(clean_code) > 32 then
    raise exception 'Referral code must be 32 characters or less';
  end if;

  update public.reseller_accounts
  set referral_code = clean_code
  where lower(email) = jwt_email
    and is_active = true
  returning * into target_row;

  if not found then
    raise exception 'Reseller account not found';
  end if;

  return target_row;
exception
  when unique_violation then
    raise exception 'Referral code is already taken';
end;
$$;
