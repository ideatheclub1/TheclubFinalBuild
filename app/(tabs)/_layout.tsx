import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home as Home, TrendingUp, Search, User, Play, MessageCircle, Plus } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';

export default function TabLayout() {
  const { user, isLoading } = useUser();

  // Don't render tabs until user is loaded
  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: 'rgba(108, 92, 231, 0.3)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#E0E0E0',
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarItemStyle: {
          borderRadius: 20,
          marginHorizontal: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              borderWidth: focused ? 1 : 0,
              borderColor: focused ? '#6C5CE7' : 'transparent',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.4 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 4 : 0,
            }}>
              <Home size={size} color={color} strokeWidth={2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              borderWidth: focused ? 1 : 0,
              borderColor: focused ? '#6C5CE7' : 'transparent',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.4 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 4 : 0,
            }}>
              <Play size={size} color={color} strokeWidth={2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: focused ? '#6C5CE7' : 'rgba(108, 92, 231, 0.3)',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.6 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 6 : 0,
              transform: focused ? [{ scale: 1.1 }] : [{ scale: 1 }],
            }}>
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              borderWidth: focused ? 1 : 0,
              borderColor: focused ? '#6C5CE7' : 'transparent',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.4 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 4 : 0,
            }}>
              <TrendingUp size={size} color={color} strokeWidth={2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              borderWidth: focused ? 1 : 0,
              borderColor: focused ? '#6C5CE7' : 'transparent',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.4 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 4 : 0,
            }}>
              <Search size={size} color={color} strokeWidth={2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              borderWidth: focused ? 1 : 0,
              borderColor: focused ? '#6C5CE7' : 'transparent',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.4 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 4 : 0,
            }}>
              <User size={size} color={color} strokeWidth={2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null, // Hide from tab bar since it's accessible via header
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{
              padding: 8,
              borderRadius: 16,
              backgroundColor: focused ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
              borderWidth: focused ? 1 : 0,
              borderColor: focused ? '#6C5CE7' : 'transparent',
              shadowColor: focused ? '#6C5CE7' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: focused ? 0.4 : 0,
              shadowRadius: focused ? 8 : 0,
              elevation: focused ? 4 : 0,
            }}>
              <MessageCircle size={size} color={color} strokeWidth={2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});