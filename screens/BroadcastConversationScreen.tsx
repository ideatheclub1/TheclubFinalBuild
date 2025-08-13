import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BroadcastMessagingPanel from '@/components/BroadcastMessagingPanel';
import { useUser } from '@/contexts/UserContext';

interface ConversationParams {
  conversationId: string;
  title?: string;
  participants?: string;
}

export default function BroadcastConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ConversationParams>();
  const { user } = useUser();

  const { conversationId, title, participants } = params;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/messages');
    }
  };

  if (!conversationId) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
        {/* Error state - missing conversation ID */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />
      <BroadcastMessagingPanel
        conversationId={conversationId}
        title={title || 'Chat'}
        onBack={handleBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
