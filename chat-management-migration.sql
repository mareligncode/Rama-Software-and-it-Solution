-- ==============================================================================
-- Internal Private Chat System Migration (Non-Recursive RLS)
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create chat_participants table
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 3. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create indexes for high performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation_id ON public.chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- 5. Grant base permissions
GRANT ALL ON public.chat_conversations TO authenticated, service_role;
GRANT ALL ON public.chat_participants TO authenticated, service_role;
GRANT ALL ON public.chat_messages TO authenticated, service_role;

-- 6. Helper Security Definer function to check participation (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated, service_role;

-- 7. Enable Row Level Security (RLS) for 100% privacy
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS: chat_conversations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view participating conversations" ON public.chat_conversations;
CREATE POLICY "Users can view participating conversations"
  ON public.chat_conversations FOR SELECT
  USING (public.is_chat_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.chat_conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Participants can update conversation updated_at" ON public.chat_conversations;
CREATE POLICY "Participants can update conversation updated_at"
  ON public.chat_conversations FOR UPDATE
  USING (public.is_chat_participant(id, auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS: chat_participants
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_participants;
CREATE POLICY "Users can view participants of their conversations"
  ON public.chat_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_chat_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can insert participants" ON public.chat_participants;
CREATE POLICY "Authenticated users can insert participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own participant entry" ON public.chat_participants;
CREATE POLICY "Users can update their own participant entry"
  ON public.chat_participants FOR UPDATE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- RLS: chat_messages
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (public.is_chat_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.chat_messages;
CREATE POLICY "Users can send messages to their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_chat_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR public.is_chat_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Helper function: get_or_create_direct_conversation
-- Returns existing direct conversation between two users or creates a new one
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_user1 uuid, _user2 uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  -- Look for existing direct conversation between user1 and user2
  SELECT cp1.conversation_id INTO _conv_id
  FROM public.chat_participants cp1
  JOIN public.chat_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN public.chat_conversations cc ON cc.id = cp1.conversation_id
  WHERE cc.type = 'direct'
    AND cp1.user_id = _user1
    AND cp2.user_id = _user2
  LIMIT 1;

  -- If conversation does not exist, create it
  IF _conv_id IS NULL THEN
    INSERT INTO public.chat_conversations (type, created_by)
    VALUES ('direct', _user1)
    RETURNING id INTO _conv_id;

    -- Add both participants
    INSERT INTO public.chat_participants (conversation_id, user_id)
    VALUES 
      (_conv_id, _user1),
      (_conv_id, _user2)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN _conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid, uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enable Realtime for live messaging
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
