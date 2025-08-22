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
      
      // More nuanced detection based on different thresholds
      // Modern Android devices with gesture navigation typically have 0-15dp difference
      // Devices with button navigation have 30-60dp difference
      if (navBarHeight > 25) {
        setNavigationMode('button');
      } else if (navBarHeight >= 0 && navBarHeight <= 25) {
        setNavigationMode('gesture');
      } else {
        // Fallback for edge cases
        setNavigationMode('unknown');
      }
    };

    detectNavigationMode();

    // Listen for dimension changes (orientation changes, etc.)
    const subscription = Dimensions.addEventListener('change', detectNavigationMode);

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  return navigationMode;
}
