import React, { useState } from 'react';
import { useEffect } from 'react';
import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { CommentProvider } from '@/contexts/CommentContext';
import { UserProvider } from '@/contexts/UserContext';
import DebugAuth from '@/components/DebugAuth';
import DebugPanel from '@/components/DebugPanel';
import NavigationDebug from '@/components/NavigationDebug';
import { Bug } from 'lucide-react-native';

export default function RootLayout() {
  useFrameworkReady();
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UserProvider>
          <CommentProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen 
              name="ProfileScreen" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen 
              name="profile" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen name="host-registration" />
            <Stack.Screen name="conversation" />
            <Stack.Screen name="conversations" />
            <Stack.Screen name="profile-completion" />
            <Stack.Screen 
              name="edit-profile" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen 
              name="followers-following" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen name="+not-found" />
          </Stack>
          <DebugAuth />
          <StatusBar style="light" backgroundColor="#1E1E1E" />
          
          {/* Debug Panel Trigger */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setShowDebugPanel(true)}
          >
            <Bug size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Debug Panel */}
          <DebugPanel 
            visible={showDebugPanel} 
            onClose={() => setShowDebugPanel(false)} 
          />
          
          {/* Navigation Debug - Remove this after testing */}
          <NavigationDebug />
        </CommentProvider>
      </UserProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
});