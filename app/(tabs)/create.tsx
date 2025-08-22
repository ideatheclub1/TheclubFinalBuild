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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Video, Play, Upload, X, Image as ImageIcon } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import CameraScreen from '../../components/CameraScreen';
import { useDebugLogger, debug } from '@/utils/debugLogger';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import { Video as VideoPlayer, ResizeMode } from 'expo-av';
import { VideoThumbnailGenerator } from '@/utils/videoThumbnailGenerator';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function CreateScreen() {
  const debugLogger = useDebugLogger('CreateScreen');
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams();
  
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [createMode, setCreateMode] = useState<'post' | 'reel' | 'story'>(
    params.mode === 'story' ? 'story' : params.mode === 'reel' ? 'reel' : 'post'
  );
  const [capturedMedia, setCapturedMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
    name: string;
  } | null>(null);
  const [postContent, setPostContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<{
    uri: string;
    timestamp: number;
  } | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);

  // Debug: Page load
  useEffect(() => {
    debug.pageLoad('Create screen loaded');
  }, []);

  const photoButtonScale = useSharedValue(1);
  const videoButtonScale = useSharedValue(1);
  const uploadButtonScale = useSharedValue(1);

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
    // Keep the current createMode (reel or story)
    setShowCamera(true);
    debug.userAction('Camera opened in video mode');
  };

  const handleCloseCamera = () => {
    debug.userAction('Close camera - navigating back to create screen');
    setShowCamera(false);
    // Optional: Navigate back to index/feed if needed
    // router.replace('/(tabs)/');
  };

  const handleUploadMedia = async () => {
    debug.userAction('Upload media button pressed');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    uploadButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );

    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload media.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker with both images and videos
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false, // No cropping/editing
      quality: 1.0, // Full quality to preserve original dimensions
      videoMaxDuration: 30, // 30 seconds max for stories
      presentationStyle: 'fullScreen', // Full screen presentation
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Properly detect media type based on the asset
      console.log('📱 Asset details:', { type: asset.type, fileName: asset.fileName, uri: asset.uri });
      
      // Multiple detection methods for media type
      let mediaType = 'image'; // default
      if (asset.type?.startsWith('video/')) {
        mediaType = 'video';
      } else if (asset.fileName) {
        // Fallback: check file extension if MIME type is not available
        const extension = asset.fileName.toLowerCase().split('.').pop();
        if (extension && ['mp4', 'mov', 'avi', 'mkv', 'm4v'].includes(extension)) {
          mediaType = 'video';
        }
      }
      
      const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
      console.log('📱 Detected media type:', mediaType, 'from type:', asset.type, 'fileName:', asset.fileName);
      
      setCapturedMedia({
        uri: asset.uri,
        type: mediaType,
        name: asset.fileName || `uploaded-${mediaType}-${Date.now()}.${fileExtension}`
      });
      debugLogger.info('MEDIA', 'UPLOADED', `${mediaType} uploaded from gallery: ${asset.fileName || 'unknown'}`);
    }
  };

  const handleMediaCaptured = async (asset: { uri: string; type?: string; name?: string }) => {
    debug.userAction('Media captured', { type: asset.type, name: asset.name });
    debugLogger.info('MEDIA', 'CAPTURED', `Media captured: ${asset.name}`);
    
    const mediaType = asset.type?.startsWith('video/') ? 'video' : 'image';
    
    setCapturedMedia({
      uri: asset.uri,
      type: mediaType,
      name: asset.name || `media-${Date.now()}`
    });
    setShowCamera(false);

    // For stories, just set the media and let user manually upload
    if (createMode === 'story') {
      debugLogger.info('STORY', 'MEDIA_SET', 'Story mode detected, media set for manual upload');
      return;
    }

    // Generate thumbnail for videos immediately (for reels only now)
    if (mediaType === 'video' && createMode === 'reel') {
      setIsGeneratingThumbnail(true);
      try {
        debugLogger.info('THUMBNAIL', 'AUTO_GENERATE_START', 'Auto-generating thumbnail for captured video');
        const thumbnail = await VideoThumbnailGenerator.generateThumbnailWithFallback(asset.uri);
        
        if (thumbnail) {
          setGeneratedThumbnail({
            uri: thumbnail.uri,
            timestamp: thumbnail.timestamp
          });
          debugLogger.info('THUMBNAIL', 'AUTO_GENERATE_SUCCESS', `Thumbnail generated at ${thumbnail.timestamp}ms`);
        }
      } catch (error) {
        debugLogger.error('THUMBNAIL', 'AUTO_GENERATE_ERROR', `Failed to auto-generate thumbnail: ${error}`);
      } finally {
        setIsGeneratingThumbnail(false);
      }
    }
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

      // Upload existing thumbnail for reels only (stories don't need thumbnails)
      let thumbnailUrl = null;
      if (capturedMedia.type === 'video' && createMode === 'reel' && generatedThumbnail) {
        try {
          debugLogger.info('THUMBNAIL', 'UPLOAD_START', `Uploading existing thumbnail for ${createMode}`);
          
          // Upload thumbnail to storage
          const thumbnailUploadResult = await dataService.storage.uploadImage(
            { 
              uri: generatedThumbnail.uri, 
              type: 'image/jpeg', 
              name: `${capturedMedia.name}_thumbnail.jpg` 
            },
            'thumbnails',
            user.id,
            {
              quality: 0.8,
              folder: 'reels'
            }
          );
          
          if (thumbnailUploadResult) {
            thumbnailUrl = thumbnailUploadResult.url;
            debugLogger.info('THUMBNAIL', 'UPLOAD_SUCCESS', `Thumbnail uploaded: ${thumbnailUrl}`);
          }
        } catch (error) {
          debugLogger.error('THUMBNAIL', 'UPLOAD_ERROR', `Failed to upload thumbnail: ${error}`);
          // Continue without thumbnail - not a blocking error
        }
      }

      // Upload media to storage
      const uploadResult = capturedMedia.type === 'video' 
        ? await dataService.storage.uploadVideo(
            { uri: capturedMedia.uri, type: 'video/mp4', name: capturedMedia.name },
            createMode === 'story' ? 'user-media' : 'reels', // Stories go to user-media, reels to reels bucket
            user.id,
            createMode === 'story' ? { folder: 'stories' } : undefined // Add folder for stories
          )
        : await dataService.storage.uploadImage(
            { uri: capturedMedia.uri, type: 'image/jpeg', name: capturedMedia.name },
            'user-media',
            user.id,
            {
              quality: 1.0, // Maximum quality
              folder: createMode === 'story' ? 'stories' : 'posts' // Organize by content type
            }
          );

      if (!uploadResult) {
        throw new Error('Failed to upload media');
      }

      debugLogger.info('UPLOAD', 'SUCCESS', `Media uploaded: ${uploadResult.url}`);

      // Create the post, reel, or story based on user's mode selection
      const content = postContent.trim() || `Check out my ${capturedMedia.type}!`;
      
      let post = null;
      if (createMode === 'post') {
        // Create a post (for images or videos)
        post = await dataService.post.createPost(user.id, content, uploadResult.url);
      } else if (createMode === 'reel') {
        // Create a reel (for images or videos) with thumbnail
        post = await dataService.reel.createReel(
          user.id,
          uploadResult.url,
          content,
          0, // duration will be calculated by the app
          undefined, // hashtags
          undefined, // musicInfo
          thumbnailUrl // pass the thumbnail URL
        );
      } else if (createMode === 'story') {
        // Create a story (for images or videos) - stories don't need captions or thumbnails
        post = await dataService.story.createStory(
          user.id,
          uploadResult.url, // mediaUrl - the uploaded image or video URL
          capturedMedia.type, // mediaType - 'image' or 'video'
          24 // expiresInHours - stories expire in 24 hours
        );
      }

      if (post) {
        debugLogger.info('POST', 'CREATE_SUCCESS', 'Post created successfully');
        
        if (createMode === 'story') {
          // For stories, navigate immediately without alert - stories should be quick and seamless
          debugLogger.info('STORY', 'SUCCESS', 'Story posted successfully, navigating to feed');
          router.replace('/(tabs)/');
        } else {
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
        }
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
            setGeneratedThumbnail(null);
            setPostContent('');
            Keyboard.dismiss();
            debug.userAction('Media discarded');
          }
        }
      ]
    );
  };

  const handleRegenerateThumbnail = async () => {
    if (!capturedMedia || capturedMedia.type !== 'video') return;
    
    setIsGeneratingThumbnail(true);
    try {
      debugLogger.info('THUMBNAIL', 'REGENERATE_START', 'Regenerating thumbnail with random strategy');
      const thumbnail = await VideoThumbnailGenerator.generateSingleThumbnail(
        capturedMedia.uri, 
        { strategy: 'random' }
      );
      
      if (thumbnail) {
        setGeneratedThumbnail({
          uri: thumbnail.uri,
          timestamp: thumbnail.timestamp
        });
        debugLogger.info('THUMBNAIL', 'REGENERATE_SUCCESS', `New thumbnail generated at ${thumbnail.timestamp}ms`);
      }
    } catch (error) {
      debugLogger.error('THUMBNAIL', 'REGENERATE_ERROR', `Failed to regenerate thumbnail: ${error}`);
      Alert.alert('Error', 'Failed to generate new thumbnail. Please try again.');
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleSelectThumbnailFrame = async (timeInSeconds: number) => {
    if (!capturedMedia || capturedMedia.type !== 'video') return;
    
    setIsGeneratingThumbnail(true);
    try {
      debugLogger.info('THUMBNAIL', 'CUSTOM_FRAME_START', `Generating thumbnail at ${timeInSeconds}s`);
      const thumbnail = await VideoThumbnailGenerator.generateSingleThumbnail(
        capturedMedia.uri, 
        { time: timeInSeconds * 1000 } // Convert to milliseconds
      );
      
      if (thumbnail) {
        setGeneratedThumbnail({
          uri: thumbnail.uri,
          timestamp: thumbnail.timestamp
        });
        debugLogger.info('THUMBNAIL', 'CUSTOM_FRAME_SUCCESS', `Custom thumbnail generated at ${thumbnail.timestamp}ms`);
      }
    } catch (error) {
      debugLogger.error('THUMBNAIL', 'CUSTOM_FRAME_ERROR', `Failed to generate custom thumbnail: ${error}`);
      Alert.alert('Error', 'Failed to generate thumbnail at selected time. Please try again.');
    } finally {
      setIsGeneratingThumbnail(false);
    }
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

  const uploadButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: uploadButtonScale.value }],
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
            {capturedMedia ? `Create your ${createMode}` : 
             createMode === 'story' ? 'Share a 30-second story with The Club' :
             createMode === 'reel' ? 'Create a trending reel for The Club' :
             'Share your moment with The Club'}
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
            <TouchableOpacity
              style={[
                styles.modeButton,
                createMode === 'story' && styles.modeButtonActive
              ]}
              onPress={() => setCreateMode('story')}
            >
              <Text style={[
                styles.modeButtonText,
                createMode === 'story' && styles.modeButtonTextActive
              ]}>
                Story
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

            {/* Thumbnail Preview for Reels Only */}
            {capturedMedia.type === 'video' && createMode === 'reel' && (
              <View style={styles.thumbnailSection}>
                <Text style={styles.thumbnailTitle}>
                  Reel Thumbnail
                </Text>
                
                <View style={styles.thumbnailPreviewContainer}>
                  {isGeneratingThumbnail ? (
                    <View style={styles.thumbnailPlaceholder}>
                      <ActivityIndicator size="large" color="#6C5CE7" />
                      <Text style={styles.thumbnailLoadingText}>Generating thumbnail...</Text>
                    </View>
                  ) : generatedThumbnail ? (
                    <View style={styles.thumbnailPreviewWrapper}>
                      <Image
                        source={{ uri: generatedThumbnail.uri }}
                        style={styles.thumbnailPreview}
                        resizeMode="cover"
                      />
                      <View style={styles.thumbnailPlayIcon}>
                        <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Text style={styles.thumbnailPlaceholderText}>No thumbnail generated</Text>
                    </View>
                  )}
                  
                  {/* Thumbnail Controls */}
                  <View style={styles.thumbnailControls}>
                    <TouchableOpacity
                      style={[styles.thumbnailButton, isGeneratingThumbnail && styles.thumbnailButtonDisabled]}
                      onPress={handleRegenerateThumbnail}
                      disabled={isGeneratingThumbnail}
                    >
                      <Text style={styles.thumbnailButtonText}>
                        {isGeneratingThumbnail ? 'Generating...' : 'New Frame'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.thumbnailButton, styles.thumbnailButtonSecondary]}
                      onPress={() => setShowThumbnailSelector(true)}
                      disabled={isGeneratingThumbnail}
                    >
                      <Text style={[styles.thumbnailButtonText, styles.thumbnailButtonTextSecondary]}>
                        Select Frame
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Post Content Input - Hide for stories */}
            {createMode !== 'story' && (
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
            )}

            {/* Story Upload Button */}
            {createMode === 'story' && capturedMedia && (
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
                    {isUploading ? 'Posting Story...' : 'Share Story'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Create Post Button - Hide for stories since they have their own button */}
            {createMode !== 'story' && (
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
                  {isUploading ? 
                    `Creating ${createMode === 'story' ? 'Story' : createMode === 'reel' ? 'Reel' : 'Post'}...` : 
                    `Create ${createMode === 'story' ? 'Story' : createMode === 'reel' ? 'Reel' : 'Post'}`
                  }
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Action Buttons - Only show when no media is captured */}
        {!capturedMedia && (
          <View style={styles.buttonsContainer}>
          {/* Take Photo Button - Only show in post mode */}
          {createMode === 'post' && (
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
          )}

          {/* Record Video Button - Show in reel and story modes */}
          {(createMode === 'reel' || createMode === 'story') && (
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
                      {createMode === 'story' ? 'Record Story' : 'Record Reel'}
                    </Text>
                    <Text style={styles.buttonSubtitle}>
                      {createMode === 'story' ? 'Share a 30-second story' : 'Create a trending reel'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          )}

          {/* Upload Media Button - Show in story mode */}
          {createMode === 'story' && (
            <AnimatedTouchableOpacity
              style={[styles.actionButton, uploadButtonStyle]}
              onPress={handleUploadMedia}
              entering={SlideInUp.delay(600).springify()}
            >
              <LinearGradient
                colors={['#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.iconContainer}>
                    <ImageIcon size={32} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={styles.buttonText}>
                    <Text style={styles.buttonTitle}>📱 Upload Photo or Video</Text>
                    <Text style={styles.buttonSubtitle}>Choose from your gallery</Text>
                  </View>
                </View>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          )}
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
            <Text style={styles.featureText}>
              {createMode === 'story' ? '30-second Stories' : '15-second Shorts'}
            </Text>
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
          createMode={createMode}
        />
      )}

      {/* Thumbnail Frame Selector Modal */}
      <Modal
        visible={showThumbnailSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowThumbnailSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.frameSelectionModal}>
            <View style={styles.frameSelectionHeader}>
              <Text style={styles.frameSelectionTitle}>Select Thumbnail Frame</Text>
              <TouchableOpacity
                onPress={() => setShowThumbnailSelector(false)}
                style={styles.frameSelectionClose}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.frameSelectionSubtitle}>
              Tap a time to generate thumbnail from that frame
            </Text>
            
            <ScrollView style={styles.frameTimesContainer}>
              {[1, 3, 5, 7, 10, 15, 20, 25, 30].map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  style={styles.frameTimeButton}
                  onPress={() => {
                    handleSelectThumbnailFrame(seconds);
                    setShowThumbnailSelector(false);
                  }}
                  disabled={isGeneratingThumbnail}
                >
                  <Text style={styles.frameTimeText}>{seconds}s</Text>
                  <Text style={styles.frameTimeLabel}>Generate at {seconds} seconds</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  
  // Thumbnail Styles
  thumbnailSection: {
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  thumbnailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  thumbnailPreviewContainer: {
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    width: 120,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnailLoadingText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  thumbnailPlaceholderText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  thumbnailPreviewWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  thumbnailPreview: {
    width: 120,
    height: 160,
    borderRadius: 8,
  },
  thumbnailPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailControls: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnailButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)',
  },
  thumbnailButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  thumbnailButtonDisabled: {
    opacity: 0.5,
  },
  thumbnailButtonText: {
    color: '#6C5CE7',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  thumbnailButtonTextSecondary: {
    color: '#FFFFFF',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  frameSelectionModal: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  frameSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  frameSelectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  frameSelectionClose: {
    padding: 4,
  },
  frameSelectionSubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  frameTimesContainer: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  frameTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.2)',
  },
  frameTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C5CE7',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  frameTimeLabel: {
    fontSize: 14,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});