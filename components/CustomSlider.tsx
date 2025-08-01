import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = screenWidth - 138;
const THUMB_SIZE = 20;

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  style?: any;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

export default function CustomSlider({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  style,
  minimumTrackTintColor = '#6C5CE7',
  maximumTrackTintColor = '#333',
  thumbTintColor = '#6C5CE7',
}: CustomSliderProps) {
  const percent = (value - minimumValue) / (maximumValue - minimumValue);
  const [sliderWidth, setSliderWidth] = useState(SLIDER_WIDTH);
  const animatedX = useRef(new Animated.Value(percent * SLIDER_WIDTH)).current;
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  // Animate thumb position only if not dragging
  useEffect(() => {
    if (!dragging) {
      const toValue = percent * sliderWidth;
      Animated.timing(animatedX, {
        toValue,
        duration: 140,
        useNativeDriver: false,
      }).start();
    }
    // eslint-disable-next-line
  }, [value, sliderWidth, minimumValue, maximumValue, dragging]);

  const onHandlerStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;
    if (state === State.BEGAN) {
      setDragging(true);
      // Save current thumb X
      startX.current = percent * sliderWidth;
    }
    if (state === State.ACTIVE) {
      let newX = startX.current + translationX;
      newX = Math.max(0, Math.min(sliderWidth, newX));
      animatedX.setValue(newX);

      // Value calculation (more sensitive)
      const newPercent = newX / sliderWidth;
      let rawValue = minimumValue + newPercent * (maximumValue - minimumValue);
      let steppedValue = Math.round(rawValue / step) * step;
      steppedValue = Math.max(minimumValue, Math.min(maximumValue, steppedValue));
      onValueChange(steppedValue);
    }
    if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      setDragging(false);
      // No thumb reset! Wait for parent update to trigger animation.
    }
  };

  const onLayout = (event: any) => {
    const width = event.nativeEvent.layout.width;
    setSliderWidth(width);
  };

  const fillWidth = animatedX.interpolate({
    inputRange: [0, sliderWidth],
    outputRange: [0, sliderWidth],
    extrapolate: 'clamp',
  });

  const thumbStyle = {
    transform: [
      { translateX: animatedX.interpolate({
        inputRange: [0, sliderWidth],
        outputRange: [-THUMB_SIZE / 2, sliderWidth - THUMB_SIZE / 2],
        extrapolate: 'clamp',
      }) },
    ],
    backgroundColor: thumbTintColor,
  };

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {/* Track */}
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: minimumTrackTintColor,
              width: fillWidth,
            },
          ]}
        />
      </View>
      {/* Thumb */}
      <PanGestureHandler
        onGestureEvent={({ nativeEvent }) => {
          if (dragging) {
            let newX = startX.current + nativeEvent.translationX;
            newX = Math.max(0, Math.min(sliderWidth, newX));
            animatedX.setValue(newX);

            const newPercent = newX / sliderWidth;
            let rawValue = minimumValue + newPercent * (maximumValue - minimumValue);
            let steppedValue = Math.round(rawValue / step) * step;
            steppedValue = Math.max(minimumValue, Math.min(maximumValue, steppedValue));
            onValueChange(steppedValue);
          }
        }}
        onHandlerStateChange={onHandlerStateChange}
        minDist={1}
        hitSlop={20}
      >
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 35,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C5CE7',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#6C5CE7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    top: -8,
  },
});
