import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Text,
  Image,
  Alert,
} from 'react-native';
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapViewRef,
  NaverMapCircleOverlay,
} from '@mj-studio/react-native-naver-map';

import Geolocation from '@react-native-community/geolocation';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔹 API 설정
const NAVER_CLIENT_ID = "m3ckbz520a";   
const NAVER_CLIENT_SECRET = "a9mqDAN0HWYWh1tqsPQ5rJYma53n7MMgtHZ79kqG"; 
const API_URL = 'http://3.34.70.142:3001'; 
const TMAP_APP_KEY = "t2I25GO6US3STSH06HEde8GS3KFV7NggoW1sYYp2"; 

type ClassMarker = {
    id: string;
    name: string; 
    latitude: number;
    longitude: number;
    classes: string[]; 
};

// ⭐️ 친구 마커 타입
type FriendMarker = {
    name: string;      // 친구 이름
    building: string;  // 건물명
    latitude: number;
    longitude: number;
};

type NavInfo = {
    destination: string;
    totalTime: number; 
    remainingDistance: number; 
};

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navRoute = useRoute<HomeScreenRouteProp>();
  
  const [classes, setClasses] = useState<any[]>([]); 
  const mapRef = useRef<NaverMapViewRef>(null);

  // 내 위치
  const [location, setLocation] = useState({
    latitude: 35.8883,
    longitude: 128.6106,
  });

  const [isNavigating, setIsNavigating] = useState(false);
  const [navInfo, setNavInfo] = useState<NavInfo | null>(null);
  const [pathRoute, setPathRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const watchId = useRef<number | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  
  const [classMarkers, setClassMarkers] = useState<ClassMarker[]>([]);
  
  // ⭐️ 친구 위치 마커 상태
  const [friendMarker, setFriendMarker] = useState<FriendMarker | null>(null);

  useEffect(() => {
    requestLocationPermission();
    return () => {
        if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      // @ts-ignore
      Geolocation.requestAuthorization('whenInUse');
      getCurrentPosition();
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) getCurrentPosition();
    }
  };

  const getCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude }); 
        if (mapRef.current && !isNavigating) {
            mapRef.current.animateCameraTo({ latitude, longitude, zoom: 15 });
        }
      },
      (err) => console.log('GPS error:', err),
      { enableHighAccuracy: true },
    );
  };

  const startWatchingPosition = () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
      watchId.current = Geolocation.watchPosition(
          (pos) => {
              const { latitude, longitude } = pos.coords;
              setLocation({ latitude, longitude });
          },
          (err) => console.log('Watching Error:', err),
          { enableHighAccuracy: true, distanceFilter: 5, interval: 1000, fastestInterval: 500 }
      );
  };

  useEffect(() => {
    if (isNavigating && pathRoute.length > 0) {
        const nextPoint = pathRoute[0];
        const dist = Math.sqrt(
            Math.pow(location.latitude - nextPoint.latitude, 2) + 
            Math.pow(location.longitude - nextPoint.longitude, 2)
        );
        if (dist < 0.0003) {
            const newPath = pathRoute.slice(1);
            setPathRoute(newPath);
            if (newPath.length === 0) {
                Alert.alert("안내", "목적지 부근에 도착했습니다.");
                stopNavigation();
            }
        }
    }
  }, [location, isNavigating]);

  const getOneCoordinate = async (buildingName: string) => {
    try {
        const res = await axios.get(`${API_URL}/location/coordinates`, {
            params: { location: buildingName } 
        });
        const { first, second } = res.data;
        if (first && second) {
            return { lat: parseFloat(first), lng: parseFloat(second) };
        }
        return null;
    } catch (e) {
        return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchMyTimetableAndMarkers = async () => {
          try {
              if (!isNavigating) getCurrentPosition();
              const token = await AsyncStorage.getItem('userToken');
              if (!token) return;
              const res = await axios.get(`${API_URL}/users/timetable`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const timetableData = res.data.timetable || [];
              setClasses(timetableData);

              if (timetableData.length === 0) {
                  setClassMarkers([]);
                  return;
              }

              const tempMarkers: Record<string, ClassMarker> = {};
              const buildingToClasses: Record<string, string[]> = {};

              for (const cls of timetableData) {
                  const rawLoc = cls.location || cls.place || ''; 
                  if (!rawLoc) continue;
                  let cleanLoc = rawLoc.replace(/산격동캠퍼스|상주캠퍼스|동인동캠퍼스/g, '').trim();
                  if (cleanLoc.includes('(')) cleanLoc = cleanLoc.split('(')[0].trim();
                  const parts = cleanLoc.split(' ').filter((p: string) => p.trim() !== '');
                  let buildingName = '';
                  for (let i = parts.length - 1; i >= 0; i--) {
                      const part = parts[i];
                      if (!part.match(/^[\d-]+호?$/) && !part.match(/^[A-Z]?\d+$/)) {
                          buildingName = part.replace(/\d+호?$/, ''); 
                          break; 
                      }
                  }
                  if (!buildingName) continue;
                  if (!buildingToClasses[buildingName]) buildingToClasses[buildingName] = [];
                  if (!buildingToClasses[buildingName].includes(cls.name)) {
                      buildingToClasses[buildingName].push(cls.name);
                  }
                  const coord = await getOneCoordinate(buildingName);
                  if (coord) {
                      tempMarkers[buildingName] = {
                          id: buildingName,
                          name: buildingName,
                          latitude: coord.lat,
                          longitude: coord.lng,
                          classes: buildingToClasses[buildingName]
                      };
                  }
              }
              setClassMarkers(Object.values(tempMarkers));
          } catch (e) { console.log("데이터 로드 실패:", e); }
      };
      fetchMyTimetableAndMarkers();
      setMapKey((prev) => prev + 1);
    }, []) 
  );

  // ⭐️ [핵심] 친구 위치 파라미터 처리 및 마커 생성
  useEffect(() => {
    const handleNavParams = async () => {
        const params = navRoute.params as any; 

        // FriendsScreen에서 넘어온 파라미터 처리
        if (params?.searchQuery) {
            const buildingName = params.searchQuery;
            // friendName이 있으면 친구 이름으로, 없으면 건물 이름으로 표시
            const displayName = params.friendName || buildingName; 

            console.log(`📍 위치 찾기 요청: ${displayName} -> ${buildingName}`);

            const coord = await getOneCoordinate(buildingName);
            
            if (coord) {
                // ⭐️ 친구 마커 상태 설정 (보라색 원으로 표시됨)
                setFriendMarker({
                    name: displayName,
                    building: buildingName,
                    latitude: coord.lat,
                    longitude: coord.lng
                });

                // 지도 이동 및 안내
                setTimeout(() => {
                    mapRef.current?.animateCameraTo({ latitude: coord.lat, longitude: coord.lng, zoom: 17 });
                    Alert.alert("위치 확인", `${displayName}님이 수업 중인 건물(${buildingName})입니다.`);
                }, 500);
            } else {
                Alert.alert("알림", `"${buildingName}"의 위치 정보를 찾을 수 없습니다.`);
            }
        }
    };
    handleNavParams();
  }, [navRoute.params]);

  const getRoute = async (target: { x?: string; y?: string; latitude?: number; longitude?: number; name: string }) => {
    try {
        const destLng = target.x ? parseFloat(target.x) : target.longitude;
        const destLat = target.y ? parseFloat(target.y) : target.latitude;

        if (!destLng || !destLat) {
            Alert.alert("오류", "도착지 좌표를 찾을 수 없습니다.");
            return;
        }
        const startStr = `${location.longitude},${location.latitude}`;
        const endStr = `${destLng},${destLat}`;

        const url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json";
        const body = {
            startX: location.longitude, startY: location.latitude,
            endX: destLng, endY: destLat,
            reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
            startName: "Start", endName: "End",
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "appKey": TMAP_APP_KEY, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await response.json();

        if (json.features) {
            const path: { latitude: number; longitude: number }[] = [];
            json.features.forEach((feature: any) => {
                if (feature.geometry.type === "LineString") {
                    feature.geometry.coordinates.forEach((coord: number[]) => {
                        path.push({ longitude: coord[0], latitude: coord[1] });
                    });
                }
            });
            setPathRoute(path);
            const totalTime = json.features[0].properties.totalTime;
            setIsNavigating(true);
            setNavInfo({
                destination: target.name,
                totalTime: Math.ceil(totalTime / 60),
                remainingDistance: json.features[0].properties.totalDistance
            });
            startWatchingPosition();
            mapRef.current?.animateCameraTo({ latitude: location.latitude, longitude: location.longitude, zoom: 18 });
        } else {
            Alert.alert("길찾기 실패", "도보 경로를 찾을 수 없습니다.");
        }
    } catch (e) { console.log('길찾기 오류:', e); }
  };

  const stopNavigation = () => {
      setIsNavigating(false);
      setPathRoute([]);
      setNavInfo(null);
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
      mapRef.current?.animateCameraTo({ latitude: location.latitude, longitude: location.longitude, zoom: 15 });
  };

  return (
    <View style={styles.container}>
      <NaverMapView
        key={mapKey}
        ref={mapRef}
        style={styles.map}
        initialCamera={{ latitude: location.latitude, longitude: location.longitude, zoom: 15 }}
        onInitialized={() => setIsMapReady(true)}
        isShowLocationButton
        isShowCompass
      >
        {isMapReady && (
          <>
            <NaverMapCircleOverlay
                latitude={location.latitude} longitude={location.longitude}
                radius={25} color={"rgba(37, 99, 235, 0.2)"} outlineWidth={0}
            />
            <NaverMapCircleOverlay
                latitude={location.latitude} longitude={location.longitude}
                radius={7} color={"#2563EB"} outlineWidth={2} outlineColor={"#FFFFFF"}
            />
            <NaverMapMarkerOverlay
                latitude={location.latitude} longitude={location.longitude}
                image={require('../../assets/me_icon.png')} 
                width={1} height={1} alpha={0} 
                caption={{ text: "ME", textSize: 14, color: "#2563EB", haloColor: "#FFFFFF", offset: 10 }}
            />
          </>
        )}
        
        {/* 내 강의 마커들 */}
        {isMapReady && classMarkers.map((marker, index) => (
            <NaverMapMarkerOverlay
                key={`class-${index}`}
                latitude={marker.latitude} longitude={marker.longitude}
                caption={{
                    text: marker.name,
                    textSize: 16, color: "#000000", haloColor: "#FFFFFF", align: "Bottom",
                }}
                subCaption={{
                    text: marker.classes.join(', '), 
                    color: '#333333', textSize: 12, haloColor: "#FFFFFF"
                }}
                tintColor="green" 
                onTap={() => {
                    Alert.alert(
                        marker.name, 
                        `[수업 목록]\n${marker.classes.join('\n')}`,
                        [
                            { text: '닫기', style: 'cancel' },
                            { text: '도보 길찾기', onPress: () => getRoute(marker) }
                        ]
                    );
                }}
            />
        ))}

        {/* ⭐️ 친구 위치 마커 (보라색 원 + 이름) */}
        {isMapReady && friendMarker && (
            <>
                <NaverMapCircleOverlay
                    latitude={friendMarker.latitude} longitude={friendMarker.longitude}
                    radius={25} color={"rgba(128, 0, 128, 0.2)"} outlineWidth={0}
                />
                <NaverMapCircleOverlay
                    latitude={friendMarker.latitude} longitude={friendMarker.longitude}
                    radius={7} color={"#800080"} outlineWidth={2} outlineColor={"#FFFFFF"}
                />
                <NaverMapMarkerOverlay
                    latitude={friendMarker.latitude} longitude={friendMarker.longitude}
                    image={require('../../assets/me_icon.png')} 
                    width={1} height={1} alpha={0} 
                    caption={{ 
                        text: friendMarker.name, // 친구 이름 표시
                        textSize: 16, color: "#800080", haloColor: "#FFFFFF", align: "Top", offset: 10 
                    }}
                    onTap={() => {
                         Alert.alert(
                            friendMarker.name, 
                            `현재 위치: ${friendMarker.building || "건물 정보 없음"}`,
                            [
                                { text: '닫기', style: 'cancel' },
                                { text: '길찾기', onPress: () => getRoute(friendMarker) }
                            ]
                        );
                    }}
                />
            </>
        )}

        {pathRoute.length > 0 && (
          <NaverMapPathOverlay coords={pathRoute} width={8} color="#2563EB" outlineWidth={2} outlineColor="#FFFFFF" />
        )}
      </NaverMapView>

      {isNavigating && navInfo ? (
          <View style={styles.navInfoContainer}>
              <View style={styles.navInfoTextContainer}>
                  <Text style={styles.navTitle}>🚩 {navInfo.destination}</Text>
                  <Text style={styles.navSub}>약 {navInfo.totalTime}분 소요 ({navInfo.remainingDistance}m)</Text>
              </View>
              <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
                  <Text style={styles.stopButtonText}>종료</Text>
              </TouchableOpacity>
          </View>
      ) : (
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Codeplay</Text>
          </View>
      )}

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.friendButton} onPress={() => navigation.navigate('Friends')}>
          <Image source={require('../../assets/friend_icon.png')} style={styles.buttonIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <Image source={require('../../assets/me_icon.png')} style={styles.buttonIcon_ME} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EBFF' },
  map: { flex: 1 },
  
  logoContainer: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, zIndex: 10,
  },
  logoText: { fontSize: 22, fontWeight: '900', color: '#7288FF', letterSpacing: 1, fontStyle: 'italic' },
  
  navInfoContainer: {
      position: 'absolute', top: 60, 
      width: '90%', alignSelf: 'center',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#FFFFFF', padding: 15, borderRadius: 15,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
      zIndex: 20,
  },
  navInfoTextContainer: { flex: 1 },
  navTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  navSub: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  stopButton: {
      backgroundColor: '#FF5252', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8
  },
  stopButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  bottomButtons: {
    position: 'absolute', bottom: 70, 
    width: '100%', flexDirection: 'row', justifyContent: 'space-evenly', zIndex: 10,
  },
  friendButton: {
    backgroundColor: '#8EA2FF', borderRadius: 40, width: 70, height: 70, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#8EA2FF', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  profileButton: {
    backgroundColor: '#FFFFFF', borderRadius: 40, width: 70, height: 70, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#A5B1FF', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  buttonIcon: { width: 32, height: 32, tintColor: '#FFF' },
  buttonIcon_ME: { width: 35, height: 35, tintColor: '#4B4B4B' },
});