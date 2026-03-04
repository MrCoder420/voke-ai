-- Add missing analytical columns to interview_sessions to support voice interview results
ALTER TABLE public.interview_sessions
ADD COLUMN IF NOT EXISTS delivery_score INTEGER CHECK (delivery_score >= 0 AND delivery_score <= 100),
ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
ADD COLUMN IF NOT EXISTS whats_good JSONB,
ADD COLUMN IF NOT EXISTS whats_wrong JSONB,
ADD COLUMN IF NOT EXISTS feedback_summary TEXT;
