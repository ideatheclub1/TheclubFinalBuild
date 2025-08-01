import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Comment, CommentState, CommentContextType } from '../types/comments';
import { mockUsers } from '../data/mockData';

const STORAGE_KEY = '@comments_storage';

type CommentAction =
  | { type: 'SET_COMMENTS'; payload: { [postId: string]: Comment[] } }
  | { type: 'ADD_COMMENT'; payload: { postId: string; comment: Comment } }
  | { type: 'LIKE_COMMENT'; payload: { postId: string; commentId: string } }
  | { type: 'DELETE_COMMENT'; payload: { postId: string; commentId: string } }
  | { type: 'EDIT_COMMENT'; payload: { postId: string; commentId: string; content: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: CommentState = {
  comments: {},
  loading: false,
  error: null,
};

const commentReducer = (state: CommentState, action: CommentAction): CommentState => {
  switch (action.type) {
    case 'SET_COMMENTS':
      return { ...state, comments: action.payload };
    
    case 'ADD_COMMENT':
      const { postId, comment } = action.payload;
      const existingComments = state.comments[postId] || [];
      
      if (comment.parentId) {
        // Add as reply
        const updatedComments = existingComments.map(c => {
          if (c.id === comment.parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), comment]
            };
          }
          return c;
        });
        return {
          ...state,
          comments: {
            ...state.comments,
            [postId]: updatedComments
          }
        };
      } else {
        // Add as top-level comment
        return {
          ...state,
          comments: {
            ...state.comments,
            [postId]: [comment, ...existingComments]
          }
        };
      }
    
    case 'LIKE_COMMENT':
      const { commentId } = action.payload;
      const postComments = state.comments[action.payload.postId] || [];
      
      const updateCommentLike = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentLike(comment.replies)
            };
          }
          return comment;
        });
      };
      
      return {
        ...state,
        comments: {
          ...state.comments,
          [action.payload.postId]: updateCommentLike(postComments)
        }
      };
    
    case 'DELETE_COMMENT':
      const deleteComment = (comments: Comment[]): Comment[] => {
        return comments.filter(comment => {
          if (comment.id === action.payload.commentId) {
            return false;
          }
          if (comment.replies) {
            comment.replies = deleteComment(comment.replies);
          }
          return true;
        });
      };
      
      return {
        ...state,
        comments: {
          ...state.comments,
          [action.payload.postId]: deleteComment(state.comments[action.payload.postId] || [])
        }
      };
    
    case 'EDIT_COMMENT':
      const editComment = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === action.payload.commentId) {
            return {
              ...comment,
              content: action.payload.content,
              isEdited: true,
              editedAt: new Date().toISOString()
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: editComment(comment.replies)
            };
          }
          return comment;
        });
      };
      
      return {
        ...state,
        comments: {
          ...state.comments,
          [action.payload.postId]: editComment(state.comments[action.payload.postId] || [])
        }
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
};

const CommentContext = createContext<CommentContextType | undefined>(undefined);

// Mock initial comments
const mockComments: { [postId: string]: Comment[] } = {
  '1': [
    {
      id: 'c1',
      postId: '1',
      postType: 'feed',
      userId: '2',
      user: mockUsers[1],
      content: 'This is absolutely stunning! 🔥',
      likes: 12,
      isLiked: false,
      timestamp: '2h ago',
      replies: [
        {
          id: 'c1-r1',
          postId: '1',
          postType: 'feed',
          userId: '1',
          user: mockUsers[0],
          content: 'Thank you so much! 💜',
          likes: 5,
          isLiked: false,
          timestamp: '2h ago',
          parentId: 'c1'
        }
      ]
    },
    {
      id: 'c2',
      postId: '1',
      postType: 'feed',
      userId: '3',
      user: mockUsers[2],
      content: 'Amazing work! Keep it up ✨',
      likes: 8,
      isLiked: true,
      timestamp: '1h ago'
    }
  ],
  '2': [
    {
      id: 'c3',
      postId: '2',
      postType: 'feed',
      userId: '4',
      user: mockUsers[3],
      content: 'Love the colors! 🎨',
      likes: 15,
      isLiked: false,
      timestamp: '3h ago'
    }
  ]
};

