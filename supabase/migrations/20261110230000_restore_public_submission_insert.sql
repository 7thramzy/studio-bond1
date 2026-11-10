-- Restore only the public INSERT capability needed by the guest order flow.
-- Public clients must never be able to read, update, or delete order data.

ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.order_logs, public.analytics_events FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.order_logs, public.analytics_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON TABLE public.order_logs, public.analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO service_role;

DROP POLICY IF EXISTS "Public Insert Orders" ON public.order_logs;
CREATE POLICY "Public Insert Orders"
  ON public.order_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'جديد'
    AND length(btrim(names)) BETWEEN 1 AND 120
    AND length(btrim(client_names)) BETWEEN 1 AND 120
    AND length(btrim(track_title)) BETWEEN 1 AND 240
    AND length(btrim(track_code)) BETWEEN 1 AND 80
    AND length(btrim(event_type)) BETWEEN 1 AND 100
    AND length(coalesce(notes, '')) <= 1000
    AND length(coalesce(phone, '')) <= 32
  );

DROP POLICY IF EXISTS "Public Insert Analytics" ON public.analytics_events;
CREATE POLICY "Public Insert Analytics"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('visit', 'play')
    AND (track_id IS NULL OR length(btrim(track_id)) BETWEEN 1 AND 128)
    AND length(coalesce(session_id, '')) <= 128
    AND jsonb_typeof(metadata) = 'object'
  );
