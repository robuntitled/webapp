-- DO NOT APPLY without owner review
-- Adds resolve audit fields for booking_reconciliation (A3).
-- Until applied, resolve notes are stored in payload.resolved*.

alter table if exists public.booking_reconciliation
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users (id),
  add column if not exists resolve_note text;

comment on column public.booking_reconciliation.resolved_at is
  'When an admin marked the row resolved/abandoned.';
comment on column public.booking_reconciliation.resolved_by is
  'Admin user id who resolved the row.';
comment on column public.booking_reconciliation.resolve_note is
  'Required admin note explaining the resolution.';
