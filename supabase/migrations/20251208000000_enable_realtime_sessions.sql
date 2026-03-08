-- Enable realtime for interview_sessions table
BEGIN;
  -- Remove the table from publication if it's already there (to avoid duplicates)
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.interview_sessions;
  
  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_sessions;
COMMIT;

-- Ensure the replica identity is set to FULL so we get all column changes
ALTER TABLE public.interview_sessions REPLICA IDENTITY FULL;
