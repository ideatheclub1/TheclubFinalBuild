import { StyleSheet } from 'react-native';

/**
 * Standard touch target styles for accessibility compliance
 * Minimum touch target size: 44x44 points (iOS) / 48x48dp (Android)
 */
export const touchTargetStyles = StyleSheet.create({
  // Standard button touch target
  standard: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  
  // Compact button touch target (for smaller UI elements)
  compact: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  
  // Large button touch target (for primary actions)
  large: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  
  // Icon button touch target
  icon: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
  },
  
  // Header button touch target
  header: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
});

/**
 * Helper function to create touch target styles with custom properties
 */
export const createTouchTarget = (
  baseStyle: keyof typeof touchTargetStyles,
  additionalStyles?: object
) => ({
  ...touchTargetStyles[baseStyle],
  ...additionalStyles,
});

/**
 * Common touch target configurations
 */
export const touchTargets = {
  backButton: createTouchTarget('header'),
  headerIcon: createTouchTarget('icon'),
  primaryButton: createTouchTarget('large'),
  secondaryButton: createTouchTarget('standard'),
  iconButton: createTouchTarget('icon'),
  compactButton: createTouchTarget('compact'),
}; 