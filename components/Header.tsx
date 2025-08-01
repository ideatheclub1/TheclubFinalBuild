import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MessageCircle, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';

interface HeaderProps {
  onMessagesPress?: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function Header({ onMessagesPress }: HeaderProps) {
  const router = useRouter();
  const { user } = useUser();
  const logoGlow = useSharedValue(0);
  const messageScale = useSharedValue(1);
  const [unreadCount] = useState(2);

  // Don't render if no user data
  if (!user) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>The Club</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  React.useEffect(() => {
    logoGlow.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(logoGlow.value, [0, 1], [0.3, 0.6]),
      shadowRadius: interpolate(logoGlow.value, [0, 1], [8, 16]),
    };
  });

  const heartAnimatedStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(logoGlow.value, [0, 1], [0.2, 0.5]),
      shadowRadius: interpolate(logoGlow.value, [0, 1], [6, 12]),
    };
  });

  const messageAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: messageScale.value }],
    };
  });

  const handleMessagesPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Haptics error:', error);
    }
    messageScale.value = withSpring(0.95, {}, () => {
      messageScale.value = withSpring(1);
    });
    router.push('/(tabs)/messages');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {/* Logo with Heart */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoContent}>
              <Animated.View style={[styles.heartContainer, heartAnimatedStyle]}>
                <Heart size={24} color="#6C5CE7" fill="#6C5CE7" />
              </Animated.View>
              <Text style={styles.logo}>The Club</Text>
            </View>
          </Animated.View>
          
          {/* Messages Button */}
          <AnimatedTouchableOpacity 
            onPress={handleMessagesPress} 
            style={[styles.messagesButton, messageAnimatedStyle]}
          >
            <View style={styles.messagesIconContainer}>
              <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </AnimatedTouchableOpacity>
        </View>
        
        {/* Subtle divider */}
        <View style={styles.divider} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#1E1E1E',
  },
  container: {
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoContainer: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartContainer: {
    marginRight: 8,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#6C5CE7',
    letterSpacing: 0.5,
  },
  messagesButton: {
    position: 'relative',
  },
  messagesIconContainer: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1E1E1E',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  notificationText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    marginHorizontal: 20,
  },
});