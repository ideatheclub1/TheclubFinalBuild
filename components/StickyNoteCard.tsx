import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
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
const cardWidth = width * 0.65;

interface Note {
  id: string;
  title: string;
  smallImage: string;
  fullImage: string;
  createdAt: string;
  type: 'sticky' | 'currency';
  amount?: number;
}

interface StickyNoteCardProps {
  note: Note;
  onImagePress: (note: Note) => void;
  index: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Vintage paper colors
const vintagePaperColors = [
  '#F7F3E9', // Aged white
  '#F5F0E1', // Cream
  '#F2EDD7', // Antique white
  '#F0EBD8', // Parchment
  '#EDE6D6', // Old paper
];

export default function StickyNoteCard({ note, onImagePress, index }: StickyNoteCardProps) {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
  });

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const fold = useSharedValue(0);

  // Generate random rotation and color for realistic effect
  const baseRotation = (index % 2 === 0 ? 1 : -1) * (Math.random() * 6 + 2);
  const paperColor = vintagePaperColors[index % vintagePaperColors.length];

  React.useEffect(() => {
    rotation.value = withSpring(baseRotation, { damping: 20 });
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.96);
    fold.value = withSpring(0.3);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    fold.value = withSpring(0);
  };

  const handleImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onImagePress(note);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
        { perspective: 1000 },
        { rotateX: `${fold.value * 5}deg` },
      ],
    };
  });

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(scale.value, [0.96, 1], [0.3, 0.6]),
      shadowRadius: interpolate(scale.value, [0.96, 1], [12, 20]),
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
      <View style={[styles.card, { backgroundColor: paperColor }]}>
        {/* Torn edges effect */}
        <View style={styles.tornEdges}>
          <View style={[styles.tornEdge, styles.topLeft]} />
          <View style={[styles.tornEdge, styles.topRight]} />
          <View style={[styles.tornEdge, styles.bottomLeft]} />
          <View style={[styles.tornEdge, styles.bottomRight]} />
        </View>
        
        {/* Realistic pin */}
        <View style={styles.pin}>
          <View style={styles.pinHead} />
          <View style={styles.pinShaft} />
        </View>
        
        {/* Vintage ruled lines */}
        <View style={styles.ruledLines}>
          {[...Array(10)].map((_, i) => (
            <View key={i} style={styles.ruledLine} />
          ))}
        </View>
        
        {/* Stain effects */}
        <View style={styles.stains}>
          <View style={[styles.stain, styles.stain1]} />
          <View style={[styles.stain, styles.stain2]} />
        </View>
        
        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.title, { fontFamily: 'PatrickHand_400Regular' }]} numberOfLines={3}>
            {note.title}
          </Text>
          
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handleImagePress}
          >
            <Image
              source={{ uri: note.smallImage }}
              style={styles.smallImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Text style={[styles.tapText, { fontFamily: 'PatrickHand_400Regular' }]}>
                tap to view
              </Text>
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.date, { fontFamily: 'PatrickHand_400Regular' }]}>
            {note.createdAt}
          </Text>
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: cardWidth,
    marginHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    borderRadius: 8,
    padding: 20,
    minHeight: 260,
    position: 'relative',
  },
  tornEdges: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tornEdge: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 69, 19, 0.15)',
    borderRadius: 2,
  },
  topLeft: {
    top: 0,
    left: 0,
    width: 20,
    height: 3,
    transform: [{ rotate: '45deg' }],
  },
  topRight: {
    top: 2,
    right: 5,
    width: 15,
    height: 2,
    transform: [{ rotate: '-30deg' }],
  },
  bottomLeft: {
    bottom: 5,
    left: 3,
    width: 18,
    height: 2,
    transform: [{ rotate: '20deg' }],
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    width: 22,
    height: 3,
    transform: [{ rotate: '-45deg' }],
  },
  pin: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -6,
    alignItems: 'center',
  },
  pinHead: {
    width: 12,
    height: 12,
    backgroundColor: '#DC2626',
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  pinShaft: {
    width: 2,
    height: 8,
    backgroundColor: '#B91C1C',
    marginTop: -2,
    borderRadius: 1,
  },
  ruledLines: {
    position: 'absolute',
    top: 35,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  ruledLine: {
    height: 1,
    backgroundColor: '#B0BEC5',
    marginVertical: 16,
    opacity: 0.3,
  },
  stains: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stain: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 69, 19, 0.08)',
    borderRadius: 10,
  },
  stain1: {
    top: 40,
    right: 20,
    width: 15,
    height: 12,
  },
  stain2: {
    bottom: 30,
    left: 15,
    width: 20,
    height: 8,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    transform: [{ rotate: '0.5deg' }],
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  smallImage: {
    width: 85,
    height: 85,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2D3748',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingVertical: 3,
  },
  tapText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'normal',
  },
  date: {
    fontSize: 14,
    color: '#555555',
    fontWeight: 'normal',
    transform: [{ rotate: '-0.5deg' }],
  },
});