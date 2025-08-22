import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle } from 'lucide-react-native';

export default function Messages() {
  const router = useRouter();
  const params = useLocalSearchParams<{ createWithUserId?: string }>();
  
  useEffect(() => {
    // Redirect to the unified conversation screen
    router.replace({
      pathname: '/conversation',
      params: { 
        mode: 'list',
        ...(params.createWithUserId && { createWithUserId: params.createWithUserId })
      }
    });
  }, [params.createWithUserId]);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f0518', '#1a0a2e']} style={styles.background}>
        <View style={styles.loadingContainer}>
          <MessageCircle size={48} color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading messages...</Text>
          <ActivityIndicator size="large" color="#6C5CE7" style={styles.spinner} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 20,
  },
  spinner: {
    marginTop: 10,
  },
});