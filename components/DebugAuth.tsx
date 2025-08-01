import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  PanResponder, 
  Animated, 
  Dimensions,
  Platform 
} from 'react-native';
import { useUser } from '@/contexts/UserContext';
import { ChevronDown, ChevronUp, Move, X } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DebugAuth: React.FC = () => {
  const { clearAllAuthData, isAuthenticated, user, isLoading } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ 
    x: Math.max(0, Math.min(screenWidth - 250, screenWidth - 210)), 
    y: Math.max(50, Math.min(screenHeight - 200, 100)) 
  });
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Scale down slightly when dragging starts
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        // Calculate new position based on current position + gesture delta
        const newX = Math.max(0, Math.min(screenWidth - 250, position.x + gesture.dx));
        const newY = Math.max(50, Math.min(screenHeight - 200, position.y + gesture.dy));
        
        pan.setValue({ x: newX - position.x, y: newY - position.y });
      },
      onPanResponderRelease: (_, gesture) => {
        // Calculate final position
        const newX = Math.max(0, Math.min(screenWidth - 250, position.x + gesture.dx));
        const newY = Math.max(50, Math.min(screenHeight - 200, position.y + gesture.dy));
        
        setPosition({ x: newX, y: newY });
        pan.setValue({ x: 0, y: 0 }); // Reset pan to 0 since we're updating position
        
        // Scale back to normal when dragging ends
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleClearAuth = async () => {
    await clearAllAuthData();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!__DEV__ || !isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Header with drag handle and controls */}
      <View style={styles.header}>
        <View style={styles.dragHandle}>
          <Move size={12} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>🔧 Debug Auth</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={toggleCollapse}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isCollapsed ? (
              <ChevronUp size={14} color="#FFFFFF" />
            ) : (
              <ChevronDown size={14} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible content */}
      {!isCollapsed && (
        <View style={styles.content}>
          <Text style={styles.status}>
            Status: {isLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Text>
          {user && (
            <Text style={styles.userInfo}>
              User: {user.username} (ID: {user.id})
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={handleClearAuth}>
            <Text style={styles.buttonText}>Clear All Auth Data</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    zIndex: 9999,
    minWidth: 200,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragHandle: {
    marginRight: 8,
    opacity: 0.7,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
    marginLeft: 4,
  },
  content: {
    padding: 12,
  },
  status: {
    color: '#FFFFFF',
    fontSize: 10,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  userInfo: {
    color: '#FFFFFF',
    fontSize: 10,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  button: {
    backgroundColor: '#E74C3C',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default DebugAuth; 