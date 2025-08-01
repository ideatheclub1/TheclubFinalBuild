import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedHeaderProps {
  scrollY: Animated.SharedValue<number>;
  onMessagesPress?: () => void;
}

export default function AnimatedHeader({ scrollY, onMessagesPress }: AnimatedHeaderProps) {
  const router = useRouter();
  const logoGlow = useSharedValue(0);
  const [unreadCount] = React.useState(2); // Mock unread count

  React.useEffect(() => {
    logoGlow.value = withRepeat(
      withTiming(1, { duration: 2500 }),
      -1,
      true
    );
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 100, 200],
      [0, -50, -100],
      'clamp'
    );
    
    const opacity = interpolate(
      scrollY.value,
      [0, 50, 100],
      [1, 0.8, 0],
      'clamp'
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(logoGlow.value, [0, 1], [0.4, 0.9]),
      shadowRadius: interpolate(logoGlow.value, [0, 1], [10, 25]),
    };
  });

  const heartAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(logoGlow.value, [0, 1], [0.3, 0.8]),
      shadowRadius: interpolate(logoGlow.value, [0, 1], [8, 20]),
    };
  });

  const handleMessagesPress = () => {
    router.push('/(tabs)/messages');
  };

  return (
    <Animated.View style={[styles.container, headerAnimatedStyle]}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.15)', 'rgba(88, 28, 135, 0.1)', 'transparent']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoContent}>
              <Animated.View style={[styles.heartContainer, heartAnimatedStyle]}>
                <Heart size={24} color="#ff6b9d" fill="#ff6b9d" />
              </Animated.View>
              <Text style={styles.logo}>The Club</Text>
            </View>
          </Animated.View>
          
          <TouchableOpacity 
            onPress={onMessagesPress || handleMessagesPress} 
            style={styles.messagesButton}
          >
            <MessageCircle size={24} color="#e0aaff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#121212',
  },
  gradient: {
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50, // Account for status bar
  },
  logoContainer: {
    shadowColor: '#9B61E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  logoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartContainer: {
    marginRight: 8,
    shadowColor: '#9B61E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9B61E5',
    letterSpacing: 0.8,
    fontFamily: 'System',
  },
  messagesButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#9B61E5',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#9B61E5',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#1D1B3D',
  },
  notificationText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});