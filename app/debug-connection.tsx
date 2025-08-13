import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import ConnectionFix from '@/components/ConnectionFix';

export default function DebugConnectionScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />
      <ConnectionFix />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
});
