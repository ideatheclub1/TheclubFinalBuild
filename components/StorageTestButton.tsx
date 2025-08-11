import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Upload } from 'lucide-react-native';
import StorageTestUtils from '@/utils/storageTestUtils';
import { useUser } from '@/contexts/UserContext';

interface StorageTestButtonProps {
  testType?: 'image' | 'video' | 'all';
}

export default function StorageTestButton({ testType = 'all' }: StorageTestButtonProps) {
  const { user } = useUser();

  const handleTest = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      switch (testType) {
        case 'image':
          await StorageTestUtils.testImageUpload(user.id);
          break;
        case 'video':
          await StorageTestUtils.testVideoUpload(user.id);
          break;
        case 'all':
          await StorageTestUtils.runAllTests(user.id);
          break;
      }
    } catch (error) {
      console.error('Storage test error:', error);
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getButtonText = () => {
    switch (testType) {
      case 'image':
        return 'Test Image Upload';
      case 'video':
        return 'Test Video Upload';
      case 'all':
        return 'Test All Storage';
      default:
        return 'Test Storage';
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleTest}>
      <Upload size={16} color="#FFFFFF" />
      <Text style={styles.buttonText}>{getButtonText()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
