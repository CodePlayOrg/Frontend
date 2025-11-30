import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 친구 위치 타입
type FriendLocation = {
  nickname: string;
  lat: number;
  lon: number;
};

type WebSocketContextType = {
  friendLocations: Record<string, FriendLocation>; 
  sendMyLocation: (lat: number, lon: number) => void;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_URL = 'ws://3.34.70.142:8001';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [friendLocations, setFriendLocations] = useState<Record<string, FriendLocation>>({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const myNickname = useRef<string>("");

  useEffect(() => {
    const connect = async () => {
      const storedNickname = await AsyncStorage.getItem("userName");
      if (!storedNickname) {
        console.log("❌ 로컬에 userName 없음");
        return;
      }

      myNickname.current = storedNickname;

      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("🟢 WebSocket Connected");
        setIsConnected(true);

        ws.current?.send(JSON.stringify({
          type: "join",
          username: storedNickname,
        }));
      };

      // 서버에서 위치 수신
      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "location") {
            // 내 위치면 무시
            if (msg.nickname === myNickname.current) return;

            setFriendLocations(prev => ({
              ...prev,
              [msg.nickname]: {
                nickname: msg.nickname,
                lat: msg.lat,
                lon: msg.lon
              }
            }));
          }
        } catch (err) {
          console.log("❌ WS Parse Error:", err);
        }
      };

      ws.current.onclose = () => {
        console.log("🔴 WebSocket Closed");
        setIsConnected(false);
      };

      ws.current.onerror = (err) => {
        console.log("❌ WebSocket Error", err);
      };
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, []);

  // 내 위치 서버로 전송
  const sendMyLocation = (lat: number, lon: number) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return;

    ws.current.send(JSON.stringify({
      type: "location",
      nickname: myNickname.current,
      lat,
      lon,
    }));
  };

  return (
    <WebSocketContext.Provider value={{ friendLocations, sendMyLocation, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
};
