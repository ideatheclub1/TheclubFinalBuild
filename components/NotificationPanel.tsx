import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  user: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  avatar?: string;
}

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  visible,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  const [slideAnim] = useState(new Animated.Value(SCREEN_WIDTH));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Ionicons name="heart" size={20} color="#E74C3C" />;
      case 'comment':
        return <Ionicons name="chatbubble" size={20} color="#7A4FE2" />;
      case 'follow':
        return <Ionicons name="person-add" size={20} color="#7A4FE2" />;
      case 'mention':
        return <Ionicons name="at" size={20} color="#7A4FE2" />;
      default:
        return <Ionicons name="notifications" size={20} color="#7A4FE2" />;
    }
  };

  const groupNotificationsByDay = (notifications: Notification[]) => {
    const grouped: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(notification);
    });
    
    return grouped;
  };

  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      user: 'sarah_dev',
      message: 'liked your post',
      timestamp: new Date().toISOString(),
      isRead: false,
    },
    {
      id: '2',
      type: 'comment',
      user: 'mike_creator',
      message: 'commented on your reel',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
    },
    {
      id: '3',
      type: 'follow',
      user: 'alex_photo',
      message: 'started following you',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isRead: true,
    },
    {
      id: '4',
      type: 'mention',
      user: 'jenny_art',
      message: 'mentioned you in a comment',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      isRead: true,
    },
  ];

  const groupedNotifications = groupNotificationsByDay(mockNotifications);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <BlurView intensity={20} style={styles.blurContainer}>
            <SafeAreaView style={styles.safeArea}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.markAllButton}
                    onPress={onMarkAllRead}
                  >
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                  >
                    <Ionicons name="close" size={24} color="#F5F5F5" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notifications List */}
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
                  <View key={date} style={styles.dayGroup}>
                    <Text style={styles.dayHeader}>
                      {date === new Date().toDateString() ? 'Today' : date}
                    </Text>
                    
                    {dayNotifications.map((notification) => (
                      <TouchableOpacity
                        key={notification.id}
                        style={[
                          styles.notificationItem,
                          !notification.isRead && styles.unreadNotification,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.notificationIcon}>
                          {getNotificationIcon(notification.type)}
                        </View>
                        
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationText}>
                            <Text style={styles.username}>@{notification.user}</Text>
                            {' '}
                            <Text style={styles.message}>{notification.message}</Text>
                          </Text>
                          <Text style={styles.timestamp}>
                            {new Date(notification.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        
                        {!notification.isRead && (
                          <View style={styles.unreadDot} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </SafeAreaView>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT,
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5F5F5',
    fontFamily: 'Inter-SemiBold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#7A4FE2',
  },
  markAllText: {
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0B0B0',
    marginHorizontal: 20,
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  unreadNotification: {
    backgroundColor: 'rgba(122, 79, 226, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#7A4FE2',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(122, 79, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#F5F5F5',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  username: {
    fontWeight: '600',
    color: '#7A4FE2',
    fontFamily: 'Inter-SemiBold',
  },
  message: {
    color: '#B0B0B0',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'Inter-Regular',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7A4FE2',
    marginLeft: 12,
  },
});

export default NotificationPanel;