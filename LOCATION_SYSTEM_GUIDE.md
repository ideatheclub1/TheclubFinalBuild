# Location System Guide - The Club App

## 🎯 Overview

This guide covers the enhanced location system that provides web-based location search, real-time maps, and improved nearby people calculation using precise coordinates.

## 🌍 **Key Features**

### ✅ **Web-Based Location Search**
- **Real-time Search**: Search for locations using Google Places API
- **Current Location**: Automatic GPS location detection
- **Location Types**: Cities, neighborhoods, landmarks, addresses
- **Debounced Search**: Optimized search with 500ms delay

### 📍 **Precise Coordinates**
- **Latitude/Longitude**: Store exact coordinates for each user
- **Haversine Formula**: Accurate distance calculation between users
- **Location Timestamps**: Track when location was last updated

### 🎯 **Enhanced Nearby People**
- **Distance-based Matching**: Find users within specified radius
- **Real-time Updates**: Location changes reflect immediately
- **Performance Optimized**: Spatial indexes for fast queries

## 🗄️ **Database Schema**

### **New Fields Added to `user_profiles`**
```sql
-- Location coordinates
latitude DECIMAL(10, 8),
longitude DECIMAL(11, 8),
location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

-- Spatial index for performance
CREATE INDEX idx_user_profiles_location_coords ON user_profiles (latitude, longitude);
```

### **New SQL Functions**
```sql
-- Calculate distance between two points (Haversine formula)
calculate_distance(lat1, lon1, lat2, lon2) -> DECIMAL

-- Find nearby users within specified distance
find_nearby_users(user_lat, user_lon, max_distance_km, limit_count) -> TABLE

-- Update user location with coordinates
update_user_location(user_id, new_location, new_latitude, new_longitude) -> BOOLEAN
```

## 🧩 **Components**

### **LocationSearch Component**
```typescript
interface LocationSearchProps {
  value: string;
  onLocationSelect: (location: string, latitude: number, longitude: number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}
```

**Features:**
- Modal-based location picker
- Current location detection
- Real-time search with debouncing
- Location type categorization
- Error handling and validation

## 🔧 **Data Service Functions**

### **Location Management**
```typescript
// Update user location with coordinates
dataService.user.updateUserLocation(userId, location, latitude, longitude)

// Find nearby users
dataService.user.findNearbyUsers(latitude, longitude, maxDistanceKm, limit)

// Update user profile (includes location coordinates)
dataService.user.updateUserProfile(userId, {
  location: 'New York, NY',
  latitude: 40.7128,
  longitude: -74.0060,
  // ... other fields
})
```

## 📱 **Usage Examples**

### **1. Profile Completion Screen**
```typescript
import LocationSearch from '@/components/LocationSearch';

// In your component
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
```

### **2. Finding Nearby Users**
```typescript
// Get users within 50km
const nearbyUsers = await dataService.user.findNearbyUsers(
  userLatitude,
  userLongitude,
  50, // max distance in km
  20  // limit results
);

// Users include distance information
nearbyUsers.forEach(user => {
  console.log(`${user.username} is ${user.distanceKm}km away`);
});
```

### **3. Updating User Location**
```typescript
// Update location with coordinates
const success = await dataService.user.updateUserLocation(
  userId,
  'New York, NY',
  40.7128,
  -74.0060
);
```

## 🗺️ **Location Search Flow**

### **1. User Interaction**
1. User taps location input
2. Modal opens with search interface
3. User can choose "Use Current Location" or search manually

### **2. Current Location**
1. Request location permissions
2. Get GPS coordinates
3. Reverse geocode to get address
4. Update user location automatically

### **3. Manual Search**
1. User types location query
2. Debounced search (500ms delay)
3. Call Google Places API
4. Display results with location types
5. User selects location
6. Store coordinates and address

## 📊 **Nearby People Algorithm**

### **Distance Calculation**
```sql
-- Haversine formula for accurate distance
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;
```

### **Nearby Users Query**
```sql
-- Find users within specified distance
SELECT 
    up.*,
    calculate_distance(user_lat, user_lon, up.latitude, up.longitude) as distance_km
FROM user_profiles up
WHERE up.latitude IS NOT NULL 
    AND up.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, up.latitude, up.longitude) <= max_distance_km
ORDER BY distance_km ASC
LIMIT limit_count;
```

