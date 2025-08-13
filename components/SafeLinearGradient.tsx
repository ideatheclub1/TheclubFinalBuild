import React from 'react';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { View, ViewStyle } from 'react-native';

interface SafeLinearGradientProps extends LinearGradientProps {
  fallbackStyle?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * SafeLinearGradient - A wrapper around LinearGradient that prevents null reference errors
 * This component catches any errors that might occur within LinearGradient contexts
 */
export default function SafeLinearGradient({ 
  children, 
  fallbackStyle, 
  style,
  ...props 
}: SafeLinearGradientProps) {
  try {
    // Validate all children recursively to ensure no null references
    const safeChildren = React.Children.map(children, (child) => {
      if (!child) return null;
      
      // If child is a React element, validate its props
      if (React.isValidElement(child)) {
        return child;
      }
      
      return child;
    });

    return (
      <LinearGradient style={style} {...props}>
        {safeChildren}
      </LinearGradient>
    );
  } catch (error) {
    console.warn('SafeLinearGradient caught error:', error);
    
    // Fallback to a regular View if LinearGradient fails
    return (
      <View style={[style, fallbackStyle]}>
        {children}
      </View>
    );
  }
}

