# Unapplied migrations (DB-1 … DB-15)

**Status: files only — DO NOT apply** without explicit owner approval.

These stubs document schema work inferred from the deep-review / PIANO package.
`uploads/PIANO-FINALE.md` was not available on disk for this run, so topic titles
are reconstructed from owner constraints + the Nov 1 piano unico + known code gaps.
Replace descriptions when the authoritative PIANO file is re-attached.

| ID | File | Topic (draft) | Apply? |
|----|------|---------------|--------|
| DB-1 | `051_db1_flight_bookings_array_hardening.sql` | Harden `practices.flight_bookings[]` multi-leg + RLS | No |
| DB-2 | `052_db2_booking_reconciliation_admin.sql` | Admin resolve queue indexes / RLS for reconciliation | No |
| DB-3 | `053_db3_creator_transfer_audit.sql` | Audit trail when creator role transfers on leave | No |
| DB-4 | `054_db4_invite_age_gate.sql` | Persist 18+ ack on invite accept | No |
| DB-5 | `055_db5_support_channel_meta.sql` | Placeholder table for support channel (owner TBD) | No |
| DB-6 | `056_db6_public_profile_fields.sql` | Public profile fields (no env/domain changes) | No |
| DB-7 | `057_db7_community_report_reasons.sql` | DSA report reason enum expansion | No |
| DB-8 | `058_db8_leg_payment_share.sql` | Per-leg per-person payment share ledger | No |
| DB-9 | `059_db9_needs_review_status.sql` | Persist `NEEDS_REVIEW` on booking rows | No |
| DB-10 | `060_db10_draft_hard_delete_policy.sql` | Enforce immediate draft hard-delete (no soft 30d) | No |
| DB-11 | `061_db11_whatsapp_invite_tokens.sql` | WhatsApp invite token store (email gated) | No |
| DB-12 | `062_db12_map_credits_ack.sql` | Map credits “i” ack preference | No |
| DB-13 | `063_db13_seller_name_placeholder.sql` | Seller display name placeholder (owner TBD) | No |
| DB-14 | `064_db14_insolvency_guarantee_flag.sql` | Flag for insolvency guarantee (default false) | No |
| DB-15 | `065_db15_company_legal_placeholders.sql` | Company legal fields still placeholder-only | No |
