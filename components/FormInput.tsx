import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface FormInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  prefix?: string;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
}

export default function FormInput({
  label,
  value,
  onChangeText,
  error,
  prefix,
  maxLength,
  multiline = false,
  numberOfLines = 1,
  ...props
}: FormInputProps) {
  const inputRef = useRef<TextInput>(null);
  const focusAnimation = useSharedValue(0);
  const errorAnimation = useSharedValue(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  React.useEffect(() => {
    if (error) {
      errorAnimation.value = withSpring(1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      errorAnimation.value = withSpring(0);
    }
  }, [error]);

  const handleFocus = () => {
    focusAnimation.value = withSpring(1);
  };

  const handleBlur = () => {
    focusAnimation.value = withSpring(0);
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.1)', '#6C5CE7']
    );
    
    const shadowOpacity = focusAnimation.value * 0.3;
    
    return {
      borderColor,
      shadowOpacity,
      transform: [
        { scale: withSpring(1 + (focusAnimation.value * 0.01)) }
      ],
    };
  });

  const errorAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: errorAnimation.value,
      transform: [
        { translateY: withTiming(errorAnimation.value ? 0 : -10) }
      ],
    };
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      
      <Animated.View style={[styles.inputContainer, containerAnimatedStyle]}>
        {prefix && (
          <Text style={[styles.prefix, { fontFamily: 'Inter_400Regular' }]}>
            {prefix}
          </Text>
        )}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { fontFamily: 'Inter_400Regular' },
            multiline && styles.multilineInput,
            prefix && styles.inputWithPrefix,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#C5C5C5"
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </Animated.View>

      {error && (
        <Animated.View style={[styles.errorContainer, errorAnimatedStyle]}>
          <Text style={[styles.errorText, { fontFamily: 'Inter_400Regular' }]}>
            {error}
          </Text>
        </Animated.View>
      )}

      {maxLength && (
        <View style={styles.charCountContainer}>
          <Text style={[styles.charCount, { fontFamily: 'Inter_400Regular' }]}>
            {value.length}/{maxLength}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  prefix: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '500',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    minHeight: Platform.OS === 'android' ? 20 : 0,
  },
  inputWithPrefix: {
    marginLeft: 4,
  },
  multilineInput: {
    minHeight: 80,
    maxHeight: 120,
  },
  errorContainer: {
    marginTop: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '400',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  charCount: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '400',
  },
});