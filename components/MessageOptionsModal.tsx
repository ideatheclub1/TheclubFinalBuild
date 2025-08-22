import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Edit3, Trash2, Copy, Reply } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Message } from '@/types';

interface MessageOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  message: Message;
  isOwn: boolean;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onCopy: (message: Message) => void;
  onReply?: (message: Message) => void;
}

export default function MessageOptionsModal({
  visible,
  onClose,
  message,
  isOwn,
  onEdit,
  onDelete,
  onCopy,
  onReply,
}: MessageOptionsModalProps) {

  console.log('🔥 MODAL_RENDER - MessageOptionsModal rendering:', { visible, messageId: message?.id, isOwn });

  const handleOptionPress = (action: () => void) => {
    console.log('🔥 OPTION_PRESS - Option button pressed in modal');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    console.log('🔥 EXECUTING_ACTION - About to execute action');
    action();
    console.log('🔥 CLOSING_MODAL - About to close modal');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>Message Options</Text>
              </View>
              
              <View style={styles.optionsContainer}>
                {/* Copy option - available for all messages */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress(() => onCopy(message))}
                >
                  <Copy size={20} color="#FFFFFF" />
                  <Text style={styles.optionText}>Copy Text</Text>
                </TouchableOpacity>

                {/* Reply option - available for all messages */}
                {onReply && (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleOptionPress(() => onReply(message))}
                  >
                    <Reply size={20} color="#FFFFFF" />
                    <Text style={styles.optionText}>Reply</Text>
                  </TouchableOpacity>
                )}

                {/* Edit - only for own text messages */}
                {isOwn && message.type === 'text' && !message.isDeleted && (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleOptionPress(() => onEdit(message))}
                  >
                    <Edit3 size={20} color="#FFFFFF" />
                    <Text style={styles.optionText}>Edit Message</Text>
                  </TouchableOpacity>
                )}

                {/* Delete/Unsend - available for all own messages */}
                {isOwn && !message.isDeleted && (
                  <TouchableOpacity
                    style={[styles.option, styles.deleteOption]}
                    onPress={() => handleOptionPress(() => onDelete(message))}
                  >
                    <Trash2 size={20} color="#FF4444" />
                    <Text style={[styles.optionText, styles.deleteText]}>
                      {message.type === 'text' ? 'Delete Message' : 'Unsend'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    width: '80%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.2)',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  deleteText: {
    color: '#FF4444',
  },
});
