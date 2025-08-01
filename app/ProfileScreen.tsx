import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ProfileScreen from '../screens/ProfileScreen';

export default function ProfileScreenRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  
  return <ProfileScreen route={{ params: { userId } }} />;
}