import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { User, X } from 'lucide-react-native';
import CustomSlider from './CustomSlider';

interface AgeSliderProps {
  minAge: number;
  maxAge: number;
  onAgeChange: (minAge: number, maxAge: number) => void;
  label?: string;
}

export default function AgeSlider({
  minAge,
  maxAge,
  onAgeChange,
  label = "Age Range"
}: AgeSliderProps) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleMinAgeChange = (value: number) => {
    const newMinAge = Math.round(value);
    if (newMinAge <= maxAge) {
      onAgeChange(newMinAge, maxAge);
    }
  };

  const handleMaxAgeChange = (value: number) => {
    const newMaxAge = Math.round(value);
    if (newMaxAge >= minAge) {
      onAgeChange(minAge, newMaxAge);
    }
  };

  const handleClear = () => {
    onAgeChange(18, 65);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <User size={16} color="#6C5CE7" />
        <Text style={[styles.label, { fontFamily: 'Inter_600SemiBold' }]}>
          {label}
        </Text>
        {(minAge !== 18 || maxAge !== 65) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <X size={14} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.ageDisplay}>
        <Text style={[styles.ageText, { fontFamily: 'Inter_500Medium' }]}>
          {minAge} - {maxAge} years
        </Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <View style={styles.sliderRow}>
          <Text style={[styles.sliderLabel, { fontFamily: 'Inter_400Regular' }]}>Min: {minAge}</Text>
          <CustomSlider
            style={styles.slider}
            minimumValue={18}
            maximumValue={65}
            value={minAge}
            onValueChange={handleMinAgeChange}
            minimumTrackTintColor="#6C5CE7"
            maximumTrackTintColor="#333"
            thumbTintColor="#6C5CE7"
          />
        </View>
        
        <View style={styles.sliderRow}>
          <Text style={[styles.sliderLabel, { fontFamily: 'Inter_400Regular' }]}>Max: {maxAge}</Text>
          <CustomSlider
            style={styles.slider}
            minimumValue={18}
            maximumValue={65}
            value={maxAge}
            onValueChange={handleMaxAgeChange}
            minimumTrackTintColor="#6C5CE7"
            maximumTrackTintColor="#333"
            thumbTintColor="#6C5CE7"
          />
        </View>
        
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabel, { fontFamily: 'Inter_400Regular' }]}>18</Text>
          <Text style={[styles.sliderLabel, { fontFamily: 'Inter_400Regular' }]}>65</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  ageDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ageText: {
    fontSize: 18,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  slider: {
    flex: 1,
    height: 35,
    marginLeft: 10,
    maxWidth: 270, // Make them narrower
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#888',
    minWidth: 50,
  },
}); 