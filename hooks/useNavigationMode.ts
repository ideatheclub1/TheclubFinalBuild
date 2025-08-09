import { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';

export type NavigationMode = 'gesture' | 'button' | 'unknown';

export function useNavigationMode(): NavigationMode {
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('unknown');

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setNavigationMode('unknown');
      return;
    }

    const detectNavigationMode = () => {
      const { height: screenHeight } = Dimensions.get('window');
      const { height: windowHeight } = Dimensions.get('screen');
      
      // Calculate the difference between screen and window height
      const navBarHeight = windowHeight - screenHeight;
      
      // If there's a significant difference, it's button navigation
      if (navBarHeight > 20) {
        setNavigationMode('button');
      } else {
        // If no significant difference, it's likely gesture navigation
        setNavigationMode('gesture');
      }
    };

    detectNavigationMode();

    // Listen for dimension changes (orientation changes, etc.)
    const subscription = Dimensions.addEventListener('change', detectNavigationMode);

    return () => {
      subscription?.remove();
    };
  }, []);

  return navigationMode;
}
