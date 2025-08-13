import { useMemo } from 'react';

interface SafeUser {
  id: string;
  username: string;
  avatar: string;
  [key: string]: any;
}

interface SafePost {
  id: string;
  user: SafeUser;
  content: string;
  [key: string]: any;
}

interface SafeReel {
  id: string;
  user: SafeUser;
  [key: string]: any;
}

interface SafeStory {
  id: string;
  user: SafeUser;
  [key: string]: any;
}

/**
 * useSafeData - A hook that ensures data objects have required properties
 * This prevents null reference errors by providing safe defaults
 */
export function useSafeData() {
  const createSafeUser = useMemo(() => (user: any): SafeUser | null => {
    if (!user) return null;
    
    return {
      id: user.id || 'unknown',
      username: user.username || 'Unknown User',
      avatar: user.avatar || 'https://via.placeholder.com/150',
      ...user
    };
  }, []);

  const createSafePost = useMemo(() => (post: any): SafePost | null => {
    if (!post) return null;
    
    const safeUser = createSafeUser(post.user);
    if (!safeUser) return null;
    
    return {
      id: post.id || 'unknown',
      user: safeUser,
      content: post.content || '',
      timestamp: post.timestamp || 'Just now',
      likes: post.likes || 0,
      comments: post.comments || 0,
      isLiked: post.isLiked || false,
      ...post
    };
  }, [createSafeUser]);

  const createSafeReel = useMemo(() => (reel: any): SafeReel | null => {
    if (!reel) return null;
    
    const safeUser = createSafeUser(reel.user);
    if (!safeUser) return null;
    
    return {
      id: reel.id || 'unknown',
      user: safeUser,
      mediaUrl: reel.mediaUrl || '',
      timestamp: reel.timestamp || 'Just now',
      ...reel
    };
  }, [createSafeUser]);

  const createSafeStory = useMemo(() => (story: any): SafeStory | null => {
    if (!story) return null;
    
    const safeUser = createSafeUser(story.user);
    if (!safeUser) return null;
    
    return {
      id: story.id || 'unknown',
      user: safeUser,
      expiresAt: story.expiresAt || '24h',
      ...story
    };
  }, [createSafeUser]);

  const validateUserArray = useMemo(() => (users: any[]): SafeUser[] => {
    if (!Array.isArray(users)) return [];
    
    return users
      .map(createSafeUser)
      .filter((user): user is SafeUser => user !== null);
  }, [createSafeUser]);

  const validatePostArray = useMemo(() => (posts: any[]): SafePost[] => {
    if (!Array.isArray(posts)) return [];
    
    return posts
      .map(createSafePost)
      .filter((post): post is SafePost => post !== null);
  }, [createSafePost]);

  const validateReelArray = useMemo(() => (reels: any[]): SafeReel[] => {
    if (!Array.isArray(reels)) return [];
    
    return reels
      .map(createSafeReel)
      .filter((reel): reel is SafeReel => reel !== null);
  }, [createSafeReel]);

  const validateStoryArray = useMemo(() => (stories: any[]): SafeStory[] => {
    if (!Array.isArray(stories)) return [];
    
    return stories
      .map(createSafeStory)
      .filter((story): story is SafeStory => story !== null);
  }, [createSafeStory]);

  return {
    createSafeUser,
    createSafePost,
    createSafeReel,
    createSafeStory,
    validateUserArray,
    validatePostArray,
    validateReelArray,
    validateStoryArray
  };
}

export type { SafeUser, SafePost, SafeReel, SafeStory };

