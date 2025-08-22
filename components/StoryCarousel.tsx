import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Story, User } from '../types';
import { useUser } from '@/contexts/UserContext';

const { width } = Dimensions.get('window');
interface StoryCarouselProps {
  stories: Story[];
  onAddStory: () => void;
  onStoryPress: (story: Story) => void;
  onMediaCaptured?: (media: { uri: string; type: 'image' | 'video' }) => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function StoryCarousel({
  stories,
  onAddStory,
  onStoryPress,
  onMediaCaptured,
}: StoryCarouselProps) {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [showMediaOptions, setShowMediaOptions] = useState(false);

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userId === currentUser?.id) {
      Alert.alert(
        'Your Profile',
        'You are viewing your own profile. To make changes, go to your settings.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }
    if (!userId) return;
    router.push({
      pathname: '/ProfileScreen',
      params: { userId }
    });
  };

  const handleCameraPress = async () => {
    console.log('📸 Camera button pressed');
    setShowMediaOptions(false);
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    console.log('📸 ImagePicker not working in development, using create page fallback');
    
    // Fallback: Route to create page for story upload
    router.push({
      pathname: '/(tabs)/create',
      params: { mode: 'story' }
    });
  };

  const handleGalleryPress = async () => {
    console.log('📁 Gallery button pressed');
    setShowMediaOptions(false);
    
    try {
      console.log('🔄 Requesting gallery permissions...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Gallery permission result:', permissionResult);
      
      if (permissionResult.granted === false) {
        console.log('❌ Gallery permission denied');
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('📁 ImagePicker not working in development, using create page fallback');
      
      // Fallback: Route to create page for story upload
      router.push({
        pathname: '/(tabs)/create',
        params: { mode: 'story' }
      });
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  // Don't render if no current user
  if (!currentUser) {
    console.log('❌ No current user found in StoryCarousel');
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading stories...</Text>
        </View>
      </View>
    );
  }

  console.log('✅ Current user in StoryCarousel:', currentUser?.id, currentUser?.username);

  const StoryItem = ({ story, isCurrentUser = false, hasStories = false, index = 0, storyCount = 1 }: { story?: Story; isCurrentUser?: boolean; hasStories?: boolean; index?: number; storyCount?: number }) => {
    const scale = useSharedValue(1);

    // Removed glow and pulse animations

    const handlePressIn = () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Haptics error:', error);
      }
      scale.value = withSpring(0.9, { damping: 12 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 12 });
    };

    const handlePress = () => {
      console.log('👆 Main story circle pressed');
      console.log('👆 isCurrentUser:', isCurrentUser, 'hasStories:', hasStories);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error('Haptics error:', error);
      }
      if (isCurrentUser && !hasStories) {
        console.log('👆 Setting showMediaOptions to true from main press');
        setShowMediaOptions(true);
      } else if (story) {
        console.log('👆 Calling onStoryPress for story:', story.id);
        onStoryPress(story);
      }
    };

    const handleAddPress = () => {
      console.log('🔴 Small + button pressed!');
      console.log('🔴 Current showMediaOptions state:', showMediaOptions);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Haptics error:', error);
      }
      setShowMediaOptions(true);
      console.log('🔴 Setting showMediaOptions to true');
    };

    const storyAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // Removed glow animated style

    // Current user's story (with or without stories)
    if (isCurrentUser) {
      const displayUser = story?.user || currentUser;
      return (
        <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
          <AnimatedTouchableOpacity
            style={[styles.storyContainer, storyAnimatedStyle]} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            activeOpacity={1}
          >
          <View style={hasStories ? styles.storyBorder : styles.addStoryBorder}>
            {hasStories ? (
              <LinearGradient
                colors={['#6C5CE7', '#8B5CF6', '#A855F7']}
                style={styles.storyGradientBorder}
              >
                <View style={styles.storyImageContainer}>
                  <Image 
                    source={{ 
                      uri: displayUser?.avatar ?? 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
                    }} 
                    style={styles.storyImage} 
                  />
                  {/* Removed story count badge */}
                  {/* Small plus button for adding more stories */}
                  <TouchableOpacity 
                    style={styles.smallAddButton}
                    onPress={handleAddPress}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    <LinearGradient
                      colors={['#6C5CE7', '#8B5CF6']}
                      style={styles.smallAddButtonGradient}
                    >
                      <Plus size={12} color="#FFFFFF" strokeWidth={3} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.addStoryImageContainer}>
                <Image
                  source={{ 
                    uri: displayUser?.avatar ?? 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
                  }} 
                  style={styles.addStoryImage} 
                />
                <Animated.View style={styles.addButton}>
                  <LinearGradient
                    colors={['#6C5CE7', '#8B5CF6']}
                    style={styles.addButtonGradient}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                  </LinearGradient>
                </Animated.View>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => handleUserPress(displayUser?.id || '')}>
            <Text style={styles.storyUsername} numberOfLines={1}>
              {hasStories ? displayUser?.username : 'Your Story'}
            </Text>
          </TouchableOpacity>
          </AnimatedTouchableOpacity>
        </Animated.View>
      );
    }

