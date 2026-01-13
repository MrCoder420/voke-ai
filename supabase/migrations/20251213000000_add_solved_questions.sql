-- Create solved_questions table to track user progress
CREATE TABLE IF NOT EXISTS public.solved_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    question_title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    platform_url TEXT,
    solved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_solved_questions_user_id ON public.solved_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_solved_questions_user_difficulty ON public.solved_questions(user_id, difficulty);

-- Enable RLS
ALTER TABLE public.solved_questions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own solved questions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'solved_questions' AND policyname = 'Users can view their own solved questions'
    ) THEN
        CREATE POLICY "Users can view their own solved questions"
        ON public.solved_questions FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Users can insert their own solved questions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'solved_questions' AND policyname = 'Users can insert their own solved questions'
    ) THEN
        CREATE POLICY "Users can insert their own solved questions"
        ON public.solved_questions FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Users can delete their own solved questions (if they want to reset)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'solved_questions' AND policyname = 'Users can delete their own solved questions'
    ) THEN
        CREATE POLICY "Users can delete their own solved questions"
        ON public.solved_questions FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;
