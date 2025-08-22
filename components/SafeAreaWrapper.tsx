import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function SafeAreaWrapper({ 
  children, 
  style, 
  backgroundColor = '#1E1E1E',
  edges = ['top', 'bottom', 'left', 'right']
}: SafeAreaWrapperProps) {
  const insets = useSafeAreaInsets();
  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingTop: edges.includes('top') ? insets.top : 0,
      paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      paddingLeft: edges.includes('left') ? insets.left : 0,
      paddingRight: edges.includes('right') ? insets.right : 0,
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
