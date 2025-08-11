export interface User {
  id: string;
  username: string;
  avatar: string;
  bio?: string;
  location?: string;
  age?: number;
  isFollowing?: boolean;
  isHost?: boolean;
  hourlyRate?: number;
  totalChats?: number;
  responseTime?: string;
  // Additional fields from database
  fullName?: string;
  handle?: string;
  profilePicture?: string;
  gender?: string;
  dateOfBirth?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  rating?: number;
  totalReviews?: number;
  faceData?: string;
  createdAt?: string;
  updatedAt?: string;
  // TODO: Add follower/following counts when server supports them
  followersCount?: string | number;
  followingCount?: string | number;
  // Profile completion fields for better match finding
  interests?: string[];
  expertise?: string[];
  relationshipGoals?: string[];
  lookingFor?: string;
  agePreferenceMin?: number;
  agePreferenceMax?: number;
  distancePreference?: number;
  profileCompletionPercentage?: number;
  lastProfileUpdate?: string;
  // Location coordinates for nearby people calculation
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string;
  // Distance from current user (for nearby people)
  distanceKm?: number;
  // Community trust score
  communityTrustScore?: number;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isTrending: boolean;
  timestamp: string;
  // Additional fields from database
  imageUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  hashtags?: string[];
}

export interface Story {
  id: string;
  user: User;
  image: string;
  expiresAt: string;
  // Additional fields from database
  imageUrl?: string;
  createdAt?: string;
}

export interface Reel {
  id: string;
  user: User;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  duration: number;
  musicInfo?: {
    title: string;
    artist: string;
    coverUrl: string;
  };
  timestamp: string;
  // Additional fields from database
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  musicTitle?: string;
  musicArtist?: string;
  musicCoverUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  // Additional fields from database
  conversationId?: string;
  isRead?: boolean;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  // Additional fields from database
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user?: User;
  content: string;
  parentId?: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Like {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  reelId?: string;
  createdAt?: string;
}

export interface Hashtag {
  id: string;
  name: string;
  postCount: number;
  createdAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt?: string;
}

export interface Booking {
  id: string;
  hostId: string;
  clientId: string;
  startTime: string;
  endTime: string;
  status: string;
  amount: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewedId: string;
  bookingId?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface HostProfile {
  id: string;
  userId: string;
  description?: string;
  relationshipRoles?: string[];
  interests?: string[];
  expertise?: string[];
  priceCategory: string;
  isApproved: boolean;
  approvalDate?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}