export const CommentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(commentReducer, initialState);

  // Load comments from storage on mount
  useEffect(() => {
    loadComments();
  }, []);

  // Save comments to storage whenever they change
  useEffect(() => {
    saveComments();
  }, [state.comments]);

  const loadComments = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const storedComments = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (storedComments && storedComments !== 'null' && storedComments !== 'undefined') {
        try {
          const parsedComments = JSON.parse(storedComments);
          // Validate the parsed data structure
          if (parsedComments && typeof parsedComments === 'object') {
            dispatch({ type: 'SET_COMMENTS', payload: parsedComments });
            return;
          } else {
            // Invalid data structure, use mock data
            try {
            await AsyncStorage.removeItem(STORAGE_KEY); // Clear invalid data
            } catch (clearError) {
              console.error('Error clearing invalid comments:', clearError);
            }
            dispatch({ type: 'SET_COMMENTS', payload: mockComments });
          }
        } catch (parseError) {
          console.error('Error parsing comments:', parseError);
          // Clear corrupt data to prevent future crashes
          try {
          await AsyncStorage.removeItem(STORAGE_KEY); // Clear corrupt data
          } catch (clearError) {
            console.error('Error clearing corrupt comments:', clearError);
          }
          dispatch({ type: 'SET_COMMENTS', payload: mockComments });
        }
      } else {
        // Initialize with mock data if no stored comments
        dispatch({ type: 'SET_COMMENTS', payload: mockComments });
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load comments' });
      // Fallback to mock data
      dispatch({ type: 'SET_COMMENTS', payload: mockComments });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveComments = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.comments));
    } catch (error) {
      console.error('Error saving comments:', error);
      // Don't throw error, just log it
    }
  };

  const addComment = async (postId: string, postType: 'feed' | 'reel', content: string, parentId?: string) => {
    try {
      // Use the first mock user as fallback
      const currentUser = mockUsers[0];
      if (!currentUser || !content?.trim()) {
        return;
      }

      const newComment: Comment = {
        id: `c${Date.now()}`,
        postId,
        postType,
        userId: currentUser.id,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar
        },
        content: content.trim(),
        likes: 0,
        isLiked: false,
        timestamp: 'now',
        parentId
      };

      dispatch({ type: 'ADD_COMMENT', payload: { postId, comment: newComment } });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error adding comment:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add comment' });
    }
  };

  const likeComment = async (postId: string, commentId: string) => {
    try {
      dispatch({ type: 'LIKE_COMMENT', payload: { postId, commentId } });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error liking comment:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to like comment' });
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    try {
      dispatch({ type: 'DELETE_COMMENT', payload: { postId, commentId } });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error deleting comment:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete comment' });
    }
  };

  const editComment = async (postId: string, commentId: string, newContent: string) => {
    try {
      dispatch({ type: 'EDIT_COMMENT', payload: { postId, commentId, content: newContent.trim() } });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error editing comment:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to edit comment' });
    }
  };

  const getComments = (postId: string): Comment[] => {
    return state.comments[postId] || [];
  };

  const getCommentCount = (postId: string): number => {
    const comments = state.comments[postId] || [];
    let count = comments.length;
    
    // Count replies
    comments.forEach(comment => {
      if (comment.replies) {
        count += comment.replies.length;
      }
    });
    
    return count;
  };

  const value: CommentContextType = {
    comments: state.comments,
    addComment,
    likeComment,
    deleteComment,
    editComment,
    getComments,
    getCommentCount,
    loading: state.loading,
    error: state.error,
  };

  return (
    <CommentContext.Provider value={value}>
      {children}
    </CommentContext.Provider>
  );
};

export const useComments = (): CommentContextType => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentProvider');
  }
  return context;
};