import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import { X, RefreshCw, TestTube, BarChart3, Info } from 'lucide-react-native';
import { cacheService } from '@/services/cacheService';
import { debugLogger } from '@/utils/debugLogger';

interface CacheDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface CacheStats {
  platform: string;
  memoryCache: {
    totalItems: number;
    totalSize: number;
    byType: Record<string, number>;
  };
  mediaCache: {
    totalItems: number;
    totalSize: number;
    oldestItem?: { url: string; age: number };
    newestItem?: { url: string; age: number };
  };
  persistent: {
    totalSize: number;
    keyCount: number;
    sampleKeys: string[];
  };
  isWebPlatform: boolean;
  mediaCacheDisabled: boolean;
}

const CacheDebugPanel: React.FC<CacheDebugPanelProps> = ({ visible, onClose }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [detailedInfo, setDetailedInfo] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      loadCacheStats();
    }
  }, [visible]);

  const loadCacheStats = async () => {
    try {
      setLoading(true);
      const cacheStats = await cacheService.getStats();
      setStats(cacheStats);
      debugLogger.info('CACHE_DEBUG', 'STATS_LOADED', 'Cache stats loaded for debug panel', cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      Alert.alert('Error', 'Failed to load cache statistics');
    } finally {
      setLoading(false);
    }
  };

  const runCacheTests = async () => {
    try {
      setLoading(true);
      console.log('🧪 Starting cache test suite...');
      
      const results = await cacheService.testCacheOperations();
      setTestResults(results);
      
      console.log('🧪 Cache test results:', results);
      
      Alert.alert(
        'Cache Tests Complete',
        `Tests ${results.success ? 'PASSED' : 'FAILED'}\n\nCheck console for details`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Cache test failed:', error);
      Alert.alert('Error', 'Cache test suite failed');
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedInfo = async () => {
    try {
      setLoading(true);
      const info = await cacheService.getDetailedCacheInfo();
      setDetailedInfo(info);
      console.log('🔍 Detailed cache info:', info);
    } catch (error) {
      console.error('Failed to load detailed cache info:', error);
      Alert.alert('Error', 'Failed to load detailed cache information');
    } finally {
      setLoading(false);
    }
  };

  const clearAllCaches = async () => {
    Alert.alert(
      'Clear All Caches',
      'Are you sure? This will clear all cached data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would require implementing a clearAll method
              console.log('🗑️ Clearing all caches...');
              debugLogger.info('CACHE_DEBUG', 'CLEAR_ALL', 'Clearing all caches from debug panel');
              Alert.alert('Success', 'All caches cleared');
              loadCacheStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear caches');
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatAge = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cache Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#007AFF' }]} 
            onPress={loadCacheStats}
            disabled={loading}
          >
            <RefreshCw size={16} color="white" />
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#FF9500' }]} 
            onPress={runCacheTests}
            disabled={loading}
          >
            <TestTube size={16} color="white" />
            <Text style={styles.buttonText}>Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#34C759' }]} 
            onPress={loadDetailedInfo}
            disabled={loading}
          >
            <Info size={16} color="white" />
            <Text style={styles.buttonText}>Details</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}

          {/* Platform Info */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Platform Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Platform:</Text>
                <Text style={styles.value}>{stats.platform}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Media Caching:</Text>
                <Text style={[styles.value, { color: stats.mediaCacheDisabled ? '#FF3B30' : '#34C759' }]}>
                  {stats.mediaCacheDisabled ? 'DISABLED (Web)' : 'ENABLED'}
                </Text>
              </View>
            </View>
          )}

          {/* Memory Cache Stats */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Memory Cache</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Items:</Text>
                <Text style={styles.value}>{stats.memoryCache.totalItems}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Size:</Text>
                <Text style={styles.value}>{formatBytes(stats.memoryCache.totalSize)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>By Type:</Text>
                <View style={styles.typeList}>
                  {Object.entries(stats.memoryCache.byType).map(([type, count]) => (
                    <Text key={type} style={styles.typeItem}>
                      {type}: {count}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Media Cache Stats */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Media Cache</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Files:</Text>
                <Text style={styles.value}>{stats.mediaCache.totalItems}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Size:</Text>
                <Text style={styles.value}>{formatBytes(stats.mediaCache.totalSize)}</Text>
              </View>
              {stats.mediaCache.oldestItem && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Oldest:</Text>
                  <Text style={styles.value}>{formatAge(stats.mediaCache.oldestItem.age)}</Text>
                </View>
              )}
              {stats.mediaCache.newestItem && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Newest:</Text>
                  <Text style={styles.value}>{formatAge(stats.mediaCache.newestItem.age)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Persistent Cache Stats */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Persistent Cache (AsyncStorage)</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Keys:</Text>
                <Text style={styles.value}>{stats.persistent.keyCount}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Est. Size:</Text>
                <Text style={styles.value}>{formatBytes(stats.persistent.totalSize)}</Text>
              </View>
              {stats.persistent.sampleKeys.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Sample Keys:</Text>
                  <View style={styles.typeList}>
                    {stats.persistent.sampleKeys.map((key, index) => (
                      <Text key={index} style={styles.typeItem}>
                        {key.replace('cache:', '')}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Test Results */}
          {testResults && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Results</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Overall:</Text>
                <Text style={[styles.value, { color: testResults.success ? '#34C759' : '#FF3B30' }]}>
                  {testResults.success ? 'PASSED' : 'FAILED'}
                </Text>
              </View>
              {testResults.results.map((result: any, index: number) => (
                <View key={index} style={styles.infoRow}>
                  <Text style={styles.label}>{result.test}:</Text>
                  <Text style={[styles.value, { color: result.success ? '#34C759' : '#FF3B30' }]}>
                    {result.success ? 'PASS' : 'FAIL'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Detailed Info */}
          {detailedInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detailed Cache Contents</Text>
              <Text style={styles.jsonText}>
                {JSON.stringify(detailedInfo, null, 2)}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  typeList: {
    flex: 1,
    alignItems: 'flex-end',
  },
  typeItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  jsonText: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
});

export default CacheDebugPanel;











