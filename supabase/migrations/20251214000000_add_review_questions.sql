-- Create review_questions table to track questions users want to revisit
CREATE TABLE IF NOT EXISTS public.review_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_review_questions_user_id ON public.review_questions(user_id);

-- Enable RLS
ALTER TABLE public.review_questions ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'review_questions' AND policyname = 'Users can view their own review questions'
    ) THEN
        CREATE POLICY "Users can view their own review questions"
        ON public.review_questions FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'review_questions' AND policyname = 'Users can insert their own review questions'
    ) THEN
        CREATE POLICY "Users can insert their own review questions"
        ON public.review_questions FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'review_questions' AND policyname = 'Users can delete their own review questions'
    ) THEN
        CREATE POLICY "Users can delete their own review questions"
        ON public.review_questions FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;
