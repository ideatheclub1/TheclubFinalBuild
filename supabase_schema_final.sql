-- Supabase Database Schema Export - FINAL COMPLETE VERSION
-- Generated on: 2025-08-10T20:04:23.553Z
-- Project: https://jbcxrqyzyuhhmolsxtrx.supabase.co
-- 
-- This export combines discovered table structures with existing SQL definitions
-- for a complete representation of your database schema

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

-- Table: posts
CREATE TABLE IF NOT EXISTS "posts" (
  "id" varchar(255),
  "user_id" varchar(255),
  "content" varchar(255),
  "image_url" varchar(255),
  "likes_count" integer,
  "comments_count" integer,
  "is_trending" boolean,
  "created_at" timestamp,
  "updated_at" timestamp
);

-- Table: comments
CREATE TABLE IF NOT EXISTS "comments" (
  "id" varchar(255),
  "post_id" varchar(255),
  "user_id" varchar(255),
  "content" varchar(255),
  "parent_id" text,
  "likes_count" integer,
  "created_at" timestamp,
  "updated_at" timestamp
);

-- Table: likes
CREATE TABLE IF NOT EXISTS "likes" (
  "id" varchar(255),
  "user_id" varchar(255),
  "post_id" varchar(255),
  "comment_id" text,
  "reel_id" text,
  "created_at" timestamp
);

-- Table: followers
CREATE TABLE IF NOT EXISTS "followers" (
  "id" varchar(255),
  "follower_id" varchar(255),
  "following_id" varchar(255),
  "created_at" timestamp
);

-- Table: reels
CREATE TABLE IF NOT EXISTS "reels" (
  "id" varchar(255),
  "user_id" varchar(255),
  "video_url" varchar(255),
  "thumbnail_url" varchar(255),
  "caption" varchar(255),
  "duration" integer,
  "view_count" integer,
  "likes_count" integer,
  "comments_count" integer,
  "shares_count" integer,
  "saves_count" integer,
  "hashtags" jsonb,
  "location" varchar(255),
  "is_public" boolean,
  "is_featured" boolean,
  "status" varchar(255),
  "created_at" timestamp,
  "updated_at" timestamp
);

-- Table: reviews (from existing SQL definition)
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reviewer_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "reviewed_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "booking_id" UUID REFERENCES bookings(id) ON DELETE CASCADE,
  "rating" INTEGER CHECK (rating >= 1 AND rating <= 5),
  "comment" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: stories (from existing SQL definition)
CREATE TABLE IF NOT EXISTS "stories" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "media_url" TEXT NOT NULL,
  "media_type" TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  "caption" TEXT,
  "expires_at" TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: messages (from existing SQL definition)
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversation_id" UUID REFERENCES conversations(id) ON DELETE CASCADE,
  "sender_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "message_type" TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio')),
  "media_url" TEXT,
  "is_read" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: conversations (from existing SQL definition)
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" TEXT,
  "conversation_type" TEXT DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: host_profiles
CREATE TABLE IF NOT EXISTS "host_profiles" (
  "id" varchar(255),
  "user_id" varchar(255),
  "description" varchar(255),
  "relationship_roles" jsonb,
  "interests" jsonb,
  "expertise" jsonb,
  "price_category" varchar(255),
  "is_approved" boolean,
  "approval_date" text,
  "rejection_reason" text,
  "created_at" timestamp,
  "updated_at" timestamp
);

-- =====================================================
-- ADDITIONAL TABLES FROM EXISTING SQL FILES
-- =====================================================

-- Table: user_profiles (referenced in other tables)
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "username" TEXT UNIQUE NOT NULL,
  "handle" TEXT UNIQUE NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "avatar_url" TEXT,
  "bio" TEXT,
  "date_of_birth" DATE,
  "gender" TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  "location" TEXT,
  "latitude" NUMERIC(10, 8),
  "longitude" NUMERIC(11, 8),
  "is_host" BOOLEAN DEFAULT FALSE,
  "is_online" BOOLEAN DEFAULT FALSE,
  "last_seen" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: hashtags
CREATE TABLE IF NOT EXISTS "hashtags" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT UNIQUE NOT NULL,
  "post_count" INTEGER DEFAULT 0,
  "reel_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: post_hashtags
CREATE TABLE IF NOT EXISTS "post_hashtags" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "post_id" UUID REFERENCES posts(id) ON DELETE CASCADE,
  "hashtag_id" UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- Table: reel_hashtags
CREATE TABLE IF NOT EXISTS "reel_hashtags" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "reel_id" UUID REFERENCES reels(id) ON DELETE CASCADE,
  "hashtag_id" UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reel_id, hashtag_id)
);

-- Table: conversation_participants
CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversation_id" UUID REFERENCES conversations(id) ON DELETE CASCADE,
  "user_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "joined_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "left_at" TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "type" TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'message', 'booking', 'review')),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "is_read" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: bookings
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "host_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "guest_id" UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "status" TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  "total_amount" NUMERIC(10, 2) NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_handle ON user_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_host ON user_profiles(is_host);
CREATE INDEX IF NOT EXISTS idx_user_profiles_online ON user_profiles(is_online);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_trending ON posts(is_trending, created_at DESC);

-- Reels indexes
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);

-- Hashtags indexes
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_reel_hashtags_reel_id ON reel_hashtags(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_hashtags_hashtag_id ON reel_hashtags(hashtag_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Followers indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_host_profiles_updated_at BEFORE UPDATE ON host_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reels_updated_at BEFORE UPDATE ON reels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EXPORT SUMMARY
-- =====================================================
-- 
-- Total Tables Found: 10
-- Tables with Data: 5 (posts, comments, likes, followers, reels, host_profiles)
-- Empty Tables: 4 (reviews, stories, messages, conversations)
-- Missing Tables: 3 (profiles, currency_notes, bulletin_board)
-- 
-- This export represents the current state of your Supabase database
-- as discovered through the API and existing SQL definitions.
