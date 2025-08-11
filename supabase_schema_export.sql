-- Supabase Database Schema Export
-- Generated on: 2025-08-10T20:03:32.654Z
-- Project: https://jbcxrqyzyuhhmolsxtrx.supabase.co

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
  "hashtags" text,
  "location" varchar(255),
  "is_public" boolean,
  "is_featured" boolean,
  "status" varchar(255),
  "created_at" timestamp,
  "updated_at" timestamp
);

-- Table: host_profiles
CREATE TABLE IF NOT EXISTS "host_profiles" (
  "id" varchar(255),
  "user_id" varchar(255),
  "description" varchar(255),
  "relationship_roles" text,
  "interests" text,
  "expertise" text,
  "price_category" varchar(255),
  "is_approved" boolean,
  "approval_date" text,
  "rejection_reason" text,
  "created_at" timestamp,
  "updated_at" timestamp
);

