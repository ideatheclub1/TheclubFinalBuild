import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LocationEdit as Edit3 } from 'lucide-react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import ProtectedRoute from '../../components/ProtectedRoute';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ProfileTab() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const handleEditProfile = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    
    router.push('/edit-profile');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ProtectedRoute>
      <>
        <ProfileScreen />
        <AnimatedTouchableOpacity 
          style={[styles.editFab, animatedStyle]} 
          onPress={handleEditProfile}
        >
          <Edit3 size={20} color="#FFFFFF" />
        </AnimatedTouchableOpacity>
      </>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  editFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
});