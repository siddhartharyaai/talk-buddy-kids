-- Fix security warnings for functions by setting proper search_path

-- Fix clean_old_memory_data function
CREATE OR REPLACE FUNCTION clean_old_memory_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Clean memory data older than 30 days
  UPDATE public.child_profiles 
  SET extended_memory = jsonb_set(
    jsonb_set(
      jsonb_set(
        extended_memory,
        '{recentTopics}', 
        '[]'::jsonb
      ),
      '{struggleWords}',
      '[]'::jsonb
    ),
    '{sessionSummary}',
    '""'::jsonb
  )
  WHERE (extended_memory->>'lastMemoryUpdate')::timestamp < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Cleaned old memory data for profiles older than 30 days';
END;
$$;

-- Fix update_child_memory function
CREATE OR REPLACE FUNCTION update_child_memory(
  profile_user_id UUID,
  new_topics TEXT[],
  struggle_words TEXT[] DEFAULT NULL,
  session_summary TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_memory JSONB;
  updated_memory JSONB;
  recent_topics JSONB;
  favourite_topics JSONB;
BEGIN
  -- Get current memory
  SELECT extended_memory INTO current_memory
  FROM public.child_profiles 
  WHERE user_id = profile_user_id;
  
  IF current_memory IS NULL THEN
    current_memory := '{
      "recentTopics": [],
      "favouriteTopics": {},
      "struggleWords": [],
      "sessionSummary": "",
      "lastMemoryUpdate": null,
      "sessionCount": 0
    }'::jsonb;
  END IF;
  
  -- Update recent topics (keep last 6)
  recent_topics := current_memory->'recentTopics';
  IF recent_topics IS NULL THEN
    recent_topics := '[]'::jsonb;
  END IF;
  
  -- Add new topics to recent topics
  FOR i IN 1..array_length(new_topics, 1) LOOP
    recent_topics := recent_topics || to_jsonb(new_topics[i]);
  END LOOP;
  
  -- Keep only last 6 topics
  IF jsonb_array_length(recent_topics) > 6 THEN
    recent_topics := jsonb_path_query_array(recent_topics, '$[last(6) to last()]');
  END IF;
  
  -- Update favourite topics count
  favourite_topics := current_memory->'favouriteTopics';
  IF favourite_topics IS NULL THEN
    favourite_topics := '{}'::jsonb;
  END IF;
  
  -- Increment counts for new topics
  FOR i IN 1..array_length(new_topics, 1) LOOP
    favourite_topics := jsonb_set(
      favourite_topics,
      ARRAY[new_topics[i]],
      to_jsonb(COALESCE((favourite_topics->>new_topics[i])::int, 0) + 1)
    );
  END LOOP;
  
  -- Build updated memory
  updated_memory := jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          current_memory,
          '{recentTopics}',
          recent_topics
        ),
        '{favouriteTopics}',
        favourite_topics
      ),
      '{lastMemoryUpdate}',
      to_jsonb(NOW())
    ),
    '{sessionCount}',
    to_jsonb(COALESCE((current_memory->>'sessionCount')::int, 0) + 1)
  );
  
  -- Add struggle words if provided
  IF struggle_words IS NOT NULL THEN
    updated_memory := jsonb_set(
      updated_memory,
      '{struggleWords}',
      to_jsonb(struggle_words)
    );
  END IF;
  
  -- Add session summary if provided
  IF session_summary IS NOT NULL THEN
    updated_memory := jsonb_set(
      updated_memory,
      '{sessionSummary}',
      to_jsonb(session_summary)
    );
  END IF;
  
  -- Update the profile
  UPDATE public.child_profiles 
  SET extended_memory = updated_memory
  WHERE user_id = profile_user_id;
  
  RAISE NOTICE 'Updated memory for user %, added % topics', profile_user_id, array_length(new_topics, 1);
END;
$$;

-- Fix trigger_memory_cleanup function
CREATE OR REPLACE FUNCTION trigger_memory_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only clean if it's been more than 24 hours since last cleanup
  IF (SELECT COUNT(*) FROM public.child_profiles WHERE (extended_memory->>'lastMemoryUpdate')::timestamp < NOW() - INTERVAL '24 hours') > 0 THEN
    PERFORM clean_old_memory_data();
  END IF;
  
  RETURN NEW;
END;
$$;