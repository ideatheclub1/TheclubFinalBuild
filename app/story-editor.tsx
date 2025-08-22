import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, X, Type, Palette, Sticker } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  SlideInUp,
  SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useDebugLogger } from '@/utils/debugLogger';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function StoryEditorScreen() {
  const debugLogger = useDebugLogger('StoryEditor');
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams();
  
  // Get the media URI from params
  const mediaUri = params.mediaUri as string;
  const mediaType = params.mediaType as 'image' | 'video';
  
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);

  // Animation values
  const postButtonScale = useSharedValue(1);
  const textEditorOpacity = useSharedValue(0);

  useEffect(() => {
    debugLogger.info('STORY_EDITOR', 'LOADED', `Editing ${mediaType} story`);
  }, [mediaType]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleGoBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    if (caption.trim()) {
      Alert.alert(
        'Discard Story?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handlePostStory = async () => {
    if (!user?.id || !mediaUri) {
      Alert.alert('Error', 'Unable to post story. Please try again.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }

    postButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );

    setIsPosting(true);

    try {
      debugLogger.info('STORY_EDITOR', 'POSTING', 'Creating story with media');

      // Create the story
      const storyData = {
        mediaUri,
        mediaType,
        caption: caption.trim(),
        userId: user.id,
      };

      const result = await dataService.story.createStory(storyData);
      
      if (result) {
        debugLogger.success('STORY_EDITOR', 'POSTED', 'Story created successfully');
        
        // Success feedback
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error('Haptics error:', error);
        }

        // Navigate back to feed
        router.replace('/(tabs)/');
      } else {
        throw new Error('Failed to create story');
      }
    } catch (error) {
      debugLogger.error('STORY_EDITOR', 'POST_ERROR', 'Failed to post story', error);
      Alert.alert(
        'Error',
        'Failed to post your story. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPosting(false);
    }
  };

  const toggleTextEditor = () => {
    setShowTextEditor(!showTextEditor);
    textEditorOpacity.value = withSpring(showTextEditor ? 0 : 1);
  };

  const postButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: postButtonScale.value }],
  }));

  if (!mediaUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No media to edit</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.background}>
          {/* Media Preview */}
          <View style={styles.mediaContainer}>
            {mediaType === 'video' ? (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoText}>Video Preview</Text>
                <Text style={styles.videoSubtext}>(Video player would go here)</Text>
              </View>
            ) : (
              <Image 
                source={{ uri: mediaUri }} 
                style={styles.mediaPreview}
                resizeMode="contain"
              />
            )}
            
            {/* Media Overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']}
              style={styles.mediaOverlay}
            />
          </View>

          {/* Top Controls */}
          <Animated.View 
            style={styles.topControls}
            entering={SlideInDown.delay(200)}
          >
            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.topButton}
            >
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.topButtonsRight}>
              <TouchableOpacity
                onPress={toggleTextEditor}
                style={styles.topButton}
              >
                <Type size={22} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {/* Add stickers functionality */}}
                style={styles.topButton}
              >
                <Sticker size={22} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {/* Add color filters functionality */}}
                style={styles.topButton}
              >
                <Palette size={22} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Caption Input */}
          <Animated.View 
            style={styles.captionContainer}
            entering={SlideInUp.delay(300)}
          >
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption to your story..."
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              multiline
              maxLength={200}
              value={caption}
              onChangeText={setCaption}
              returnKeyType="done"
            />
            
            {/* Character Count */}
            <Text style={styles.characterCount}>
              {caption.length}/200
            </Text>
          </Animated.View>

          {/* Bottom Controls */}
          <Animated.View 
            style={styles.bottomControls}
            entering={SlideInUp.delay(400)}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.discardButton}
            >
              <X size={20} color="#FF6B6B" strokeWidth={2} />
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            
            <AnimatedTouchableOpacity
              style={[styles.postButton, postButtonStyle]}
              onPress={handlePostStory}
              disabled={isPosting}
            >
              <LinearGradient
                colors={['#6C5CE7', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.postGradient}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.postText}>Share Story</Text>
                  </>
                )}
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaContainer: {
    flex: 1,
    position: 'relative',
  },
  mediaPreview: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  videoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  videoSubtext: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  mediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  topButtonsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  captionInput: {
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 16,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  characterCount: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  discardText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  postButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  postGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  postText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});