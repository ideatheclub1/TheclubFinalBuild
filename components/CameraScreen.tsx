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
} from 'react-native';
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
import { X, RotateCcw, Zap, ZapOff, Image, Video, Circle, Camera, CircleAlert as AlertCircle, Timer, Palette } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraScreenProps {
  isVisible: boolean;
  onClose: () => void;
  initialMode?: 'photo' | 'video';
  onMediaCaptured?: (asset: { uri: string; type?: string; name?: string }) => void;
  onPostCreate?: (mediaUri: string, mediaType: 'image' | 'video') => void;
}

type CameraMode = 'Post' | 'Reel' | 'Story' | 'Shorts';

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
    overlay: 'rgba(139, 92, 246, 0.15)',
    tint: 'sepia(0.8) contrast(1.2)' 
  },
  { 
    id: 'blackwhite', 
    name: 'B&W', 
    overlay: null,
    tint: 'grayscale(1) contrast(1.1)' 
  },
  { 
    id: 'sepia', 
    name: 'Sepia', 
    overlay: 'rgba(139, 69, 19, 0.2)',
    tint: 'sepia(1) brightness(1.1)' 
  },
  { 
    id: 'vibrant', 
    name: 'Vibrant', 
    overlay: 'rgba(108, 92, 231, 0.1)',
    tint: 'saturate(1.5) contrast(1.2)' 
  },
  { 
    id: 'cool', 
    name: 'Cool', 
    overlay: 'rgba(59, 130, 246, 0.15)',
    tint: 'hue-rotate(15deg) saturate(1.2)' 
  },
  { 
    id: 'warm', 
    name: 'Warm', 
    overlay: 'rgba(251, 146, 60, 0.1)',
    tint: 'hue-rotate(-15deg) brightness(1.1)' 
  },
];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CameraScreen({ 
  isVisible, 
  onClose, 
  initialMode = 'video',
  onMediaCaptured,
  onPostCreate 
}: CameraScreenProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [currentMode, setCurrentMode] = useState<CameraMode>(initialMode === 'photo' ? 'Post' : 'Reel');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  const [showFilterName, setShowFilterName] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timerDelay, setTimerDelay] = useState(0);
  
  const cameraRef = useRef<CameraView>(null);
  const recordingTimer = useRef<number | null>(null);
  
  // Animation values
  const recordButtonScale = useSharedValue(1);
  const recordButtonPulse = useSharedValue(0);
  const filterNameOpacity = useSharedValue(0);
  const filterNameScale = useSharedValue(0.8);
  const flashOpacity = useSharedValue(0);
  const recordingProgress = useSharedValue(0);
  const captureButtonGlow = useSharedValue(0);

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
      
      // Start recording timer for Shorts mode
      if (currentMode === 'Shorts') {
        recordingTimer.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 0.1;
            recordingProgress.value = withTiming(newDuration / 15, { duration: 100 });
            
            if (newDuration >= 15) {
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

  const handleCapture = async () => {
    triggerHaptic('heavy');
    recordButtonScale.value = withSequence(
      withSpring(0.8, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    if (currentMode === 'Post') {
      // Take photo
      try {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.8,
            base64: false,
          });
          
          // Handle the captured photo
          if (onMediaCaptured) {
            onMediaCaptured({
              uri: photo.uri,
              type: 'image/jpeg',
              name: `photo-${Date.now()}.jpg`
            });
          } else if (onPostCreate) {
            onPostCreate(photo.uri, 'image');
          } else {
            Alert.alert(
              'Photo Captured!', 
              'Would you like to create a post with this photo?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Create Post', 
                  onPress: () => {
                    // Navigate to post creation with this image
                    console.log('Navigate to post creation with:', photo.uri);
                    onClose();
                  }
                }
              ]
            );
          }
        }
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

  const handleStartRecording = async () => {
    try {
      if (cameraRef.current) {
        setIsRecording(true);
        triggerHaptic('medium');
        
        const video = await cameraRef.current.recordAsync({
          maxDuration: currentMode === 'Shorts' ? 15 : 60,
        });
        
        // Handle the recorded video
        if (video && video.uri) {
          if (onMediaCaptured) {
            onMediaCaptured({
              uri: video.uri,
              type: 'video/mp4',
              name: `video-${Date.now()}.mp4`
            });
          } else if (onPostCreate) {
            onPostCreate(video.uri, 'video');
          } else {
            Alert.alert(
              'Video Recorded!', 
              'Would you like to create a reel with this video?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Create Reel', 
                  onPress: () => {
                    // Navigate to reel creation with this video
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
    }
  };

  const handleStopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      triggerHaptic('heavy');
    }
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
      mediaTypes: currentMode === 'Post' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: currentMode === 'Story' ? [9, 16] : [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      
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
      <StatusBar hidden />
      
      <GestureDetector gesture={panGesture}>
        <View style={styles.cameraContainer}>
          {/* Camera View with Filter Overlay */}
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flashMode}
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
          </CameraView>
        </View>
      </GestureDetector>

      {/* Dark UI Overlay */}
      <LinearGradient
        colors={['rgba(30, 30, 30, 0.7)', 'rgba(48, 30, 90, 0.8)', 'rgba(30, 30, 30, 0.9)']}
        style={styles.uiOverlay}
        pointerEvents="box-none"
      >
        {/* Top Controls */}
        <Animated.View entering={FadeIn.delay(300)}>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.topButton} onPress={onClose}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.controlBlur}>
                <X size={24} color="#FFFFFF" />
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
            
            <TouchableOpacity style={styles.topButton}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.controlBlur}>
                <Palette size={20} color="#FFFFFF" />
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

        {/* Recording Progress Bar (Shorts mode only) */}
        {currentMode === 'Shorts' && isRecording && (
          <Animated.View entering={SlideInDown}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, recordingProgressStyle]} />
              </View>
              <Text style={styles.progressText}>
                {Math.floor(recordingDuration)}s / 15s
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

        {/* Bottom Controls */}
        <Animated.View entering={SlideInDown.delay(400)}>
          <View style={styles.bottomControls}>
            {/* Gallery Import */}
            <TouchableOpacity style={styles.sideControl} onPress={handleGalleryImport}>
              <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} style={styles.sideControlBlur}>
                <Image size={24} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>

          {/* Capture Button */}
          <AnimatedTouchableOpacity
            style={[styles.captureButtonContainer, recordButtonStyle]}
            onPress={handleCapture}
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

        {/* Gesture Instructions */}
        <Animated.View entering={FadeIn.delay(1000)}>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              Swipe ← → to change filters • Swipe ↑ for Shorts mode
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
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
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
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
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topButton: {
    borderRadius: 25,
    overflow: 'hidden',
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
    top: '45%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -20 }],
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
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'android' ? 40 : 60,
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
    bottom: 120,
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
});