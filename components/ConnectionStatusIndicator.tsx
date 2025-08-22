import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useDebugLogger } from '@/utils/debugLogger';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  networkStatus: boolean;
  supabaseConnected: boolean;
  onRetry?: () => void;
  showDetails?: boolean;
}

export default function ConnectionStatusIndicator({
  isConnected,
  networkStatus,
  supabaseConnected,
  onRetry,
  showDetails = false
}: ConnectionStatusIndicatorProps) {
  const debugLogger = useDebugLogger('ConnectionStatusIndicator');

  if (isConnected) {
    return null; // Don't show anything when fully connected
  }

  const getStatusIcon = () => {
    if (!networkStatus) {
      return <WifiOff size={16} color="#FF6B6B" />;
    }
    if (!supabaseConnected) {
      return <AlertTriangle size={16} color="#FFA500" />;
    }
    return <AlertTriangle size={16} color="#FF6B6B" />;
  };

  const getStatusText = () => {
    if (!networkStatus) {
      return 'No internet connection';
    }
    if (!supabaseConnected) {
      return 'Database connection issues';
    }
    return 'Connection problems';
  };

  const getStatusColor = () => {
    if (!networkStatus) {
      return '#FF6B6B';
    }
    if (!supabaseConnected) {
      return '#FFA500';
    }
    return '#FF6B6B';
  };

  const handleRetry = () => {
    debugLogger.info('CONNECTION_STATUS', 'RETRY_CLICKED', 'User clicked retry button');
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <View style={styles.statusRow}>
        {getStatusIcon()}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {onRetry && (
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <RefreshCw size={14} color={getStatusColor()} />
          </TouchableOpacity>
        )}
      </View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Wifi size={12} color={networkStatus ? '#4CAF50' : '#FF6B6B'} />
            <Text style={[styles.detailText, { color: networkStatus ? '#4CAF50' : '#FF6B6B' }]}>
              Network: {networkStatus ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <CheckCircle size={12} color={supabaseConnected ? '#4CAF50' : '#FF6B6B'} />
            <Text style={[styles.detailText, { color: supabaseConnected ? '#4CAF50' : '#FF6B6B' }]}>
              Database: {supabaseConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
      )}
      
      <Text style={styles.warningText}>
        ⚠️ Messages may not update automatically
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
    textAlign: 'center',
  },
});
