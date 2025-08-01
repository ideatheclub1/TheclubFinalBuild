import { User } from '../types';

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
}

// Mock users for reels
const reelsUsers: User[] = [
  {
    id: '1',
    username: 'luna_mystic',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Exploring the mysteries of the night ✨',
    location: 'Los Angeles, CA',
    age: 24,
    isHost: true,
    hourlyRate: 200,
    totalChats: 156,
    responseTime: '5 min',
    isFollowing: false,
  },
  {
    id: '2',
    username: 'neon_dreamer',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Digital artist & night owl 🌙',
    location: 'San Francisco, CA',
    age: 28,
    isHost: false,
    totalChats: 89,
    responseTime: '10 min',
    isFollowing: false,
  },
  {
    id: '3',
    username: 'purple_vibes',
    avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Living in purple dreams 💜',
    location: 'New York, NY',
    age: 26,
    isHost: true,
    hourlyRate: 150,
    totalChats: 234,
    responseTime: '3 min',
    isFollowing: true,
  },
  {
    id: '4',
    username: 'cosmic_soul',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Stargazer and soul searcher 🌟',
    location: 'Chicago, IL',
    age: 30,
    isHost: false,
    totalChats: 67,
    responseTime: '15 min',
    isFollowing: false,
  },
  {
    id: '5',
    username: 'cyber_punk',
    avatar: 'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Future is now 🚀',
    location: 'Seattle, WA',
    age: 32,
    isHost: true,
    hourlyRate: 300,
    totalChats: 445,
    responseTime: '2 min',
    isFollowing: false,
  },
];

export const mockReels: Reel[] = [
  {
    id: '1',
    user: reelsUsers[0],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    caption: 'Exploring the mysteries of the night ✨ Nothing beats a midnight adventure in the city!',
    hashtags: ['#nightlife', '#mystery', '#adventure', '#cityvibes'],
    likes: 2847,
    comments: 156,
    shares: 89,
    isLiked: false,
    isSaved: false,
    duration: 15,
    musicInfo: {
      title: 'Midnight Dreams',
      artist: 'Cosmic Beats',
      coverUrl: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    timestamp: '2h ago',
  },
  {
    id: '2',
    user: reelsUsers[1],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    caption: 'Digital art creation process 🎨 Watch how I bring neon dreams to life!',
    hashtags: ['#digitalart', '#neon', '#creative', '#process'],
    likes: 1932,
    comments: 89,
    shares: 45,
    isLiked: true,
    isSaved: false,
    duration: 20,
    musicInfo: {
      title: 'Electronic Vibes',
      artist: 'Synth Master',
      coverUrl: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    timestamp: '4h ago',
  },
  {
    id: '3',
    user: reelsUsers[2],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    caption: 'Purple aesthetic vibes 💜 Living my best life in this dreamy space!',
    hashtags: ['#purple', '#aesthetic', '#vibes', '#dreamy'],
    likes: 3456,
    comments: 234,
    shares: 123,
    isLiked: false,
    isSaved: true,
    duration: 18,
    musicInfo: {
      title: 'Purple Rain',
      artist: 'Dream Pop',
      coverUrl: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    timestamp: '6h ago',
  },
  {
    id: '4',
    user: reelsUsers[3],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    caption: 'Stargazing session 🌟 The universe always has something beautiful to show us',
    hashtags: ['#stargazing', '#universe', '#peace', '#nature'],
    likes: 1789,
    comments: 67,
    shares: 34,
    isLiked: true,
    isSaved: false,
    duration: 25,
    musicInfo: {
      title: 'Cosmic Journey',
      artist: 'Space Sounds',
      coverUrl: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    timestamp: '8h ago',
  },
  {
    id: '5',
    user: reelsUsers[4],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    caption: 'Cyberpunk tech setup 🚀 The future is now and it looks amazing!',
    hashtags: ['#cyberpunk', '#tech', '#future', '#gaming'],
    likes: 2654,
    comments: 445,
    shares: 167,
    isLiked: false,
    isSaved: true,
    duration: 22,
    musicInfo: {
      title: 'Cyber Dreams',
      artist: 'Neon Nights',
      coverUrl: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    timestamp: '12h ago',
  },
  {
    id: '6',
    user: reelsUsers[1],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    caption: 'Late night creative flow 🌙 When inspiration strikes at 3 AM',
    hashtags: ['#latenight', '#creative', '#flow', '#inspiration'],
    likes: 1543,
    comments: 78,
    shares: 23,
    isLiked: true,
    isSaved: false,
    duration: 16,
    musicInfo: {
      title: 'Night Vibes',
      artist: 'Ambient Dreams',
      coverUrl: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150',
    },
    timestamp: '1d ago',
  },
];