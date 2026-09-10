-- Notes Management Migration
-- Run this in your Supabase SQL Editor

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  color text DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'red', 'purple', 'orange', 'pink', 'gray')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create note_todos table for todo items within notes
CREATE TABLE IF NOT EXISTS public.note_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grant permissions
GRANT ALL ON public.notes TO authenticated, service_role;
GRANT ALL ON public.note_todos TO authenticated, service_role;

-- Enable Row Level Security (RLS) for privacy
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_todos ENABLE ROW LEVEL SECURITY;

-- Notes RLS Policies (Personal & Private to each user)
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = created_by);

-- Note Todos RLS Policies
DROP POLICY IF EXISTS "Users can view todos of their own notes" ON public.note_todos;
CREATE POLICY "Users can view todos of their own notes"
  ON public.note_todos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_todos.note_id AND notes.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert todos to their own notes" ON public.note_todos;
CREATE POLICY "Users can insert todos to their own notes"
  ON public.note_todos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_todos.note_id AND notes.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update todos of their own notes" ON public.note_todos;
CREATE POLICY "Users can update todos of their own notes"
  ON public.note_todos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_todos.note_id AND notes.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete todos of their own notes" ON public.note_todos;
CREATE POLICY "Users can delete todos of their own notes"
  ON public.note_todos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = note_todos.note_id AND notes.created_by = auth.uid()
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON public.notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_color ON public.notes(color);
CREATE INDEX IF NOT EXISTS idx_note_todos_note_id ON public.note_todos(note_id);
CREATE INDEX IF NOT EXISTS idx_note_todos_completed ON public.note_todos(completed);

-- Create trigger for updated_at on notes
DROP TRIGGER IF EXISTS notes_set_updated_at ON public.notes;
CREATE TRIGGER notes_set_updated_at BEFORE UPDATE ON public.notes 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create trigger for updated_at on note_todos
DROP TRIGGER IF EXISTS note_todos_set_updated_at ON public.note_todos;
CREATE TRIGGER note_todos_set_updated_at BEFORE UPDATE ON public.note_todos 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to get todos for a note
CREATE OR REPLACE FUNCTION public.get_note_todos(_note_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  completed boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nt.id,
    nt.title,
    nt.completed,
    nt.created_at
  FROM public.note_todos nt
  WHERE nt.note_id = _note_id
  ORDER BY nt.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_note_todos(uuid) TO authenticated, service_role;
