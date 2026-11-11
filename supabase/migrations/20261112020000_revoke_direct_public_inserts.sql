-- Public submissions are handled by the server API with the service-role client.
-- Do not allow the publishable client key to bypass honeypot, validation,
-- persistent rate limiting, idempotency, or push notification handling.

DROP POLICY IF EXISTS "Public Insert Orders" ON public.order_logs;
DROP POLICY IF EXISTS "Public Insert Analytics" ON public.analytics_events;

REVOKE INSERT ON TABLE public.order_logs, public.analytics_events FROM anon, authenticated;
REVOKE USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq FROM anon, authenticated;

ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Keep the server-side path explicit. service_role bypasses RLS, but these
-- grants document the only intended writer for these two tables.
GRANT ALL ON TABLE public.order_logs, public.analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO service_role;
