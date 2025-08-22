import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '@/app/lib/supabase';

export default function DatabaseDiagnostic() {
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const result = `[${timestamp}] ${message}`;
    setResults(prev => [...prev, result]);
    console.log(result);
  };

  const testDatabaseConfiguration = async () => {
    setTesting(true);
    setResults([]);
    
    addResult('🔍 Starting database diagnostic...');
    
    try {
      // Test 1: Basic configuration
      addResult('📋 Testing Supabase configuration...');
      const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
      const currentUrl = supabase.supabaseUrl;
      addResult(`URL Check: ${currentUrl === supabaseUrl ? '✅' : '❌'} ${currentUrl}`);
      
      // Test 2: Connection to Supabase
      addResult('🌐 Testing connection to Supabase...');
      try {
        const response = await fetch(supabaseUrl + '/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g'
          }
        });
        addResult(`REST API: ${response.ok ? '✅' : '❌'} Status ${response.status}`);
      } catch (error: any) {
        addResult(`REST API: ❌ ${error.message}`);
      }

      // Test 3: Check if user_profiles table exists
      addResult('🗄️ Testing user_profiles table...');
      try {
        const { data, error, status } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        if (error) {
          addResult(`user_profiles: ❌ ${error.message} (Status: ${status})`);
          if (error.message.includes('relation "user_profiles" does not exist')) {
            addResult('💡 SOLUTION: You need to create the user_profiles table in your database');
          }
        } else {
          addResult(`user_profiles: ✅ Found ${data?.length || 0} records`);
        }
      } catch (error: any) {
        addResult(`user_profiles: ❌ ${error.message}`);
      }

      // Test 4: Check other required tables
      addResult('📊 Testing other required tables...');
      const requiredTables = ['conversations', 'messages', 'user_presence'];
      
      for (const table of requiredTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            addResult(`${table}: ❌ ${error.message}`);
          } else {
            addResult(`${table}: ✅ Accessible`);
          }
        } catch (error: any) {
          addResult(`${table}: ❌ ${error.message}`);
        }
      }

      // Test 5: Check authentication
      addResult('🔐 Testing authentication...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          addResult(`Auth: ❌ ${error.message}`);
        } else if (session) {
          addResult(`Auth: ✅ User logged in: ${session.user.id}`);
          
          // Test RLS with current user
          try {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id);
              
            if (error) {
              addResult(`RLS Test: ❌ ${error.message}`);
            } else {
              addResult(`RLS Test: ✅ Can access own profile`);
            }
          } catch (rls_error: any) {
            addResult(`RLS Test: ❌ ${rls_error.message}`);
          }
        } else {
          addResult('Auth: ⚠️ No active session');
        }
      } catch (error: any) {
        addResult(`Auth: ❌ ${error.message}`);
      }

      addResult('🏁 Database diagnostic complete!');

    } catch (error: any) {
      addResult(`❌ Diagnostic failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const runDatabaseSetup = () => {
    Alert.alert(
      'Database Setup Required',
      'It looks like your database tables are missing. You need to:\n\n1. Run the SQL script: supabase_broadcast_setup_fixed.sql\n2. Make sure user_profiles table exists\n3. Ensure RLS policies are set up\n\nWould you like me to copy the setup instructions?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Show Instructions', onPress: showSetupInstructions }
      ]
    );
  };

  const showSetupInstructions = () => {
    Alert.alert(
      'Database Setup Instructions',
      'Steps to fix your database:\n\n1. Open Supabase Dashboard → SQL Editor\n2. Run: supabase_broadcast_setup_fixed.sql\n3. Check Tables tab to verify creation\n4. Restart your app\n\nThis will create all required tables and policies.',
      [{ text: 'Got it!' }]
    );
  };

  useEffect(() => {
    testDatabaseConfiguration();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Database Diagnostic</Text>
      
      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testDatabaseConfiguration}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? '🔄 Testing...' : '🔄 Retest Database'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.setupButton]} 
          onPress={runDatabaseSetup}
        >
          <Text style={styles.buttonText}>🛠️ Fix Database</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
    maxHeight: 400,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  resultText: {
    color: '#E0E0E0',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setupButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
