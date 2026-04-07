
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.event_services ADD COLUMN IF NOT EXISTS rejection_reason text;
