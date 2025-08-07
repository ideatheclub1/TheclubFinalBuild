import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { useNavigationMode } from '@/hooks/useNavigationMode';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function SafeAreaWrapper({ 
  children, 
  style, 
  backgroundColor = '#1E1E1E',
  edges = ['top', 'bottom', 'left', 'right']
}: SafeAreaWrapperProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [navigationBarHeight, setNavigationBarHeight] = useState(0);
  const navigationMode = useNavigationMode();
  
  // Get the status bar height
  const statusBarHeight = Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0;
  
  // Calculate navigation bar height for Android
  const getNavigationBarHeight = () => {
    if (Platform.OS !== 'android') return 0;
    
    const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
    const { height: windowHeight } = Dimensions.get('screen');
    
    // If there's a difference between screen and window height, it indicates navigation bar
    const navBarHeight = windowHeight - screenHeight;
    
    // For gesture navigation, we need to account for the gesture area
    // The gesture area is typically 48dp on modern Android devices
    const gestureAreaHeight = 48;
    
    // Use the detected navigation mode to determine the appropriate height
    if (navigationMode === 'gesture') {
      return gestureAreaHeight;
    } else if (navigationMode === 'button') {
      return navBarHeight > 0 ? navBarHeight : 48; // Fallback to 48 if calculation fails
    }
    
    // Fallback: If no navigation bar detected (gesture navigation), use gesture area height
    if (navBarHeight <= 0) {
      return gestureAreaHeight;
    }
    
    // If navigation bar is detected (button navigation), use the actual height
    return navBarHeight;
  };

  useEffect(() => {
    const height = getNavigationBarHeight();
    setNavigationBarHeight(height);
  }, [windowHeight]);

  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingTop: edges.includes('top') ? Math.max(insets.top, statusBarHeight) : 0,
      paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, navigationBarHeight) : 0,
      paddingLeft: edges.includes('left') ? insets.left : 0,
      paddingRight: edges.includes('right') ? insets.right : 0,
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
