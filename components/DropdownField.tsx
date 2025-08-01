import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Search, Check } from 'lucide-react-native';

interface Option {
  label: string;
  value: string;
}

interface DropdownFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  allowCustom?: boolean;
  error?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function DropdownField({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  allowCustom = false,
  error,
}: DropdownFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const focusAnimation = useSharedValue(0);
  const chevronRotation = useSharedValue(0);
  const errorAnimation = useSharedValue(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  React.useEffect(() => {
    if (error) {
      errorAnimation.value = withSpring(1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      errorAnimation.value = withSpring(0);
    }
  }, [error]);

  React.useEffect(() => {
    chevronRotation.value = withSpring(isOpen ? 1 : 0);
  }, [isOpen]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
    focusAnimation.value = withSpring(1);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    setShowCustomInput(false);
    setCustomValue('');
    focusAnimation.value = withSpring(0);
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    handleClose();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onValueChange(customValue.trim());
      handleClose();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : value || placeholder;

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.1)', '#6C5CE7']
    );
    
    return {
      borderColor,
      shadowOpacity: focusAnimation.value * 0.3,
    };
  });

  const chevronAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${chevronRotation.value * 180}deg` }
      ],
    };
  });

  const errorAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: errorAnimation.value,
      transform: [
        { translateY: withTiming(errorAnimation.value ? 0 : -10) }
      ],
    };
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      
      <AnimatedTouchableOpacity
        style={[styles.dropdownContainer, containerAnimatedStyle]}
        onPress={handlePress}
      >
        <Text style={[
          styles.dropdownText,
          { fontFamily: 'Inter_400Regular' },
          !value && styles.placeholderText
        ]}>
          {displayValue}
        </Text>
        <Animated.View style={chevronAnimatedStyle}>
          <ChevronDown size={20} color="#B0B0B0" />
        </Animated.View>
      </AnimatedTouchableOpacity>

      {error && (
        <Animated.View style={[styles.errorContainer, errorAnimatedStyle]}>
          <Text style={[styles.errorText, { fontFamily: 'Inter_400Regular' }]}>
            {error}
          </Text>
        </Animated.View>
      )}

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={handleClose}
            activeOpacity={1}
          />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                {label}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { fontFamily: 'Inter_500Medium' }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={16} color="#B0B0B0" />
              <TextInput
                style={[styles.searchInput, { fontFamily: 'Inter_400Regular' }]}
                placeholder="Search options..."
                placeholderTextColor="#C5C5C5"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    { fontFamily: 'Inter_400Regular' },
                    item.value === value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Check size={16} color="#6C5CE7" />
                  )}
                </TouchableOpacity>
              )}
            />

            {/* Custom Input */}
            {allowCustom && (
              <View style={styles.customSection}>
                {!showCustomInput ? (
                  <TouchableOpacity
                    style={styles.customButton}
                    onPress={() => setShowCustomInput(true)}
                  >
                    <Text style={[styles.customButtonText, { fontFamily: 'Inter_500Medium' }]}>
                      + Add Custom Option
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.customInputContainer}>
                    <TextInput
                      style={[styles.customInput, { fontFamily: 'Inter_400Regular' }]}
                      placeholder="Enter custom value..."
                      placeholderTextColor="#C5C5C5"
                      value={customValue}
                      onChangeText={setCustomValue}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.customSubmitButton}
                      onPress={handleCustomSubmit}
                    >
                      <Check size={16} color="#6C5CE7" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  placeholderText: {
    color: '#C5C5C5',
  },
  errorContainer: {
    marginTop: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6C5CE7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedOption: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  selectedOptionText: {
    color: '#6C5CE7',
    fontWeight: '500',
  },
  customSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  customButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6C5CE7',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  customSubmitButton: {
    padding: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderRadius: 16,
    marginLeft: 8,
  },
});