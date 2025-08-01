import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Video, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import CameraScreen from '../../components/CameraScreen';
import { useDebugLogger, debug } from '@/utils/debugLogger';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CreateScreen() {
  const debugLogger = useDebugLogger('CreateScreen');
  const router = useRouter();
  const [showCamera, setShowCamera] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<'photo' | 'video'>('photo');

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Create screen loaded');
  }, []);

  const photoButtonScale = useSharedValue(1);
  const videoButtonScale = useSharedValue(1);

  const handleTakePhoto = () => {
    debug.userAction('Take photo button pressed');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
      debugLogger.error('Haptics error', (error as Error).message);
    }
    
    photoButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    
    setCameraMode('photo');
    setShowCamera(true);
    debug.userAction('Camera opened in photo mode');
  };

  const handleRecordVideo = () => {
    debug.userAction('Record video button pressed');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
      debugLogger.error('Haptics error', (error as Error).message);
    }
    
    videoButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    
    setCameraMode('video');
    setShowCamera(true);
    debug.userAction('Camera opened in video mode');
  };

  const handleCloseCamera = () => {
    debug.userAction('Close camera');
    setShowCamera(false);
  };

  const photoButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoButtonScale.value }],
  }));

  const videoButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: videoButtonScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      
      <LinearGradient
        colors={['#1E1E1E', '#2A2A2A', '#121212']}
        style={styles.background}
      >
        {/* Header */}
        <Animated.View 
          style={styles.header}
          entering={FadeIn.duration(800)}
        >
          <Text style={styles.title}>Create</Text>
          <Text style={styles.subtitle}>Share your moment with The Club</Text>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Take Photo Button */}
          <AnimatedTouchableOpacity
            style={[styles.actionButton, photoButtonStyle]}
            onPress={handleTakePhoto}
            entering={SlideInUp.delay(200).springify()}
          >
            <LinearGradient
              colors={['#6C5CE7', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Camera size={32} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Take Photo</Text>
                  <Text style={styles.buttonSubtitle}>Capture a moment</Text>
                </View>
              </View>
            </LinearGradient>
          </AnimatedTouchableOpacity>

          {/* Record Video Button */}
          <AnimatedTouchableOpacity
            style={[styles.actionButton, videoButtonStyle]}
            onPress={handleRecordVideo}
            entering={SlideInUp.delay(400).springify()}
          >
            <LinearGradient
              colors={['#6C5CE7', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Video size={32} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Record Video</Text>
                  <Text style={styles.buttonSubtitle}>Create a short video</Text>
                </View>
              </View>
            </LinearGradient>
          </AnimatedTouchableOpacity>
        </View>

        {/* Feature Highlights */}
        <Animated.View 
          style={styles.featuresContainer}
          entering={FadeIn.delay(600)}
        >
          <View style={styles.featureItem}>
            <Play size={16} color="#6C5CE7" />
            <Text style={styles.featureText}>15-second Shorts</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.filterDot} />
            <Text style={styles.featureText}>Real-time Filters</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.gestureIcon} />
            <Text style={styles.featureText}>Swipe Gestures</Text>
          </View>
        </Animated.View>

        {/* Instructions */}
        <Animated.View 
          style={styles.instructionsContainer}
          entering={FadeIn.delay(800)}
        >
          <Text style={styles.instructionsText}>
            Swipe gestures in camera: ← → filters • ↑ Shorts mode
          </Text>
        </Animated.View>
      </LinearGradient>
      
      {/* Camera Screen Modal */}
      {showCamera && (
        <CameraScreen 
          isVisible={showCamera} 
          onClose={handleCloseCamera}
          initialMode={cameraMode}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  background: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 16,
    color: '#C5C5C5',
    textAlign: 'center',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    gap: 20,
    marginBottom: 40,
  },
  actionButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonGradient: {
    padding: 24,
    minHeight: 100,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  filterDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  gestureIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 'auto',
    marginBottom: 40,
  },
  instructionsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});