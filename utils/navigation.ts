import { router } from 'expo-router';

/**
 * Handles back navigation with fallback for web builds
 * @param fallbackRoute - The route to navigate to if router.back() fails
 * @param fallbackParams - Optional parameters for the fallback route
 */
export const handleBackNavigation = (
  fallbackRoute: '/(tabs)/profile' | '/profile' = '/(tabs)/profile',
  fallbackParams?: Record<string, any>
) => {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback navigation
      if (fallbackParams) {
        router.push({
          pathname: fallbackRoute as any,
          params: fallbackParams
        });
      } else {
        router.push(fallbackRoute as any);
      }
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Final fallback
    if (fallbackParams) {
      router.push({
        pathname: fallbackRoute as any,
        params: fallbackParams
      });
    } else {
      router.push(fallbackRoute as any);
    }
  }
};

/**
 * Handles back navigation specifically for profile-related screens
 * @param userId - Optional user ID for profile navigation
 */
export const handleProfileBackNavigation = (userId?: string) => {
  if (userId) {
    handleBackNavigation('/profile', { userId });
  } else {
    handleBackNavigation('/(tabs)/profile');
  }
}; 