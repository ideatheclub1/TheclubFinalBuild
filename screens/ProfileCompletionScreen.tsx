import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import LocationSearch from '@/components/LocationSearch';
import { 
  User, 
  Heart, 
  Briefcase, 
  Camera, 
  ArrowRight, 
  CheckCircle,
  Star,
  Users,
  Globe
} from 'lucide-react-native';

interface ProfileCompletionData {
  bio: string;
  location: string;
  latitude?: number;
  longitude?: number;
  interests: string[];
  expertise: string[];
  relationshipGoals: string[];
  lookingFor: string;
  agePreference: {
    min: number;
    max: number;
  };
  distancePreference: number;
  profilePicture: string;
}

export default function ProfileCompletionScreen() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileCompletionData>({
    bio: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
    interests: [],
    expertise: [],
    relationshipGoals: [],
    lookingFor: '',
    agePreference: { min: 18, max: 50 },
    distancePreference: 50,
    profilePicture: '',
  });

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const totalSteps = 5;

  const interestOptions = [
    'Travel', 'Music', 'Sports', 'Cooking', 'Reading', 'Gaming',
    'Fitness', 'Art', 'Photography', 'Dancing', 'Movies', 'Technology',
    'Fashion', 'Food', 'Nature', 'Adventure', 'Yoga', 'Writing'
  ];

  const expertiseOptions = [
    'Career Advice', 'Life Coaching', 'Relationship Counseling',
    'Fitness Training', 'Cooking Classes', 'Language Teaching',
    'Music Lessons', 'Art Classes', 'Business Consulting',
    'Mental Health Support', 'Travel Planning', 'Financial Advice'
  ];

  const relationshipGoals = [
    'Serious Relationship', 'Casual Dating', 'Friendship',
    'Marriage', 'Open to All', 'Not Sure Yet'
  ];

  const lookingForOptions = [
    'Men', 'Women', 'Everyone', 'Non-binary'
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update user profile with completion data
      const success = await dataService.user.updateUserProfile(user.id, {
        bio: profileData.bio,
        location: profileData.location,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        // Add other fields as they become available in the database
      });

      if (success) {
        // Update local user state with new profile data
        await updateUser({
          bio: profileData.bio,
          location: profileData.location,
          latitude: profileData.latitude,
          longitude: profileData.longitude,
        });
        Alert.alert(
          'Profile Complete! 🎉',
          'Your profile has been updated successfully. You\'re now ready to find great matches!',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest].slice(0, 5) // Limit to 5 interests
    }));
  };

  const toggleExpertise = (expertise: string) => {
    setProfileData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(expertise)
        ? prev.expertise.filter(e => e !== expertise)
        : [...prev.expertise, expertise].slice(0, 3) // Limit to 3 expertise areas
    }));
  };

  const toggleRelationshipGoal = (goal: string) => {
    setProfileData(prev => ({
      ...prev,
      relationshipGoals: prev.relationshipGoals.includes(goal)
        ? prev.relationshipGoals.filter(g => g !== goal)
        : [...prev.relationshipGoals, goal].slice(0, 2) // Limit to 2 goals
    }));
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <User size={32} color="#8b5cf6" />
        <Text style={[styles.stepTitle, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
          Tell us about yourself
        </Text>
        <Text style={[styles.stepSubtitle, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
          Help others get to know you better
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          Bio
        </Text>
        <TextInput
          style={[styles.textArea, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}
          placeholder="Share your story, interests, and what makes you unique..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          value={profileData.bio}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, bio: text }))}
          maxLength={500}
        />
        <Text style={styles.charCount}>{profileData.bio.length}/500</Text>
      </View>

      <LocationSearch
        value={profileData.location}
        onLocationSelect={(location, latitude, longitude) => {
          setProfileData(prev => ({
            ...prev,
            location,
            latitude,
            longitude
          }));
        }}
        placeholder="Search for your location..."
        label="Location"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Heart size={32} color="#8b5cf6" />
        <Text style={[styles.stepTitle, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
          Your Interests
        </Text>
        <Text style={[styles.stepSubtitle, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
          Select up to 5 interests that describe you
        </Text>
      </View>

      <View style={styles.optionsGrid}>
        {interestOptions.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[
              styles.optionChip,
              profileData.interests.includes(interest) && styles.selectedChip
            ]}
            onPress={() => toggleInterest(interest)}
          >
            <Text style={[
              styles.optionText,
              profileData.interests.includes(interest) && styles.selectedOptionText,
              fontsLoaded && { fontFamily: 'Inter_500Medium' }
            ]}>
              {interest}
            </Text>
            {profileData.interests.includes(interest) && (
              <CheckCircle size={16} color="#8b5cf6" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Briefcase size={32} color="#8b5cf6" />
        <Text style={[styles.stepTitle, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
          Your Expertise
        </Text>
        <Text style={[styles.stepSubtitle, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
          What can you help others with? (Select up to 3)
        </Text>
      </View>

      <View style={styles.optionsGrid}>
        {expertiseOptions.map((expertise) => (
          <TouchableOpacity
            key={expertise}
            style={[
              styles.optionChip,
              profileData.expertise.includes(expertise) && styles.selectedChip
            ]}
            onPress={() => toggleExpertise(expertise)}
          >
            <Text style={[
              styles.optionText,
              profileData.expertise.includes(expertise) && styles.selectedOptionText,
              fontsLoaded && { fontFamily: 'Inter_500Medium' }
            ]}>
              {expertise}
            </Text>
            {profileData.expertise.includes(expertise) && (
              <CheckCircle size={16} color="#8b5cf6" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Star size={32} color="#8b5cf6" />
        <Text style={[styles.stepTitle, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
          Relationship Goals
        </Text>
        <Text style={[styles.stepSubtitle, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
          What are you looking for? (Select up to 2)
        </Text>
      </View>

      <View style={styles.optionsGrid}>
        {relationshipGoals.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.optionChip,
              profileData.relationshipGoals.includes(goal) && styles.selectedChip
            ]}
            onPress={() => toggleRelationshipGoal(goal)}
          >
            <Text style={[
              styles.optionText,
              profileData.relationshipGoals.includes(goal) && styles.selectedOptionText,
              fontsLoaded && { fontFamily: 'Inter_500Medium' }
            ]}>
              {goal}
            </Text>
            {profileData.relationshipGoals.includes(goal) && (
              <CheckCircle size={16} color="#8b5cf6" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          Looking for
        </Text>
        <View style={styles.optionsRow}>
          {lookingForOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                profileData.lookingFor === option && styles.selectedRadio
              ]}
              onPress={() => setProfileData(prev => ({ ...prev, lookingFor: option }))}
            >
              <Text style={[
                styles.radioText,
                profileData.lookingFor === option && styles.selectedRadioText,
                fontsLoaded && { fontFamily: 'Inter_500Medium' }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Globe size={32} color="#8b5cf6" />
        <Text style={[styles.stepTitle, fontsLoaded && { fontFamily: 'Inter_700Bold' }]}>
          Preferences
        </Text>
        <Text style={[styles.stepSubtitle, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
          Set your matching preferences
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          Age Range
        </Text>
        <View style={styles.ageRangeContainer}>
          <Text style={[styles.ageText, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            {profileData.agePreference.min} - {profileData.agePreference.max} years
          </Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          Distance Preference
        </Text>
        <View style={styles.distanceContainer}>
          <Text style={[styles.distanceText, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            Within {profileData.distancePreference} km
          </Text>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={[styles.summaryTitle, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          Profile Summary
        </Text>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            Bio: {profileData.bio ? '✓ Added' : '✗ Missing'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            Location: {profileData.location ? '✓ Added' : '✗ Missing'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            Interests: {profileData.interests.length}/5
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            Expertise: {profileData.expertise.length}/3
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
            Goals: {profileData.relationshipGoals.length}/2
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, isLoading && styles.disabledButton]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === totalSteps ? 'Complete Profile' : 'Next'}
          </Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    minWidth: 52,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  backButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  progressText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  selectedChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  optionText: {
    fontSize: 14,
    color: '#ffffff',
  },
  selectedOptionText: {
    color: '#8b5cf6',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedRadio: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  radioText: {
    fontSize: 14,
    color: '#ffffff',
  },
  selectedRadioText: {
    color: '#8b5cf6',
  },
  ageRangeContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  ageText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  distanceContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  distanceText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryTitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 12,
  },
  summaryItem: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  nextButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 