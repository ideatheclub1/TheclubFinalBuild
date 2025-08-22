import React, { useEffect } from 'react';
import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { CommentProvider } from '@/contexts/CommentContext';
import { UserProvider } from '@/contexts/UserContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { cacheService } from '@/services/cacheService';
import DebugAuth from '@/components/DebugAuth';


export default function RootLayout() {
  useFrameworkReady();

  // Initialize cache service
  useEffect(() => {
    cacheService.initialize();
    
    // In development, expose cache debugging functions globally
    if (__DEV__ && typeof window !== 'undefined') {
      (window as any).debugCache = async () => {
        const stats = await cacheService.getStats();
        console.log('📊 Cache Stats:', stats);
      };
      
      (window as any).testCache = async () => {
        const results = await cacheService.testCacheOperations();
        console.log('🧪 Cache Test Results:', results);
      };
      
      (window as any).detailedCacheInfo = async () => {
        const info = await cacheService.getDetailedCacheInfo();
        console.log('🔍 Detailed Cache Info:', info);
      };
      
      console.log('🐛 Cache debugging functions available:');
      console.log('  - window.debugCache() - Show cache statistics');
      console.log('  - window.testCache() - Run cache tests');
      console.log('  - window.detailedCacheInfo() - Show detailed cache contents');
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UserProvider>
          <PresenceProvider>
            <CommentProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen 
              name="ProfileScreen" 
              options={{ 
                headerShown: false,
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen 
              name="profile" 
              options={{ 
                headerShown: false,
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen name="host-registration" />
            <Stack.Screen 
              name="conversation" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen name="profile-completion" />
            <Stack.Screen 
              name="edit-profile" 
              options={{ 
                headerShown: false,
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
            <Stack.Screen 
              name="story-editor" 
              options={{ 
                headerShown: false,
                presentation: 'fullScreenModal',
                gestureEnabled: true 
              }} 
            />
            <Stack.Screen name="+not-found" />
          </Stack>
          <DebugAuth />
          <StatusBar style="light" backgroundColor="#1E1E1E" />
            </CommentProvider>
          </PresenceProvider>
        </UserProvider>
    </GestureHandlerRootView>
    </View>
  );
}

