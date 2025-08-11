import React from 'react';
import { View, StyleSheet } from 'react-native';
import DeleteFunctionTest from '@/components/DeleteFunctionTest';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';

export default function DeleteTestScreen() {
  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <DeleteFunctionTest />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
});
