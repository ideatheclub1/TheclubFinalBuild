import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NavigationDebug() {
  const insets = useSafeAreaInsets();
  const navigationMode = useNavigationMode();
  const { height: screenHeight } = Dimensions.get('window');
  const { height: windowHeight } = Dimensions.get('screen');
  const navBarHeight = windowHeight - screenHeight;

  // Position state for dragging
  const translateX = useSharedValue(10);
  const translateY = useSharedValue(100);
  const [isDragging, setIsDragging] = useState(false);

  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(setIsDragging)(true);
    },
    onActive: (event) => {
      translateX.value = event.translationX + translateX.value;
      translateY.value = event.translationY + translateY.value;
    },
    onEnd: () => {
      // Keep the panel within screen bounds
      const maxX = SCREEN_WIDTH - 200; // Approximate panel width
      const maxY = SCREEN_HEIGHT - 300; // Approximate panel height
      
      translateX.value = withSpring(
        Math.max(0, Math.min(translateX.value, maxX)),
        { damping: 15, stiffness: 150 }
      );
      translateY.value = withSpring(
        Math.max(insets.top, Math.min(translateY.value, maxY)),
        { damping: 15, stiffness: 150 }
      );
      
      runOnJS(setIsDragging)(false);
    },
  });

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      opacity: isDragging ? 0.8 : 1,
      scale: isDragging ? 1.05 : 1,
    };
  });

  return (
    <PanGestureHandler onGestureEvent={panGestureHandler}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Navigation Debug</Text>
          <View style={styles.dragHandle} />
        </View>
        <Text style={styles.text}>Navigation Mode: {navigationMode}</Text>
        <Text style={styles.text}>Screen Height: {screenHeight}</Text>
        <Text style={styles.text}>Window Height: {windowHeight}</Text>
        <Text style={styles.text}>Nav Bar Height: {navBarHeight}</Text>
        <Text style={styles.text}>Safe Area Top: {insets.top}</Text>
        <Text style={styles.text}>Safe Area Bottom: {insets.bottom}</Text>
        <Text style={styles.text}>Safe Area Left: {insets.left}</Text>
        <Text style={styles.text}>Safe Area Right: {insets.right}</Text>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 12,
    borderRadius: 12,
    zIndex: 9999,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  dragHandle: {
    width: 30,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
