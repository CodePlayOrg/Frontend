import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 친구 위치 데이터 타입
export type FriendLocation = {
  username: string;
  latitude: number;
  longitude: number;
};

type WebSocketContextType = {
  friendLocations: Record<string, FriendLocation>; // 친구들 위치 저장소 { '아이디': {위치} }
  sendMyLocation: (lat: number, lng: number) => void; // 내 위치 전송 함수
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// ⭐️ 서버 주소 (10.0.2.2는 안드로이드 에뮬레이터용, 실기기는 PC IP 사용)
const WS_URL = 'ws://3.34.70.142:3001'; 

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [friendLocations, setFriendLocations] = useState<Record<string, FriendLocation>>({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const myUsername = useRef<string | null>(null);

  useEffect(() => {
    const connect = async () => {
      const storedName = await AsyncStorage.getItem('userName'); // 사용자 ID (username)
      if (!storedName) return;
      myUsername.current = storedName;

      // 웹소켓 연결 시작
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('🟢 WebSocket 연결 성공');
        setIsConnected(true);
        // 접속 알림 (서버에 "나 들어왔어" 라고 알림)
        ws.current?.send(JSON.stringify({ type: 'join', username: storedName }));
      };

      // 서버에서 메시지(친구 위치)가 왔을 때
      ws.current.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            
            // 친구 위치 업데이트 메시지라면
            if (data.type === 'update_location') {
              // 내 위치는 무시
              if (data.username === myUsername.current) return;

              // 상태 업데이트 (기존 데이터 유지 + 새 데이터 갱신)
              setFriendLocations((prev) => ({
                  ...prev,
                  [data.username]: {
                    username: data.username,
                    latitude: data.latitude,
                    longitude: data.longitude,
                  },
              }));
              // console.log(`📍 [WS] ${data.username} 위치 수신:`, data.latitude, data.longitude);
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

  // 내 위치 전송 함수 (App.tsx에서 호출)
  const sendMyLocation = (lat: number, lng: number) => {
    if (ws.current?.readyState === WebSocket.OPEN && myUsername.current) {
      ws.current.send(JSON.stringify({
        type: 'location',
        username: myUsername.current,
        latitude: lat,
        longitude: lng
      }));
      // console.log("📡 [WS] 내 위치 전송:", lat, lng);
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