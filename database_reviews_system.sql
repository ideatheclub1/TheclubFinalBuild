-- =====================================================
-- REVIEWS SYSTEM ENHANCEMENT
-- =====================================================
-- This script enhances the reviews system with proper RLS policies,
-- triggers for automatic rating calculations, and community trust score

-- 1. Add indexes for reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- 2. Drop existing RLS policies for reviews if they exist
DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users cannot edit reviews" ON reviews;

-- 3. Create RLS policies for reviews
-- Users can view all reviews
CREATE POLICY "Users can view all reviews" ON reviews
    FOR SELECT USING (true);

-- Users can create reviews (but not for themselves)
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND 
        reviewer_id != reviewed_id
    );

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- Users cannot edit reviews (no UPDATE policy = no updates allowed)
-- This ensures reviews cannot be edited once posted

-- 4. Create function to calculate average rating and update user profile
CREATE OR REPLACE FUNCTION update_user_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new average rating and total reviews
    UPDATE user_profiles
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE reviewed_id = COALESCE(NEW.reviewed_id, OLD.reviewed_id)
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewed_id = COALESCE(NEW.reviewed_id, OLD.reviewed_id)
        )
    WHERE id = COALESCE(NEW.reviewed_id, OLD.reviewed_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers to automatically update user rating stats
DROP TRIGGER IF EXISTS trigger_update_user_rating_stats ON reviews;

CREATE TRIGGER trigger_update_user_rating_stats
    AFTER INSERT OR DELETE OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_stats();

-- 6. Create function to calculate community trust score
CREATE OR REPLACE FUNCTION calculate_community_trust_score(
    user_rating DECIMAL,
    total_reviews INTEGER,
    profile_completion_percentage INTEGER,
    is_verified BOOLEAN,
    is_host BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER;
    review_bonus INTEGER;
    completion_bonus INTEGER;
    verification_bonus INTEGER;
    host_bonus INTEGER;
    final_score INTEGER;
BEGIN
    -- Base score from rating (0-50 points)
    base_score := ROUND(user_rating * 10);
    
    -- Review count bonus (0-20 points)
    IF total_reviews >= 50 THEN
        review_bonus := 20;
    ELSIF total_reviews >= 20 THEN
        review_bonus := 15;
    ELSIF total_reviews >= 10 THEN
        review_bonus := 10;
    ELSIF total_reviews >= 5 THEN
        review_bonus := 5;
    ELSE
        review_bonus := 0;
    END IF;
    
    -- Profile completion bonus (0-15 points)
    completion_bonus := ROUND(profile_completion_percentage * 0.15);
    
    -- Verification bonus (0-10 points)
    IF is_verified THEN
        verification_bonus := 10;
    ELSE
        verification_bonus := 0;
    END IF;
    
    -- Host bonus (0-5 points)
    IF is_host THEN
        host_bonus := 5;
    ELSE
        host_bonus := 0;
    END IF;
    
    -- Calculate final score (max 100)
    final_score := base_score + review_bonus + completion_bonus + verification_bonus + host_bonus;
    
    -- Ensure score is between 0 and 100
    RETURN GREATEST(0, LEAST(100, final_score));
END;
$$ LANGUAGE plpgsql;

-- 7. Add community_trust_score column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS community_trust_score INTEGER DEFAULT 0;

-- 8. Create function to update community trust score
CREATE OR REPLACE FUNCTION update_community_trust_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    user_data RECORD;
    trust_score INTEGER;
BEGIN
    -- Get user data
    SELECT 
        rating,
        total_reviews,
        profile_completion_percentage,
        is_verified,
        is_host
    INTO user_data
    FROM user_profiles
    WHERE id = user_id;
    
    -- Calculate trust score
    trust_score := calculate_community_trust_score(
        user_data.rating,
        user_data.total_reviews,
        user_data.profile_completion_percentage,
        user_data.is_verified,
        user_data.is_host
    );
    
    -- Update the user's trust score
    UPDATE user_profiles
    SET community_trust_score = trust_score
    WHERE id = user_id;
    
    RETURN trust_score;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to update community trust score when relevant fields change
CREATE OR REPLACE FUNCTION trigger_update_community_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Update community trust score when rating, reviews, completion, verification, or host status changes
    IF (NEW.rating IS DISTINCT FROM OLD.rating) OR
       (NEW.total_reviews IS DISTINCT FROM OLD.total_reviews) OR
       (NEW.profile_completion_percentage IS DISTINCT FROM OLD.profile_completion_percentage) OR
       (NEW.is_verified IS DISTINCT FROM OLD.is_verified) OR
       (NEW.is_host IS DISTINCT FROM OLD.is_host) THEN
        
        NEW.community_trust_score := update_community_trust_score(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_community_trust_score ON user_profiles;

CREATE TRIGGER trigger_update_community_trust_score
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_community_trust_score();

-- 10. Update existing users with community trust scores
UPDATE user_profiles 
SET community_trust_score = update_community_trust_score(id)
WHERE community_trust_score = 0 OR community_trust_score IS NULL;

-- 11. Create function to get user reviews with reviewer information
CREATE OR REPLACE FUNCTION get_user_reviews(target_user_id UUID, current_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    review_id UUID,
    reviewer_id UUID,
    reviewer_name TEXT,
    reviewer_avatar TEXT,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    can_delete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as review_id,
        r.reviewer_id,
        up.full_name as reviewer_name,
        up.avatar as reviewer_avatar,
        r.rating,
        r.comment,
        r.created_at,
        (r.reviewer_id = current_user_id) as can_delete
    FROM reviews r
    JOIN user_profiles up ON r.reviewer_id = up.id
    WHERE r.reviewed_id = target_user_id
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. Verify the setup
SELECT 
    'Reviews system setup complete' as status,
    COUNT(*) as total_reviews,
    COUNT(DISTINCT reviewed_id) as users_with_reviews,
    AVG(rating) as average_rating
FROM reviews; 