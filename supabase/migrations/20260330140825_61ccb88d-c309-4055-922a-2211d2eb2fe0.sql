CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_institution_uuid uuid;
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  
  BEGIN
    IF NEW.raw_user_meta_data->>'institution_uuid' IS NOT NULL 
       AND NEW.raw_user_meta_data->>'institution_uuid' != '' THEN
      v_institution_uuid := (NEW.raw_user_meta_data->>'institution_uuid')::uuid;
    ELSE
      v_institution_uuid := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_institution_uuid := NULL;
  END;

  IF v_institution_uuid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = v_institution_uuid) THEN
      v_institution_uuid := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    institution_uuid,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_role,
    v_institution_uuid,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    role = COALESCE(NULLIF(EXCLUDED.role, 'user'), profiles.role),
    institution_uuid = COALESCE(EXCLUDED.institution_uuid, profiles.institution_uuid);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user FAILED: % %', SQLERRM, SQLSTATE;
  RAISE;
END;
$function$;