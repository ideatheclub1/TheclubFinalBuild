import React, { useState } from 'react';
import FeedScreen from '../../screens/FeedScreen';
import DebugTest from '../../components/DebugTest';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function TabOneScreen() {
  const [showDebugTest, setShowDebugTest] = useState(false);

  if (showDebugTest) {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowDebugTest(false)}
        >
          <Text style={styles.backButtonText}>← Back to Feed</Text>
        </TouchableOpacity>
        <DebugTest />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={() => setShowDebugTest(true)}
      >
        <Text style={styles.debugButtonText}>🧪 Test Debug System</Text>
      </TouchableOpacity>
      <FeedScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#374151',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});