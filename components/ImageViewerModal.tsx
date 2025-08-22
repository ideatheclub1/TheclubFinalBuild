import React, { useState } from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PanGestureHandler,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export default function ImageViewerModal({ visible, imageUri, onClose }: ImageViewerModalProps) {
  const [imageSize, setImageSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 });

  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Get image dimensions
  React.useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (width, height) => {
          const aspectRatio = width / height;
          const maxWidth = SCREEN_WIDTH * 0.9;
          const maxHeight = SCREEN_HEIGHT * 0.8;
          
          let newWidth, newHeight;
          
          if (aspectRatio > 1) {
            // Landscape
            newWidth = Math.min(maxWidth, width);
            newHeight = newWidth / aspectRatio;
          } else {
            // Portrait
            newHeight = Math.min(maxHeight, height);
            newWidth = newHeight * aspectRatio;
          }
          
          setImageSize({ width: newWidth, height: newHeight });
        },
        (error) => {
          console.log('Error getting image size:', error);
        }
      );
    }
  }, [imageUri]);

  // Reset transforms when modal opens
  React.useEffect(() => {
    if (visible) {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible]);

  const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    },
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 4));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

  const panHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      if (scale.value > 1) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    onActive: (event) => {
      if (scale.value > 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    },
    onEnd: () => {
      // Snap back to center if moved too far
      const maxTranslateX = (imageSize.width * scale.value - SCREEN_WIDTH) / 2;
      const maxTranslateY = (imageSize.height * scale.value - SCREEN_HEIGHT) / 2;
      
      if (Math.abs(translateX.value) > maxTranslateX) {
        translateX.value = withSpring(translateX.value > 0 ? maxTranslateX : -maxTranslateX);
      }
      if (Math.abs(translateY.value) > maxTranslateY) {
        translateY.value = withSpring(translateY.value > 0 ? maxTranslateY : -maxTranslateY);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 });
    setTimeout(onClose, 200);
  };

  const handleDoubleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (scale.value > 1) {
      // Zoom out
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    } else {
      // Zoom in
      scale.value = withSpring(2);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      
      <Animated.View style={[styles.container, backgroundStyle]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Image container */}
          <View style={styles.imageContainer}>
            <PanGestureHandler onGestureEvent={panHandler}>
              <Animated.View>
                <PinchGestureHandler onGestureEvent={pinchHandler}>
                  <Animated.View style={animatedStyle}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={handleDoubleTap}
                      style={styles.imageWrapper}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={[
                          styles.image,
                          {
                            width: imageSize.width,
                            height: imageSize.height,
                          }
                        ]}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: 8,
  },
});