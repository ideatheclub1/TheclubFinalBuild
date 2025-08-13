import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Video, Play, Upload, X } from 'lucide-react-native';
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
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import { Video as VideoPlayer, ResizeMode } from 'expo-av';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CreateScreen() {
  const debugLogger = useDebugLogger('CreateScreen');
  const router = useRouter();
  const { user } = useUser();
  
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [createMode, setCreateMode] = useState<'post' | 'reel'>('post');
  const [capturedMedia, setCapturedMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
    name: string;
  } | null>(null);
  const [postContent, setPostContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
    setCreateMode('post'); // Photos default to posts
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
    setCreateMode('reel'); // Videos default to reels
    setShowCamera(true);
    debug.userAction('Camera opened in video mode');
  };

  const handleCloseCamera = () => {
    debug.userAction('Close camera');
    setShowCamera(false);
  };

  const handleMediaCaptured = (asset: { uri: string; type?: string; name?: string }) => {
    debug.userAction('Media captured', { type: asset.type, name: asset.name });
    debugLogger.info('MEDIA', 'CAPTURED', `Media captured: ${asset.name}`);
    
    setCapturedMedia({
      uri: asset.uri,
      type: asset.type?.startsWith('video/') ? 'video' : 'image',
      name: asset.name || `media-${Date.now()}`
    });
    setShowCamera(false);
  };

  const handleUploadAndCreatePost = async () => {
    if (!capturedMedia || !user) {
      Alert.alert('Error', 'No media or user found');
      return;
    }

    try {
      setIsUploading(true);
      debug.userAction('Upload and create post', { mediaType: capturedMedia.type });
      debugLogger.info('POST', 'CREATE_START', `Creating post with ${capturedMedia.type}`);

      // Upload media to storage
      const uploadResult = capturedMedia.type === 'video' 
        ? await dataService.storage.uploadVideo(
            { uri: capturedMedia.uri, type: capturedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg', name: capturedMedia.name },
            'reels',
            user.id
          )
        : await dataService.storage.uploadImage(
            { uri: capturedMedia.uri, type: 'image/jpeg', name: capturedMedia.name },
            'user-media',
            user.id
          );

      if (!uploadResult) {
        throw new Error('Failed to upload media');
      }

      debugLogger.info('UPLOAD', 'SUCCESS', `Media uploaded: ${uploadResult.url}`);

      // Create the post or reel based on user's mode selection
      const content = postContent.trim() || `Check out my ${capturedMedia.type}!`;
      
      let post = null;
      if (createMode === 'post') {
        // Create a post (for images or videos)
        post = await dataService.post.createPost(user.id, content, uploadResult.url);
      } else if (createMode === 'reel') {
        // Create a reel (for images or videos)
        post = await dataService.reel.createReel(
          user.id,
          uploadResult.url,
          content,
          0, // duration will be calculated by the app
          undefined, // hashtags
          undefined // musicInfo
        );
      }

      if (post) {
        debugLogger.info('POST', 'CREATE_SUCCESS', 'Post created successfully');
        Alert.alert(
          'Success!', 
          `Your ${capturedMedia.type === 'video' ? 'video' : 'photo'} has been posted!`,
          [
            {
              text: 'View Feed',
              onPress: () => router.back()
            },
            {
              text: 'Create Another',
              onPress: () => {
                setCapturedMedia(null);
                setPostContent('');
                Keyboard.dismiss();
              }
            }
          ]
        );
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      debugLogger.error('POST', 'CREATE_ERROR', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscardMedia = () => {
    Alert.alert(
      'Discard Media',
      'Are you sure you want to discard this media?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setCapturedMedia(null);
            setPostContent('');
            Keyboard.dismiss();
            debug.userAction('Media discarded');
          }
        }
      ]
    );
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
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
      
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <LinearGradient
          colors={['#1E1E1E', '#2A2A2A', '#121212']}
          style={styles.background}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        {/* Header */}
        <Animated.View 
          style={styles.header}
          entering={FadeIn.duration(800)}
        >
          <Text style={styles.title}>Create</Text>
          <Text style={styles.subtitle}>
            {capturedMedia ? `Create your ${createMode}` : 'Share your moment with The Club'}
          </Text>
        </Animated.View>

        {/* Mode Selector - Only show when no media is captured */}
        {!capturedMedia && (
          <Animated.View 
            style={styles.modeSelectorContainer}
            entering={FadeIn.delay(200)}
          >
            <TouchableOpacity
              style={[
                styles.modeButton,
                createMode === 'post' && styles.modeButtonActive
              ]}
              onPress={() => setCreateMode('post')}
            >
              <Text style={[
                styles.modeButtonText,
                createMode === 'post' && styles.modeButtonTextActive
              ]}>
                Post
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                createMode === 'reel' && styles.modeButtonActive
              ]}
              onPress={() => setCreateMode('reel')}
            >
              <Text style={[
                styles.modeButtonText,
                createMode === 'reel' && styles.modeButtonTextActive
              ]}>
                Reel
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Media Preview and Post Creation */}
        {capturedMedia && (
          <Animated.View 
            style={styles.mediaPreviewContainer}
            entering={FadeIn.duration(500)}
          >
            {/* Media Preview */}
            <View style={styles.mediaPreview}>
              {capturedMedia.type === 'video' ? (
                <VideoPlayer
                  source={{ uri: capturedMedia.uri }}
                  style={styles.previewMedia}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isLooping={false}
                  useNativeControls
                />
              ) : (
                <Image
                  source={{ uri: capturedMedia.uri }}
                  style={styles.previewMedia}
                  resizeMode="cover"
                />
              )}
              
              {/* Discard Button */}
              <TouchableOpacity
                style={styles.discardButton}
                onPress={handleDiscardMedia}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Post Content Input */}
            <View style={styles.postInputContainer}>
              <TextInput
                style={styles.postInput}
                placeholder="Write a caption..."
                placeholderTextColor="#888888"
                multiline
                maxLength={500}
                value={postContent}
                onChangeText={setPostContent}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={dismissKeyboard}
              />
            </View>

            {/* Create Post Button */}
            <TouchableOpacity
              style={[styles.createPostButton, isUploading && styles.createPostButtonDisabled]}
              onPress={handleUploadAndCreatePost}
              disabled={isUploading}
            >
              <LinearGradient
                colors={isUploading ? ['#888888', '#666666'] : ['#6C5CE7', '#EC4899']}
                style={styles.createPostButtonGradient}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Upload size={20} color="#FFFFFF" />
                )}
                <Text style={styles.createPostButtonText}>
                  {isUploading ? `Creating ${createMode === 'reel' ? 'Reel' : 'Post'}...` : `Create ${createMode === 'reel' ? 'Reel' : 'Post'}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Action Buttons - Only show when no media is captured */}
        {!capturedMedia && (
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
                  <Text style={styles.buttonTitle}>
                    {createMode === 'reel' ? 'Record Reel' : 'Take Photo'}
                  </Text>
                  <Text style={styles.buttonSubtitle}>
                    {createMode === 'reel' ? 'Create a short video' : 'Capture a moment'}
                  </Text>
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
                  <Text style={styles.buttonTitle}>
                    {createMode === 'reel' ? 'Record Reel' : 'Record Video'}
                  </Text>
                  <Text style={styles.buttonSubtitle}>
                    {createMode === 'reel' ? 'Create a trending reel' : 'Create a short video'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </AnimatedTouchableOpacity>
        </View>
        )}

        {/* Feature Highlights - Only show when no media is captured */}
        {!capturedMedia && (
        <>
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
        </>
        )}
          </ScrollView>
        </LinearGradient>
      </TouchableWithoutFeedback>
      
      {/* Camera Screen Modal */}
      {showCamera && (
        <CameraScreen 
          isVisible={showCamera} 
          onClose={handleCloseCamera}
          initialMode={cameraMode}
          onMediaCaptured={handleMediaCaptured}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  // Media Preview Styles
  mediaPreviewContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mediaPreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  previewMedia: {
    width: '100%',
    height: 300,
    backgroundColor: '#2A2A2A',
  },
  discardButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    marginBottom: 20,
  },
  postInput: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createPostButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createPostButtonDisabled: {
    shadowOpacity: 0.1,
  },
  createPostButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  createPostButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // Mode Selector Styles
  modeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  modeButtonTextActive: {
    color: '#6C5CE7',
  },
});