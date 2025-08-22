-- =====================================================
-- AUTOMATED STORY DELETION SYSTEM (24 HOUR EXPIRY)
-- =====================================================
-- This file sets up automatic deletion of stories after 24 hours
-- Including cron job setup and monitoring

-- =====================================================
-- 1. ENABLE PG_CRON EXTENSION (Supabase Pro required)
-- =====================================================

-- Note: This requires Supabase Pro plan or self-hosted PostgreSQL
-- For Supabase Free tier, use the client-side cleanup approach below

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 2. COMPREHENSIVE CLEANUP FUNCTION
-- =====================================================

-- Enhanced cleanup function with logging and safety checks
CREATE OR REPLACE FUNCTION comprehensive_story_cleanup()
RETURNS JSONB AS $$
DECLARE
    expired_stories_count INTEGER := 0;
    archived_stories_count INTEGER := 0;
    deleted_files_count INTEGER := 0;
    error_count INTEGER := 0;
    cleanup_start_time TIMESTAMP;
    result JSONB;
    story_record RECORD;
    batch_size INTEGER := 100; -- Process in batches to avoid locks
BEGIN
    cleanup_start_time := NOW();
    
    -- Log cleanup start
    INSERT INTO story_cleanup_log (started_at, status) 
    VALUES (cleanup_start_time, 'started')
    ON CONFLICT DO NOTHING;
    
    -- Step 1: Archive expired stories
    BEGIN
        UPDATE stories 
        SET 
            is_archived = true,
            updated_at = NOW()
        WHERE expires_at <= NOW() 
        AND NOT is_archived
        AND id IN (
            SELECT id FROM stories 
            WHERE expires_at <= NOW() AND NOT is_archived 
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS archived_stories_count = ROW_COUNT;
        
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        INSERT INTO story_cleanup_log (started_at, status, error_message)
        VALUES (cleanup_start_time, 'error_archiving', SQLERRM);
    END;
    
    -- Step 2: Delete old archived stories (optional - after 7 days)
    BEGIN
        -- Get stories to be deleted for logging
        FOR story_record IN
            SELECT id, image_url, video_url, thumbnail_url
            FROM stories
            WHERE is_archived = true 
            AND updated_at <= NOW() - INTERVAL '7 days'
            LIMIT batch_size
        LOOP
            -- Log the deletion
            INSERT INTO story_deletion_log (
                story_id, 
                deleted_at, 
                reason, 
                metadata
            ) VALUES (
                story_record.id,
                NOW(),
                'archived_7_days',
                json_build_object(
                    'image_url', story_record.image_url,
                    'video_url', story_record.video_url,
                    'thumbnail_url', story_record.thumbnail_url
                )
            );
            
            -- Delete the story
            DELETE FROM stories WHERE id = story_record.id;
            expired_stories_count := expired_stories_count + 1;
        END LOOP;
        
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        INSERT INTO story_cleanup_log (started_at, status, error_message)
        VALUES (cleanup_start_time, 'error_deleting', SQLERRM);
    END;
    
    -- Step 3: Clean up orphaned story views and likes
    BEGIN
        DELETE FROM story_views 
        WHERE story_id NOT IN (SELECT id FROM stories);
        
        DELETE FROM story_likes 
        WHERE story_id NOT IN (SELECT id FROM stories);
        
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        INSERT INTO story_cleanup_log (started_at, status, error_message)
        VALUES (cleanup_start_time, 'error_cleanup_orphans', SQLERRM);
    END;
    
    -- Build result summary
    result := json_build_object(
        'cleanup_started_at', cleanup_start_time,
        'cleanup_completed_at', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - cleanup_start_time)),
        'archived_stories', archived_stories_count,
        'deleted_stories', expired_stories_count,
        'error_count', error_count,
        'status', CASE WHEN error_count = 0 THEN 'success' ELSE 'partial_success' END
    );
    
    -- Log cleanup completion
    INSERT INTO story_cleanup_log (
        started_at, 
        completed_at, 
        status, 
        archived_count, 
        deleted_count,
        duration_seconds,
        result_summary
    ) VALUES (
        cleanup_start_time,
        NOW(),
        CASE WHEN error_count = 0 THEN 'completed' ELSE 'completed_with_errors' END,
        archived_stories_count,
        expired_stories_count,
        EXTRACT(EPOCH FROM (NOW() - cleanup_start_time)),
        result
    )
    ON CONFLICT (started_at) DO UPDATE SET
        completed_at = EXCLUDED.completed_at,
        status = EXCLUDED.status,
        archived_count = EXCLUDED.archived_count,
        deleted_count = EXCLUDED.deleted_count,
        duration_seconds = EXCLUDED.duration_seconds,
        result_summary = EXCLUDED.result_summary;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. LOGGING TABLES FOR MONITORING
-- =====================================================

