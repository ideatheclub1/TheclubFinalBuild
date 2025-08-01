import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RotateCcw, Image, Zap, ZapOff } from 'lucide-react-native';

interface CameraControlsProps {
  onFlipCamera: () => void;
  onGalleryImport: () => void;
  onFlashToggle: () => void;
  flashMode: 'on' | 'off';
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CameraControls({
  onFlipCamera,
  onGalleryImport,
  onFlashToggle,
  flashMode,
}: CameraControlsProps) {
  const flipScale = useSharedValue(1);
  const galleryScale = useSharedValue(1);
  const flashScale = useSharedValue(1);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
  };

  const handleFlipPress = () => {
    triggerHaptic();
    flipScale.value = withSequence(
      withSpring(0.8, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    onFlipCamera();
  };

  const handleGalleryPress = () => {
    triggerHaptic();
    galleryScale.value = withSequence(
      withSpring(0.8, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    onGalleryImport();
  };

  const handleFlashPress = () => {
    triggerHaptic();
    flashScale.value = withSequence(
      withSpring(0.8, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    onFlashToggle();
  };

  const flipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flipScale.value }],
  }));

  const galleryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: galleryScale.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Gallery Import */}
      <AnimatedTouchableOpacity
        style={[styles.controlButton, galleryAnimatedStyle]}
        onPress={handleGalleryPress}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.buttonBlur}>
          <Image size={24} color="#FFFFFF" strokeWidth={2} />
        </BlurView>
      </AnimatedTouchableOpacity>

      {/* Flash Toggle */}
      <AnimatedTouchableOpacity
        style={[styles.controlButton, flashAnimatedStyle]}
        onPress={handleFlashPress}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.buttonBlur}>
          {flashMode === 'on' ? (
            <Zap size={24} color="#FFD700" fill="#FFD700" strokeWidth={2} />
          ) : (
            <ZapOff size={24} color="#FFFFFF" strokeWidth={2} />
          )}
        </BlurView>
      </AnimatedTouchableOpacity>

      {/* Camera Flip */}
      <AnimatedTouchableOpacity
        style={[styles.controlButton, flipAnimatedStyle]}
        onPress={handleFlipPress}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.buttonBlur}>
          <RotateCcw size={24} color="#FFFFFF" strokeWidth={2} />
        </BlurView>
      </AnimatedTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    top: '35%',
    gap: 20,
    zIndex: 5,
  },
  controlButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonBlur: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
  },
});