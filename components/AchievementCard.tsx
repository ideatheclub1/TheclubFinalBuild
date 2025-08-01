import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.7;

interface Achievement {
  id: string;
  title: string;
  smallImage: string;
  fullImage: string;
  createdAt: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  onImagePress: (achievement: Achievement) => void;
  index: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function AchievementCard({ achievement, onImagePress, index }: AchievementCardProps) {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
  });

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Generate random rotation for sticky note effect
  const baseRotation = (index % 2 === 0 ? 1 : -1) * (Math.random() * 4 + 2);

  React.useEffect(() => {
    rotation.value = withSpring(baseRotation, { damping: 20 });
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onImagePress(achievement);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(scale.value, [0.95, 1], [0.15, 0.25]),
      shadowRadius: interpolate(scale.value, [0.95, 1], [8, 12]),
    };
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AnimatedTouchableOpacity
      style={[styles.cardContainer, cardAnimatedStyle, shadowAnimatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <View style={styles.card}>
        {/* Pin effect */}
        <View style={styles.pin} />
        
        {/* Ruled lines background */}
        <View style={styles.ruledLines}>
          {[...Array(8)].map((_, i) => (
            <View key={i} style={styles.ruledLine} />
          ))}
        </View>
        
        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.title, { fontFamily: 'PatrickHand_400Regular' }]} numberOfLines={3}>
            {achievement.title}
          </Text>
          
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handleImagePress}
          >
            <Image
              source={{ uri: achievement.smallImage }}
              style={styles.smallImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.tapText}>tap to view</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.date, { fontFamily: 'PatrickHand_400Regular' }]}>
            {achievement.createdAt}
          </Text>
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: cardWidth,
    marginHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    backgroundColor: '#FFF5B7',
    borderRadius: 8,
    padding: 16,
    minHeight: 220,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  pin: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  ruledLines: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  ruledLine: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  smallImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2D3748',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingVertical: 2,
  },
  tapText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#666666',
    fontWeight: 'normal',
  },
});