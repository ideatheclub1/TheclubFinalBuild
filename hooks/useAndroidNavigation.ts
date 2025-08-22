import { useState, useEffect } from 'react';
import { Platform, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationMode } from './useNavigationMode';

export interface AndroidNavigationInfo {
  navigationBarHeight: number;
  statusBarHeight: number;
  isGestureNavigation: boolean;
  isButtonNavigation: boolean;
  safeBottomPadding: number;
  screenHeight: number;
  availableHeight: number;
}

export function useAndroidNavigation(): AndroidNavigationInfo {
  const insets = useSafeAreaInsets();
  const navigationMode = useNavigationMode();
  const [navigationInfo, setNavigationInfo] = useState<AndroidNavigationInfo>({
    navigationBarHeight: 0,
    statusBarHeight: 0,
    isGestureNavigation: false,
    isButtonNavigation: false,
    safeBottomPadding: 0,
    screenHeight: 0,
    availableHeight: 0,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const calculateNavigationInfo = () => {
      const { height: screenHeight } = Dimensions.get('window');
      const { height: windowHeight } = Dimensions.get('screen');
      const statusBarHeight = StatusBar.currentHeight || 0;
      
      // Calculate navigation bar height
      const navBarHeight = windowHeight - screenHeight;
      
      // Determine navigation type
      const isGestureNavigation = navigationMode === 'gesture';
      const isButtonNavigation = navigationMode === 'button';
      
      // Calculate safe bottom padding
      let safeBottomPadding = 0;
      
      if (isGestureNavigation) {
        // For gesture navigation, use the larger of insets.bottom or minimum safe area
        safeBottomPadding = Math.max(insets.bottom, 24);
      } else if (isButtonNavigation) {
        // For button navigation, use the navigation bar height
        safeBottomPadding = Math.max(navBarHeight, insets.bottom, 48);
      } else {
        // Unknown navigation mode, use conservative approach
        safeBottomPadding = Math.max(insets.bottom, navBarHeight > 10 ? navBarHeight : 32);
      }
      
      // Calculate available height (screen minus status bar minus navigation area)
      const availableHeight = screenHeight - statusBarHeight - safeBottomPadding;
      
      setNavigationInfo({
        navigationBarHeight: navBarHeight,
        statusBarHeight,
        isGestureNavigation,
        isButtonNavigation,
        safeBottomPadding,
        screenHeight,
        availableHeight,
      });
    };

    calculateNavigationInfo();

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', calculateNavigationInfo);
    
    return () => subscription?.remove();
  }, [insets.bottom, navigationMode]);

  return navigationInfo;
}

// Utility function to get navigation bar aware styles
export function getNavigationAwareStyles(androidNavInfo: AndroidNavigationInfo) {
  if (Platform.OS !== 'android') {
    return {};
  }

  return {
    paddingBottom: androidNavInfo.safeBottomPadding,
    marginBottom: -androidNavInfo.navigationBarHeight, // Extend behind nav bar
  };
}

// Hook specifically for tab screens that need to account for tab bar
export function useTabScreenPadding(): { bottomPadding: number } {
  const androidNavInfo = useAndroidNavigation();
  const tabBarHeight = Platform.OS === 'android' ? 80 : 85; // From tab layout
  
  if (Platform.OS !== 'android') {
    return { bottomPadding: 0 };
  }

  // Add extra padding to account for both tab bar and navigation bar
  const bottomPadding = tabBarHeight + androidNavInfo.safeBottomPadding;
  
  return { bottomPadding };
}


