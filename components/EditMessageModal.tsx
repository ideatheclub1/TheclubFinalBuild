import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Save, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Message } from '@/types';

interface EditMessageModalProps {
  visible: boolean;
  onClose: () => void;
  message: Message | null;
  onSave: (messageId: string, newContent: string) => Promise<boolean>;
}

export default function EditMessageModal({
  visible,
  onClose,
  message,
  onSave,
}: EditMessageModalProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (message && visible) {
      setContent(message.content);
    }
  }, [message, visible]);

  const handleSave = async () => {
    if (!message || !content.trim()) {
      Alert.alert('Error', 'Message content cannot be empty');
      return;
    }

    if (content.trim() === message.content) {
      // No changes made
      onClose();
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const success = await onSave(message.id, content.trim());
      
      if (success) {
        Alert.alert('Success', 'Message updated successfully');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to update message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update message');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (content !== message?.content) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <View style={styles.header}>
                  <Text style={styles.headerText}>Edit Message</Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                  >
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.content}>
                  <TextInput
                    style={styles.textInput}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Enter your message..."
                    placeholderTextColor="#666"
                    multiline
                    autoFocus
                    maxLength={1000}
                  />
                  
                  <View style={styles.footer}>
                    <Text style={styles.characterCount}>
                      {content.length}/1000
                    </Text>
                    
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        onPress={handleClose}
                        style={[styles.button, styles.cancelButton]}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={handleSave}
                        style={[styles.button, styles.saveButton]}
                        disabled={saving || !content.trim()}
                      >
                        <Save size={16} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>
                          {saving ? 'Saving...' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  footer: {
    marginTop: 16,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: '#6C5CE7',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});









