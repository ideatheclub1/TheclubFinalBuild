export interface Comment {
  id: string;
  postId: string;
  postType: 'feed' | 'reel';
  userId: string;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  content: string;
  likes: number;
  isLiked: boolean;
  timestamp: string;
  parentId?: string; // For replies
  replies?: Comment[];
  isEdited?: boolean;
  editedAt?: string;
}

export interface CommentState {
  comments: { [postId: string]: Comment[] };
  loading: boolean;
  error: string | null;
}

export interface CommentContextType {
  comments: { [postId: string]: Comment[] };
  addComment: (postId: string, postType: 'feed' | 'reel', content: string, parentId?: string) => Promise<void>;
  likeComment: (postId: string, commentId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, newContent: string) => Promise<void>;
  getComments: (postId: string) => Comment[];
  getCommentCount: (postId: string) => number;
  loading: boolean;
  error: string | null;
}