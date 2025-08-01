import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import CameraScreen from './CameraScreen';
import MessagesScreen from './MessagesPanel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CAMERA_SNAP_POINT = SCREEN_WIDTH * 0.9;
const MESSAGES_SNAP_POINT = SCREEN_WIDTH * 0.85;

interface SwipeContainerProps {
  children: React.ReactNode;
}

type SwipeDirection = 'camera' | 'home' | 'messages';

export default function SwipeContainer({ children }: SwipeContainerProps) {
  const [currentView, setCurrentView] = useState<SwipeDirection>('home');
  const [cameraMounted, setCameraMounted] = useState(false);
  const [messagesMounted, setMessagesMounted] = useState(false);
  
  const translateX = useSharedValue(0);
  const cameraOpacity = useSharedValue(0);
  const messagesOpacity = useSharedValue(0);
  const backgroundBlur = useSharedValue(0);
  const cameraScale = useSharedValue(0.9);
  const messagesScale = useSharedValue(0.9);

  // Pre-mount screens after initial render to prevent black flicker
  useEffect(() => {
    const timer = setTimeout(() => {
      setCameraMounted(true);
      setMessagesMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
  };

  const snapToView = (direction: SwipeDirection) => {
    let targetX = 0;
    
    switch (direction) {
      case 'camera':
        targetX = CAMERA_SNAP_POINT;
        cameraOpacity.value = withTiming(1, { duration: 300 });
        cameraScale.value = withSpring(1, { damping: 15 });
        messagesOpacity.value = withTiming(0, { duration: 200 });
        messagesScale.value = withTiming(0.9, { duration: 200 });
        backgroundBlur.value = withTiming(0.7, { duration: 300 });
        break;
      case 'messages':
        targetX = -MESSAGES_SNAP_POINT;
        messagesOpacity.value = withTiming(1, { duration: 300 });
        messagesScale.value = withSpring(1, { damping: 15 });
        cameraOpacity.value = withTiming(0, { duration: 200 });
        cameraScale.value = withTiming(0.9, { duration: 200 });
        backgroundBlur.value = withTiming(0.5, { duration: 300 });
        break;
      case 'home':
      default:
        targetX = 0;
        cameraOpacity.value = withTiming(0, { duration: 300 });
        cameraScale.value = withTiming(0.9, { duration: 300 });
        messagesOpacity.value = withTiming(0, { duration: 300 });
        messagesScale.value = withTiming(0.9, { duration: 300 });
        backgroundBlur.value = withTiming(0, { duration: 300 });
        break;
    }

    translateX.value = withSpring(targetX, {
      damping: 20,
      stiffness: 120,
    });
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(triggerHaptic)();
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      // Update opacity and scale values based on swipe direction
      if (event.translationX > 0) {
        // Swiping right (showing camera)
        const progress = Math.min(event.translationX / CAMERA_SNAP_POINT, 1);
        cameraOpacity.value = progress;
        cameraScale.value = interpolate(progress, [0, 1], [0.9, 1], Extrapolate.CLAMP);
        messagesOpacity.value = 0;
        messagesScale.value = 0.9;
        backgroundBlur.value = progress * 0.7;
      } else if (event.translationX < 0) {
        // Swiping left (showing messages)
        const progress = Math.min(Math.abs(event.translationX) / MESSAGES_SNAP_POINT, 1);
        messagesOpacity.value = progress;
        messagesScale.value = interpolate(progress, [0, 1], [0.9, 1], Extrapolate.CLAMP);
        cameraOpacity.value = 0;
        cameraScale.value = 0.9;
        backgroundBlur.value = progress * 0.5;
      } else {
        cameraOpacity.value = 0;
        cameraScale.value = 0.9;
        messagesOpacity.value = 0;
        messagesScale.value = 0.9;
        backgroundBlur.value = 0;
      }
    },
    onEnd: (event) => {
      const { translationX, velocityX } = event;
      
      if (translationX > SWIPE_THRESHOLD || velocityX > 500) {
        // Swipe right to camera
        runOnJS(setCurrentView)('camera');
        runOnJS(snapToView)('camera');
        runOnJS(triggerHaptic)();
      } else if (translationX < -SWIPE_THRESHOLD || velocityX < -500) {
        // Swipe left to messages
        runOnJS(setCurrentView)('messages');
        runOnJS(snapToView)('messages');
        runOnJS(triggerHaptic)();
      } else {
        // Snap back to home
        runOnJS(setCurrentView)('home');
        runOnJS(snapToView)('home');
      }
    },
  });

  const handleCloseMessages = () => {
    setCurrentView('home');
    snapToView('home');
  };

  const handleCloseCamera = () => {
    setCurrentView('home');
    snapToView('home');
  };

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        backgroundBlur.value,
        [0, 1],
        [1, 0.3],
        Extrapolate.CLAMP
      ),
    };
  });

  const cameraStyle = useAnimatedStyle(() => {
    return {
      opacity: cameraOpacity.value,
      transform: [{ scale: cameraScale.value }],
      pointerEvents: cameraOpacity.value > 0.5 ? 'auto' : 'none',
    };
  });

  const messagesStyle = useAnimatedStyle(() => {
    const translateXValue = interpolate(
      messagesOpacity.value,
      [0, 1],
      [SCREEN_WIDTH, 0],
      Extrapolate.CLAMP
    );
    
    return {
      opacity: messagesOpacity.value,
      transform: [
        { translateX: translateXValue },
        { scale: messagesScale.value }
      ],
      pointerEvents: messagesOpacity.value > 0.5 ? 'auto' : 'none',
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      
      {/* Background dimming overlay */}
      <Animated.View style={[styles.backgroundOverlay, backgroundStyle]} />
      
      {/* Main content container */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.mainContainer, containerStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
      
      {/* Camera Screen (Left Swipe) - Pre-mounted */}
      {cameraMounted && (
        <Animated.View style={[styles.cameraContainer, cameraStyle]}>
          <CameraScreen 
            isVisible={currentView === 'camera'} 
            onClose={handleCloseCamera}
          />
        </Animated.View>
      )}
      
      {/* Messages Panel (Right Swipe) - Pre-mounted */}
      {messagesMounted && (
        <Animated.View style={[styles.messagesContainer, messagesStyle]}>
          <MessagesScreen 
            isVisible={currentView === 'messages'} 
            onClose={handleCloseMessages}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1E1E',
    zIndex: 1,
  },
  mainContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: '#1E1E1E',
    zIndex: 2,
  },
  cameraContainer: {
    position: 'absolute',
    top: 0,
    left: -SCREEN_WIDTH,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1E1E1E',
    zIndex: 3,
  },
  messagesContainer: {
    position: 'absolute',
    top: 0,
    right: -SCREEN_WIDTH,
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1E1E1E',
    zIndex: 3,
  },
});