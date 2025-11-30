import React, { useEffect } from 'react';
import { Alert, Platform, LogBox } from 'react-native';
import { TimetableProvider } from './src/context/TimetableContext';
// ⭐️ WebSocketProvider 추가
import { WebSocketProvider, useWebSocket } from './src/context/WebSocketContext'; 
import AppNavigator from './src/navigations/AppNavigator';
import Geolocation from '@react-native-community/geolocation';

LogBox.ignoreLogs(['new NativeEventEmitter']); 

// 위치 추적 컴포넌트 (Context 안에서 동작해야 하므로 분리)
const LocationTracker = () => {
  const { sendMyLocation } = useWebSocket();

  useEffect(() => {
    if (Platform.OS === 'ios') Geolocation.requestAuthorization();

    // 1. 이동할 때마다 위치 전송 (웹소켓)
    const watchId = Geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // ⭐️ API 대신 웹소켓으로 전송!
        sendMyLocation(latitude, longitude);
      },
      (err) => console.log("위치 오류:", err),
      { 
          enableHighAccuracy: true, 
          distanceFilter: 10, // 10m 이동 시마다
          interval: 5000      // 5초마다
      } 
    );

    return () => Geolocation.clearWatch(watchId);
  }, []);

  return null; // 화면 없음
};

const App = () => {
  return (
    <TimetableProvider>
      <WebSocketProvider>
        <LocationTracker /> 
        <AppNavigator />
      </WebSocketProvider>
    </TimetableProvider>
  );
};

export default App;