import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Bug, X, Trash2, Download, Filter, Search, 
  Info, AlertTriangle, CheckCircle, Clock, Activity, Video 
} from 'lucide-react-native';
import { debugLogger, DebugLog } from '@/utils/debugLogger';
import { supabase } from '@/app/lib/supabase';
import ThumbnailTestComponent from './ThumbnailTestComponent';

const { width, height } = Dimensions.get('window');

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'PROCESS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showThumbnailTest, setShowThumbnailTest] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update logs every 500ms
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setLogs(debugLogger.getLogs());
    }, 500);

    return () => clearInterval(interval);
  }, [visible]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch = searchQuery === '' || 
      log.component.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'INFO': return '#3B82F6';
      case 'WARN': return '#F59E0B';
      case 'ERROR': return '#EF4444';
      case 'SUCCESS': return '#10B981';
      case 'PROCESS': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getLevelIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'INFO': return <Info size={12} color="#3B82F6" />;
      case 'WARN': return <AlertTriangle size={12} color="#F59E0B" />;
      case 'ERROR': return <AlertTriangle size={12} color="#EF4444" />;
      case 'SUCCESS': return <CheckCircle size={12} color="#10B981" />;
      case 'PROCESS': return <Activity size={12} color="#8B5CF6" />;
      default: return <Clock size={12} color="#6B7280" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            debugLogger.clear();
            setLogs([]);
          }
        }
      ]
    );
  };

  const deleteSpecificPosts = async () => {
    const postIds = [
      '22e869de-c158-4e59-a4b4-20a3e3f3944c',
      '25322aa4-aec6-4e79-a179-20ec83900932'
    ];

    Alert.alert(
      'Delete Posts',
      `Are you sure you want to delete these 2 specific posts?\n\nIDs:\n${postIds.join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // First, let's try to run the fix for the trigger issue
              debugLogger.log('Attempting to fix database triggers...');
              
              // Try to delete posts one by one to avoid trigger issues
              let deletedCount = 0;
              
              for (const postId of postIds) {
                try {
                  // Delete related data first to avoid trigger issues
                  await supabase.from('likes').delete().eq('post_id', postId);
                  await supabase.from('comments').delete().eq('post_id', postId);
                  await supabase.from('post_hashtags').delete().eq('post_id', postId);
                  
                  // Now delete the post
                  const { error: postError } = await supabase
                    .from('posts')
                    .delete()
                    .eq('id', postId);
                    
                  if (postError) {
                    debugLogger.error('Failed to delete post', { postId, error: postError.message });
                  } else {
                    deletedCount++;
                    debugLogger.log('Post deleted successfully', { postId });
                  }
                } catch (error) {
                  debugLogger.error('Error deleting post', { postId, error });
                }
              }

              if (deletedCount > 0) {
                Alert.alert('Success', `Deleted ${deletedCount} out of ${postIds.length} posts successfully!`);
              } else {
                Alert.alert('Error', 'Failed to delete any posts. Check debug logs for details.');
              }
              
            } catch (error) {
              Alert.alert('Error', `Unexpected error: ${error}`);
              debugLogger.error('Delete posts error', { error });
            }
          }
        }
      ]
    );
  };

  const exportLogs = () => {
    const logData = debugLogger.exportLogs();
    // In a real app, you'd save this to a file or share it
    Alert.alert('Export Logs', `Logs exported (${logs.length} entries)`);
    console.log('Debug Logs:', logData);
  };

  const FilterButton = ({ level, label }: { level: DebugLog['level'] | 'ALL', label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterLevel === level && styles.filterButtonActive
      ]}
      onPress={() => setFilterLevel(level as any)}
    >
      <Text style={[
        styles.filterButtonText,
        filterLevel === level && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1E1E1E', '#2A2A2A', '#1E1E1E']}
          style={styles.background}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bug size={24} color="#10B981" />
              <Text style={styles.headerTitle}>Debug Panel</Text>
              <View style={styles.logCount}>
                <Text style={styles.logCountText}>{filteredLogs.length}</Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setAutoScroll(!autoScroll)}
              >
                <Text style={[styles.headerButtonText, autoScroll && styles.headerButtonTextActive]}>
                  Auto
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={exportLogs}
              >
                <Download size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowThumbnailTest(true)}
              >
                <Video size={20} color="#8B5CF6" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.headerButton}
                onPress={deleteSpecificPosts}
              >
                <Trash2 size={20} color="#F59E0B" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.headerButton}
                onPress={clearLogs}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search logs..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Buttons */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            <FilterButton level="ALL" label="All" />
            <FilterButton level="INFO" label="Info" />
            <FilterButton level="WARN" label="Warn" />
            <FilterButton level="ERROR" label="Error" />
            <FilterButton level="SUCCESS" label="Success" />
            <FilterButton level="PROCESS" label="Process" />
          </ScrollView>

          {/* Logs */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.logsContainer}
            showsVerticalScrollIndicator={false}
          >
            {filteredLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No logs to display</Text>
              </View>
            ) : (
              filteredLogs.map((log, index) => (
                <View key={`${log.timestamp}-${index}`} style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <View style={styles.logLevel}>
                      {getLevelIcon(log.level)}
                      <Text style={[styles.logLevelText, { color: getLevelColor(log.level) }]}>
                        {log.level}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                  </View>
                  
                  <View style={styles.logContent}>
                    <Text style={styles.logComponent}>{log.component}</Text>
                    <Text style={styles.logAction}>{log.action}</Text>
                  </View>
                  
                  <Text style={styles.logMessage}>{log.message}</Text>
                  
                  {log.duration && (
                    <Text style={styles.logDuration}>{log.duration}ms</Text>
                  )}
                  
                  {log.data && (
                    <View style={styles.logData}>
                      <Text style={styles.logDataText}>
                        {JSON.stringify(log.data, null, 2)}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </Modal>

    {/* Thumbnail Test Modal */}
    <Modal
      visible={showThumbnailTest}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <ThumbnailTestComponent onClose={() => setShowThumbnailTest(false)} />
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginLeft: 8,
  },
  logCount: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  logCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  headerButtonTextActive: {
    color: '#10B981',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 16,
    paddingVertical: 12,
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  logsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  logItem: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logLevelText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logContent: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logComponent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    marginRight: 8,
  },
  logAction: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  logMessage: {
    fontSize: 14,
    color: '#F9FAFB',
    marginBottom: 4,
  },
  logDuration: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  logData: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  logDataText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
}); 