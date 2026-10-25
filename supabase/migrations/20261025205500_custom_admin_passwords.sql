-- Move dashboard credentials out of Supabase Auth while keeping the existing
-- admin IDs stable so deliveries, integrations and audit rows retain their links.
ALTER TABLE public.orchest_admin_users
  DROP CONSTRAINT IF EXISTS orchest_admin_users_user_id_fkey,
  ALTER COLUMN user_id SET DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Preserve the existing identifiers. Copy bcrypt hashes only for the two
-- explicitly approved login accounts; keep the third row and its foreign-key
-- dependents, but clear its password hash and disable sign-in.
UPDATE public.orchest_admin_users AS admin
SET email = lower(auth_user.email),
    username = split_part(lower(auth_user.email), '@', 1),
    password_hash = CASE
      WHEN lower(auth_user.email) IN ('astdywawrkst@gmail.com', 'ramzyalbazel700@gmail.com')
        AND auth_user.encrypted_password LIKE '$2a$%'
      THEN auth_user.encrypted_password
      ELSE NULL
    END,
    is_active = COALESCE(
      lower(auth_user.email) IN ('astdywawrkst@gmail.com', 'ramzyalbazel700@gmail.com')
        AND auth_user.encrypted_password LIKE '$2a$%',
      false
    ),
    updated_at = now()
FROM auth.users AS auth_user
WHERE admin.user_id = auth_user.id;

DO $$
DECLARE active_account_count integer;
BEGIN
  SELECT count(*)::integer INTO active_account_count
  FROM public.orchest_admin_users
  WHERE is_active = true
    AND email IN ('astdywawrkst@gmail.com', 'ramzyalbazel700@gmail.com')
    AND password_hash LIKE '$2a$%';

  IF active_account_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two enabled custom admin accounts with bcrypt hashes; found %', active_account_count;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS orchest_admin_users_email_uidx
  ON public.orchest_admin_users (email)
  WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orchest_admin_users_username_uidx
  ON public.orchest_admin_users (username)
  WHERE username IS NOT NULL;

ALTER TABLE public.orchest_admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.orchest_admin_users FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.orchest_admin_users TO service_role;

COMMENT ON COLUMN public.orchest_admin_users.password_hash IS
  'Server-only bcrypt password hash for dashboard login; never return to clients.';
COMMENT ON COLUMN public.orchest_admin_users.is_active IS
  'Whether this custom account may authenticate to the admin dashboard.';
