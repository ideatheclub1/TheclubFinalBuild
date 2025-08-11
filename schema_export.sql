

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_distance"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$;


ALTER FUNCTION "public"."calculate_distance"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_distance"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) IS 'Calculate distance between two points using Haversine formula';



CREATE OR REPLACE FUNCTION "public"."calculate_profile_completion_percentage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 10; -- Total number of important fields
BEGIN
    -- Basic info (3 points)
    IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.username IS NOT NULL AND NEW.username != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Location (1 point)
    IF NEW.location IS NOT NULL AND NEW.location != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Profile picture (1 point)
    IF NEW.profile_picture IS NOT NULL AND NEW.profile_picture != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Interests (1 point)
    IF NEW.interests IS NOT NULL AND array_length(NEW.interests, 1) > 0 THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Expertise (1 point)
    IF NEW.expertise IS NOT NULL AND array_length(NEW.expertise, 1) > 0 THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Relationship goals (1 point)
    IF NEW.relationship_goals IS NOT NULL AND array_length(NEW.relationship_goals, 1) > 0 THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Looking for (1 point)
    IF NEW.looking_for IS NOT NULL AND NEW.looking_for != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Age and gender (1 point)
    IF NEW.age IS NOT NULL AND NEW.gender IS NOT NULL AND NEW.gender != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Calculate percentage
    NEW.profile_completion_percentage := (completion_score * 100) / total_fields;
    NEW.last_profile_update := NOW();
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_profile_completion_percentage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_nearby_users"("user_lat" numeric, "user_lon" numeric, "max_distance_km" numeric DEFAULT 50, "limit_count" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "full_name" "text", "handle" "text", "username" "text", "avatar" "text", "profile_picture" "text", "bio" "text", "location" "text", "age" integer, "distance_km" numeric, "is_host" boolean, "hourly_rate" numeric, "total_chats" integer, "response_time" "text", "rating" numeric, "total_reviews" integer, "profile_completion_percentage" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.full_name,
        up.handle,
        up.username,
        up.avatar,
        up.profile_picture,
        up.bio,
        up.location,
        up.age,
        calculate_distance(user_lat, user_lon, up.latitude, up.longitude) as distance_km,
        up.is_host,
        up.hourly_rate,
        up.total_chats,
        up.response_time,
        up.rating,
        up.total_reviews,
        up.profile_completion_percentage
    FROM user_profiles up
    WHERE up.latitude IS NOT NULL 
        AND up.longitude IS NOT NULL
        AND calculate_distance(user_lat, user_lon, up.latitude, up.longitude) <= max_distance_km
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."find_nearby_users"("user_lat" numeric, "user_lon" numeric, "max_distance_km" numeric, "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_nearby_users"("user_lat" numeric, "user_lon" numeric, "max_distance_km" numeric, "limit_count" integer) IS 'Find users within specified distance using coordinates';



CREATE OR REPLACE FUNCTION "public"."get_like_count"("p_post_id" "uuid" DEFAULT NULL::"uuid", "p_comment_id" "uuid" DEFAULT NULL::"uuid", "p_reel_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    like_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO like_count
    FROM likes
    WHERE 
        (p_post_id IS NOT NULL AND post_id = p_post_id) OR
        (p_comment_id IS NOT NULL AND comment_id = p_comment_id) OR
        (p_reel_id IS NOT NULL AND reel_id = p_reel_id);
    
    RETURN like_count;
END;
$$;


ALTER FUNCTION "public"."get_like_count"("p_post_id" "uuid", "p_comment_id" "uuid", "p_reel_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reels_with_engagement"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "user_id" "uuid", "video_url" "text", "thumbnail_url" "text", "caption" "text", "duration" integer, "view_count" integer, "likes_count" integer, "comments_count" integer, "shares_count" integer, "saves_count" integer, "hashtags" "text"[], "location" "text", "created_at" timestamp with time zone, "username" "text", "avatar" "text", "bio" "text", "is_liked" boolean, "is_saved" boolean, "music_title" "text", "music_artist" "text", "music_cover_url" "text", "hours_ago" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.user_id,
        r.video_url,
        r.thumbnail_url,
        r.caption,
        r.duration,
        r.view_count,
        r.likes_count,
        r.comments_count,
        r.shares_count,
        r.saves_count,
        r.hashtags,
        r.location,
        r.created_at,
        up.username,
        up.avatar,
        up.bio,
        CASE WHEN rl.id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN rs.id IS NOT NULL THEN true ELSE false END as is_saved,
        rm.title as music_title,
        rm.artist as music_artist,
        rm.cover_url as music_cover_url,
        EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 as hours_ago
    FROM reels r
    LEFT JOIN user_profiles up ON r.user_id = up.id
    LEFT JOIN reel_music rm ON r.id = rm.reel_id
    LEFT JOIN reel_likes rl ON r.id = rl.reel_id AND rl.user_id = COALESCE(p_user_id, auth.uid())
    LEFT JOIN reel_saves rs ON r.id = rs.reel_id AND rs.user_id = COALESCE(p_user_id, auth.uid())
    WHERE r.status = 'active' AND r.is_public = true
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_reels_with_engagement"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert user profile with error handling
    INSERT INTO user_profiles (id, full_name, handle, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || NEW.id),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || NEW.id)
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_reel_view"("p_reel_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE reels SET view_count = view_count + 1 WHERE id = p_reel_id;
END;
$$;


ALTER FUNCTION "public"."increment_reel_view"("p_reel_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_comment_edited"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.content != NEW.content THEN
        NEW.is_edited = TRUE;
        NEW.edited_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_comment_edited"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_storage_access"() RETURNS TABLE("test_name" "text", "result" "text", "details" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Test 1: Check if buckets exist
    RETURN QUERY 
    SELECT 
        'Buckets Exist'::TEXT,
        CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*)::TEXT || '/5 required buckets'::TEXT
    FROM storage.buckets 
    WHERE id IN ('posts', 'avatars', 'stories', 'reels', 'user-media');

    -- Test 2: Check if buckets are public
    RETURN QUERY
    SELECT 
        'Buckets Public'::TEXT,
        CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*)::TEXT || '/5 public buckets'::TEXT
    FROM storage.buckets 
    WHERE id IN ('posts', 'avatars', 'stories', 'reels', 'user-media')
    AND public = true;

    -- Test 3: Check policies
    RETURN QUERY
    SELECT 
        'Policies Exist'::TEXT,
        CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' storage policies'::TEXT
    FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage';

    -- Test 4: Check failing post
    RETURN QUERY
    SELECT 
        'Failing Post Exists'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Post found in database' ELSE 'Post not found in database' END::TEXT
    FROM posts 
    WHERE id = '25322aa4-aec6-4e79-a179-20ec83900932';
END $$;


ALTER FUNCTION "public"."test_storage_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_reel_like"("p_reel_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if like exists
    SELECT EXISTS(SELECT 1 FROM reel_likes WHERE reel_id = p_reel_id AND user_id = v_user_id) INTO v_exists;
    
    IF v_exists THEN
        -- Remove like
        DELETE FROM reel_likes WHERE reel_id = p_reel_id AND user_id = v_user_id;
        RETURN false;
    ELSE
        -- Add like
        INSERT INTO reel_likes (reel_id, user_id) VALUES (p_reel_id, v_user_id);
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_reel_like"("p_reel_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_reel_save"("p_reel_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if save exists
    SELECT EXISTS(SELECT 1 FROM reel_saves WHERE reel_id = p_reel_id AND user_id = v_user_id) INTO v_exists;
    
    IF v_exists THEN
        -- Remove save
        DELETE FROM reel_saves WHERE reel_id = p_reel_id AND user_id = v_user_id;
        RETURN false;
    ELSE
        -- Add save
        INSERT INTO reel_saves (reel_id, user_id) VALUES (p_reel_id, v_user_id);
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_reel_save"("p_reel_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_location_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
        NEW.location_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_location_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_album_media_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE media_albums 
        SET media_count = media_count + 1,
            updated_at = NOW()
        WHERE id = NEW.album_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE media_albums 
        SET media_count = media_count - 1,
            updated_at = NOW()
        WHERE id = OLD.album_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_album_media_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_comment_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_follower_counts_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE user_profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    UPDATE user_profiles 
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
    
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_follower_counts_on_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_follower_counts_on_delete"() IS 'Automatically updates follower/following counts when a follow relationship is deleted';



CREATE OR REPLACE FUNCTION "public"."update_follower_counts_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Use atomic update with GREATEST to prevent negative counts
    UPDATE user_profiles 
    SET following_count = GREATEST(following_count + 1, 0)
    WHERE id = NEW.follower_id;
    
    UPDATE user_profiles 
    SET followers_count = GREATEST(followers_count + 1, 0)
    WHERE id = NEW.following_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_follower_counts_on_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_follower_counts_on_insert"() IS 'Automatically updates follower/following counts when a new follow relationship is created';



CREATE OR REPLACE FUNCTION "public"."update_hashtag_post_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE hashtags SET post_count = post_count + 1 WHERE id = NEW.hashtag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE hashtags SET post_count = post_count - 1 WHERE id = OLD.hashtag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_hashtag_post_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_like_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment likes count
        IF NEW.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF NEW.comment_id IS NOT NULL THEN
            UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        ELSIF NEW.reel_id IS NOT NULL THEN
            UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement likes count
        IF OLD.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        ELSIF OLD.comment_id IS NOT NULL THEN
            UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
        ELSIF OLD.reel_id IS NOT NULL THEN
            UPDATE reels SET likes_count = likes_count - 1 WHERE id = OLD.reel_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_like_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_media_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_media 
        SET updated_at = NOW()
        WHERE id = NEW.media_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_media 
        SET updated_at = NOW()
        WHERE id = OLD.media_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_media_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_media_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update user_media table if it has a likes_count column
        UPDATE user_media 
        SET updated_at = NOW()
        WHERE id = NEW.media_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_media 
        SET updated_at = NOW()
        WHERE id = OLD.media_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_media_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reel_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.post_id AND NEW.post_type = 'reel';
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET comments_count = comments_count - 1 WHERE id = OLD.post_id AND OLD.post_type = 'reel';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_reel_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reel_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET likes_count = likes_count - 1 WHERE id = OLD.reel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_reel_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reel_saves_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET saves_count = saves_count + 1 WHERE id = NEW.reel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET saves_count = saves_count - 1 WHERE id = OLD.reel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_reel_saves_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reel_shares_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET shares_count = shares_count + 1 WHERE id = NEW.reel_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_reel_shares_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_location"("user_id" "uuid", "new_location" "text", "new_latitude" numeric, "new_longitude" numeric) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        location = new_location,
        latitude = new_latitude,
        longitude = new_longitude,
        location_updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_user_location"("user_id" "uuid", "new_location" "text", "new_latitude" numeric, "new_longitude" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_location"("user_id" "uuid", "new_location" "text", "new_latitude" numeric, "new_longitude" numeric) IS 'Update user location with coordinates';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."album_media" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "album_id" "uuid",
    "media_id" "uuid",
    "order_index" integer DEFAULT 0,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."album_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "host_id" "uuid",
    "client_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "parent_id" "uuid",
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid",
    "user_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."followers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "follower_id" "uuid",
    "following_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hashtags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "post_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."host_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "description" "text",
    "relationship_roles" "text"[] DEFAULT '{}'::"text"[],
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "expertise" "text"[] DEFAULT '{}'::"text"[],
    "price_category" "text" DEFAULT 'casual'::"text",
    "is_approved" boolean DEFAULT false,
    "approval_date" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."host_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "post_id" "uuid",
    "comment_id" "uuid",
    "reel_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "one_target" CHECK (((("post_id" IS NOT NULL) AND ("comment_id" IS NULL) AND ("reel_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NOT NULL) AND ("reel_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NULL) AND ("reel_id" IS NOT NULL))))
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_albums" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(100) NOT NULL,
    "description" "text",
    "cover_media_id" "uuid",
    "is_public" boolean DEFAULT true,
    "media_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "content" "text" NOT NULL,
    "parent_id" "uuid",
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "media_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_hashtags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid",
    "hashtag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "image_url" "text",
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "is_trending" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reel_hashtags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reel_id" "uuid",
    "hashtag_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reel_hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reel_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reel_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reel_music" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reel_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "artist" "text" NOT NULL,
    "cover_url" "text",
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reel_music" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reel_saves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reel_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reel_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "share_type" "text" DEFAULT 'internal'::"text",
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reel_shares_share_type_check" CHECK (("share_type" = ANY (ARRAY['internal'::"text", 'external'::"text", 'story'::"text"])))
);


ALTER TABLE "public"."reel_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "video_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "caption" "text",
    "duration" integer DEFAULT 0 NOT NULL,
    "view_count" integer DEFAULT 0,
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "shares_count" integer DEFAULT 0,
    "saves_count" integer DEFAULT 0,
    "hashtags" "text"[],
    "location" "text",
    "is_public" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reels_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'reported'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."reels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "handle" "text" NOT NULL,
    "username" "text",
    "avatar" "text",
    "profile_picture" "text",
    "bio" "text",
    "location" "text",
    "age" integer,
    "gender" "text",
    "date_of_birth" "date",
    "is_host" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "is_online" boolean DEFAULT false,
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "hourly_rate" numeric(10,2) DEFAULT 0,
    "total_chats" integer DEFAULT 0,
    "response_time" "text" DEFAULT '5 min'::"text",
    "rating" numeric(3,2) DEFAULT 0,
    "total_reviews" integer DEFAULT 0,
    "face_data" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "expertise" "text"[] DEFAULT '{}'::"text"[],
    "relationship_goals" "text"[] DEFAULT '{}'::"text"[],
    "looking_for" character varying(20) DEFAULT 'Everyone'::character varying,
    "age_preference_min" integer DEFAULT 18,
    "age_preference_max" integer DEFAULT 50,
    "distance_preference" integer DEFAULT 50,
    "profile_completion_percentage" integer DEFAULT 0,
    "last_profile_update" timestamp with time zone DEFAULT "now"(),
    "followers_count" integer DEFAULT 0,
    "following_count" integer DEFAULT 0,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "location_updated_at" timestamp with time zone DEFAULT "now"(),
    "community_trust_score" integer DEFAULT 0,
    CONSTRAINT "user_profiles_community_trust_score_check" CHECK ((("community_trust_score" >= 0) AND ("community_trust_score" <= 100)))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."interests" IS 'Array of user interests for better matching';



COMMENT ON COLUMN "public"."user_profiles"."expertise" IS 'Array of areas where user can help others';



COMMENT ON COLUMN "public"."user_profiles"."relationship_goals" IS 'Array of relationship goals (e.g., serious, casual, friendship)';



COMMENT ON COLUMN "public"."user_profiles"."looking_for" IS 'Gender preference for matches';



COMMENT ON COLUMN "public"."user_profiles"."age_preference_min" IS 'Minimum age preference for matches';



COMMENT ON COLUMN "public"."user_profiles"."age_preference_max" IS 'Maximum age preference for matches';



COMMENT ON COLUMN "public"."user_profiles"."distance_preference" IS 'Maximum distance preference for matches in kilometers';



COMMENT ON COLUMN "public"."user_profiles"."profile_completion_percentage" IS 'Profile completion percentage (0-100)';



COMMENT ON COLUMN "public"."user_profiles"."last_profile_update" IS 'Timestamp of last profile update';



COMMENT ON COLUMN "public"."user_profiles"."followers_count" IS 'Number of followers (for future use)';



COMMENT ON COLUMN "public"."user_profiles"."following_count" IS 'Number of users being followed (for future use)';



COMMENT ON COLUMN "public"."user_profiles"."latitude" IS 'Latitude coordinate for location-based features';



COMMENT ON COLUMN "public"."user_profiles"."longitude" IS 'Longitude coordinate for location-based features';



COMMENT ON COLUMN "public"."user_profiles"."location_updated_at" IS 'Timestamp when location was last updated';



CREATE OR REPLACE VIEW "public"."reels_with_users" AS
 SELECT "r"."id",
    "r"."user_id",
    "r"."video_url",
    "r"."thumbnail_url",
    "r"."caption",
    "r"."duration",
    "r"."view_count",
    "r"."likes_count",
    "r"."comments_count",
    "r"."shares_count",
    "r"."saves_count",
    "r"."hashtags",
    "r"."location" AS "reel_location",
    "r"."is_public",
    "r"."is_featured",
    "r"."status",
    "r"."created_at",
    "r"."updated_at",
    "up"."username",
    "up"."avatar",
    "up"."bio",
    "up"."location" AS "user_location",
    "up"."age",
    "up"."is_host",
    "up"."hourly_rate",
    "up"."total_chats",
    "up"."response_time",
    "rm"."title" AS "music_title",
    "rm"."artist" AS "music_artist",
    "rm"."cover_url" AS "music_cover_url",
    "rm"."duration" AS "music_duration",
        CASE
            WHEN ("rl"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "is_liked",
        CASE
            WHEN ("rs"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "is_saved",
    (EXTRACT(epoch FROM ("now"() - "r"."created_at")) / (3600)::numeric) AS "hours_ago"
   FROM (((("public"."reels" "r"
     LEFT JOIN "public"."user_profiles" "up" ON (("r"."user_id" = "up"."id")))
     LEFT JOIN "public"."reel_music" "rm" ON (("r"."id" = "rm"."reel_id")))
     LEFT JOIN "public"."reel_likes" "rl" ON ((("r"."id" = "rl"."reel_id") AND ("rl"."user_id" = "auth"."uid"()))))
     LEFT JOIN "public"."reel_saves" "rs" ON ((("r"."id" = "rs"."reel_id") AND ("rs"."user_id" = "auth"."uid"()))))
  WHERE (("r"."status" = 'active'::"text") AND ("r"."is_public" = true))
  ORDER BY "r"."created_at" DESC;


ALTER VIEW "public"."reels_with_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reviewer_id" "uuid",
    "reviewed_id" "uuid",
    "booking_id" "uuid",
    "rating" integer,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "image_url" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "bucket_name" "text" NOT NULL,
    "public_url" "text",
    "width" integer,
    "height" integer,
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_media" OWNER TO "postgres";


ALTER TABLE ONLY "public"."album_media"
    ADD CONSTRAINT "album_media_album_id_media_id_key" UNIQUE ("album_id", "media_id");



ALTER TABLE ONLY "public"."album_media"
    ADD CONSTRAINT "album_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_user_id_key" UNIQUE ("comment_id", "user_id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_albums"
    ADD CONSTRAINT "media_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_comments"
    ADD CONSTRAINT "media_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_likes"
    ADD CONSTRAINT "media_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_likes"
    ADD CONSTRAINT "media_likes_user_id_media_id_key" UNIQUE ("user_id", "media_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_post_id_hashtag_id_key" UNIQUE ("post_id", "hashtag_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reel_hashtags"
    ADD CONSTRAINT "reel_hashtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reel_hashtags"
    ADD CONSTRAINT "reel_hashtags_reel_id_hashtag_id_key" UNIQUE ("reel_id", "hashtag_id");



ALTER TABLE ONLY "public"."reel_likes"
    ADD CONSTRAINT "reel_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reel_likes"
    ADD CONSTRAINT "reel_likes_reel_id_user_id_key" UNIQUE ("reel_id", "user_id");



ALTER TABLE ONLY "public"."reel_music"
    ADD CONSTRAINT "reel_music_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reel_saves"
    ADD CONSTRAINT "reel_saves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reel_saves"
    ADD CONSTRAINT "reel_saves_reel_id_user_id_key" UNIQUE ("reel_id", "user_id");



ALTER TABLE ONLY "public"."reel_shares"
    ADD CONSTRAINT "reel_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reels"
    ADD CONSTRAINT "reels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_media"
    ADD CONSTRAINT "user_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");



CREATE INDEX "idx_album_media_album_id" ON "public"."album_media" USING "btree" ("album_id");



CREATE INDEX "idx_album_media_order" ON "public"."album_media" USING "btree" ("album_id", "order_index");



CREATE INDEX "idx_comment_likes_comment_id" ON "public"."comment_likes" USING "btree" ("comment_id");



CREATE INDEX "idx_comment_likes_user_id" ON "public"."comment_likes" USING "btree" ("user_id");



CREATE INDEX "idx_comments_created_at" ON "public"."comments" USING "btree" ("created_at");



CREATE INDEX "idx_comments_parent_id" ON "public"."comments" USING "btree" ("parent_id");



CREATE INDEX "idx_comments_post_id" ON "public"."comments" USING "btree" ("post_id");



CREATE INDEX "idx_comments_user_id" ON "public"."comments" USING "btree" ("user_id");



CREATE INDEX "idx_followers_follower_id" ON "public"."followers" USING "btree" ("follower_id");



CREATE INDEX "idx_followers_following_id" ON "public"."followers" USING "btree" ("following_id");



CREATE INDEX "idx_hashtags_name" ON "public"."hashtags" USING "btree" ("name");



CREATE INDEX "idx_likes_comment_id" ON "public"."likes" USING "btree" ("comment_id");



CREATE INDEX "idx_likes_created_at" ON "public"."likes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_likes_post_id" ON "public"."likes" USING "btree" ("post_id");



CREATE INDEX "idx_likes_reel_id" ON "public"."likes" USING "btree" ("reel_id");



CREATE INDEX "idx_likes_user_id" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "idx_media_albums_public" ON "public"."media_albums" USING "btree" ("is_public");



CREATE INDEX "idx_media_albums_user_id" ON "public"."media_albums" USING "btree" ("user_id");



CREATE INDEX "idx_media_comments_media_id" ON "public"."media_comments" USING "btree" ("media_id");



CREATE INDEX "idx_media_comments_parent_id" ON "public"."media_comments" USING "btree" ("parent_id");



CREATE INDEX "idx_media_comments_user_id" ON "public"."media_comments" USING "btree" ("user_id");



CREATE INDEX "idx_media_likes_media_id" ON "public"."media_likes" USING "btree" ("media_id");



CREATE INDEX "idx_media_likes_user_id" ON "public"."media_likes" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("is_read", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_post_hashtags_hashtag_id" ON "public"."post_hashtags" USING "btree" ("hashtag_id");



CREATE INDEX "idx_post_hashtags_post_id" ON "public"."post_hashtags" USING "btree" ("post_id");



CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_trending" ON "public"."posts" USING "btree" ("is_trending", "created_at" DESC);



CREATE INDEX "idx_posts_user_id" ON "public"."posts" USING "btree" ("user_id");



CREATE INDEX "idx_reel_hashtags_hashtag_id" ON "public"."reel_hashtags" USING "btree" ("hashtag_id");



CREATE INDEX "idx_reel_hashtags_reel_id" ON "public"."reel_hashtags" USING "btree" ("reel_id");



CREATE INDEX "idx_reel_likes_created_at" ON "public"."reel_likes" USING "btree" ("created_at");



CREATE INDEX "idx_reel_likes_reel_id" ON "public"."reel_likes" USING "btree" ("reel_id");



CREATE INDEX "idx_reel_likes_user_id" ON "public"."reel_likes" USING "btree" ("user_id");



CREATE INDEX "idx_reel_music_reel_id" ON "public"."reel_music" USING "btree" ("reel_id");



CREATE INDEX "idx_reel_saves_created_at" ON "public"."reel_saves" USING "btree" ("created_at");



CREATE INDEX "idx_reel_saves_reel_id" ON "public"."reel_saves" USING "btree" ("reel_id");



CREATE INDEX "idx_reel_saves_user_id" ON "public"."reel_saves" USING "btree" ("user_id");



CREATE INDEX "idx_reel_shares_created_at" ON "public"."reel_shares" USING "btree" ("created_at");



CREATE INDEX "idx_reel_shares_reel_id" ON "public"."reel_shares" USING "btree" ("reel_id");



CREATE INDEX "idx_reel_shares_user_id" ON "public"."reel_shares" USING "btree" ("user_id");



CREATE INDEX "idx_reels_created_at" ON "public"."reels" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reels_is_featured" ON "public"."reels" USING "btree" ("is_featured");



CREATE INDEX "idx_reels_is_public" ON "public"."reels" USING "btree" ("is_public");



CREATE INDEX "idx_reels_likes_count" ON "public"."reels" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_reels_status" ON "public"."reels" USING "btree" ("status");



CREATE INDEX "idx_reels_user_id" ON "public"."reels" USING "btree" ("user_id");



CREATE INDEX "idx_reels_view_count" ON "public"."reels" USING "btree" ("view_count" DESC);



CREATE INDEX "idx_user_profiles_age" ON "public"."user_profiles" USING "btree" ("age");



CREATE INDEX "idx_user_profiles_age_preference" ON "public"."user_profiles" USING "btree" ("age_preference_min", "age_preference_max");



CREATE INDEX "idx_user_profiles_bio" ON "public"."user_profiles" USING "gin" ("to_tsvector"('"english"'::"regconfig", "bio"));



CREATE INDEX "idx_user_profiles_completion_percentage" ON "public"."user_profiles" USING "btree" ("profile_completion_percentage");



CREATE INDEX "idx_user_profiles_expertise" ON "public"."user_profiles" USING "gin" ("expertise");



CREATE INDEX "idx_user_profiles_followers_count" ON "public"."user_profiles" USING "btree" ("followers_count");



CREATE INDEX "idx_user_profiles_following_count" ON "public"."user_profiles" USING "btree" ("following_count");



CREATE INDEX "idx_user_profiles_full_name" ON "public"."user_profiles" USING "btree" ("full_name");



CREATE INDEX "idx_user_profiles_handle" ON "public"."user_profiles" USING "btree" ("handle");



CREATE INDEX "idx_user_profiles_hourly_rate" ON "public"."user_profiles" USING "btree" ("hourly_rate");



CREATE INDEX "idx_user_profiles_interests" ON "public"."user_profiles" USING "gin" ("interests");



CREATE INDEX "idx_user_profiles_is_host" ON "public"."user_profiles" USING "btree" ("is_host");



CREATE INDEX "idx_user_profiles_is_online" ON "public"."user_profiles" USING "btree" ("is_online");



CREATE INDEX "idx_user_profiles_is_verified" ON "public"."user_profiles" USING "btree" ("is_verified");



CREATE INDEX "idx_user_profiles_location" ON "public"."user_profiles" USING "btree" ("location");



CREATE INDEX "idx_user_profiles_location_coords" ON "public"."user_profiles" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_user_profiles_looking_for" ON "public"."user_profiles" USING "btree" ("looking_for");



CREATE INDEX "idx_user_profiles_online" ON "public"."user_profiles" USING "btree" ("is_online");



CREATE INDEX "idx_user_profiles_online_hosts" ON "public"."user_profiles" USING "btree" ("is_host", "is_online", "rating") WHERE (("is_host" = true) AND ("is_online" = true));



CREATE INDEX "idx_user_profiles_rating" ON "public"."user_profiles" USING "btree" ("rating");



CREATE INDEX "idx_user_profiles_relationship_goals" ON "public"."user_profiles" USING "gin" ("relationship_goals");



CREATE INDEX "idx_user_profiles_search_combo" ON "public"."user_profiles" USING "btree" ("is_host", "rating", "age") WHERE ("is_host" = true);



CREATE INDEX "idx_user_profiles_username" ON "public"."user_profiles" USING "btree" ("username");



CREATE UNIQUE INDEX "unique_user_comment_like" ON "public"."likes" USING "btree" ("user_id", "comment_id") WHERE ("comment_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_user_post_like" ON "public"."likes" USING "btree" ("user_id", "post_id") WHERE ("post_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_user_reel_like" ON "public"."likes" USING "btree" ("user_id", "reel_id") WHERE ("reel_id" IS NOT NULL);



CREATE INDEX "user_media_created_at_idx" ON "public"."user_media" USING "btree" ("created_at" DESC);



CREATE INDEX "user_media_file_type_idx" ON "public"."user_media" USING "btree" ("file_type");



CREATE INDEX "user_media_user_id_idx" ON "public"."user_media" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "mark_comment_edited" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."mark_comment_edited"();



CREATE OR REPLACE TRIGGER "trigger_calculate_profile_completion" BEFORE INSERT OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_profile_completion_percentage"();



CREATE OR REPLACE TRIGGER "trigger_reel_comments_count" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_reel_comments_count"();



CREATE OR REPLACE TRIGGER "trigger_reel_likes_count" AFTER INSERT OR DELETE ON "public"."reel_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_reel_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_reel_saves_count" AFTER INSERT OR DELETE ON "public"."reel_saves" FOR EACH ROW EXECUTE FUNCTION "public"."update_reel_saves_count"();



CREATE OR REPLACE TRIGGER "trigger_reel_shares_count" AFTER INSERT ON "public"."reel_shares" FOR EACH ROW EXECUTE FUNCTION "public"."update_reel_shares_count"();



CREATE OR REPLACE TRIGGER "trigger_reels_updated_at" BEFORE UPDATE ON "public"."reels" FOR EACH ROW EXECUTE FUNCTION "public"."update_reels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_album_media_count" AFTER INSERT OR DELETE ON "public"."album_media" FOR EACH ROW EXECUTE FUNCTION "public"."update_album_media_count"();



CREATE OR REPLACE TRIGGER "trigger_update_follower_counts_delete" AFTER DELETE ON "public"."followers" FOR EACH ROW EXECUTE FUNCTION "public"."update_follower_counts_on_delete"();



COMMENT ON TRIGGER "trigger_update_follower_counts_delete" ON "public"."followers" IS 'Trigger to update counts on unfollow';



CREATE OR REPLACE TRIGGER "trigger_update_follower_counts_insert" AFTER INSERT ON "public"."followers" FOR EACH ROW EXECUTE FUNCTION "public"."update_follower_counts_on_insert"();



COMMENT ON TRIGGER "trigger_update_follower_counts_insert" ON "public"."followers" IS 'Trigger to update counts on follow';



CREATE OR REPLACE TRIGGER "trigger_update_location_timestamp" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_location_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_media_comments_count" AFTER INSERT OR DELETE ON "public"."media_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_media_comments_count"();



CREATE OR REPLACE TRIGGER "trigger_update_media_likes_count" AFTER INSERT OR DELETE ON "public"."media_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_media_likes_count"();



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comment_likes_count" AFTER INSERT OR DELETE ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "update_comment_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hashtag_post_count_trigger" AFTER INSERT OR DELETE ON "public"."post_hashtags" FOR EACH ROW EXECUTE FUNCTION "public"."update_hashtag_post_count"();



CREATE OR REPLACE TRIGGER "update_host_profiles_updated_at" BEFORE UPDATE ON "public"."host_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_like_count_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_like_count"();



CREATE OR REPLACE TRIGGER "update_post_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_likes_count"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reel_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_reel_likes_count"();



CREATE OR REPLACE TRIGGER "update_user_media_updated_at" BEFORE UPDATE ON "public"."user_media" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."album_media"
    ADD CONSTRAINT "album_media_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."media_albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."host_profiles"
    ADD CONSTRAINT "host_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_albums"
    ADD CONSTRAINT "media_albums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_comments"
    ADD CONSTRAINT "media_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."media_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_comments"
    ADD CONSTRAINT "media_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_likes"
    ADD CONSTRAINT "media_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_hashtag_id_fkey" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_hashtags"
    ADD CONSTRAINT "reel_hashtags_hashtag_id_fkey" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_likes"
    ADD CONSTRAINT "reel_likes_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_likes"
    ADD CONSTRAINT "reel_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_music"
    ADD CONSTRAINT "reel_music_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_saves"
    ADD CONSTRAINT "reel_saves_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_saves"
    ADD CONSTRAINT "reel_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_shares"
    ADD CONSTRAINT "reel_shares_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "public"."reels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reel_shares"
    ADD CONSTRAINT "reel_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reels"
    ADD CONSTRAINT "reels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewed_id_fkey" FOREIGN KEY ("reviewed_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_media"
    ADD CONSTRAINT "user_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view hashtags" ON "public"."hashtags" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create hashtags" ON "public"."hashtags" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can create bookings" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "client_id"));



COMMENT ON POLICY "Users can create bookings" ON "public"."bookings" IS 'Allow users to create bookings as clients';



CREATE POLICY "Users can create comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create comments on visible posts" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "comments"."post_id") AND (("p"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."followers" "f"
          WHERE (("f"."follower_id" = "auth"."uid"()) AND ("f"."following_id" = "p"."user_id"))))))))));



CREATE POLICY "Users can create music for their reels" ON "public"."reel_music" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."reels"
  WHERE (("reels"."id" = "reel_music"."reel_id") AND ("reels"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can create notifications" ON "public"."notifications" IS 'Allow users to create notifications';



CREATE POLICY "Users can create reels" ON "public"."reels" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can create their own follows" ON "public"."followers" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



COMMENT ON POLICY "Users can create their own follows" ON "public"."followers" IS 'Allow users to create their own follow relationships';



CREATE POLICY "Users can create their own host profile" ON "public"."host_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own likes" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own stories" ON "public"."stories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own bookings" ON "public"."bookings" FOR DELETE USING ((("auth"."uid"() = "host_id") OR ("auth"."uid"() = "client_id")));



COMMENT ON POLICY "Users can delete their own bookings" ON "public"."bookings" IS 'Allow users to delete bookings they are involved in';



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."media_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own follows" ON "public"."followers" FOR DELETE USING (("auth"."uid"() = "follower_id"));



COMMENT ON POLICY "Users can delete their own follows" ON "public"."followers" IS 'Allow users to delete their own follow relationships';



CREATE POLICY "Users can delete their own host profile" ON "public"."host_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own media metadata" ON "public"."user_media" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can delete their own notifications" ON "public"."notifications" IS 'Allow users to delete their own notifications';



CREATE POLICY "Users can delete their own posts" ON "public"."posts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reels" ON "public"."reels" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own stories" ON "public"."stories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own media metadata" ON "public"."user_media" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can like/unlike comments" ON "public"."comment_likes" USING ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM ("public"."comments" "c"
     JOIN "public"."posts" "p" ON (("c"."post_id" = "p"."id")))
  WHERE (("c"."id" = "comment_likes"."comment_id") AND (("p"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."followers" "f"
          WHERE (("f"."follower_id" = "auth"."uid"()) AND ("f"."following_id" = "p"."user_id"))))))))));