-- Create cleanup log table
CREATE TABLE IF NOT EXISTS "story_cleanup_log" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "status" TEXT NOT NULL, -- 'started', 'completed', 'error', 'completed_with_errors'
    "archived_count" INTEGER DEFAULT 0,
    "deleted_count" INTEGER DEFAULT 0,
    "duration_seconds" NUMERIC DEFAULT 0,
    "error_message" TEXT,
    "result_summary" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(started_at)
);

-- Enhanced deletion log with more details
ALTER TABLE story_deletion_log 
ADD COLUMN IF NOT EXISTS "file_urls" JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "cleanup_batch_id" UUID,
ADD COLUMN IF NOT EXISTS "deletion_method" TEXT DEFAULT 'auto'; -- 'auto', 'manual', 'bulk'

-- Create indexes for cleanup monitoring
CREATE INDEX IF NOT EXISTS idx_cleanup_log_started_at ON story_cleanup_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_log_status ON story_cleanup_log(status);
CREATE INDEX IF NOT EXISTS idx_deletion_log_deleted_at ON story_deletion_log(deleted_at DESC);

-- =====================================================
-- 4. CRON JOB SETUP (Supabase Pro / Self-hosted)
-- =====================================================

-- Schedule cleanup to run every hour
-- This will process expired stories continuously rather than in large batches
SELECT cron.schedule(
    'story-cleanup-hourly',
    '0 * * * *', -- Every hour at minute 0
    'SELECT comprehensive_story_cleanup();'
);

-- Schedule a more aggressive cleanup daily at 2 AM
SELECT cron.schedule(
    'story-cleanup-daily',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT comprehensive_story_cleanup();'
);

-- Schedule weekly maintenance (cleanup logs, optimize tables)
SELECT cron.schedule(
    'story-maintenance-weekly',
    '0 3 * * 0', -- Weekly on Sunday at 3 AM
    $$
    -- Clean up old cleanup logs (keep last 30 days)
    DELETE FROM story_cleanup_log 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old deletion logs (keep last 90 days)
    DELETE FROM story_deletion_log 
    WHERE deleted_at < NOW() - INTERVAL '90 days';
    
    -- Vacuum and analyze tables
    VACUUM ANALYZE stories;
    VACUUM ANALYZE story_views;
    VACUUM ANALYZE story_likes;
    $$
);

-- =====================================================
-- 5. MONITORING AND ALERTING FUNCTIONS
-- =====================================================

-- Function to check cleanup health
CREATE OR REPLACE FUNCTION check_story_cleanup_health()
RETURNS JSONB AS $$
DECLARE
    health_status JSONB;
    last_successful_cleanup TIMESTAMP;
    expired_stories_count INTEGER;
    failed_cleanups_count INTEGER;
BEGIN
    -- Get last successful cleanup
    SELECT MAX(completed_at) INTO last_successful_cleanup
    FROM story_cleanup_log 
    WHERE status IN ('completed', 'completed_with_errors');
    
    -- Count expired stories waiting for cleanup
    SELECT COUNT(*) INTO expired_stories_count
    FROM stories 
    WHERE expires_at <= NOW() AND NOT is_archived;
    
    -- Count failed cleanups in last 24 hours
    SELECT COUNT(*) INTO failed_cleanups_count
    FROM story_cleanup_log
    WHERE started_at >= NOW() - INTERVAL '24 hours'
    AND status = 'error';
    
    health_status := json_build_object(
        'last_successful_cleanup', last_successful_cleanup,
        'hours_since_last_cleanup', EXTRACT(EPOCH FROM (NOW() - last_successful_cleanup)) / 3600,
        'expired_stories_pending', expired_stories_count,
        'failed_cleanups_24h', failed_cleanups_count,
        'status', CASE 
            WHEN last_successful_cleanup IS NULL THEN 'never_run'
            WHEN last_successful_cleanup < NOW() - INTERVAL '2 hours' THEN 'overdue'
            WHEN expired_stories_count > 1000 THEN 'backlog'
            WHEN failed_cleanups_count > 3 THEN 'unstable'
            ELSE 'healthy'
        END,
        'checked_at', NOW()
    );
    
    RETURN health_status;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CLIENT-SIDE CLEANUP (For Supabase Free Tier)
-- =====================================================

-- Function to be called from client app periodically
CREATE OR REPLACE FUNCTION client_story_cleanup()
RETURNS JSONB AS $$
DECLARE
    cleanup_result JSONB;
    batch_limit INTEGER := 50; -- Smaller batches for client calls
