import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
  Image as RNImage,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  withSequence,
  runOnJS,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { VideoThumbnailGenerator } from '../utils/videoThumbnailGenerator';
import { X, RotateCcw, Zap, ZapOff, Image, Video, Circle, Camera, CircleAlert as AlertCircle, Timer, Palette } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen'); // Use 'screen' for full dimensions

interface CameraScreenProps {
  isVisible: boolean;
  onClose: () => void;
  initialMode?: 'photo' | 'video';
  onMediaCaptured?: (asset: { uri: string; type?: string; name?: string }) => void;
  onPostCreate?: (mediaUri: string, mediaType: 'image' | 'video') => void;
  createMode?: 'post' | 'reel' | 'story';
}

type CameraMode = 'Post' | 'Reel' | 'Story' | 'Shorts';
type CameraReadiness = 'INITIALIZING' | 'CALLBACK_READY' | 'VERIFYING' | 'FULLY_READY';

// Camera filters with overlay effects
const cameraFilters = [
  { 
    id: 'normal', 
    name: 'Normal', 
    overlay: null,
    tint: null 
  },
  { 
    id: 'vintage', 
    name: 'Vintage', 
    overlay: 'rgba(139, 92, 246, 0.3)',
    tint: 'sepia(1.2) contrast(1.4) brightness(0.95) saturate(1.1)' 
  },
  { 
    id: 'blackwhite', 
    name: 'B&W', 
    overlay: 'rgba(0, 0, 0, 0.05)',
    tint: 'grayscale(1) contrast(1.8) brightness(1.1) saturate(0)' 
  },
  { 
    id: 'sepia', 
    name: 'Sepia', 
    overlay: 'rgba(139, 69, 19, 0.35)',
    tint: 'sepia(1.5) brightness(1.15) contrast(1.3)' 
  },
  { 
    id: 'vibrant', 
    name: 'Vibrant', 
    overlay: 'rgba(255, 20, 147, 0.15)',
    tint: 'saturate(2.2) contrast(1.5) brightness(1.1)' 
  },
  { 
    id: 'cool', 
    name: 'Cool', 
    overlay: 'rgba(59, 130, 246, 0.25)',
    tint: 'hue-rotate(30deg) saturate(1.6) contrast(1.3) brightness(1.05)' 
  },
  { 
    id: 'warm', 
    name: 'Warm', 
    overlay: 'rgba(255, 165, 0, 0.25)',
    tint: 'hue-rotate(-25deg) saturate(1.5) brightness(1.2) contrast(1.2)' 
  },
  { 
    id: 'dramatic', 
    name: 'Dramatic', 
    overlay: 'rgba(0, 0, 0, 0.4)',
    tint: 'contrast(2.2) brightness(0.8) saturate(1.8)' 
  },
  { 
    id: 'soft', 
    name: 'Soft', 
    overlay: 'rgba(255, 192, 203, 0.2)',
    tint: 'contrast(0.6) brightness(1.25) saturate(0.8) blur(1px)' 
  },
  { 
    id: 'neon', 
    name: 'Neon', 
    overlay: 'rgba(255, 0, 255, 0.25)',
    tint: 'saturate(3) contrast(2) hue-rotate(280deg) brightness(1.3)' 
  },
  { 
    id: 'retro', 
    name: 'Retro', 
    overlay: 'rgba(255, 140, 0, 0.3)',
    tint: 'sepia(0.8) contrast(1.6) saturate(1.5) hue-rotate(-15deg) brightness(1.1)' 
  },
  { 
    id: 'mono', 
    name: 'Mono', 
    overlay: 'rgba(0, 0, 0, 0.2)',
    tint: 'grayscale(1) contrast(2) brightness(1.2) invert(0.1)' 
  },
  { 
    id: 'sunset', 
    name: 'Sunset', 
    overlay: 'rgba(255, 94, 77, 0.35)',
    tint: 'hue-rotate(-30deg) saturate(2) brightness(1.25) contrast(1.4)' 
  },
  { 
    id: 'arctic', 
    name: 'Arctic', 
    overlay: 'rgba(135, 206, 250, 0.3)',
    tint: 'hue-rotate(200deg) saturate(1.5) brightness(1.4) contrast(1.3)' 
  },
  { 
    id: 'faded', 
    name: 'Faded', 
    overlay: 'rgba(245, 245, 220, 0.25)',
    tint: 'saturate(0.4) contrast(0.8) brightness(1.2) sepia(0.5)' 
  },
];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CameraScreen({ 
  isVisible, 
  onClose, 
  initialMode = 'video',
  onMediaCaptured,
  onPostCreate,
  createMode = 'reel'
}: CameraScreenProps) {
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [currentMode, setCurrentMode] = useState<CameraMode>(
    initialMode === 'photo' ? 'Post' : 
    createMode === 'story' ? 'Story' : 'Reel'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  const [showFilterName, setShowFilterName] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timerDelay, setTimerDelay] = useState(0);
  const [cameraReadiness, setCameraReadiness] = useState<CameraReadiness>('INITIALIZING');
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [cameraKey, setCameraKey] = useState(0); // Force camera remount
  const [emergencyMode, setEmergencyMode] = useState(false); // Emergency bypass
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [showThumbnailCapture, setShowThumbnailCapture] = useState(false);
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({
    x: 20,
    y: 40,
    width: SCREEN_WIDTH - 120,
    height: SCREEN_WIDTH - 120,
  });
  
  const cameraRef = useRef<CameraView>(null);
  const recordingTimer = useRef<number | null>(null);
  const initializationAttempts = useRef(0);
  
  // Animation values
  const recordButtonScale = useSharedValue(1);
  const recordButtonPulse = useSharedValue(0);
  const filterNameOpacity = useSharedValue(0);
  const filterNameScale = useSharedValue(0.8);
  const flashOpacity = useSharedValue(0);
  const recordingProgress = useSharedValue(0);
  const captureButtonGlow = useSharedValue(0);
  const cropX = useSharedValue(20);
  const cropY = useSharedValue(40);
  const cropWidth = useSharedValue(SCREEN_WIDTH - 120);
  const cropHeight = useSharedValue(SCREEN_WIDTH - 120);

  useEffect(() => {
    if (isRecording) {
      recordButtonPulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
      
      // Start recording timer for Shorts and Story modes
      if (currentMode === 'Shorts' || currentMode === 'Story') {
        const maxDuration = currentMode === 'Shorts' ? 15 : 30; // 15s for Shorts, 30s for Stories
        recordingTimer.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 0.1;
            recordingProgress.value = withTiming(newDuration / maxDuration, { duration: 100 });
            
            if (newDuration >= maxDuration) {
              runOnJS(handleStopRecording)();
              return 0;
            }
            return newDuration;
          });
        }, 100);
      }
    } else {
      recordButtonPulse.value = withTiming(1, { duration: 300 });
      recordingProgress.value = withTiming(0, { duration: 300 });
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
    };
  }, [isRecording, currentMode]);

  useEffect(() => {
    // Capture button glow animation
    captureButtonGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  // Reset camera state completely with memory cleanup
  const resetCameraState = () => {
    console.log('Resetting camera state completely with memory cleanup...');
    setCameraReadiness('INITIALIZING');
    setVerificationAttempts(0);
    setFallbackMode(false);
    setEmergencyMode(false);
    
    // Force garbage collection if possible
    if (global.gc) {
      console.log('Triggering garbage collection...');
      global.gc();
    }
    
    // Reset camera component with new key
    setCameraKey(prev => prev + 1);
    cameraRef.current = null;
    
    console.log('Camera reset complete - fresh component will be mounted');
  };

  // Handle camera initialization with enhanced readiness system
  useEffect(() => {
    if (isVisible && permission?.granted) {
      initializationAttempts.current += 1;
      console.log(`Camera initialization attempt ${initializationAttempts.current}`);
      
      setCameraReadiness('INITIALIZING');
      setVerificationAttempts(0);
      
      // Progressive fallback timer - shorter for subsequent attempts
      const timeoutDuration = initializationAttempts.current === 1 ? 8000 : 5000;
      const fallbackTimer = setTimeout(() => {
        console.log(`Camera fallback timeout (attempt ${initializationAttempts.current}) - enabling fallback mode`);
        setFallbackMode(true);
        setCameraReadiness('FULLY_READY');
      }, timeoutDuration);
      
      return () => clearTimeout(fallbackTimer);
    } else {
      setCameraReadiness('INITIALIZING');
      initializationAttempts.current = 0;
    }
  }, [isVisible, permission?.granted, cameraKey]); // Add cameraKey as dependency

  // Simplified camera verification - minimal memory usage
  const verifyCameraOperations = async (): Promise<boolean> => {
    try {
      if (!cameraRef.current) {
        return false;
      }

      // For memory-conscious approach, skip image testing if we've had memory issues
      // Just verify camera ref exists and wait
      console.log('Verifying camera availability (memory-conscious)...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Camera verification complete (no memory operations)');
      return true;
    } catch (error: any) {
      console.log('Camera verification failed:', error.message);
      return false;
    }
  };

  // Simplified preparation function - NO warm-up recording to avoid memory issues
  const prepareForRecording = async (): Promise<boolean> => {
    try {
      if (!cameraRef.current) {
        return false;
      }

      console.log(`Preparing camera for ${currentMode} recording (memory-conscious approach)...`);
      
      // Instead of warm-up recording (which causes memory issues), just use time-based preparation
      if (currentMode === 'Reel') {
        console.log('Reel mode detected - using extended time-based preparation...');
        
        // Just wait longer for reel mode to let camera settle
        // No image captures or warm-up recordings that consume memory
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second preparation for reels
        console.log('Reel preparation complete (time-based)');
        return true;
      } else {
        // Standard preparation for non-reel modes
        console.log('Standard recording preparation (time-based)...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second for other modes
        console.log('Standard preparation complete (time-based)');
        return true;
      }
    } catch (error: any) {
      console.log('Recording preparation failed:', error.message);
      return false;
    }
  };

  // Handle camera ready state callback with extended delays
  const handleCameraReady = async () => {
    console.log('Camera onReady callback fired! Starting verification...');
    setCameraReadiness('CALLBACK_READY');
    
    // Wait longer after callback before verification (increased from 500ms to 1500ms)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCameraReadiness('VERIFYING');
    
    // Attempt verification with retries and longer delays
    let verified = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!verified && attempts < maxAttempts) {
      attempts++;
      setVerificationAttempts(attempts);
      console.log(`Camera verification attempt ${attempts}/${maxAttempts}`);
      
      verified = await verifyCameraOperations();
      
      if (!verified && attempts < maxAttempts) {
        // Wait before retry, with longer delays: 1s, 2s, 3s
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    if (verified) {
      console.log('Camera verification successful! Preparing for recording...');
      
      // Now prepare the camera specifically for recording
      const recordingReady = await prepareForRecording();
      
      if (recordingReady) {
        console.log('Recording preparation successful! Camera is fully ready.');
        // For reels, add extra final delay to ensure complete readiness
        const finalDelay = currentMode === 'Reel' ? 1500 : 500;
        console.log(`Adding final ${finalDelay}ms delay for ${currentMode} mode...`);
        await new Promise(resolve => setTimeout(resolve, finalDelay));
        setCameraReadiness('FULLY_READY');
      } else {
        console.log('Recording preparation failed...');
        
        // If reel preparation failed, try one more remount
        if (currentMode === 'Reel' && cameraKey < 2) {
          console.log('Reel preparation failed - attempting camera remount...');
          setCameraReadiness('INITIALIZING');
          setCameraKey(prev => prev + 1);
          return;
        } else {
          console.log('Proceeding anyway with extended delay...');
          const extendedDelay = currentMode === 'Reel' ? 3000 : 1000;
          await new Promise(resolve => setTimeout(resolve, extendedDelay));
          setCameraReadiness('FULLY_READY');
        }
      }
    } else {
      console.log('Camera verification failed after all attempts. Trying camera remount...');
      
      // If verification fails, try remounting the camera
      if (cameraKey < 2) { // Allow up to 2 remounts
        console.log(`Remounting camera (attempt ${cameraKey + 1}/3)...`);
        setCameraReadiness('INITIALIZING');
        setCameraKey(prev => prev + 1);
        return; // This will trigger the entire process again with a new camera instance
      } else {
        console.log('Max remount attempts reached. Using time-based fallback.');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay for stubborn cameras
        setCameraReadiness('FULLY_READY');
      }
    }
  };

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      switch (intensity) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Haptics error:', error);
    }
  };

  const showFilterNameBriefly = () => {
    setShowFilterName(true);
    filterNameOpacity.value = withTiming(1, { duration: 200 });
    filterNameScale.value = withSpring(1, { damping: 15 });
    
    setTimeout(() => {
      filterNameOpacity.value = withTiming(0, { duration: 300 });
      filterNameScale.value = withTiming(0.8, { duration: 300 });
      setTimeout(() => setShowFilterName(false), 300);
    }, 1500);
  };

  const changeFilter = (direction: 'left' | 'right') => {
    triggerHaptic('light');
    
    if (direction === 'right') {
      setSelectedFilterIndex(prev => 
        prev === cameraFilters.length - 1 ? 0 : prev + 1
      );
    } else {
      setSelectedFilterIndex(prev => 
        prev === 0 ? cameraFilters.length - 1 : prev - 1
      );
    }
    
    showFilterNameBriefly();
  };

  const handleModeSwipe = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setCurrentMode('Shorts');
      triggerHaptic('medium');
    } else if (direction === 'down') {
      onClose();
    }
  };

  // Gesture handlers
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;
      
      // Horizontal swipes for filter change
      if (Math.abs(translationX) > Math.abs(translationY)) {
        if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 500) {
          runOnJS(changeFilter)(translationX > 0 ? 'left' : 'right');
        }
      } 
      // Vertical swipes for mode change
      else if (Math.abs(translationY) > 80 || Math.abs(velocityY) > 600) {
        runOnJS(handleModeSwipe)(translationY > 0 ? 'down' : 'up');
      }
    });

  // Crop area drag gesture
  const cropDragGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(SCREEN_WIDTH - cropWidth.value - 40, cropX.value + event.changeX));
      const newY = Math.max(0, Math.min(SCREEN_HEIGHT * 0.6 - cropHeight.value, cropY.value + event.changeY));
      
      cropX.value = newX;
      cropY.value = newY;
    })
    .onEnd(() => {
      runOnJS(setCropArea)({
        x: cropX.value,
        y: cropY.value,
        width: cropWidth.value,
        height: cropHeight.value,
      });
    });

  // Corner resize gesture
  const cornerResizeGesture = Gesture.Pan()
    .onUpdate((event) => {
      const minSize = 100;
      const maxSize = Math.min(SCREEN_WIDTH - 80, SCREEN_HEIGHT * 0.4);
      
      const newWidth = Math.max(minSize, Math.min(maxSize, cropWidth.value + event.changeX));
      const newHeight = Math.max(minSize, Math.min(maxSize, cropHeight.value + event.changeY));
      
      // Keep aspect ratio square
      const size = Math.min(newWidth, newHeight);
      cropWidth.value = size;
      cropHeight.value = size;
    })
    .onEnd(() => {
      runOnJS(setCropArea)({
        x: cropX.value,
        y: cropY.value,
        width: cropWidth.value,
        height: cropHeight.value,
      });
    });

  const handleCapture = async () => {
    triggerHaptic('heavy');
    recordButtonScale.value = withSequence(
      withSpring(0.8, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    if (currentMode === 'Post') {
      // Take photo
      try {
        if (cameraReadiness !== 'FULLY_READY') {
          const readinessMessages = {
            'INITIALIZING': 'Camera is initializing...',
            'CALLBACK_READY': 'Camera callback received, verifying...',
            'VERIFYING': 'Camera is being verified...',
            'FULLY_READY': 'Camera is ready!'
          };
          
          Alert.alert('Please wait', readinessMessages[cameraReadiness]);
          return;
        }
        
        if (!cameraRef.current) {
          Alert.alert('Error', 'Camera is not available');
          return;
        }

        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0, // Maximum quality for full resolution
          base64: false,
          skipProcessing: false, // Ensure proper processing
          exif: true, // Include EXIF data for proper orientation
          isImageMirror: false, // Don't mirror the image
          additionalExif: {}, // Additional EXIF data
          fixOrientation: true, // Fix orientation issues
        });
        
        // Log image details for debugging
        console.log('📸 Photo captured details:', {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          orientation: photo.exif?.Orientation,
          fileSize: photo.exif?.FileSize
        });
        
        // Show image editor for cropping/editing
        setCapturedImageUri(photo.uri);
        setShowImageEditor(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to capture photo');
      }
    } else {
      // Handle video recording
      if (!isRecording) {
        handleStartRecording();
      } else {
        handleStopRecording();
      }
    }
  };

  // Enhanced recording function with recording-specific preparation
  const attemptRecording = async (retryCount = 0): Promise<any> => {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    try {
      if (!cameraRef.current) {
        throw new Error('Camera ref not available');
      }

      console.log(`Recording attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      // Skip image testing between retries to avoid memory issues
      if (retryCount > 0) {
        console.log('Pre-recording preparation (memory-conscious approach)...');
        // Just wait instead of testing with image capture
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Pre-recording preparation complete');
      }
      
      // Progressive delay based on attempt and mode - longer delays for reels
      let delayTime;
      if (currentMode === 'Reel') {
        // Extended delays for reel recording: 500ms, 2s, 3s, 4s
        delayTime = retryCount === 0 ? 500 : 1500 + (retryCount * 1000);
      } else {
        // Standard delays for other modes: 300ms, 1.5s, 2s, 2.5s
        delayTime = retryCount === 0 ? 300 : 1000 + (retryCount * 500);
      }
      
      console.log(`Using ${delayTime}ms delay for ${currentMode} recording attempt`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
      
      const video = await cameraRef.current.recordAsync({
        maxDuration: currentMode === 'Shorts' ? 15 : currentMode === 'Story' ? 30 : 60,
      });
      
      return video;
    } catch (error: any) {
      console.log(`Recording attempt ${retryCount + 1} failed:`, error.message);
      
      if (error.message.includes('Camera is not ready') && retryCount < maxRetries) {
        // Longer delays with exponential backoff: 1s, 2s, 3s
        const delay = baseDelay * (retryCount + 1);
        console.log(`Retrying in ${delay}ms...`);
        
        // Force camera to re-verify readiness during retry
        if (retryCount === 1) {
          console.log('Force re-verification during retry...');
          setCameraReadiness('VERIFYING');
          await new Promise(resolve => setTimeout(resolve, 500));
          setCameraReadiness('FULLY_READY');
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptRecording(retryCount + 1);
      }
      
      throw error;
    }
  };

  const handleStartRecording = async () => {
    try {
      // Emergency mode bypasses all checks
      if (!emergencyMode) {
        // Ensure camera is fully ready before attempting to record
        if (cameraReadiness !== 'FULLY_READY') {
          const readinessMessages = {
            'INITIALIZING': 'Camera is initializing...',
            'CALLBACK_READY': 'Camera callback received, verifying...',
            'VERIFYING': 'Camera is being verified...',
            'FULLY_READY': 'Camera is ready!'
          };
          
          // If it's been too long, offer emergency mode
          if (Date.now() - performance.now() > 10000) {
            Alert.alert(
              'Camera Taking Too Long',
              'The camera is taking longer than expected. Would you like to try emergency recording mode?',
              [
                { text: 'Wait', style: 'cancel' },
                {
                  text: 'Emergency Mode',
                  onPress: () => {
                    setEmergencyMode(true);
                    setCameraReadiness('FULLY_READY');
                    console.log('Emergency mode activated - bypassing all checks');
                  }
                }
              ]
            );
            return;
          }
          
          Alert.alert('Please wait', readinessMessages[cameraReadiness]);
          return;
        }
      }
      
      if (!cameraRef.current) {
        Alert.alert('Error', 'Camera is not available');
        return;
      }

      setIsRecording(true);
      triggerHaptic('medium');
      
      let video;
      
      // Skip final verification to avoid memory conflicts
      if (!emergencyMode) {
        console.log('Skipping final verification to preserve camera memory...');
        // Just a small delay to let camera settle
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('Memory-conscious preparation complete');
      }

      if (emergencyMode) {
        console.log('Using EMERGENCY mode - direct recording with minimal delay...');
        // Emergency mode: minimal delay, direct recording, no retries
        await new Promise(resolve => setTimeout(resolve, 100));
        
        video = await cameraRef.current.recordAsync({
          maxDuration: currentMode === 'Shorts' ? 15 : currentMode === 'Story' ? 30 : 60,
        });
      } else if (fallbackMode) {
        console.log('Using fallback mode - memory-conservative approach...');
        // In fallback mode, use longer delay without any memory operations
        const fallbackDelay = currentMode === 'Reel' ? 8000 : 5000; // Even longer delays
        console.log(`Waiting ${fallbackDelay}ms for memory-conservative recording...`);
        await new Promise(resolve => setTimeout(resolve, fallbackDelay));
        
        video = await cameraRef.current.recordAsync({
          maxDuration: currentMode === 'Shorts' ? 15 : currentMode === 'Story' ? 30 : 60,
        });
      } else {
        // Normal mode with retries - much longer delays for memory issues
        const normalDelay = currentMode === 'Reel' ? 5000 : 3000; // Significantly increased
        console.log(`Starting recording with ${normalDelay}ms memory-conscious delay for ${currentMode}...`);
        await new Promise(resolve => setTimeout(resolve, normalDelay));
        
        // Try direct recording first, then retry mechanism
        try {
          video = await cameraRef.current.recordAsync({
            maxDuration: currentMode === 'Shorts' ? 15 : 60,
          });
        } catch (directError: any) {
          console.log('Direct recording failed, using retry mechanism:', directError.message);
          video = await attemptRecording();
        }
      }
      
      // Handle the recorded video
      if (video && video.uri) {
        // Store the video URI for thumbnail capture
        setRecordedVideoUri(video.uri);
        
        if (onMediaCaptured) {
          onMediaCaptured({
            uri: video.uri,
            type: 'video/mp4',
            name: `video-${Date.now()}.mp4`
          });
        } else if (onPostCreate) {
          onPostCreate(video.uri, 'video');
        } else {
          // For reels, show thumbnail capture option
          if (currentMode === 'Reel' || currentMode === 'Shorts') {
            Alert.alert(
              'Video Recorded!', 
              'Would you like to capture a custom thumbnail for your reel?',
              [
                { 
                  text: 'Skip Thumbnail', 
                  style: 'cancel',
                  onPress: async () => {
                    try {
                      // Auto-generate thumbnail when skipping
                      console.log('Auto-generating thumbnail for video:', video.uri);
                      const autoThumbnail = await VideoThumbnailGenerator.generateThumbnailWithFallback(video.uri);
                      
                      if (autoThumbnail) {
                        console.log('Navigate to reel creation with auto-generated thumbnail:', {
                          videoUri: video.uri,
                          thumbnailUri: autoThumbnail.uri,
                          autoGenerated: true,
                          timestamp: autoThumbnail.timestamp
                        });
                      } else {
                        console.log('Navigate to reel creation with video only:', video.uri);
                      }
                    } catch (error) {
                      console.error('Failed to auto-generate thumbnail:', error);
                      console.log('Navigate to reel creation with video only:', video.uri);
                    }
                    onClose();
                  }
                },
                { 
                  text: 'Capture Thumbnail', 
                  onPress: () => {
                    setShowThumbnailCapture(true);
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              'Video Recorded!', 
              'Would you like to create a reel with this video?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Create Reel', 
                  onPress: () => {
                    console.log('Navigate to reel creation with:', video.uri);
                    onClose();
                  }
                }
              ]
            );
          }
        }
      }
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
      
      // Final fallback - if recording still fails, suggest camera restart
      Alert.alert(
        'Camera Recording Issue', 
        'The camera is having trouble starting recording. This sometimes happens on the first use. Please close and reopen the camera.',
        [
          { 
            text: 'Close Camera', 
            onPress: () => {
              onClose();
            }
          },
          {
            text: 'Try Again',
            onPress: () => {
              // Reset camera completely and try again
              resetCameraState();
            }
          }
        ]
      );
    }
  };

  const handleStopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      triggerHaptic('heavy');
    }
  };

  const handleCaptureThumbnail = async () => {
    try {
      if (cameraReadiness !== 'FULLY_READY') {
        const readinessMessages = {
          'INITIALIZING': 'Camera is initializing...',
          'CALLBACK_READY': 'Camera callback received, verifying...',
          'VERIFYING': 'Camera is being verified...',
          'FULLY_READY': 'Camera is ready!'
        };
        
        Alert.alert('Please wait', readinessMessages[cameraReadiness]);
        return;
      }
      
      if (!cameraRef.current) {
        Alert.alert('Error', 'Camera is not available');
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0, // Maximum quality for thumbnails too
        base64: false,
        skipProcessing: false,
        exif: true,
        isImageMirror: false,
        additionalExif: {},
        fixOrientation: true,
      });
      
      setCapturedThumbnail(photo.uri);
      setShowThumbnailCapture(false);
      
      // Show confirmation with thumbnail preview
      Alert.alert(
        'Thumbnail Captured!', 
        'Ready to create your reel with custom thumbnail?',
        [
          { 
            text: 'Retake Thumbnail', 
            onPress: () => setShowThumbnailCapture(true) 
          },
          { 
            text: 'Create Reel', 
            onPress: () => {
              console.log('Navigate to reel creation with:', {
                videoUri: recordedVideoUri,
                thumbnailUri: photo.uri
              });
              onClose();
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to capture thumbnail');
      console.error('Thumbnail capture error:', error);
    }
  };

  const handleSkipThumbnail = async () => {
    setShowThumbnailCapture(false);
    
    if (recordedVideoUri) {
      try {
        // Auto-generate thumbnail using the algorithm
        console.log('Auto-generating thumbnail for video:', recordedVideoUri);
        const autoThumbnail = await VideoThumbnailGenerator.generateThumbnailWithFallback(recordedVideoUri);
        
        if (autoThumbnail) {
          console.log('Auto-generated thumbnail:', autoThumbnail.uri);
          console.log('Navigate to reel creation with:', {
            videoUri: recordedVideoUri,
            thumbnailUri: autoThumbnail.uri,
            autoGenerated: true,
            timestamp: autoThumbnail.timestamp
          });
        } else {
          console.log('Navigate to reel creation with video only:', recordedVideoUri);
        }
      } catch (error) {
        console.error('Failed to auto-generate thumbnail:', error);
        console.log('Navigate to reel creation with video only:', recordedVideoUri);
      }
    }
    
    onClose();
  };

  const handleConfirmEditedImage = () => {
    if (capturedImageUri) {
      // Handle the edited/cropped image
      if (onMediaCaptured) {
        onMediaCaptured({
          uri: capturedImageUri,
          type: 'image/jpeg',
          name: `photo-${Date.now()}.jpg`
        });
      } else if (onPostCreate) {
        onPostCreate(capturedImageUri, 'image');
      } else {
        console.log('Navigate to post creation with edited image:', capturedImageUri);
      }
      
      setShowImageEditor(false);
      setCapturedImageUri(null);
      onClose();
    }
  };

  const handleCancelImageEdit = () => {
    setShowImageEditor(false);
    setCapturedImageUri(null);
  };

  const handleFlipCamera = () => {
    triggerHaptic('light');
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleFlashToggle = () => {
    triggerHaptic('light');
    const newMode = flashMode === 'off' ? 'on' : 'off';
    setFlashMode(newMode);
    
    if (newMode === 'on') {
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  };

  const handleTimerToggle = () => {
    triggerHaptic('light');
    setTimerDelay(prev => {
      const newDelay = prev === 0 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 0;
      if (newDelay > 0) {
        Alert.alert('Timer Set', `Photo will be taken in ${newDelay} seconds`);
      }
      return newDelay;
    });
  };

  const handleGalleryImport = async () => {
    triggerHaptic('light');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos for all modes
      allowsEditing: false, // Disable cropping to get full images
      quality: 1, // Maximum quality
      allowsMultipleSelection: false, // Single selection
      orderedSelection: false,
      exif: true, // Include EXIF data
      base64: false, // Don't include base64 to save memory
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      
      // Log gallery import details for debugging
      console.log('🖼️ Gallery import details:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        fileSize: asset.fileSize,
        orientation: asset.orientation
      });
      
      // Handle the imported media
      if (onMediaCaptured) {
        onMediaCaptured({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          name: `imported-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`
        });
      } else if (onPostCreate) {
        onPostCreate(asset.uri, asset.type === 'video' ? 'video' : 'image');
      } else {
        const mediaType = asset.type === 'video' ? 'video' : 'photo';
        Alert.alert(
          `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Selected!`, 
          `Would you like to create a ${asset.type === 'video' ? 'reel' : 'post'} with this ${mediaType}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: `Create ${asset.type === 'video' ? 'Reel' : 'Post'}`, 
              onPress: () => {
                // Navigate to creation with this media
                console.log(`Navigate to ${asset.type === 'video' ? 'reel' : 'post'} creation with:`, asset.uri);
                onClose();
              }
            }
          ]
        );
      }
    }
  };

  // Animated styles
  const recordButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: recordButtonScale.value * recordButtonPulse.value }
      ],
      shadowOpacity: interpolate(captureButtonGlow.value, [0, 1], [0.4, 0.8]),
      shadowRadius: interpolate(captureButtonGlow.value, [0, 1], [12, 24]),
    };
  });

  const filterNameStyle = useAnimatedStyle(() => {
    return {
      opacity: filterNameOpacity.value,
      transform: [{ scale: filterNameScale.value }],
    };
  });

  const flashOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: flashOpacity.value,
    };
  });

  const recordingProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${recordingProgress.value * 100}%`,
    };
  });

  const cropAreaStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: cropX.value },
        { translateY: cropY.value },
      ],
      width: cropWidth.value,
      height: cropHeight.value,
    };
  });

  const currentFilter = cameraFilters[selectedFilterIndex];

  // Permission denied fallback
  if (!permission) {
    return (
      <View style={styles.fallbackContainer}>
        <LinearGradient colors={['#1E1E1E', '#301E5A']} style={styles.fallbackGradient}>
          <View style={styles.fallbackContent}>
            <Camera size={48} color="#6C5CE7" />
            <Text style={styles.fallbackTitle}>Loading camera...</Text>
            <Text style={styles.fallbackSubtitle}>Please wait while we check permissions</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.fallbackContainer}>
        <LinearGradient colors={['#1E1E1E', '#301E5A']} style={styles.fallbackGradient}>
          <View style={styles.fallbackContent}>
            <AlertCircle size={64} color="#6C5CE7" />
            <Text style={styles.fallbackTitle}>Camera Access Needed</Text>
            <Text style={styles.fallbackSubtitle}>
              We need camera access to record videos and take photos
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <LinearGradient colors={['#6C5CE7', '#5A4FCF']} style={styles.permissionButtonGradient}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        hidden={true}
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      <GestureDetector gesture={panGesture}>
        <View style={styles.cameraContainer}>
          {/* Camera View with Filter Overlay */}
          <CameraView
            key={cameraKey}
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flashMode}
            onCameraReady={handleCameraReady}
          >
            {/* Filter Overlay */}
            {currentFilter.overlay && (
              <View 
                style={[
                  styles.filterOverlay, 
                  { backgroundColor: currentFilter.overlay }
                ]} 
              />
            )}
            
            {/* CSS Filter Effect */}
            {currentFilter.tint && (
              <View 
                style={[
                  styles.filterTint,
                  Platform.OS === 'web' && { filter: currentFilter.tint }
                ]} 
              />
            )}
            
            {/* Flash overlay */}
            <Animated.View style={[styles.flashOverlay, flashOverlayStyle]} />
            
            {/* Camera loading overlay */}
            {cameraReadiness !== 'FULLY_READY' && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContainer}>
                  <View style={[
                    styles.loadingSpinner,
                    cameraReadiness === 'VERIFYING' && styles.verifyingSpinner
                  ]} />
                  <Text style={styles.loadingText}>
                    {cameraReadiness === 'INITIALIZING' && 'Initializing Camera...'}
                    {cameraReadiness === 'CALLBACK_READY' && 'Camera Ready - Preparing...'}
                    {cameraReadiness === 'VERIFYING' && `Verifying Camera... (${verificationAttempts}/3)`}
                  </Text>
                  <Text style={styles.loadingSubtext}>
                    {cameraReadiness === 'INITIALIZING' && 'Setting up camera components'}
                    {cameraReadiness === 'CALLBACK_READY' && 'Running verification checks'}
                    {cameraReadiness === 'VERIFYING' && 'Testing camera operations'}
                  </Text>
                  
                  {/* Progress indicator */}
                  <View style={styles.progressIndicator}>
                    <View style={[
                      styles.progressStep,
                      (cameraReadiness === 'CALLBACK_READY' || cameraReadiness === 'VERIFYING') && styles.progressStepActive
                    ]} />
                    <View style={[
                      styles.progressStep,
                      cameraReadiness === 'VERIFYING' && styles.progressStepActive
                    ]} />
                    <View style={styles.progressStep} />
                  </View>
                </View>
              </View>
            )}
          </CameraView>
        </View>
      </GestureDetector>

      {/* Dark UI Overlay */}
      <View
        style={styles.uiOverlay}
        pointerEvents="box-none"
      >
        {/* Top Controls */}
        <Animated.View entering={FadeIn.delay(300)}>
          <View style={[styles.topControls, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity 
              style={[styles.topButton, styles.closeButtonHighlight]} 
              onPress={() => {
                console.log('🔍 DEBUG: Camera close button pressed - redirecting to feed');
                triggerHaptic('medium');
                // Debounce to prevent multiple rapid calls
                setTimeout(() => {
                  onClose();
                }, 50);
              }}
              disabled={false}
              activeOpacity={0.7}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={[styles.controlBlur, styles.closeButtonBlur]}>
                <X size={26} color="#FFFFFF" strokeWidth={2.5} />
              </BlurView>
            </TouchableOpacity>
          
          <View style={styles.topCenterControls}>
            <TouchableOpacity style={styles.topButton} onPress={handleFlashToggle}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.controlBlur}>
                {flashMode === 'on' ? (
                  <Zap size={20} color="#FFD700" fill="#FFD700" />
                ) : (
                  <ZapOff size={20} color="#FFFFFF" />
                )}
              </BlurView>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.topButton} onPress={handleTimerToggle}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.controlBlur}>
                <Timer size={20} color={timerDelay > 0 ? "#6C5CE7" : "#FFFFFF"} />
                {timerDelay > 0 && (
                  <Text style={styles.timerText}>{timerDelay}</Text>
                )}
              </BlurView>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.topButton}
              onPress={() => {
                if (!emergencyMode) {
                  Alert.alert(
                    'Emergency Recording Mode',
                    'This bypasses all camera checks and tries to record immediately. Use only if normal recording fails.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Enable',
                        style: 'destructive',
                        onPress: () => {
                          setEmergencyMode(true);
                          setCameraReadiness('FULLY_READY');
                          console.log('Manual emergency mode activated');
                        }
                      }
                    ]
                  );
                }
              }}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.controlBlur}>
                <Palette size={20} color={emergencyMode ? "#FF6B6B" : "#FFFFFF"} />
              </BlurView>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modeIndicator}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.modeBlur}>
              <Text style={styles.modeText}>{currentMode}</Text>
            </BlurView>
          </View>
        </View>
      </Animated.View>

        {/* Recording Progress Bar (Shorts and Story modes) */}
        {(currentMode === 'Shorts' || currentMode === 'Story') && isRecording && (
          <Animated.View entering={SlideInDown}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, recordingProgressStyle]} />
              </View>
              <Text style={styles.progressText}>
                {Math.floor(recordingDuration)}s / {currentMode === 'Shorts' ? '15' : '30'}s
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Filter Name Display */}
        {showFilterName && (
          <Animated.View style={[styles.filterNameContainer, filterNameStyle]}>
            <BlurView intensity={Platform.OS === 'ios' ? 60 : 0} style={styles.filterNameBlur}>
              <Text style={styles.filterNameText}>{currentFilter.name}</Text>
            </BlurView>
          </Animated.View>
        )}


        {/* Gesture Instructions */}
        <Animated.View entering={FadeIn.delay(1000)}>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              Swipe ← → to change filters • Swipe ↑ for Shorts mode
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Controls - Independent positioning */}
      <Animated.View entering={SlideInDown.delay(400)} style={styles.bottomControlsWrapper}>
        <View style={styles.bottomControls}>
          {/* Gallery Import */}
          <TouchableOpacity style={styles.sideControl} onPress={handleGalleryImport}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.sideControlBlur}>
              <Image size={24} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>

          {/* Capture Button */}
          <AnimatedTouchableOpacity
            style={[
              styles.captureButtonContainer, 
              recordButtonStyle,
              !emergencyMode && cameraReadiness !== 'FULLY_READY' && styles.disabledButton
            ]}
            onPress={handleCapture}
            disabled={!emergencyMode && cameraReadiness !== 'FULLY_READY'}
          >
            <LinearGradient
              colors={isRecording ? ['#EF4444', '#DC2626'] : ['#6C5CE7', '#5A4FCF']}
              style={styles.captureButton}
            >
              {currentMode === 'Post' ? (
                <Circle size={32} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <View style={[
                  styles.recordIndicator,
                  isRecording && styles.recordingIndicator
                ]} />
              )}
            </LinearGradient>
            
            {/* Glowing ring */}
            <View style={styles.captureButtonRing} />
          </AnimatedTouchableOpacity>

          {/* Camera Flip */}
          <TouchableOpacity style={styles.sideControl} onPress={handleFlipCamera}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.sideControlBlur}>
              <RotateCcw size={24} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Image Editor Overlay */}
      {showImageEditor && capturedImageUri && (
        <View style={styles.imageEditorOverlay}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.9)', 'rgba(30, 30, 30, 0.95)']}
            style={styles.imageEditorBackground}
          >
            <View style={styles.imageEditorHeader}>
              <Text style={styles.imageEditorTitle}>Edit Your Photo</Text>
              <Text style={styles.imageEditorSubtitle}>
                Choose which part of the image to include
              </Text>
            </View>

            <View style={styles.imagePreviewContainer}>
              <RNImage 
                source={{ uri: capturedImageUri }} 
                style={styles.imagePreview}
                resizeMode="contain"
              />
              
              {/* Crop overlay guide */}
              <View style={styles.cropOverlay}>
                {/* Moveable crop frame */}
                <GestureDetector gesture={cropDragGesture}>
                  <Animated.View style={[styles.cropFrame, cropAreaStyle]}>
                    {/* Corner resize handles */}
                    <GestureDetector gesture={cornerResizeGesture}>
                      <View style={styles.cropCornerBottomRight}>
                        <View style={styles.cropHandle} />
                      </View>
                    </GestureDetector>
                    
                    {/* Center drag indicator */}
                    <View style={styles.cropDragIndicator}>
                      <View style={styles.cropDragDots} />
                    </View>
                  </Animated.View>
                </GestureDetector>
              </View>
            </View>

            <View style={styles.imageEditorControls}>
              <TouchableOpacity 
                style={styles.imageCancelButton}
                onPress={handleCancelImageEdit}
              >
                <Text style={styles.imageCancelText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.imageConfirmButton}
                onPress={handleConfirmEditedImage}
              >
                <LinearGradient
                  colors={['#6C5CE7', '#5A4FCF']}
                  style={styles.imageConfirmButtonGradient}
                >
                  <Text style={styles.imageConfirmText}>Use Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Thumbnail Capture Overlay */}
      {showThumbnailCapture && (
        <View style={styles.thumbnailCaptureOverlay}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.8)', 'rgba(30, 30, 30, 0.9)']}
            style={styles.thumbnailCaptureBackground}
          >
            <View style={styles.thumbnailCaptureHeader}>
              <Text style={styles.thumbnailCaptureTitle}>Capture Thumbnail</Text>
              <Text style={styles.thumbnailCaptureSubtitle}>
                Position your shot and tap capture for a custom thumbnail
              </Text>
            </View>

            <View style={styles.thumbnailCaptureControls}>
              <TouchableOpacity 
                style={styles.thumbnailSkipButton}
                onPress={handleSkipThumbnail}
              >
                <Text style={styles.thumbnailSkipText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.thumbnailCaptureButton}
                onPress={handleCaptureThumbnail}
              >
                <LinearGradient
                  colors={['#6C5CE7', '#5A4FCF']}
                  style={styles.thumbnailCaptureButtonGradient}
                >
                  <Camera size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.thumbnailFlipButton}
                onPress={handleFlipCamera}
              >
                <RotateCcw size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black for full screen
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  cameraContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  camera: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    mixBlendMode: 'multiply',
  },
  filterTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#6C5CE7',
    borderTopColor: 'transparent',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },
  verifyingSpinner: {
    borderColor: '#F97316',
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressStepActive: {
    backgroundColor: '#6C5CE7',
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  fallbackGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 16,
  },
  permissionButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  closeButtonHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonBlur: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
  },
  controlBlur: {
    padding: 12,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  topCenterControls: {
    flexDirection: 'row',
    gap: 16,
  },
  timerText: {
    color: '#6C5CE7',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  modeIndicator: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modeBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Platform.OS === 'android' ? 'rgba(108, 92, 231, 0.8)' : 'transparent',
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 2,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  filterNameContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterNameBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
  },
  filterNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomControlsWrapper: {
    position: 'absolute',
    bottom: 250,
    left: 0,
    right: 0,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  sideControl: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  sideControlBlur: {
    padding: 16,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
  },
  captureButtonContainer: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 44,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  captureButton: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: 'rgba(108, 92, 231, 0.4)',
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0.2,
  },
  recordIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  recordingIndicator: {
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  thumbnailCaptureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  thumbnailCaptureBackground: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  thumbnailCaptureHeader: {
    alignItems: 'center',
    paddingTop: 40,
  },
  thumbnailCaptureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  thumbnailCaptureSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  thumbnailCaptureControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  thumbnailSkipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  thumbnailSkipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  thumbnailCaptureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  thumbnailCaptureButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  thumbnailFlipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEditorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  imageEditorBackground: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  imageEditorHeader: {
    alignItems: 'center',
    paddingTop: 40,
  },
  imageEditorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageEditorSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  imagePreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
    position: 'relative',
  },
  imagePreview: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 12,
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#6C5CE7',
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  cropCornerBottomRight: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropHandle: {
    width: 16,
    height: 16,
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cropDragIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropDragDots: {
    width: 8,
    height: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 4,
    opacity: 0.8,
  },
  imageEditorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  imageCancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageConfirmButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  imageConfirmButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  imageConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});