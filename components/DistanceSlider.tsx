import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { MapPin, X } from 'lucide-react-native';
import CustomSlider from './CustomSlider';

interface DistanceSliderProps {
  maxDistance: number;
  onDistanceChange: (distance: number) => void;
  label?: string;
}

export default function DistanceSlider({
  maxDistance,
  onDistanceChange,
  label = "Distance"
}: DistanceSliderProps) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleSliderChange = (value: number) => {
    onDistanceChange(Math.round(value));
  };

  const handleClear = () => {
    onDistanceChange(0);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MapPin size={16} color="#6C5CE7" />
        <Text style={[styles.label, { fontFamily: 'Inter_600SemiBold' }]}>
          {label}
        </Text>
        {maxDistance > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <X size={14} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.distanceDisplay}>
        <Text style={[styles.distanceText, { fontFamily: 'Inter_500Medium' }]}>
          {maxDistance > 0 ? `Within ${maxDistance} km` : 'Any distance'}
        </Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <CustomSlider
          style={styles.slider}
          minimumValue={0}
          maximumValue={200}
          value={maxDistance}
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#6C5CE7"
          maximumTrackTintColor="#333"
          thumbTintColor="#6C5CE7"
        />
        
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabel, { fontFamily: 'Inter_400Regular' }]}>0 km</Text>
          <Text style={[styles.sliderLabel, { fontFamily: 'Inter_400Regular' }]}>200 km</Text>
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
  distanceDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 18,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 35,
    marginBottom: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#888',
  },
}); 