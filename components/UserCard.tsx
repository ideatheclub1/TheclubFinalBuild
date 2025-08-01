import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { UserPlus, UserCheck, Crown, DollarSign } from 'lucide-react-native';
import { User } from '../types';

interface UserCardProps {
  user: User;
  onFollow: (userId: string) => void;
  onPress: (user: User) => void;
}

export default function UserCard({ user, onFollow, onPress }: UserCardProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = React.useState(user.isFollowing || false);

  // Don't render if no user data
  if (!user) {
    return null;
  }

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow(user.id);
  };

  const handleUserPress = () => {
    if (!user?.id) return;
    
    if (user.id === '1') {
      Alert.alert(
        'Your Profile',
        'You are viewing your own profile. To make changes, go to your settings.',
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Go to Profile', 
            onPress: () => router.push('/(tabs)/profile')
          }
        ]
      );
      return;
    }
    router.push({
      pathname: '/ProfileScreen',
      params: { userId: user.id }
    });
  };

  return (
    <TouchableOpacity onPress={handleUserPress}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
        style={styles.container}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ 
              uri: user?.avatar ?? 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
            }} 
            style={styles.avatar} 
          />
          {user?.isHost && (
            <View style={styles.hostBadge}>
              <Crown size={12} color="#ffd700" />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user?.username ?? 'Guest'}</Text>
          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          {user?.isHost && user?.hourlyRate && (
            <View style={styles.rateContainer}>
              <DollarSign size={14} color="#ffd700" />
              <Text style={styles.rateText}>${user?.hourlyRate ?? 0}/hr</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollow}
        >
          {isFollowing ? (
            <UserCheck size={20} color="#ffffff" />
          ) : (
            <UserPlus size={20} color="#c77dff" />
          )}
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9B61E5',
    backgroundColor: '#121212',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  hostBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#121212',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#A0A0A0',
    opacity: 0.8,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rateText: {
    fontSize: 12,
    color: '#ffd700',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  followButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9B61E5',
  },
  followingButton: {
    backgroundColor: '#9B61E5',
    borderColor: '#9B61E5',
  },
});