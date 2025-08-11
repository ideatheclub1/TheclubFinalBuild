import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { Dimensions } from 'react-native';

export default function NavigationDebug() {
  const insets = useSafeAreaInsets();
  const navigationMode = useNavigationMode();
  const { height: screenHeight } = Dimensions.get('window');
  const { height: windowHeight } = Dimensions.get('screen');
  const navBarHeight = windowHeight - screenHeight;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Navigation Mode: {navigationMode}</Text>
      <Text style={styles.text}>Screen Height: {screenHeight}</Text>
      <Text style={styles.text}>Window Height: {windowHeight}</Text>
      <Text style={styles.text}>Nav Bar Height: {navBarHeight}</Text>
      <Text style={styles.text}>Safe Area Top: {insets.top}</Text>
      <Text style={styles.text}>Safe Area Bottom: {insets.bottom}</Text>
      <Text style={styles.text}>Safe Area Left: {insets.left}</Text>
      <Text style={styles.text}>Safe Area Right: {insets.right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
