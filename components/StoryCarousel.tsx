import React from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  withSequence,
  FadeInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Story, User } from '../types';
import { useUser } from '@/contexts/UserContext';

const { width } = Dimensions.get('window');
interface StoryCarouselProps {
  stories: Story[];
  onAddStory: () => void;
  onStoryPress: (story: Story) => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function StoryCarousel({
  stories,
  onAddStory,
  onStoryPress,
}: StoryCarouselProps) {
  const router = useRouter();
  const { user: currentUser } = useUser();

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

  // Don't render if no current user
  if (!currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading stories...</Text>
        </View>
      </View>
    );
  }

  const StoryItem = ({ story, isAddStory = false, index = 0 }: { story?: Story; isAddStory?: boolean; index?: number }) => {
    const scale = useSharedValue(1);
    const ringGlow = useSharedValue(0);
    const pulseAnimation = useSharedValue(1);

    React.useEffect(() => {
      if (!isAddStory) {
        ringGlow.value = withRepeat(
          withTiming(1, { duration: 4000 }),
          -1,
          true
        );
      } else {
        // Subtle pulse for "Your Story"
        pulseAnimation.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 2000 }),
            withTiming(1, { duration: 2000 })
          ),
          -1,
          true
        );
      }
    }, [isAddStory]);

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
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error('Haptics error:', error);
      }
      if (isAddStory) {
        onAddStory();
      } else if (story) {
        onStoryPress(story);
      }
    };

    const storyAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const ringAnimatedStyle = useAnimatedStyle(() => ({
      shadowOpacity: isAddStory ? 0.4 : interpolate(ringGlow.value, [0, 1], [0.5, 0.9]),
      shadowRadius: isAddStory ? 10 : interpolate(ringGlow.value, [0, 1], [10, 20]),
      transform: isAddStory ? [{ scale: pulseAnimation.value }] : [],
    }));

    if (isAddStory) {
      return (
        <AnimatedTouchableOpacity
          style={[styles.storyContainer, storyAnimatedStyle]} 
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          entering={FadeInRight.delay(index * 100).springify()}
        >
          <Animated.View style={[styles.addStoryBorder, ringAnimatedStyle]}>
            <View style={styles.addStoryImageContainer}>
              <Image
                source={{ 
                  uri: currentUser?.avatar ?? 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' 
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
          </Animated.View>
          <Text style={styles.storyUsername}>Add Story</Text>
        </AnimatedTouchableOpacity>
      );
    }

    if (!story || !story.user) {
      return null;
    }

    return (
      <AnimatedTouchableOpacity
        style={[styles.storyContainer, storyAnimatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Animated.View style={[styles.storyBorder, ringAnimatedStyle]}>
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
            </View>
          </LinearGradient>
        </Animated.View>
        <TouchableOpacity onPress={() => handleUserPress(story?.user?.id || '')}>
          <Text style={styles.storyUsername} numberOfLines={1}>
            {story?.user?.username ?? 'Guest'}
          </Text>
        </TouchableOpacity>
      </AnimatedTouchableOpacity>
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
        {/* Add Story Button */}
        <StoryItem isAddStory />

        {/* Stories */}
        {stories?.filter(story => story && story.user).map((story, index) => (
          <StoryItem key={story?.id || Math.random().toString()} story={story} index={index} />
        ))}
        
        {/* Spacer for half-visible next item */}
        <View style={styles.spacer} />
      </ScrollView>
      
      {/* Bottom divider */}
      <Animated.View 
        style={styles.bottomDivider}
        entering={FadeInRight.delay(500)}
      />
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
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
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
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  storyGradientBorder: {
    padding: 4,
    borderRadius: 39,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
});