## 🔒 **Privacy & Security**

### **Location Permissions**
- Request foreground location access
- Graceful fallback if permissions denied
- Clear user feedback on permission status

### **Data Protection**
- Coordinates stored securely in database
- Location updates require user authentication
- RLS policies protect user location data

## 🚀 **Performance Optimizations**

### **Database Indexes**
```sql
-- Spatial index for location queries
CREATE INDEX idx_user_profiles_location_coords ON user_profiles (latitude, longitude);

-- Composite index for nearby searches
CREATE INDEX idx_user_profiles_location_search ON user_profiles (latitude, longitude, is_online);
```

### **Caching Strategy**
- Cache nearby users results
- Invalidate cache on location updates
- Use Redis for high-frequency queries

## 🧪 **Testing**

### **Location Search Tests**
```typescript
// Test location search functionality
describe('LocationSearch', () => {
  it('should search for locations', async () => {
    // Test search functionality
  });
  
  it('should get current location', async () => {
    // Test GPS location detection
  });
  
  it('should handle location selection', async () => {
    // Test location selection callback
  });
});
```

### **Nearby Users Tests**
```typescript
// Test nearby users calculation
describe('Nearby Users', () => {
  it('should find users within distance', async () => {
    const nearbyUsers = await dataService.user.findNearbyUsers(
      40.7128, -74.0060, 50, 20
    );
    expect(nearbyUsers.length).toBeGreaterThan(0);
  });
  
  it('should calculate distances correctly', async () => {
    // Test distance calculation accuracy
  });
});
```

## 🔄 **Migration Guide**

### **1. Run Database Migration**
```sql
-- Execute the location coordinates enhancement script
\i database_location_coordinates.sql
```

### **2. Update TypeScript Types**
```typescript
// Add location coordinates to User interface
interface User {
  // ... existing fields
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string;
  distanceKm?: number; // for nearby users
}
```

### **3. Update Components**
```typescript
// Replace simple location inputs with LocationSearch component
import LocationSearch from '@/components/LocationSearch';

// Use in forms
<LocationSearch
  value={location}
  onLocationSelect={handleLocationSelect}
/>
```

## 🎯 **Future Enhancements**

### **Planned Features**
- **Real-time Location Updates**: Live location tracking
- **Location History**: Track user location changes
- **Geofencing**: Location-based notifications
- **Route Planning**: Directions between users
- **Location Analytics**: Popular areas and trends

### **API Integrations**
- **Google Maps API**: Enhanced mapping features
- **Foursquare API**: Venue and place data
- **OpenStreetMap**: Alternative mapping data
- **Weather API**: Location-based weather info

## 📋 **Setup Checklist**

### **Required Setup**
- [ ] Execute `database_location_coordinates.sql`
- [ ] Install `expo-location` package
- [ ] Configure Google Places API key
- [ ] Update TypeScript types
- [ ] Test location permissions
- [ ] Verify nearby users calculation

### **Optional Setup**
- [ ] Configure Redis for caching
- [ ] Set up location analytics
- [ ] Implement geofencing
- [ ] Add location-based notifications

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Location Permission Denied**
   - Check app permissions
   - Guide user to settings
   - Provide manual search fallback

2. **Google Places API Errors**
   - Verify API key configuration
   - Check API quota limits
   - Implement fallback search

3. **Distance Calculation Issues**
   - Verify coordinate format
   - Check Haversine formula
   - Test with known coordinates

### **Debug Commands**
```sql
-- Check location data
SELECT id, location, latitude, longitude, location_updated_at 
FROM user_profiles 
WHERE latitude IS NOT NULL;

-- Test distance calculation
SELECT calculate_distance(40.7128, -74.0060, 40.7589, -73.9851);

-- Find nearby users manually
SELECT * FROM find_nearby_users(40.7128, -74.0060, 50, 10);
```

This location system provides a robust foundation for location-based features while maintaining user privacy and performance. The web-based search and precise coordinates enable accurate nearby people matching and enhance the overall user experience. 