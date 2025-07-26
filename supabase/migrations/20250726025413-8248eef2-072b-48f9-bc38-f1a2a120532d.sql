-- Fix the update_child_memory function syntax error
CREATE OR REPLACE FUNCTION public.update_child_memory(
  profile_user_id uuid, 
  new_topics text[], 
  struggle_words text[] DEFAULT NULL::text[], 
  session_summary text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_memory JSONB;
  updated_memory JSONB;
  recent_topics JSONB;
  favourite_topics JSONB;
  topic text;
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
  FOREACH topic IN ARRAY new_topics LOOP
    recent_topics := recent_topics || to_jsonb(topic);
  END LOOP;
  
  -- Keep only last 6 topics
  IF jsonb_array_length(recent_topics) > 6 THEN
    recent_topics := jsonb_path_query_array(recent_topics, '$[last-6 to last]');
  END IF;
  
  -- Update favourite topics count
  favourite_topics := current_memory->'favouriteTopics';
  IF favourite_topics IS NULL THEN
    favourite_topics := '{}'::jsonb;
  END IF;
  
  -- Increment counts for new topics
  FOREACH topic IN ARRAY new_topics LOOP
    favourite_topics := jsonb_set(
      favourite_topics,
      ARRAY[topic],
      to_jsonb(COALESCE((favourite_topics->>topic)::int, 0) + 1)
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
$function$;