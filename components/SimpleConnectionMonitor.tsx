import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { CheckCircle, XCircle, Clock } from 'lucide-react-native';

export default function SimpleConnectionMonitor() {
  const [status, setStatus] = useState<'testing' | 'connected' | 'disconnected'>('testing');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(0);

  const testConnection = async () => {
    setStatus('testing');
    const startTime = Date.now();
    
    try {
      // Simple, fast query
      const { data, error } = await Promise.race([
        supabase.from('user_profiles').select('id').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]) as any;
      
      const testDuration = Date.now() - startTime;
      setDuration(testDuration);
      setLastCheck(new Date());
      
      if (error) {
        console.log('❌ Connection test failed:', error.message);
        setStatus('disconnected');
      } else {
        console.log(`✅ Connection test successful (${testDuration}ms)`);
        setStatus('connected');
      }
    } catch (error: any) {
      const testDuration = Date.now() - startTime;
      setDuration(testDuration);
      setLastCheck(new Date());
      console.log('❌ Connection test error:', error.message);
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    // Test immediately
    testConnection();
    
    // Test every 15 seconds
    const interval = setInterval(testConnection, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle size={14} color="#4CAF50" />;
      case 'disconnected':
        return <XCircle size={14} color="#FF6B6B" />;
      case 'testing':
        return <Clock size={14} color="#FFA500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return `Connected (${duration}ms)`;
      case 'disconnected':
        return `Disconnected (${duration}ms)`;
      case 'testing':
        return 'Testing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'disconnected':
        return '#FF6B6B';
      case 'testing':
        return '#FFA500';
    }
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <View style={styles.row}>
        {getStatusIcon()}
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      {lastCheck && (
        <Text style={styles.timestamp}>
          {lastCheck.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 8,
    margin: 4,
    borderWidth: 1,
    minWidth: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
});
