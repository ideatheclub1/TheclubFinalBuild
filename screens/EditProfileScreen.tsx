import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Save, Crown, Flag, Camera, Check, ChevronDown } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import AvatarUploader from '@/components/AvatarUploader';
import FormInput from '@/components/FormInput';
import DropdownField from '@/components/DropdownField';
import LocationSearch from '@/components/LocationSearch';
import { handleBackNavigation } from '@/utils/navigation';

const { width } = Dimensions.get('window');

interface FormData {
  fullName: string;
  username: string;
  bio: string;
  location: string;
  latitude?: number;
  longitude?: number;
  age: string;
  gender: string;
  avatar: string;
}

const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const locationSuggestions = [
  'Los Angeles, CA',
  'New York, NY',
  'San Francisco, CA',
  'Chicago, IL',
  'Miami, FL',
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
  'Denver, CO',
  'Atlanta, GA',
];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, isLoading } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    fullName: user?.username || '',
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    latitude: user?.latitude,
    longitude: user?.longitude,
    age: user?.age?.toString() || '',
    gender: '',
    avatar: user?.avatar || '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const saveButtonScale = useSharedValue(1);

  // Load Inter fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (formData.bio.length > 150) {
      newErrors.bio = 'Bio must be 150 characters or less';
    }
    
    if (formData.age && (parseInt(formData.age) < 13 || parseInt(formData.age) > 120)) {
      newErrors.age = 'Please enter a valid age';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    setIsSaving(true);
    saveButtonScale.value = withSpring(0.95, {}, () => {
      saveButtonScale.value = withSpring(1);
    });

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await updateUser({
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        age: formData.age ? parseInt(formData.age) : undefined,
        avatar: formData.avatar,
      });

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => handleBackNavigation(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
      setHasChanges(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => handleBackNavigation() },
        ]
      );
    } else {
      handleBackNavigation();
    }
  };

  const handleRegisterAsHost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/host-registration');
  };

  const renderFlags = (rating: number = 4.2) => {
    const flagColors = ['#FF4B4B', '#FF914D', '#FFC107', '#A3D977', '#4CAF50'];
    const filledFlags = Math.floor(rating);
    
    return (
      <View style={styles.flagContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.flagIcon,
              {
                backgroundColor: index < filledFlags ? flagColors[index] : '#3A3A3A',
              }
            ]}
          >
            <Flag size={12} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        ))}
      </View>
    );
  };

  const saveButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  if (!fontsLoaded || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1E1E1E', '#2A2A2A', '#1E1E1E']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                          <ArrowLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Edit Profile
          </Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Profile Picture
              </Text>
              <AvatarUploader
                imageUri={formData.avatar}
                onImageChange={(uri) => handleInputChange('avatar', uri)}
                size={120}
              />
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Personal Information
              </Text>
              
              <FormInput
                label="Full Name"
                value={formData.fullName}
                onChangeText={(value) => handleInputChange('fullName', value)}
                placeholder="Enter your name"
                error={errors.fullName}
                maxLength={50}
              />

              <FormInput
                label="Username"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                placeholder="@username"
                error={errors.username}
                maxLength={30}
                prefix="@"
                autoCapitalize="none"
                editable={false} // Restrict username editing
              />

              <FormInput
                label="Bio"
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                placeholder="Tell us about yourself..."
                error={errors.bio}
                maxLength={150}
                multiline
                numberOfLines={3}
              />

              <LocationSearch
                value={formData.location}
                onLocationSelect={(location, latitude, longitude) => {
                  setFormData(prev => ({
                    ...prev,
                    location,
                    latitude,
                    longitude
                  }));
                  setHasChanges(true);
                  // Clear error for location field
                  if (errors.location) {
                    setErrors(prev => ({ ...prev, location: undefined }));
                  }
                }}
                placeholder="Search for your location..."
                label="Location"
                error={errors.location}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <FormInput
                    label="Age"
                    value={formData.age}
                    onChangeText={(value) => handleInputChange('age', value)}
                    placeholder="Age"
                    error={errors.age}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
                
                <View style={styles.halfWidth}>
                  <DropdownField
                    label="Gender"
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
                    options={genderOptions}
                    placeholder="Select gender"
                  />
                </View>
              </View>
            </View>

            {/* Host Status Section */}
            {user.isHost && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                  Host Status
                </Text>
                <View style={styles.hostStatusCard}>
                  <View style={styles.hostInfo}>
                    <Crown size={24} color="#6C5CE7" />
                    <Text style={[styles.hostStatusText, { fontFamily: 'Inter_500Medium' }]}>
                      Verified Host
                    </Text>
                  </View>
                  <View style={styles.trustScore}>
                    {renderFlags(4.2)}
                    <Text style={[styles.trustLabel, { fontFamily: 'Inter_400Regular' }]}>
                      Community Trust Score
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Register as Host Button */}
            {!user.isHost && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.hostButton} onPress={handleRegisterAsHost}>
                  <LinearGradient
                    colors={['rgba(0, 184, 148, 0.1)', 'rgba(0, 184, 148, 0.05)']}
                    style={styles.hostButtonGradient}
                  >
                    <Crown size={24} color="#00B894" />
                    <View style={styles.hostButtonContent}>
                      <Text style={[styles.hostButtonTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                        Become a Host
                      </Text>
                      <Text style={[styles.hostButtonSubtitle, { fontFamily: 'Inter_400Regular' }]}>
                        Share your expertise and start earning
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#00B894" style={{ transform: [{ rotate: '-90deg' }] }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Save Button */}
          <View style={styles.bottomSection}>
            <AnimatedTouchableOpacity
              style={[styles.saveButton, saveButtonAnimatedStyle]}
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
            >
              <LinearGradient
                colors={hasChanges ? ['#6C5CE7', '#5A4FCF'] : ['#4A4A4A', '#565656']}
                style={styles.saveButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Save size={20} color="#FFFFFF" />
                )}
                <Text style={[styles.saveButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    fontFamily: 'Inter_400Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 92, 231, 0.2)',
  },
  backButton: {
    padding: 16,
    minWidth: 52,
    minHeight: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40, // Match back button width for centering
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Space for save button
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  hostStatusCard: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostStatusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  trustScore: {
    alignItems: 'center',
  },
  flagContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  flagIcon: {
    width: 32,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  trustLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '400',
  },
  hostButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00B894',
  },
  hostButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  hostButtonContent: {
    flex: 1,
    marginLeft: 16,
  },
  hostButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hostButtonSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '400',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(108, 92, 231, 0.2)',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});