CREATE POLICY "Users can like/unlike reels" ON "public"."reel_likes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own follow relationships" ON "public"."followers" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can manage their own album media" ON "public"."album_media" USING ((EXISTS ( SELECT 1
   FROM "public"."media_albums"
  WHERE (("media_albums"."id" = "album_media"."album_id") AND ("media_albums"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own albums" ON "public"."media_albums" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own media likes" ON "public"."media_likes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can save/unsave reels" ON "public"."reel_saves" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages to their conversations" ON "public"."messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))) AND ("auth"."uid"() = "sender_id")));



CREATE POLICY "Users can share reels" ON "public"."reel_shares" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE USING ((("auth"."uid"() = "host_id") OR ("auth"."uid"() = "client_id")));



CREATE POLICY "Users can update own host profile" ON "public"."host_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can update their own bookings" ON "public"."bookings" FOR UPDATE USING ((("auth"."uid"() = "host_id") OR ("auth"."uid"() = "client_id")));



COMMENT ON POLICY "Users can update their own bookings" ON "public"."bookings" IS 'Allow users to update bookings they are involved in';



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."media_comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own host profile" ON "public"."host_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own location" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own media metadata" ON "public"."user_media" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can update their own notifications" ON "public"."notifications" IS 'Allow users to update their own notifications';



CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own reels" ON "public"."reels" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view album media for public albums" ON "public"."album_media" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."media_albums"
  WHERE (("media_albums"."id" = "album_media"."album_id") AND (("media_albums"."is_public" = true) OR ("media_albums"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view all comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Users can view all follow relationships" ON "public"."followers" FOR SELECT USING (true);



CREATE POLICY "Users can view all followers" ON "public"."followers" FOR SELECT USING (true);



COMMENT ON POLICY "Users can view all followers" ON "public"."followers" IS 'Allow all users to view follower relationships';



CREATE POLICY "Users can view all host profiles" ON "public"."host_profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view all likes" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Users can view all media likes" ON "public"."media_likes" FOR SELECT USING (true);



CREATE POLICY "Users can view all posts" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Users can view all profiles" ON "public"."user_profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view all reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Users can view all stories" ON "public"."stories" FOR SELECT USING (true);



CREATE POLICY "Users can view comment likes" ON "public"."comment_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."comments" "c"
     JOIN "public"."posts" "p" ON (("c"."post_id" = "p"."id")))
  WHERE (("c"."id" = "comment_likes"."comment_id") AND (("p"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."followers" "f"
          WHERE (("f"."follower_id" = "auth"."uid"()) AND ("f"."following_id" = "p"."user_id")))))))));



