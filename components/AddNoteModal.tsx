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
import { BlurView } from 'expo-blur';
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
import { X, Camera, Upload, FileText, DollarSign } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Note {
  id: string;
  title: string;
  smallImage: string;
  fullImage: string;
  createdAt: string;
  type: 'sticky' | 'currency';
  amount?: number;
}

interface AddNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (note: Omit<Note, 'id' | 'createdAt'>) => void;
}

export default function AddNoteModal({ visible, onClose, onAdd }: AddNoteModalProps) {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
  });

  const [title, setTitle] = useState('');
  const [smallImage, setSmallImage] = useState('');
  const [fullImage, setFullImage] = useState('');
  const [noteType, setNoteType] = useState<'sticky' | 'currency'>('sticky');
  const [amount, setAmount] = useState('');
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
    setNoteType('sticky');
    setAmount('');
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
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }

    if (!smallImage || !fullImage) {
      Alert.alert('Error', 'Please select both preview and full images');
      return;
    }

    if (noteType === 'currency' && !amount.trim()) {
      Alert.alert('Error', 'Please enter an amount for the currency note');
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
        type: noteType,
        amount: noteType === 'currency' ? parseInt(amount) : undefined,
      });

      handleClose();
      Alert.alert('Success', 'Note added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add note. Please try again.');
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
          <BlurView intensity={60} style={styles.blurContainer}>
            <LinearGradient
              colors={['rgba(10, 10, 10, 0.95)', 'rgba(45, 27, 105, 0.95)']}
              style={styles.gradient}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { fontFamily: 'Inter-SemiBold' }]}>
                  Add New Note
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Note Type Selection */}
                <View style={styles.typeSelection}>
                  <Text style={[styles.label, { fontFamily: 'Inter-Medium' }]}>
                    Note Type
                  </Text>
                  <View style={styles.typeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        noteType === 'sticky' && styles.activeTypeButton
                      ]}
                      onPress={() => setNoteType('sticky')}
                    >
                      <FileText size={20} color={noteType === 'sticky' ? '#FFFFFF' : '#9CA3AF'} />
                      <Text style={[
                        styles.typeButtonText,
                        { fontFamily: 'Inter-Regular' },
                        noteType === 'sticky' && styles.activeTypeButtonText
                      ]}>
                        Sticky Note
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        noteType === 'currency' && styles.activeTypeButton
                      ]}
                      onPress={() => setNoteType('currency')}
                    >
                      <DollarSign size={20} color={noteType === 'currency' ? '#FFFFFF' : '#9CA3AF'} />
                      <Text style={[
                        styles.typeButtonText,
                        { fontFamily: 'Inter-Regular' },
                        noteType === 'currency' && styles.activeTypeButtonText
                      ]}>
                        Currency Note
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title Input */}
                <View style={styles.inputSection}>
                  <Text style={[styles.label, { fontFamily: 'Inter-Medium' }]}>
                    {noteType === 'currency' ? 'Achievement Description' : 'Note Title'}
                  </Text>
                  <TextInput
                    style={[styles.textInput, { fontFamily: 'Inter-Regular' }]}
                    placeholder="Enter your note title..."
                    placeholderTextColor="#9CA3AF"
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                    multiline
                  />
                  <Text style={[styles.charCount, { fontFamily: 'Inter-Regular' }]}>
                    {title.length}/100
                  </Text>
                </View>

                {/* Amount Input for Currency Notes */}
                {noteType === 'currency' && (
                  <View style={styles.inputSection}>
                    <Text style={[styles.label, { fontFamily: 'Inter-Medium' }]}>
                      Amount Earned
                    </Text>
                    <TextInput
                      style={[styles.textInput, { fontFamily: 'Inter-Regular' }]}
                      placeholder="Enter amount (e.g., 500)"
                      placeholderTextColor="#9CA3AF"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Small Image */}
                <View style={styles.inputSection}>
                  <Text style={[styles.label, { fontFamily: 'Inter-Medium' }]}>
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
                        <Camera size={32} color="#9CA3AF" />
                        <Text style={[styles.uploadText, { fontFamily: 'Inter-Regular' }]}>
                          Tap to select image
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Full Image */}
                <View style={styles.inputSection}>
                  <Text style={[styles.label, { fontFamily: 'Inter-Medium' }]}>
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
                        <Upload size={32} color="#9CA3AF" />
                        <Text style={[styles.uploadText, { fontFamily: 'Inter-Regular' }]}>
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
                    colors={isSubmitting ? ['#4B5563', '#374151'] : ['#6366F1', '#8B5CF6', '#A855F7']}
                    style={styles.submitGradient}
                  >
                    <Text style={[styles.submitText, { fontFamily: 'Inter-SemiBold' }]}>
                      {isSubmitting ? 'Adding Note...' : 'Add Note'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </LinearGradient>
          </BlurView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  typeSelection: {
    marginBottom: 28,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
    backgroundColor: 'rgba(75, 85, 99, 0.1)',
  },
  activeTypeButton: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
  imageUpload: {
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4B5563',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 85, 99, 0.1)',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  previewImageFull: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  submitButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  submitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});