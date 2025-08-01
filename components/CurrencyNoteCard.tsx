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
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DollarSign, Star, Eye } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.8;

interface Note {
  id: string;
  title: string;
  smallImage: string;
  fullImage: string;
  createdAt: string;
  type: 'sticky' | 'currency';
  amount?: number;
}

interface CurrencyNoteCardProps {
  note: Note;
  onImagePress: (note: Note) => void;
  index: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CurrencyNoteCard({ note, onImagePress, index }: CurrencyNoteCardProps) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const crinkle = useSharedValue(0);

  // Generate slight rotation for realistic effect
  const baseRotation = (index % 2 === 0 ? 1 : -1) * (Math.random() * 2 + 0.5);

  React.useEffect(() => {
    rotation.value = withSpring(baseRotation, { damping: 20 });
  }, []);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSpring(0.96);
    crinkle.value = withSpring(0.4);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    crinkle.value = withSpring(0);
  };

  const handleImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onImagePress(note);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
        { perspective: 1200 },
        { rotateX: `${crinkle.value * 2}deg` },
        { rotateY: `${crinkle.value * 1.5}deg` },
      ],
    };
  });

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(scale.value, [0.96, 1], [0.3, 0.6]),
      shadowRadius: interpolate(scale.value, [0.96, 1], [15, 25]),
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
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#388E3C', '#4CAF50']}
        style={styles.dollarBill}
      >
        {/* Aged paper texture overlay */}
        <View style={styles.paperTexture}>
          <View style={[styles.ageSpot, styles.spot1]} />
          <View style={[styles.ageSpot, styles.spot2]} />
          <View style={[styles.ageSpot, styles.spot3]} />
          <View style={[styles.ageSpot, styles.spot4]} />
        </View>
        
        {/* Torn edges effect */}
        <View style={styles.tornEdges}>
          <View style={[styles.tear, styles.topTear]} />
          <View style={[styles.tear, styles.bottomTear]} />
          <View style={[styles.tear, styles.leftTear]} />
          <View style={[styles.tear, styles.rightTear]} />
        </View>
        
        {/* Vintage dollar bill border */}
        <View style={styles.dollarBorder}>
          <View style={styles.outerBorder} />
          <View style={styles.innerBorder} />
          <View style={styles.decorativeBorder} />
        </View>
        
        {/* Dollar bill serial number */}
        <View style={styles.serialSection}>
          <Text style={[styles.serialText, { fontFamily: 'Inter_400Regular' }]}>
            A{note.id}4567890B
          </Text>
        </View>
        
        {/* Federal reserve seal area */}
        <View style={styles.sealArea}>
          <View style={styles.federalSeal}>
            <Text style={[styles.sealText, { fontFamily: 'Inter_600SemiBold' }]}>
              FEDERAL
            </Text>
            <Text style={[styles.sealText, { fontFamily: 'Inter_600SemiBold' }]}>
              RESERVE
            </Text>
          </View>
        </View>
        
        {/* Main content area */}
        <View style={styles.mainContent}>
          <View style={styles.leftSection}>
            <View style={styles.portraitFrame}>
              <TouchableOpacity onPress={handleImagePress}>
                <Image
                  source={{ uri: note.smallImage }}
                  style={styles.portraitImage}
                  resizeMode="cover"
                />
                <View style={styles.portraitOverlay}>
                  <Eye size={12} color="#1B5E20" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            <View style={styles.denominationArea}>
              <Text style={[styles.dollarSymbol, { fontFamily: 'Inter_600SemiBold' }]}>
                $
              </Text>
              <Text style={[styles.denomination, { fontFamily: 'Inter_600SemiBold' }]}>
                {note.amount || 1}
              </Text>
            </View>
            
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                ACHIEVEMENT
              </Text>
              <Text style={[styles.achievementDesc, { fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                {note.title}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Bottom section */}
        <View style={styles.bottomSection}>
          <Text style={[styles.treasuryText, { fontFamily: 'Inter_600SemiBold' }]}>
            TREASURY ACHIEVEMENT • {note.createdAt}
          </Text>
        </View>
        
        {/* Vintage patterns */}
        <View style={styles.vintagePatterns}>
          <View style={styles.cornerPattern1} />
          <View style={styles.cornerPattern2} />
          <View style={styles.cornerPattern3} />
          <View style={styles.cornerPattern4} />
        </View>
        
        {/* Watermark effect */}
        <View style={styles.watermark}>
          <Text style={[styles.watermarkText, { fontFamily: 'Inter_600SemiBold' }]}>
            VERIFIED
          </Text>
        </View>
      </LinearGradient>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: cardWidth,
    marginHorizontal: 8,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  dollarBill: {
    borderRadius: 8,
    minHeight: 160,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  paperTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ageSpot: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 90, 50, 0.1)',
    borderRadius: 15,
  },
  spot1: {
    top: 20,
    right: 30,
    width: 25,
    height: 20,
  },
  spot2: {
    bottom: 40,
    left: 25,
    width: 30,
    height: 18,
  },
  spot3: {
    top: 60,
    left: 60,
    width: 20,
    height: 25,
  },
  spot4: {
    bottom: 20,
    right: 60,
    width: 22,
    height: 15,
  },
  tornEdges: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tear: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 90, 50, 0.15)',
  },
  topTear: {
    top: 0,
    left: 40,
    width: 30,
    height: 3,
    transform: [{ rotate: '5deg' }],
  },
  bottomTear: {
    bottom: 0,
    right: 35,
    width: 25,
    height: 3,
    transform: [{ rotate: '-3deg' }],
  },
  leftTear: {
    left: 0,
    top: 50,
    width: 3,
    height: 20,
    transform: [{ rotate: '2deg' }],
  },
  rightTear: {
    right: 0,
    top: 80,
    width: 3,
    height: 15,
    transform: [{ rotate: '-2deg' }],
  },
  dollarBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
  },
  outerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderStyle: 'solid',
  },
  innerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: '#FFF8DC',
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  decorativeBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderColor: '#F0E68C',
    opacity: 0.4,
  },
  serialSection: {
    position: 'absolute',
    top: 12,
    left: 16,
  },
  serialText: {
    fontSize: 8,
    color: '#0D4F12',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sealArea: {
    position: 'absolute',
    top: 12,
    right: 16,
    alignItems: 'center',
  },
  federalSeal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  sealText: {
    fontSize: 6,
    color: '#0D4F12',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 8,
  },
  mainContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 35,
    paddingBottom: 25,
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  portraitFrame: {
    width: 60,
    height: 75,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 2,
  },
  rightSection: {
    flex: 1,
    alignItems: 'center',
  },
  denominationArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dollarSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0D4F12',
    marginRight: 4,
  },
  denomination: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0D4F12',
  },
  achievementInfo: {
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 10,
    color: '#0D4F12',
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  achievementDesc: {
    fontSize: 9,
    color: '#0D4F12',
    textAlign: 'center',
    lineHeight: 12,
    opacity: 0.8,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  treasuryText: {
    fontSize: 7,
    color: '#0D4F12',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  vintagePatterns: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerPattern1: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 2,
    opacity: 0.3,
  },
  cornerPattern2: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 2,
    opacity: 0.3,
  },
  cornerPattern3: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 2,
    opacity: 0.3,
  },
  cornerPattern4: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 2,
    opacity: 0.3,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -8 }],
    opacity: 0.1,
  },
  watermarkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D4F12',
    transform: [{ rotate: '-15deg' }],
  },
});