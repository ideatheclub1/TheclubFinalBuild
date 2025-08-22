import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Upload, 
  Grid3X3, 
  List, 
  MoreVertical,
  Trash2,
  Share,
  Download,
  Play,
  Pause
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import { debug, useDebugLogger } from '@/utils/debugLogger';
import CameraScreen from '@/components/CameraScreen';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 48) / 3; // 3 columns with padding

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
  createdAt: string;
  bucket: string;
  path: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'videos';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function PhotosVideosScreen() {
  const router = useRouter();
  const { user } = useUser();
  const debugLogger = useDebugLogger('PhotosVideosScreen');
  
  // Log page load
  debug.pageLoad('PhotosVideosScreen', { userId: user?.id });
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // State management
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

  // Animation values
  const uploadButtonScale = useSharedValue(1);
  const filterScale = useSharedValue(1);

  // Load user's media on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserMedia();
    }
  }, [user?.id, filter]);

  const loadUserMedia = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      debug.userAction('loadMedia', { filter, userId: user.id });
      debugLogger.info('LOAD_START', `Loading media for user: ${user.id}, filter: ${filter}`);
      
      const media = await dataService.storage.getUserMedia(
        user.id,
        filter === 'all' ? 'all' : filter === 'images' ? 'images' : 'videos'
      );
      
      setMediaItems(media.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      debugLogger.info('LOAD_SUCCESS', `Loaded ${media.length} media items for user: ${user.id}`);
    } catch (error) {
      debugLogger.error('LOAD_ERROR', 'Failed to load media', error);
      Alert.alert('Error', 'Failed to load your media. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    debug.userAction('refresh', { filter });
    await loadUserMedia();
    setRefreshing(false);
  }, [filter]);

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      Haptics.impactAsync(
        intensity === 'light' 
          ? Haptics.ImpactFeedbackStyle.Light
          : intensity === 'heavy' 
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium
      );
    } catch (error) {
      debugLogger.error('HAPTICS_ERROR', 'Haptics error occurred', error);
    }
  };

  const handleUploadFromGallery = async () => {
    try {
      triggerHaptic('light');
      uploadButtonScale.value = withSpring(0.9, {}, () => {
        uploadButtonScale.value = withSpring(1);
      });

      debug.userAction('openGallery', { filter });
      debugLogger.info('GALLERY_OPEN', `Opening gallery with filter: ${filter}`);

      const mediaType = filter === 'videos' 
        ? ImagePicker.MediaTypeOptions.Videos 
        : filter === 'images'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType,
        allowsEditing: false, // Disable cropping for full images
        quality: 1.0, // Maximum quality
        allowsMultipleSelection: false,
        exif: true, // Include EXIF data
        base64: false, // Don't include base64 to save memory
      });

      if (result.canceled || !result.assets?.[0] || !user?.id) {
        debugLogger.info('GALLERY_CANCELLED', 'User cancelled gallery selection');
        return;
      }

      const asset = result.assets[0];
      
      // Log gallery selection details for debugging
      console.log('🖼️ PhotosVideos gallery selection:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        fileSize: asset.fileSize,
        orientation: asset.orientation
      });

      debugLogger.info('GALLERY_SELECTED', `Selected asset: ${asset.uri}, type: ${asset.type}`);
      await uploadMedia(asset);
    } catch (error) {
      debugLogger.error('GALLERY_ERROR', 'Failed to upload from gallery', error);
      Alert.alert('Error', 'Failed to upload media. Please try again.');
    }
  };

  const handleCameraCapture = (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    setShowCameraModal(true);
    triggerHaptic('light');
    debug.userAction('openCamera', { mode });
    debugLogger.info('CAMERA_OPEN', `Opening camera in ${mode} mode`);
  };

  const uploadMedia = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user?.id) return;

    try {
      setIsUploading(true);
      debug.userAction('uploadMedia', { 
        type: asset.type, 
        fileSize: asset.fileSize 
      });
      debugLogger.info('UPLOAD_START', `Starting upload - type: ${asset.type}, size: ${asset.fileSize}`);

      const file = {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
      };

      const uploadResult = asset.type === 'video' 
        ? await dataService.storage.uploadVideo(file, 'user-media', user.id, {
            folder: 'videos',
          })
        : await dataService.storage.uploadImage(file, 'user-media', user.id, {
            folder: 'images',
          });

      if (uploadResult) {
        debugLogger.success('UPLOAD_SUCCESS', `Media uploaded successfully: ${uploadResult.url}`);
        triggerHaptic('heavy');
        await loadUserMedia(); // Refresh the list
        Alert.alert('Success', 'Media uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      debugLogger.error('UPLOAD_ERROR', 'Failed to upload media', error);
      Alert.alert('Error', 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleItemPress = (item: MediaItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
    triggerHaptic('light');
    debug.userAction('viewItem', { itemId: item.id, itemType: item.type });
    debugLogger.info('MEDIA_VIEW', `Viewing media item: ${item.name}`);
  };

  const handleDeleteItem = async (item: MediaItem) => {
    if (!user?.id) return;

    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              debug.userAction('deleteMedia', { itemId: item.id });
              debugLogger.info('DELETE_START', `Deleting media: ${item.name}`);
              
              const success = await dataService.storage.deleteFile(item.bucket, item.path);
              
              if (success) {
                setMediaItems(prev => prev.filter(i => i.id !== item.id));
                setShowItemModal(false);
                triggerHaptic('heavy');
                debugLogger.success('DELETE_SUCCESS', `Successfully deleted: ${item.name}`);
                Alert.alert('Success', 'Media deleted successfully!');
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              debugLogger.error('DELETE_ERROR', 'Failed to delete media', error);
              Alert.alert('Error', 'Failed to delete media. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    filterScale.value = withSpring(0.9, {}, () => {
      filterScale.value = withSpring(1);
    });
    triggerHaptic('light');
    debug.userAction('changeFilter', { oldFilter: filter, newFilter });
    debugLogger.info('FILTER_CHANGE', `Filter changed from ${filter} to ${newFilter}`);
  };

  const handleMediaCaptured = (asset: { uri: string; type?: string; name?: string }) => {
    if (!asset.uri) return;
    
    const imagePickerAsset: ImagePicker.ImagePickerAsset = {
      uri: asset.uri,
      type: asset.type?.startsWith('video/') ? 'video' : 'image',
      width: 0,
      height: 0,
      assetId: '',
      fileName: asset.name || `media-${Date.now()}`,
      fileSize: 0,
      exif: null,
      base64: null,
      duration: null,
      mimeType: asset.type || 'image/jpeg',
    };
    
    uploadMedia(imagePickerAsset);
    setShowCameraModal(false);
  };

  const filteredItems = mediaItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'images') return item.type === 'image';
    if (filter === 'videos') return item.type === 'video';
    return true;
  });

  // Animated styles
  const uploadButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: uploadButtonScale.value }],
  }));

  const filterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: filterScale.value }],
  }));

  const renderGridItem = ({ item }: { item: MediaItem }) => (
    <AnimatedTouchableOpacity
      entering={FadeIn.delay(Math.random() * 300)}
      style={styles.gridItem}
      onPress={() => handleItemPress(item)}
    >
      {item.type === 'video' ? (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: item.url }}
            style={styles.gridMedia}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={false}
            isMuted={true}
          />
          <View style={styles.videoOverlay}>
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      ) : (
        <Image source={{ uri: item.url }} style={styles.gridMedia} />
      )}
    </AnimatedTouchableOpacity>
  );

  const renderListItem = ({ item }: { item: MediaItem }) => (
    <AnimatedTouchableOpacity
      entering={SlideInDown.delay(Math.random() * 200)}
      style={styles.listItem}
      onPress={() => handleItemPress(item)}
    >
      {item.type === 'video' ? (
        <View style={styles.listVideoContainer}>
          <Video
            source={{ uri: item.url }}
            style={styles.listMedia}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={false}
            isMuted={true}
          />
          <View style={styles.listVideoOverlay}>
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      ) : (
        <Image source={{ uri: item.url }} style={styles.listMedia} />
      )}
      
      <View style={styles.listItemInfo}>
        <Text style={styles.listItemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.listItemDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.listItemSize}>
          {(item.size / 1024 / 1024).toFixed(1)} MB
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.listItemAction}
        onPress={() => handleItemPress(item)}
      >
        <MoreVertical size={20} color="#E0E0E0" />
      </TouchableOpacity>
    </AnimatedTouchableOpacity>
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1E1E1E', '#301E5A']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Photos & Videos</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? (
                <List size={24} color="#FFFFFF" />
              ) : (
                <Grid3X3 size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Bar */}
        <Animated.View style={[styles.filterBar, filterStyle]}>
          {(['all', 'images', 'videos'] as FilterType[]).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive
              ]}
              onPress={() => handleFilterChange(filterType)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterType && styles.filterButtonTextActive
              ]}>
                {filterType === 'all' ? 'All' : filterType === 'images' ? 'Photos' : 'Videos'}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Upload Actions */}
        <View style={styles.uploadActions}>
          <AnimatedTouchableOpacity
            style={[styles.uploadButton, uploadButtonStyle]}
            onPress={handleUploadFromGallery}
            disabled={isUploading}
          >
            <BlurView intensity={40} style={styles.uploadButtonBlur}>
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Upload size={20} color="#FFFFFF" />
              )}
              <Text style={styles.uploadButtonText}>
                {isUploading ? 'Uploading...' : 'Upload from Gallery'}
              </Text>
            </BlurView>
          </AnimatedTouchableOpacity>

          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => handleCameraCapture('photo')}
          >
            <BlurView intensity={40} style={styles.cameraButtonBlur}>
              <Camera size={20} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => handleCameraCapture('video')}
          >
            <BlurView intensity={40} style={styles.cameraButtonBlur}>
              <VideoIcon size={20} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Loading your media...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <ImageIcon size={64} color="#6C5CE7" strokeWidth={1} />
            <Text style={styles.emptyStateTitle}>No media found</Text>
            <Text style={styles.emptyStateText}>
              Start by uploading photos and videos from your gallery or taking new ones with the camera.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
            numColumns={viewMode === 'grid' ? 3 : 1}
            key={viewMode} // Force re-render when changing view mode
            contentContainerStyle={styles.mediaList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#6C5CE7"
                colors={['#6C5CE7']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Camera Modal */}
        <Modal
          visible={showCameraModal}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <CameraScreen
            isVisible={showCameraModal}
            onClose={() => setShowCameraModal(false)}
            initialMode={cameraMode}
            onMediaCaptured={handleMediaCaptured}
          />
        </Modal>

        {/* Item Detail Modal */}
        <Modal
          visible={showItemModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} style={styles.modalBlur}>
              <View style={styles.modalContent}>
                {selectedItem && (
                  <>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={() => setShowItemModal(false)}
                      >
                        <ArrowLeft size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={styles.modalActionButton}
                          onPress={() => handleDeleteItem(selectedItem)}
                        >
                          <Trash2 size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.modalMediaContainer}>
                      {selectedItem.type === 'video' ? (
                        <Video
                          source={{ uri: selectedItem.url }}
                          style={styles.modalMedia}
                          resizeMode={ResizeMode.CONTAIN}
                          shouldPlay={true}
                          isLooping={true}
                          useNativeControls
                        />
                      ) : (
                        <Image
                          source={{ uri: selectedItem.url }}
                          style={styles.modalMedia}
                          resizeMode="contain"
                        />
                      )}
                    </View>

                    <View style={styles.modalInfo}>
                      <Text style={styles.modalInfoText}>
                        Size: {(selectedItem.size / 1024 / 1024).toFixed(1)} MB
                      </Text>
                      <Text style={styles.modalInfoText}>
                        Date: {new Date(selectedItem.createdAt).toLocaleDateString()}
                      </Text>
                      <Text style={styles.modalInfoText}>
                        Type: {selectedItem.type.toUpperCase()}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
    fontFamily: 'Inter_600SemiBold',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  uploadActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  uploadButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  cameraButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#E0E0E0',
    fontFamily: 'Inter_500Medium',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
  mediaList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridMedia: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  listMedia: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  listVideoContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  listVideoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  listItemDate: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  listItemSize: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  listItemAction: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
  },
  modalBlur: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalMedia: {
    width: '100%',
    height: '70%',
    borderRadius: 12,
  },
  modalInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#E0E0E0',
    fontFamily: 'Inter_400Regular',
  },
});