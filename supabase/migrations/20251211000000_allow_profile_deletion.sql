-- Allow users to delete their own profile
-- This is critical for account deletion functionality

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'Users can delete own profile'
    ) THEN
        CREATE POLICY "Users can delete own profile"
          ON public.profiles
          FOR DELETE
          USING (auth.uid() = id);
    END IF;
END
$$;

-- Ensure RLS is enabled (should be already, but safe to re-assert)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
