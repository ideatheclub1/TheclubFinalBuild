# iOS ImagePicker Fix Guide

## Problem
The ImagePicker is not opening on iOS development builds even though permissions are granted.

## Root Cause
iOS development builds require proper native module linking for `expo-image-picker` to function correctly.

## Solutions (Choose One)

### Option 1: EAS Development Build (Recommended)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS development
eas build --platform ios --profile development

# Install the development build on your device/simulator
```

### Option 2: Rebuild with Xcode
```bash
# Generate iOS project
npx expo run:ios

# This will:
# 1. Generate the native iOS project
# 2. Install pods with expo-image-picker
# 3. Build and run on simulator/device
```

### Option 3: Use Expo Go (Limited)
- Install Expo Go from App Store
- Scan QR code from `expo start`
- Note: Some features may not work in Expo Go

## Current Workaround
- Camera shows explanatory alert on iOS
- Gallery attempts to work but may timeout
- Functionality works fully on Android/Web

## Files Changed
- `app.json`: Added iOS permissions and expo-image-picker plugin
- `StoryCarousel.tsx`: Added iOS-specific handling and timeouts

## Next Steps
1. Choose one of the solutions above
2. Test camera/gallery functionality
3. Remove iOS workarounds once native build works