CREATE POLICY "Users can view comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own bookings" ON "public"."bookings" FOR SELECT USING ((("auth"."uid"() = "host_id") OR ("auth"."uid"() = "client_id")));



CREATE POLICY "Users can view public albums" ON "public"."media_albums" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Users can view public reels" ON "public"."reels" FOR SELECT USING ((("is_public" = true) AND ("status" = 'active'::"text")));



CREATE POLICY "Users can view reel likes" ON "public"."reel_likes" FOR SELECT USING (true);



CREATE POLICY "Users can view reel music" ON "public"."reel_music" FOR SELECT USING (true);



CREATE POLICY "Users can view reel shares" ON "public"."reel_shares" FOR SELECT USING (true);



CREATE POLICY "Users can view their own albums" ON "public"."media_albums" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT USING ((("auth"."uid"() = "host_id") OR ("auth"."uid"() = "client_id")));



COMMENT ON POLICY "Users can view their own bookings" ON "public"."bookings" IS 'Allow users to view bookings they are involved in';



CREATE POLICY "Users can view their own media metadata" ON "public"."user_media" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



COMMENT ON POLICY "Users can view their own notifications" ON "public"."notifications" IS 'Allow users to view their own notifications';



CREATE POLICY "Users can view their own reels" ON "public"."reels" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own saves" ON "public"."reel_saves" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."album_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."followers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hashtags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."host_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_hashtags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reel_hashtags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reel_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reel_music" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reel_saves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reel_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_distance"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_distance"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_distance"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_profile_completion_percentage"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_profile_completion_percentage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_profile_completion_percentage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearby_users"("user_lat" numeric, "user_lon" numeric, "max_distance_km" numeric, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_nearby_users"("user_lat" numeric, "user_lon" numeric, "max_distance_km" numeric, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_nearby_users"("user_lat" numeric, "user_lon" numeric, "max_distance_km" numeric, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_like_count"("p_post_id" "uuid", "p_comment_id" "uuid", "p_reel_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_like_count"("p_post_id" "uuid", "p_comment_id" "uuid", "p_reel_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_like_count"("p_post_id" "uuid", "p_comment_id" "uuid", "p_reel_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reels_with_engagement"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_reels_with_engagement"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reels_with_engagement"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_reel_view"("p_reel_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_reel_view"("p_reel_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_reel_view"("p_reel_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_comment_edited"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_comment_edited"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_comment_edited"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_storage_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_storage_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_storage_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_reel_like"("p_reel_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_reel_like"("p_reel_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_reel_like"("p_reel_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_reel_save"("p_reel_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_reel_save"("p_reel_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_reel_save"("p_reel_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_location_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_location_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_location_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_album_media_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_album_media_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_album_media_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_follower_counts_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_follower_counts_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_follower_counts_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_follower_counts_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_follower_counts_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_follower_counts_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hashtag_post_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_hashtag_post_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hashtag_post_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_like_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_like_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_like_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_media_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_media_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_media_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_media_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_media_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_media_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reel_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reel_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reel_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reel_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reel_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reel_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reel_saves_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reel_saves_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reel_saves_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reel_shares_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reel_shares_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reel_shares_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_location"("user_id" "uuid", "new_location" "text", "new_latitude" numeric, "new_longitude" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_location"("user_id" "uuid", "new_location" "text", "new_latitude" numeric, "new_longitude" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_location"("user_id" "uuid", "new_location" "text", "new_latitude" numeric, "new_longitude" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."album_media" TO "anon";
GRANT ALL ON TABLE "public"."album_media" TO "authenticated";
GRANT ALL ON TABLE "public"."album_media" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."followers" TO "anon";
GRANT ALL ON TABLE "public"."followers" TO "authenticated";
GRANT ALL ON TABLE "public"."followers" TO "service_role";



GRANT ALL ON TABLE "public"."hashtags" TO "anon";
GRANT ALL ON TABLE "public"."hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."host_profiles" TO "anon";
GRANT ALL ON TABLE "public"."host_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."host_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."media_albums" TO "anon";
GRANT ALL ON TABLE "public"."media_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."media_albums" TO "service_role";



GRANT ALL ON TABLE "public"."media_comments" TO "anon";
GRANT ALL ON TABLE "public"."media_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."media_comments" TO "service_role";



GRANT ALL ON TABLE "public"."media_likes" TO "anon";
GRANT ALL ON TABLE "public"."media_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."media_likes" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."post_hashtags" TO "anon";
GRANT ALL ON TABLE "public"."post_hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."post_hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."reel_hashtags" TO "anon";
GRANT ALL ON TABLE "public"."reel_hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."reel_hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."reel_likes" TO "anon";
GRANT ALL ON TABLE "public"."reel_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."reel_likes" TO "service_role";



GRANT ALL ON TABLE "public"."reel_music" TO "anon";
GRANT ALL ON TABLE "public"."reel_music" TO "authenticated";
GRANT ALL ON TABLE "public"."reel_music" TO "service_role";



GRANT ALL ON TABLE "public"."reel_saves" TO "anon";
GRANT ALL ON TABLE "public"."reel_saves" TO "authenticated";
GRANT ALL ON TABLE "public"."reel_saves" TO "service_role";



GRANT ALL ON TABLE "public"."reel_shares" TO "anon";
GRANT ALL ON TABLE "public"."reel_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."reel_shares" TO "service_role";



GRANT ALL ON TABLE "public"."reels" TO "anon";
GRANT ALL ON TABLE "public"."reels" TO "authenticated";
GRANT ALL ON TABLE "public"."reels" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reels_with_users" TO "anon";
GRANT ALL ON TABLE "public"."reels_with_users" TO "authenticated";
GRANT ALL ON TABLE "public"."reels_with_users" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."user_media" TO "anon";
GRANT ALL ON TABLE "public"."user_media" TO "authenticated";
GRANT ALL ON TABLE "public"."user_media" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
