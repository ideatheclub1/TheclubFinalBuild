import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, ArrowRight } from 'lucide-react-native';

export default function ConversationTest() {
  const router = useRouter();

  const testConversationList = () => {
    router.push({
      pathname: '/conversation',
      params: { mode: 'list' }
    });
  };

  const testSpecificConversation = () => {
    router.push({
      pathname: '/conversation',
      params: { 
        conversationId: 'test-conversation-id',
        userId: 'test-user-id',
        userName: 'Test User'
      }
    });
  };

  const testCreateConversation = () => {
    router.push({
      pathname: '/conversation',
      params: { 
        mode: 'list',
        createWithUserId: 'test-user-id'
      }
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f0518', '#1a0a2e']} style={styles.background}>
        <View style={styles.header}>
          <MessageCircle size={32} color="#6C5CE7" />
          <Text style={styles.title}>Conversation System Test</Text>
        </View>
        
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Test Unified Conversation Screen</Text>
          
          <TouchableOpacity style={styles.testButton} onPress={testConversationList}>
            <LinearGradient colors={['#6C5CE7', '#5A4FCF']} style={styles.buttonGradient}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Conversation List</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testSpecificConversation}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.buttonGradient}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Specific Conversation</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={testCreateConversation}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.buttonGradient}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Test Create Conversation</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>✅ Unified Conversation System</Text>
          <Text style={styles.infoText}>
            • Single screen handles both list and chat modes{'\n'}
            • Dynamic UI based on mode parameter{'\n'}
            • Consistent navigation and state management{'\n'}
            • Reduced code duplication and complexity{'\n'}
            • Better user experience with smooth transitions
          </Text>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 15,
  },
  testSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  testButton: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  infoSection: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C5CE7',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 22,
  },
});
