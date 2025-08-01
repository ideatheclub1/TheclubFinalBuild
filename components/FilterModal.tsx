import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { X, Filter, Star, DollarSign, Users, MapPin } from 'lucide-react-native';
import DistanceSlider from './DistanceSlider';
import AgeSlider from './AgeSlider';

interface FilterOptions {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  minRating: number;
  maxPrice: number;
  showHostsOnly: boolean;
  showOnlineOnly: boolean;
  selectedRoles: string[];
  selectedInterests: string[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const relationshipRoles = [
  'Boyfriend', 'Girlfriend', 'Mother', 'Father', 'Friend', 'Listener'
];

const interests = [
  'Psychology', 'Life Coaching', 'Relationships', 'Career Advice', 'Wellness',
  'Art', 'Music', 'Travel', 'Business', 'Technology', 'Fitness', 'Cooking',
  'Books', 'Movies', 'Philosophy', 'Spirituality', 'Fashion', 'Gaming'
];

export default function FilterModal({
  visible,
  onClose,
  onApply,
  currentFilters
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      minAge: 18,
      maxAge: 65,
      maxDistance: 0,
      minRating: 0,
      maxPrice: 200,
      showHostsOnly: false,
      showOnlineOnly: false,
      selectedRoles: [],
      selectedInterests: [],
    };
    setFilters(defaultFilters);
  };

  const toggleRole = (role: string) => {
    setFilters(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
    }));
  };

  const toggleInterest = (interest: string) => {
    setFilters(prev => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(interest)
        ? prev.selectedInterests.filter(i => i !== interest)
        : [...prev.selectedInterests, interest]
    }));
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Filters
          </Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={[styles.resetText, { fontFamily: 'Inter_500Medium' }]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Age Range */}
          <AgeSlider
            minAge={filters.minAge}
            maxAge={filters.maxAge}
            onAgeChange={(minAge, maxAge) => setFilters(prev => ({ ...prev, minAge, maxAge }))}
            label="Age Range"
          />

          {/* Distance */}
          <DistanceSlider
            maxDistance={filters.maxDistance}
            onDistanceChange={(maxDistance) => setFilters(prev => ({ ...prev, maxDistance }))}
            label="Distance"
          />

          {/* Rating Filter */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={16} color="#6C5CE7" />
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Minimum Rating
              </Text>
            </View>
            <View style={styles.ratingOptions}>
              {[0, 3, 3.5, 4, 4.5, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingChip,
                    filters.minRating === rating && styles.selectedChip
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                >
                  <Text style={[
                    styles.ratingText,
                    filters.minRating === rating && styles.selectedText,
                    { fontFamily: 'Inter_500Medium' }
                  ]}>
                    {rating === 0 ? 'Any' : `${rating}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={16} color="#6C5CE7" />
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Max Price per Hour
              </Text>
            </View>
            <View style={styles.priceOptions}>
              {[50, 75, 100, 150, 200].map((price) => (
                <TouchableOpacity
                  key={price}
                  style={[
                    styles.priceChip,
                    filters.maxPrice === price && styles.selectedChip
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, maxPrice: price }))}
                >
                  <Text style={[
                    styles.priceText,
                    filters.maxPrice === price && styles.selectedText,
                    { fontFamily: 'Inter_500Medium' }
                  ]}>
                    ${price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Toggle Filters */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={16} color="#6C5CE7" />
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Additional Filters
              </Text>
            </View>
            
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { fontFamily: 'Inter_500Medium' }]}>
                Hosts Only
              </Text>
              <Switch
                value={filters.showHostsOnly}
                onValueChange={(showHostsOnly) => setFilters(prev => ({ ...prev, showHostsOnly }))}
                trackColor={{ false: '#333', true: '#6C5CE7' }}
                thumbColor={filters.showHostsOnly ? '#FFFFFF' : '#B0B0B0'}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { fontFamily: 'Inter_500Medium' }]}>
                Online Only
              </Text>
              <Switch
                value={filters.showOnlineOnly}
                onValueChange={(showOnlineOnly) => setFilters(prev => ({ ...prev, showOnlineOnly }))}
                trackColor={{ false: '#333', true: '#6C5CE7' }}
                thumbColor={filters.showOnlineOnly ? '#FFFFFF' : '#B0B0B0'}
              />
            </View>
          </View>

          {/* Relationship Roles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={16} color="#6C5CE7" />
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Relationship Roles
              </Text>
            </View>
            <View style={styles.chipContainer}>
              {relationshipRoles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.chip,
                    filters.selectedRoles.includes(role) && styles.selectedChip
                  ]}
                  onPress={() => toggleRole(role)}
                >
                  <Text style={[
                    styles.chipText,
                    filters.selectedRoles.includes(role) && styles.selectedText,
                    { fontFamily: 'Inter_500Medium' }
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interests */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={16} color="#6C5CE7" />
              <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
                Interests
              </Text>
            </View>
            <View style={styles.chipContainer}>
              {interests.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.chip,
                    filters.selectedInterests.includes(interest) && styles.selectedChip
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text style={[
                    styles.chipText,
                    filters.selectedInterests.includes(interest) && styles.selectedText,
                    { fontFamily: 'Inter_500Medium' }
                  ]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={[styles.applyButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    fontSize: 16,
    color: '#6C5CE7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedChip: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  ratingText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  priceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  priceText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  applyButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
}); 