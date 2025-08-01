import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { X, Camera, Upload } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Achievement {
  id: string;
  title: string;
  smallImage: string;
  fullImage: string;
  createdAt: string;
}

interface AddAchievementModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (achievement: Omit<Achievement, 'id' | 'createdAt'>) => void;
}

export default function AddAchievementModal({ visible, onClose, onAdd }: AddAchievementModalProps) {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
  });

  const [title, setTitle] = useState('');
  const [smallImage, setSmallImage] = useState('');
  const [fullImage, setFullImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 20 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handleClose = () => {
    scale.value = withTiming(0, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
      runOnJS(resetForm)();
    });
  };

  const resetForm = () => {
    setTitle('');
    setSmallImage('');
    setFullImage('');
    setIsSubmitting(false);
  };

  const pickImage = async (type: 'small' | 'full') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'small' ? [1, 1] : [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      if (type === 'small') {
        setSmallImage(result.assets[0].uri);
      } else {
        setFullImage(result.assets[0].uri);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your achievement');
      return;
    }

    if (!smallImage || !fullImage) {
      Alert.alert('Error', 'Please select both preview and full images');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      onAdd({
        title: title.trim(),
        smallImage,
        fullImage,
      });

      handleClose();
      Alert.alert('Success', 'Achievement added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add achievement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          <View style={styles.stickyNoteModal}>
            {/* Pin */}
            <View style={styles.pin} />
            
            {/* Ruled lines */}
            <View style={styles.ruledLines}>
              {[...Array(15)].map((_, i) => (
                <View key={i} style={styles.ruledLine} />
              ))}
            </View>
            
            {/* Close button */}
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#2D3748" />
            </TouchableOpacity>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { fontFamily: 'PatrickHand_400Regular' }]}>
                Add New Achievement
              </Text>

              {/* Title Input */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { fontFamily: 'PatrickHand_400Regular' }]}>
                  Achievement Title
                </Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: 'PatrickHand_400Regular' }]}
                  placeholder="Enter your achievement title..."
                  placeholderTextColor="#666666"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  multiline
                />
                <Text style={[styles.charCount, { fontFamily: 'PatrickHand_400Regular' }]}>
                  {title.length}/100
                </Text>
              </View>

              {/* Small Image */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { fontFamily: 'PatrickHand_400Regular' }]}>
                  Preview Image
                </Text>
                <TouchableOpacity
                  style={styles.imageUpload}
                  onPress={() => pickImage('small')}
                >
                  {smallImage ? (
                    <Image source={{ uri: smallImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Camera size={32} color="#666666" />
                      <Text style={[styles.uploadText, { fontFamily: 'PatrickHand_400Regular' }]}>
                        Tap to select image
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Full Image */}
              <View style={styles.inputSection}>
                <Text style={[styles.label, { fontFamily: 'PatrickHand_400Regular' }]}>
                  Full Image
                </Text>
                <TouchableOpacity
                  style={styles.imageUpload}
                  onPress={() => pickImage('full')}
                >
                  {fullImage ? (
                    <Image source={{ uri: fullImage }} style={styles.previewImageFull} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Upload size={32} color="#666666" />
                      <Text style={[styles.uploadText, { fontFamily: 'PatrickHand_400Regular' }]}>
                        Tap to select image
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={isSubmitting ? ['#999999', '#777777'] : ['#A259FF', '#7A4AE6']}
                  style={styles.submitGradient}
                >
                  <Text style={[styles.submitText, { fontFamily: 'PatrickHand_400Regular' }]}>
                    {isSubmitting ? 'Adding...' : 'Add Achievement'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.85,
  },
  stickyNoteModal: {
    backgroundColor: '#FFF5B7',
    borderRadius: 12,
    padding: 24,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  pin: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  ruledLines: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
  },
  ruledLine: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    zIndex: 10,
  },
  content: {
    flex: 1,
    marginTop: 16,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#2D3748',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#2D3748',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  imageUpload: {
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 8,
    fontWeight: 'normal',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  previewImageFull: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#FFFFFF',
  },
});