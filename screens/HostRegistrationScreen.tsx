import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Check, Star, Heart, Users, Clock, DollarSign } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import LocationSearch from '@/components/LocationSearch';
import { handleBackNavigation } from '@/utils/navigation';
import { useDebugLogger, debug } from '@/utils/debugLogger';

interface RegistrationData {
  description: string;
  relationshipRoles: string[];
  interests: string[];
  expertise: string[];
  hourlyRate: number;
  priceCategory: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

const relationshipRoles = [
  { id: 'boyfriend', label: 'Boyfriend', description: 'Romantic companion experience' },
  { id: 'girlfriend', label: 'Girlfriend', description: 'Caring romantic partner' },
  { id: 'mother', label: 'Mother', description: 'Nurturing maternal figure' },
  { id: 'father', label: 'Father', description: 'Supportive paternal guidance' },
  { id: 'friend', label: 'Friend', description: 'Casual friendly conversations' },
  { id: 'listener', label: 'Listener', description: 'Professional emotional support' },
];

const interests = [
  'Psychology', 'Life Coaching', 'Relationships', 'Career Advice', 'Wellness',
  'Art', 'Music', 'Travel', 'Business', 'Technology', 'Fitness', 'Cooking',
  'Books', 'Movies', 'Philosophy', 'Spirituality', 'Fashion', 'Gaming',
  'Photography', 'Writing', 'Dancing', 'Meditation', 'Astrology', 'Languages'
];

const expertiseAreas = [
  'Relationship Advice', 'Language Learning', 'Mindfulness', 'Career Coaching',
  'Mental Health Support', 'Business Strategy', 'Creative Writing', 'Art Therapy',
  'Fitness Training', 'Nutrition Guidance', 'Travel Planning', 'Financial Advice',
  'Study Help', 'Emotional Support', 'Spiritual Guidance', 'Tech Support'
];

const priceCategories = [
  { id: 'casual', label: 'Casual Conversations', price: 25, description: 'Friendly chats and light conversations' },
  { id: 'coaching', label: 'Life Coaching', price: 45, description: 'Personal development and guidance' },
  { id: 'professional', label: 'Professional Advice', price: 65, description: 'Expert consultation and advice' },
  { id: 'specialized', label: 'Specialized Expertise', price: 85, description: 'Highly specialized knowledge and skills' },
];

export default function HostRegistrationScreen() {
  const router = useRouter();
  const { registerHost } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    description: '',
    relationshipRoles: [],
    interests: [],
    expertise: [],
    hourlyRate: 25,
    priceCategory: 'casual',
    location: '',
  });

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      handleBackNavigation();
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setRegistrationData(prev => ({
      ...prev,
      relationshipRoles: prev.relationshipRoles.includes(roleId)
        ? prev.relationshipRoles.filter(r => r !== roleId)
        : [...prev.relationshipRoles, roleId]
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setRegistrationData(prev => {
      const currentInterests = prev.interests;
      if (currentInterests.includes(interest)) {
        return {
          ...prev,
          interests: currentInterests.filter(i => i !== interest)
        };
      } else if (currentInterests.length < 3) {
        return {
          ...prev,
          interests: [...currentInterests, interest]
        };
      }
      return prev;
    });
  };

  const handleExpertiseToggle = (expertise: string) => {
    setRegistrationData(prev => {
      const currentExpertise = prev.expertise;
      if (currentExpertise.includes(expertise)) {
        return {
          ...prev,
          expertise: currentExpertise.filter(e => e !== expertise)
        };
      } else if (currentExpertise.length < 2) {
        return {
          ...prev,
          expertise: [...currentExpertise, expertise]
        };
      }
      return prev;
    });
  };

  const handlePriceSelect = (category: any) => {
    setRegistrationData(prev => ({
      ...prev,
      priceCategory: category.id,
      hourlyRate: category.price
    }));
  };

  const handleCompleteSetup = async () => {
    try {
      const success = await registerHost(registrationData);
      
      if (success) {
        Alert.alert(
          'Registration Complete!',
          'Congratulations! You are now registered as a host. Your profile is now active.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)/profile')
            }
          ]
        );
      } else {
        Alert.alert(
          'Registration Failed',
          'There was an error registering you as a host. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => setCurrentStep(7) // Go back to last step
            }
          ]
        );
      }
    } catch (error) {
      console.error('Host registration error:', error);
      Alert.alert(
        'Registration Error',
        'An unexpected error occurred. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => setCurrentStep(7)
          }
        ]
      );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 3:
        return registrationData.description.trim().length > 0;
      case 4:
        return registrationData.relationshipRoles.length > 0;
      case 5:
        return registrationData.interests.length > 0;
      case 6:
        return registrationData.expertise.length > 0;
      case 7:
        return registrationData.location.trim().length > 0;
      case 8:
        return registrationData.priceCategory !== '';
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Star size={48} color="#00D46A" />
            </View>
            <Text style={styles.stepTitle}>Benefits of Becoming a Host</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <DollarSign size={20} color="#00D46A" />
                <Text style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Start Earning Today:</Text> Share your expertise and connect with people who value meaningful conversations.
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Clock size={20} color="#00D46A" />
                <Text style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Set Your Own Rates:</Text> You decide how much your time is worth.
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Users size={20} color="#00D46A" />
                <Text style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Flexible Schedule:</Text> Work when you want, as much as you want.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <LinearGradient colors={['#00D46A', '#059669']} style={styles.buttonGradient}>
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Check size={48} color="#9B61E5" />
            </View>
            <Text style={styles.stepTitle}>Host Requirements</Text>
            <View style={styles.requirementsList}>
              <View style={styles.requirementItem}>
                <Check size={16} color="#00D46A" />
                <Text style={styles.requirementText}>Be 18 years or older</Text>
              </View>
              <View style={styles.requirementItem}>
                <Check size={16} color="#00D46A" />
                <Text style={styles.requirementText}>Provide engaging conversations</Text>
              </View>
              <View style={styles.requirementItem}>
                <Check size={16} color="#00D46A" />
                <Text style={styles.requirementText}>Maintain professional conduct</Text>
              </View>
              <View style={styles.requirementItem}>
                <Check size={16} color="#00D46A" />
                <Text style={styles.requirementText}>Respond to messages promptly</Text>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell Us About Yourself</Text>
            <Text style={styles.stepSubtitle}>
              Help people understand what makes you special
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Share what makes you unique, your experience, or qualifications..."
              placeholderTextColor="#A0A0A0"
              value={registrationData.description}
              onChangeText={(text) => setRegistrationData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Offer Relationship Role As</Text>
            <Text style={styles.stepSubtitle}>
              Choose the type of relationship experience you want to offer
            </Text>
            <View style={styles.optionsGrid}>
              {relationshipRoles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.optionCard,
                    registrationData.relationshipRoles.includes(role.id) && styles.selectedOption
                  ]}
                  onPress={() => handleRoleToggle(role.id)}
                >
                  <Text style={[
                    styles.optionTitle,
                    registrationData.relationshipRoles.includes(role.id) && styles.selectedOptionText
                  ]}>
                    {role.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    registrationData.relationshipRoles.includes(role.id) && styles.selectedOptionDescription
                  ]}>
                    {role.description}
                  </Text>
                  {registrationData.relationshipRoles.includes(role.id) && (
                    <View style={styles.selectedIndicator}>
                      <Check size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Area of Interest</Text>
            <Text style={styles.stepSubtitle}>
              Select topics you're passionate about
            </Text>
            <Text style={styles.counter}>
              Selected: {registrationData.interests.length}/3
            </Text>
            <View style={styles.tagsContainer}>
              {interests.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.tag,
                    registrationData.interests.includes(interest) && styles.selectedTag
                  ]}
                  onPress={() => handleInterestToggle(interest)}
                  disabled={!registrationData.interests.includes(interest) && registrationData.interests.length >= 3}
                >
                  <Text style={[
                    styles.tagText,
                    registrationData.interests.includes(interest) && styles.selectedTagText
                  ]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Expertise</Text>
            <Text style={styles.stepSubtitle}>
              What specific skills or knowledge can you share?
            </Text>
            <Text style={styles.counter}>
              Selected: {registrationData.expertise.length}/2
            </Text>
            <View style={styles.tagsContainer}>
              {expertiseAreas.map((expertise) => (
                <TouchableOpacity
                  key={expertise}
                  style={[
                    styles.tag,
                    registrationData.expertise.includes(expertise) && styles.selectedTag
                  ]}
                  onPress={() => handleExpertiseToggle(expertise)}
                  disabled={!registrationData.expertise.includes(expertise) && registrationData.expertise.length >= 2}
                >
                  <Text style={[
                    styles.tagText,
                    registrationData.expertise.includes(expertise) && styles.selectedTagText
                  ]}>
                    {expertise}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set Your Location</Text>
            <Text style={styles.stepSubtitle}>
              Where will you be providing your services?
            </Text>
            <LocationSearch
              value={registrationData.location}
              onLocationSelect={(location, latitude, longitude) => {
                setRegistrationData(prev => ({
                  ...prev,
                  location,
                  latitude,
                  longitude
                }));
              }}
              placeholder="Search for your service location..."
              label="Service Location"
            />
          </View>
        );

      case 8:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set Hourly Price</Text>
            <Text style={styles.stepSubtitle}>
              Select an hourly price based on the type of service you provide
            </Text>
            <View style={styles.priceOptions}>
              {priceCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.priceCard,
                    registrationData.priceCategory === category.id && styles.selectedPriceCard
                  ]}
                  onPress={() => handlePriceSelect(category)}
                >
                  <View style={styles.priceHeader}>
                    <Text style={[
                      styles.priceTitle,
                      registrationData.priceCategory === category.id && styles.selectedPriceText
                    ]}>
                      {category.label}
                    </Text>
                    <Text style={[
                      styles.priceAmount,
                      registrationData.priceCategory === category.id && styles.selectedPriceText
                    ]}>
                      ${category.price}/hr
                    </Text>
                  </View>
                  <Text style={[
                    styles.priceDescription,
                    registrationData.priceCategory === category.id && styles.selectedPriceDescription
                  ]}>
                    {category.description}
                  </Text>
                  {registrationData.priceCategory === category.id && (
                    <View style={styles.selectedPriceIndicator}>
                      <Check size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.primaryButton, styles.completeButton]} 
              onPress={handleCompleteSetup}
            >
              <LinearGradient colors={['#00D46A', '#059669']} style={styles.buttonGradient}>
                <Text style={styles.primaryButtonText}>Complete Setup</Text>
                <Check size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2A1A55', '#1E0D36', '#2A1A55']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                          <ArrowLeft size={28} color="#9B61E5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host Registration</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>{currentStep}/8</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / 7) * 100}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        {/* Bottom Navigation */}
        {currentStep > 1 && currentStep < 8 && (
          <View style={styles.bottomNavigation}>
            <TouchableOpacity 
              style={[styles.nextButton, !canProceed() && styles.disabledButton]} 
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <LinearGradient 
                colors={canProceed() ? ['#9B61E5', '#7A4AE6'] : ['#666666', '#555555']} 
                style={styles.buttonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 16,
    minWidth: 52,
    minHeight: 52,
    backgroundColor: '#121212',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#9B61E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepIndicator: {
    backgroundColor: '#9B61E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#121212',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(155, 97, 229, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9B61E5',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitsList: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  benefitText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  benefitTitle: {
    fontWeight: 'bold',
    color: '#00D46A',
  },
  requirementsList: {
    marginBottom: 32,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  requirementText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  textArea: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9B61E5',
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9B61E5',
    padding: 16,
    position: 'relative',
  },
  selectedOption: {
    backgroundColor: '#9B61E5',
    borderColor: '#9B61E5',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  selectedOptionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontSize: 14,
    color: '#9B61E5',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#9B61E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedTag: {
    backgroundColor: '#9B61E5',
    borderColor: '#9B61E5',
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  selectedTagText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceOptions: {
    gap: 12,
    marginBottom: 24,
  },
  priceCard: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9B61E5',
    padding: 16,
    position: 'relative',
  },
  selectedPriceCard: {
    backgroundColor: '#9B61E5',
    borderColor: '#9B61E5',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D46A',
  },
  priceDescription: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  selectedPriceText: {
    color: '#FFFFFF',
  },
  selectedPriceDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedPriceIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
  },
  completeButton: {
    marginTop: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bottomNavigation: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#121212',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});