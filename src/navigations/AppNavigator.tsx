import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import StartScreen from '../screens/StartScreen';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/MypageScreen';
import FriendsScreen from '../screens/FriendsScreen';

export type RootStackParamList = {
  Start: undefined;
  Signup: undefined;
  Login: undefined;
  Home: undefined;
  Profile : undefined;
  Friends: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Start" component={StartScreen} options={{ title: '시작 화면' }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }}/>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }}/>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '홈화면' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '나의 프로필' }} />
        <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: '친구창' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