    // Other users' stories
    if (!story || !story.user) {
      return null;
    }

    return (
      <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
        <AnimatedTouchableOpacity
          style={[styles.storyContainer, storyAnimatedStyle]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
        >
        <View style={styles.storyBorder}>
          <LinearGradient
            colors={['#6C5CE7', '#8B5CF6', '#A855F7']}
            style={styles.storyGradientBorder}
          >
            <View style={styles.storyImageContainer}>
              <Image 
                source={{ 
                  uri: story?.user?.avatar ?? 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
                }} 
                style={styles.storyImage} 
              />
              {/* Removed story count badge */}
            </View>
          </LinearGradient>
        </View>
        <TouchableOpacity onPress={() => handleUserPress(story?.user?.id || '')}>
          <Text style={styles.storyUsername} numberOfLines={1}>
            {story?.user?.username ?? 'Guest'}
          </Text>
        </TouchableOpacity>
        </AnimatedTouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={styles.container}
      entering={SlideInLeft.duration(800)}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={88}
        decelerationRate="fast"
        snapToAlignment="start"
        bounces={true}
        bouncesZoom={true}
      >
        {/* Group stories by user and show only one per user */}
        {(() => {
          const userStoryMap = new Map<string, Story>();
          const userStoryCountMap = new Map<string, number>();
          const filteredStories = stories?.filter(story => story && story.user) || [];
          
          // Group stories by user ID, keeping the most recent one and counting total stories
          filteredStories.forEach(story => {
            if (story.user?.id) {
              // Count stories per user
              const currentCount = userStoryCountMap.get(story.user.id) || 0;
              userStoryCountMap.set(story.user.id, currentCount + 1);
              
              // Keep the most recent story for display
              const existingStory = userStoryMap.get(story.user.id);
              if (!existingStory || (story.createdAt && existingStory.createdAt && story.createdAt > existingStory.createdAt)) {
                userStoryMap.set(story.user.id, story);
              }
            }
          });
          
          const uniqueUserStories = Array.from(userStoryMap.values());
          const currentUserStory = uniqueUserStories.find(story => story.user?.id === currentUser?.id);
          const currentUserStoryCount = userStoryCountMap.get(currentUser?.id || '') || 0;
          const otherUserStories = uniqueUserStories.filter(story => story.user?.id !== currentUser?.id);
          
          console.log('📊 Story data:', {
            totalStories: filteredStories.length,
            uniqueUsers: uniqueUserStories.length,
            currentUserHasStory: !!currentUserStory,
            currentUserStoryCount
          });
          
          return (
            <>
              {/* Current user's story (always first) */}
              <StoryItem 
                key={`current-user-${currentUser?.id}`}
                story={currentUserStory}
                isCurrentUser={true}
                hasStories={!!currentUserStory}
                index={0}
                storyCount={currentUserStoryCount}
              />
              
              {/* Other users' stories */}
              {otherUserStories.map((story, index) => {
                const userStoryCount = userStoryCountMap.get(story.user?.id || '') || 1;
                return (
                  <StoryItem 
                    key={story?.id || `user-${story.user?.id}`} 
                    story={story} 
                    index={index + 1} 
                    hasStories={true}
                    storyCount={userStoryCount}
                  />
                );
              })}
            </>
          );
        })()}
        
        {/* Spacer for half-visible next item */}
        <View style={styles.spacer} />
      </ScrollView>
      
      {/* Bottom divider */}
      <Animated.View 
        style={styles.bottomDivider}
        entering={FadeInRight.delay(500)}
      />

      {/* Media Options Modal */}
      {console.log('🔍 Modal render - showMediaOptions:', showMediaOptions)}
      <Modal
        visible={showMediaOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Your Story</Text>
              <TouchableOpacity
                onPress={() => setShowMediaOptions(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handleCameraPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6C5CE7', '#8B5CF6']}
                  style={styles.optionGradient}
                >
                  <Camera size={28} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.optionText}>Take Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handleGalleryPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#EC4899', '#F97316']}
                  style={styles.optionGradient}
                >
                  <ImageIcon size={28} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.optionText}>Upload Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    paddingTop: 20,
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyContainer: {
    alignItems: 'center',
    width: 80,
  },
  addStoryBorder: {
    marginBottom: 12,
    // Removed shadow effects
  },
  addStoryImageContainer: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#3A3A3A',
    padding: 3,
  },
  addStoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  addButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  smallAddButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    zIndex: 100,
  },
  smallAddButtonGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E1E1E',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1E1E1E',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  storyBorder: {
    marginBottom: 12,
    // Removed shadow effects
  },
  storyGradientBorder: {
    padding: 4,
    borderRadius: 39,
    // Removed shadow effects
  },
  storyImageContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 35,
    padding: 2,
  },
  storyImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  storyUsername: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 80,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  spacer: {
    width: 40, // Half width to show next item
  },
  bottomDivider: {
    height: 0.5,
    backgroundColor: 'rgba(108, 92, 231, 0.25)',
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.85,
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  // Removed story count badge styles
});