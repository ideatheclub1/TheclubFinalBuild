import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { 
  MapPin, 
  Search, 
  X, 
  Navigation, 
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import * as Location from 'expo-location';

const { width: screenWidth } = Dimensions.get('window');

interface LocationResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'city' | 'neighborhood' | 'landmark' | 'address';
}

interface LocationSearchProps {
  value: string;
  onLocationSelect: (location: string, latitude: number, longitude: number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export default function LocationSearch({
  value,
  onLocationSelect,
  placeholder = "Search for a location...",
  label = "Location",
  error
}: LocationSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please enable location access to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Get address from coordinates
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationString = [
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        
        onLocationSelect(
          locationString,
          location.coords.latitude,
          location.coords.longitude
        );
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please search manually.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Use Google Places API for location search
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=YOUR_GOOGLE_PLACES_API_KEY`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      
      if (data.status === 'OK') {
        const results: LocationResult[] = data.results.map((place: any, index: number) => ({
          id: place.place_id || `location_${index}`,
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          type: getLocationType(place.types),
        }));
        
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      // Fallback to mock data for development
      setSearchResults(getMockLocationResults(query));
    } finally {
      setIsSearching(false);
    }
  };

  const getMockLocationResults = (query: string): LocationResult[] => {
    const mockResults: LocationResult[] = [
      {
        id: '1',
        name: `${query}, City`,
        address: `${query}, State, Country`,
        latitude: 40.7128,
        longitude: -74.0060,
        type: 'city',
      },
      {
        id: '2',
        name: `${query} Downtown`,
        address: `${query} Downtown, State, Country`,
        latitude: 40.7589,
        longitude: -73.9851,
        type: 'neighborhood',
      },
      {
        id: '3',
        name: `${query} Central Park`,
        address: `${query} Central Park, State, Country`,
        latitude: 40.7829,
        longitude: -73.9654,
        type: 'landmark',
      },
    ];
    
    return mockResults.filter(result => 
      result.name.toLowerCase().includes(query.toLowerCase()) ||
      result.address.toLowerCase().includes(query.toLowerCase())
    );
  };

  const getLocationType = (types: string[]): LocationResult['type'] => {
    if (types.includes('locality') || types.includes('administrative_area_level_1')) {
      return 'city';
    } else if (types.includes('sublocality') || types.includes('neighborhood')) {
      return 'neighborhood';
    } else if (types.includes('establishment') || types.includes('point_of_interest')) {
      return 'landmark';
    } else {
      return 'address';
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(text);
    }, 500);
  };

  const handleLocationSelect = (location: LocationResult) => {
    onLocationSelect(location.address, location.latitude, location.longitude);
    setSearchQuery('');
    setSearchResults([]);
    setShowModal(false);
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      // Use the current location that was already fetched
      const locationString = value || 'Current Location';
      onLocationSelect(locationString, currentLocation.lat, currentLocation.lng);
      setShowModal(false);
    } else {
      getCurrentLocation();
    }
  };

  const renderLocationItem = ({ item }: { item: LocationResult }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleLocationSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.locationIcon}>
        <MapPin size={20} color="#6C5CE7" />
      </View>
      <View style={styles.locationInfo}>
        <Text style={[styles.locationName, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          {item.name}
        </Text>
        <Text style={[styles.locationAddress, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
          {item.address}
        </Text>
        <View style={styles.locationType}>
          <Text style={[styles.locationTypeText, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
      </View>
      <CheckCircle size={20} color="#6C5CE7" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Globe size={48} color="#666" />
      <Text style={[styles.emptyStateTitle, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
        No locations found
      </Text>
      <Text style={[styles.emptyStateText, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
        Try searching for a different location or use your current location
      </Text>
    </View>
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Location Input */}
      <View style={styles.inputContainer}>
        <Text style={[styles.label, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
          {label}
        </Text>
        <TouchableOpacity
          style={[styles.input, error && styles.inputError]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <MapPin size={20} color="#666" />
          <Text style={[
            styles.inputText,
            !value && styles.placeholderText,
            fontsLoaded && { fontFamily: 'Inter_400Regular' }
          ]}>
            {value || placeholder}
          </Text>
          <Search size={20} color="#666" />
        </TouchableOpacity>
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#FF6B6B" />
            <Text style={[styles.errorText, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
              {error}
            </Text>
          </View>
        )}
      </View>

      {/* Location Search Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <LinearGradient
            colors={['#6C5CE7', '#A29BFE']}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
              Choose Location
            </Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>

          {/* Current Location Button */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={isLoadingLocation}
          >
            <Navigation size={20} color="#6C5CE7" />
            <Text style={[styles.currentLocationText, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>
              {isLoadingLocation ? 'Getting location...' : 'Use Current Location'}
            </Text>
            {isLoadingLocation && <ActivityIndicator size="small" color="#6C5CE7" />}
          </TouchableOpacity>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#666" />
              <TextInput
                style={[styles.searchInput, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}
                placeholder="Search for a location..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {isSearching && <ActivityIndicator size="small" color="#6C5CE7" />}
            </View>
          </View>

          {/* Search Results */}
          <FlatList
            data={searchResults}
            renderItem={renderLocationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsContainer}
            ListEmptyComponent={searchQuery ? renderEmptyState() : null}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  placeholderText: {
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
  },
  closeButton: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginLeft: -40,
  },
  headerSpacer: {
    width: 40,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentLocationText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  locationType: {
    alignSelf: 'flex-start',
  },
  locationTypeText: {
    fontSize: 12,
    color: '#6C5CE7',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 