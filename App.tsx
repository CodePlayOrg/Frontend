import React, { useEffect } from 'react';
import { TimetableProvider } from './src/context/TimetableContext';
import { WebSocketProvider, useWebSocket } from './src/context/WebSocketContext'; // ⭐️ 추가
import AppNavigator from './src/navigations/AppNavigator';
import Geolocation from '@react-native-community/geolocation';

// 위치 추적 로직을 분리한 컴포넌트
const LocationTracker = () => {
  const { sendMyLocation } = useWebSocket();

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // ⭐️ 내 위치가 변할 때마다 소켓으로 전송!
        sendMyLocation(latitude, longitude);
      },
      (err) => console.log(err),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
    );
    return () => Geolocation.clearWatch(watchId);
  }, []);

  return null; // UI는 없음
};

const App = () => {
  return (
    <TimetableProvider>
      <WebSocketProvider> 
        <LocationTracker /> {/* ⭐️ 여기서 위치 추적 시작 */}
        <AppNavigator />
      </WebSocketProvider>
    </TimetableProvider>
  );
};

export default App;