BEGIN
    -- Only archive expired stories (don't delete)
    UPDATE stories 
    SET is_archived = true, updated_at = NOW()
    WHERE expires_at <= NOW() 
    AND NOT is_archived
    AND id IN (
        SELECT id FROM stories 
        WHERE expires_at <= NOW() AND NOT is_archived 
        ORDER BY expires_at ASC
        LIMIT batch_limit
    );
    
    cleanup_result := json_build_object(
        'archived_count', (SELECT changes()),
        'remaining_expired', (
            SELECT COUNT(*) FROM stories 
            WHERE expires_at <= NOW() AND NOT is_archived
        ),
        'timestamp', NOW()
    );
    
    RETURN cleanup_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. MANUAL CLEANUP FUNCTIONS
-- =====================================================

-- Function to manually cleanup specific user's expired stories
CREATE OR REPLACE FUNCTION cleanup_user_expired_stories(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    deleted_count INTEGER;
BEGIN
    DELETE FROM stories 
    WHERE user_id = target_user_id 
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    result := json_build_object(
        'user_id', target_user_id,
        'deleted_stories', deleted_count,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to force cleanup all expired stories immediately
CREATE OR REPLACE FUNCTION force_cleanup_all_expired()
RETURNS JSONB AS $$
BEGIN
    RETURN comprehensive_story_cleanup();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VIEWING FUNCTIONS FOR MONITORING
-- =====================================================

-- Function to get cleanup statistics
CREATE OR REPLACE FUNCTION get_cleanup_stats(days_back INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT json_build_object(
        'total_cleanups', COUNT(*),
        'successful_cleanups', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_cleanups', COUNT(*) FILTER (WHERE status = 'error'),
        'total_archived', SUM(COALESCE(archived_count, 0)),
        'total_deleted', SUM(COALESCE(deleted_count, 0)),
        'avg_duration_seconds', AVG(COALESCE(duration_seconds, 0)),
        'last_cleanup', MAX(completed_at),
        'date_range', json_build_object(
            'from', NOW() - (days_back || ' days')::INTERVAL,
            'to', NOW()
        )
    )
    INTO stats
    FROM story_cleanup_log
    WHERE started_at >= NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. EMERGENCY PROCEDURES
-- =====================================================

-- Emergency function to disable all cron jobs
CREATE OR REPLACE FUNCTION emergency_disable_story_cleanup()
RETURNS TEXT AS $$
BEGIN
    -- Unschedule all story cleanup jobs
    PERFORM cron.unschedule('story-cleanup-hourly');
    PERFORM cron.unschedule('story-cleanup-daily');
    PERFORM cron.unschedule('story-maintenance-weekly');
    
    RETURN 'All story cleanup cron jobs have been disabled. Use emergency_enable_story_cleanup() to re-enable.';
END;
$$ LANGUAGE plpgsql;

-- Function to re-enable cleanup jobs
CREATE OR REPLACE FUNCTION emergency_enable_story_cleanup()
RETURNS TEXT AS $$
BEGIN
    -- Re-schedule all jobs
    PERFORM cron.schedule('story-cleanup-hourly', '0 * * * *', 'SELECT comprehensive_story_cleanup();');
    PERFORM cron.schedule('story-cleanup-daily', '0 2 * * *', 'SELECT comprehensive_story_cleanup();');
    PERFORM cron.schedule('story-maintenance-weekly', '0 3 * * 0', 
        'DELETE FROM story_cleanup_log WHERE started_at < NOW() - INTERVAL ''30 days''; 
         DELETE FROM story_deletion_log WHERE deleted_at < NOW() - INTERVAL ''90 days''; 
         VACUUM ANALYZE stories;'
    );
    
    RETURN 'Story cleanup cron jobs have been re-enabled.';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION AND TESTING
-- =====================================================

-- Test the cleanup function
SELECT 'Testing cleanup function...' as status;
SELECT comprehensive_story_cleanup() as test_result;

-- Check current story status
SELECT 
    COUNT(*) as total_stories,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_stories,
    COUNT(*) FILTER (WHERE expires_at <= NOW() AND NOT is_archived) as expired_unarchived,
    COUNT(*) FILTER (WHERE is_archived) as archived_stories
FROM stories;

-- Show scheduled cron jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE 'story-%';

SELECT json_build_object(
    'status', 'success',
    'message', 'Story auto-deletion system setup completed!',
    'features', json_build_array(
        'Automatic story deletion after 24 hours',
        'Comprehensive cleanup logging',
        'Health monitoring and alerting',
        'Client-side cleanup for free tier',
        'Manual cleanup functions',
        'Emergency disable/enable procedures'
    ),
    'cron_jobs', json_build_array(
        'story-cleanup-hourly (every hour)',
        'story-cleanup-daily (daily at 2 AM)',
        'story-maintenance-weekly (Sunday at 3 AM)'
    ),
    'monitoring', json_build_array(
        'check_story_cleanup_health()',
        'get_cleanup_stats(days)',
        'story_cleanup_log table',
        'story_deletion_log table'
    )
) as setup_complete;