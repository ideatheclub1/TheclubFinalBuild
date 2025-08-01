import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Story } from '../types';

interface StoryCardProps {
  story: Story;
  onPress: (story: Story) => void;
}

export default function StoryCard({ story, onPress }: StoryCardProps) {
  const glowAnimation = useSharedValue(0);

  React.useEffect(() => {
    glowAnimation.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(glowAnimation.value, [0, 1], [0.3, 0.7]),
      shadowRadius: interpolate(glowAnimation.value, [0, 1], [5, 15]),
    };
  });

  return (
    <TouchableOpacity onPress={() => onPress(story)}>
      <Animated.View style={[styles.container, glowStyle]}>
        <LinearGradient
          colors={['#e0aaff', '#c77dff', '#9d4edd']}
          style={styles.border}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: story.user.avatar }} style={styles.avatar} />
          </View>
        </LinearGradient>
        <Text style={styles.username}>{story.user.username}</Text>
        <Text style={styles.expiresAt}>{story.expiresAt}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  border: {
    padding: 3,
    borderRadius: 35,
    marginBottom: 8,
  },
  imageContainer: {
    backgroundColor: '#1a0a2e',
    borderRadius: 32,
    padding: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  username: {
    fontSize: 12,
    color: '#e0aaff',
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 70,
  },
  expiresAt: {
    fontSize: 10,
    color: '#a855f7',
    opacity: 0.8,
  },
});