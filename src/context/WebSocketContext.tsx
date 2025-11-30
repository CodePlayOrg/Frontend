import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 친구의 위치 데이터 타입
type FriendLocation = {
  username: string;
  latitude: number;
  longitude: number;
};

type WebSocketContextType = {
  friendLocations: Record<string, FriendLocation>; // { 'friendId': { lat, lng } } 형태
  sendMyLocation: (lat: number, lng: number) => void; // 내 위치 전송 함수
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// ⭐️ 서버 주소 (안드로이드 에뮬레이터: 10.0.2.2, 실기기: 내 PC IP)
const WS_URL = 'ws://3.34.70.142:3001'; 

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [friendLocations, setFriendLocations] = useState<Record<string, FriendLocation>>({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const myUsername = useRef<string | null>(null);

  useEffect(() => {
    const connect = async () => {
      const storedName = await AsyncStorage.getItem('userName'); // 사용자 ID 가져오기
      // ⭐️ 주의: 백엔드 로직에 따라 username을 식별자로 쓴다면 이걸 보내야 함
      // 만약 토큰 기반 인증이라면 'ticket'이나 'protocol'을 써야 할 수도 있음.
      // 여기선 가장 단순한 식별자 전송 방식으로 구현함.
      
      if (!storedName) return;
      myUsername.current = storedName;

      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('🟢 WebSocket 연결 성공');
        setIsConnected(true);
        // 접속 알림 메시지 전송
        ws.current?.send(JSON.stringify({ type: 'join', username: storedName }));
      };

      ws.current.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            
            // 서버에서 누가 위치를 보냈을 때 (Broadcast 수신)
            if (data.type === 'update_location' || data.type === 'location') {
            // 내 위치는 무시 (내가 보낸 거니까)
            if (data.username === myUsername.current) return;

            // 상태 업데이트 (기존 데이터 유지하면서 해당 친구 위치만 갱신)
            setFriendLocations((prev) => ({
                ...prev,
                [data.username]: {
                username: data.username,
                latitude: data.lat || data.latitude, // 서버 필드명 대응
                longitude: data.lon || data.longitude,
                },
            }));
            }
        } catch (err) {
            console.log('WS Message Parse Error', err);
        }
      };

      ws.current.onclose = () => {
          console.log('🔴 WebSocket 연결 해제');
          setIsConnected(false);
      };
      ws.current.onerror = (e) => console.log('❌ WebSocket 에러', e.message);
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, []);

  // 내 위치 전송 함수 (App.tsx 등에서 호출)
  const sendMyLocation = (lat: number, lng: number) => {
    if (ws.current?.readyState === WebSocket.OPEN && myUsername.current) {
      ws.current.send(JSON.stringify({
        type: 'location',
        username: myUsername.current,
        latitude: lat,
        longitude: lng,
        // 백엔드가 lat/lon을 받는지 latitude/longitude를 받는지 확인 후 통일
        lat: lat, 
        lon: lng 
      }));
    }
  };

  return (
    <WebSocketContext.Provider value={{ friendLocations, sendMyLocation, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};