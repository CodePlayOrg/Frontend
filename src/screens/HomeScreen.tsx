import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Text,
  Image,
  FlatList,
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
import { useTimetable } from '../context/TimetableContext';
import axios from 'axios';

// 🔹 API 설정
const NAVER_CLIENT_ID = "m3ckbz520a";   
const NAVER_CLIENT_SECRET = "a9mqDAN0HWYWh1tqsPQ5rJYma53n7MMgtHZ79kqG"; 
const API_URL = 'http://3.34.70.142:3001'; 
const TMAP_APP_KEY = "t2I25GO6US3STSH06HEde8GS3KFV7NggoW1sYYp2"; 

// 🔹 데이터 타입 정의
type Place = {
  name: string;
  x: string; 
  y: string; 
};

type ClassMarker = {
    id: string;
    name: string; 
    latitude: number;
    longitude: number;
    classes: string[]; 
};

type NavInfo = {
    destination: string;
    totalTime: number; // 분 단위
    remainingDistance: number; // 미터 단위
};

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const navRoute = useRoute<HomeScreenRouteProp>();
  const { classes } = useTimetable(); 
  const mapRef = useRef<NaverMapViewRef>(null);

  // 내 위치
  const [location, setLocation] = useState({
    latitude: 35.8883,
    longitude: 128.6106,
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  
  // 마커 데이터
  const [classMarkers, setClassMarkers] = useState<ClassMarker[]>([]);
  
  // ⭐️ [신규] 내비게이션 관련 상태
  const [isNavigating, setIsNavigating] = useState(false); // 길안내 중인지 여부
  const [navInfo, setNavInfo] = useState<NavInfo | null>(null); // 안내 정보
  const [pathRoute, setPathRoute] = useState<{ latitude: number; longitude: number }[]>([]); // 경로선
  const watchId = useRef<number | null>(null); // 실시간 위치 추적 ID

  // 1. 초기 권한 요청
  useEffect(() => {
    requestLocationPermission();
    return () => {
        // 컴포넌트 해제 시 위치 추적 중단
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

  // 현재 위치 1회 가져오기
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

  // ⭐️ [신규] 실시간 위치 추적 및 경로 업데이트 (길 줄어들기 효과)
  useEffect(() => {
    if (isNavigating && pathRoute.length > 0) {
        // 내 위치와 경로의 첫 번째 점 사이의 거리 계산 (간단한 피타고라스 근사치)
        // 정밀한 계산을 위해선 Haversine 공식을 써야 하지만, 짧은 거리는 이걸로 충분
        const nextPoint = pathRoute[0];
        const dist = Math.sqrt(
            Math.pow(location.latitude - nextPoint.latitude, 2) + 
            Math.pow(location.longitude - nextPoint.longitude, 2)
        );

        // 약 20~30m (대략적 위도차 0.0003) 이내로 접근하면 해당 점을 경로에서 제거
        if (dist < 0.0003) {
            const newPath = pathRoute.slice(1); // 첫 번째 점 제거
            setPathRoute(newPath);
            
            // 도착 체크
            if (newPath.length === 0) {
                Alert.alert("도착", "목적지 부근에 도착했습니다.");
                stopNavigation();
            }
        }
    }
  }, [location, isNavigating]);

  // ⭐️ [신규] 실시간 위치 감시 시작
  const startWatchingPosition = () => {
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
      
      watchId.current = Geolocation.watchPosition(
          (pos) => {
              const { latitude, longitude } = pos.coords;
              setLocation({ latitude, longitude });
          },
          (err) => console.log('Watching Error:', err),
          { 
              enableHighAccuracy: true, 
              distanceFilter: 5, // 5미터 이동할 때마다 갱신
              interval: 1000, 
              fastestInterval: 500 
          }
      );
  };

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
      console.log("👀 [HomeScreen] 갱신.");
      if (!isNavigating) getCurrentPosition(); 

      const fetchMarkers = async () => {
          if (classes.length === 0) return;
          const tempMarkers: Record<string, ClassMarker> = {};
          const buildingToClasses: Record<string, string[]> = {};

          classes.forEach(cls => {
              const rawLoc = (cls as any).location || (cls as any).place || ''; 
              if (!rawLoc) return;
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
              if (!buildingName) return;
              if (!buildingToClasses[buildingName]) buildingToClasses[buildingName] = [];
              if (!buildingToClasses[buildingName].includes(cls.name)) buildingToClasses[buildingName].push(cls.name);
          });

          const buildings = Object.keys(buildingToClasses);
          for (const buildingName of buildings) {
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
      };
      fetchMarkers();
      setMapKey((prev) => prev + 1);
    }, [classes]) 
  );

  useEffect(() => {
    const handleNavParams = async () => {
        if (navRoute.params?.searchQuery) {
            const targetQuery = navRoute.params.searchQuery;
            setQuery(targetQuery);
            const coord = await getOneCoordinate(targetQuery);
            if (coord) {
                setTimeout(() => {
                    mapRef.current?.animateCameraTo({ latitude: coord.lat, longitude: coord.lng, zoom: 17 });
                }, 500);
            } else {
                setTimeout(() => searchPlace(targetQuery, true), 500);
            }
        }
    };
    handleNavParams();
  }, [navRoute.params]);

  const searchPlace = async (keyword?: string, autoMove: boolean = false) => {
    const searchText = keyword || query;
    if (!searchText.trim()) return;
    try {
      const url = `https://naveropenapi.apigw.ntruss.com/map-place/v1/search?query=${encodeURIComponent(
        searchText,
      )}&coordinate=128.6106,35.8883`;
      const response = await fetch(url, { headers: { 'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID, 'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET } });
      const json = await response.json();
      const placeList = json.places || [];
      setResults(placeList);
      if (autoMove && placeList.length > 0) moveToPlace(placeList[0]);
      else if (autoMove && placeList.length === 0) Alert.alert("알림", "검색 결과가 없습니다.");
    } catch (e) { console.log('검색 API 오류', e); }
  };

  const moveToPlace = (place: Place) => {
    const lat = parseFloat(place.y);
    const lon = parseFloat(place.x);
    mapRef.current?.animateCameraTo({ latitude: lat, longitude: lon, zoom: 17 });
    setResults([]); 
  };

  // ⭐️ [길찾기] Tmap 도보 경로 API -> 내비게이션 모드 시작
  const getRoute = async (target: { x?: string; y?: string; latitude?: number; longitude?: number; name: string }) => {
    try {
        const destLng = target.x ? parseFloat(target.x) : target.longitude;
        const destLat = target.y ? parseFloat(target.y) : target.latitude;

        if (!destLng || !destLat) {
            Alert.alert("오류", "도착지 좌표를 찾을 수 없습니다.");
            return;
        }

        console.log(`🚶 도보 길찾기 요청: ${target.name}`);

        const url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json";
        const body = {
            startX: location.longitude,
            startY: location.latitude,
            endX: destLng,
            endY: destLat,
            reqCoordType: "WGS84GEO", 
            resCoordType: "WGS84GEO",
            startName: "Start",
            endName: "End",
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

            // ⭐️ 내비게이션 모드 활성화
            setPathRoute(path);
            setIsNavigating(true);
            setNavInfo({
                destination: target.name,
                totalTime: Math.round(json.features[0].properties.totalTime / 60),
                remainingDistance: json.features[0].properties.totalDistance
            });
            setResults([]); // 검색 결과창 닫기
            
            // 실시간 위치 추적 시작
            startWatchingPosition();

            // 카메라 줌인
            mapRef.current?.animateCameraTo({ latitude: location.latitude, longitude: location.longitude, zoom: 18 });

        } else {
            Alert.alert("길찾기 실패", "도보 경로를 찾을 수 없습니다.");
        }
    } catch (e) {
        console.log('Tmap API 오류:', e);
        Alert.alert("오류", "길찾기 중 문제가 발생했습니다.");
    }
  };

  // ⭐️ 내비게이션 종료
  const stopNavigation = () => {
      setIsNavigating(false);
      setPathRoute([]);
      setNavInfo(null);
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
      
      // 종료 후 카메라 살짝 줌아웃
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
        
        {/* 검색 핀 */}
        {isMapReady && query && !results.length && !isNavigating && (
            <NaverMapMarkerOverlay
                latitude={location.latitude} longitude={location.longitude}
                caption={{ text: query }} tintColor="blue"
            />
        )}

        {/* 내 강의 마커들 */}
        {isMapReady && classMarkers.map((marker, index) => (
            <NaverMapMarkerOverlay
                key={`class-${index}`}
                latitude={marker.latitude} longitude={marker.longitude}
                caption={{ text: marker.name }} 
                subCaption={{ text: marker.classes.join(', '), color: '#555', textSize: 10 }}
                tintColor="green" 
                onTap={() => {
                    Alert.alert(
                        marker.name, 
                        `수업 목록:\n${marker.classes.join('\n')}`,
                        [
                            { text: '닫기', style: 'cancel' },
                            { text: '도보 길찾기', onPress: () => getRoute(marker) }
                        ]
                    );
                }}
            />
        ))}

        {/* 경로선 */}
        {pathRoute.length > 0 && (
          <NaverMapPathOverlay coords={pathRoute} width={8} color="#2563EB" outlineWidth={2} outlineColor="#FFFFFF" />
        )}
      </NaverMapView>

      {/* ⭐️ [UI 변경] 내비게이션 중일 때는 안내판, 아닐 때는 검색창 */}
      {isNavigating && navInfo ? (
          <View style={styles.navInfoContainer}>
              <View style={styles.navInfoTextContainer}>
                  <Text style={styles.navTitle}>🚩 {navInfo.destination}</Text>
                  <Text style={styles.navSub}>약 {navInfo.totalTime}분 소요</Text>
              </View>
              <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
                  <Text style={styles.stopButtonText}>종료</Text>
              </TouchableOpacity>
          </View>
      ) : (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="건물을 검색하세요"
              value={query}
              onChangeText={setQuery}
            />
            <TouchableOpacity style={styles.searchButton} onPress={() => searchPlace()}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Search</Text>
            </TouchableOpacity>
          </View>
      )}

      {/* 검색 결과 리스트 (내비 중에는 숨김) */}
      {!isNavigating && results.length > 0 && (
        <View style={styles.resultsBox}>
          <FlatList
            data={results}
            keyExtractor={(item, index) => item.name + index}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => moveToPlace(item)}
                onLongPress={() => getRoute(item)} 
              >
                <Text style={styles.resultName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
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
  
  /* 검색창 */
  searchContainer: {
    position: 'absolute', top: 90, 
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 25, shadowColor: '#6B70FF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6, zIndex: 10,
  },
  searchInput: { width: 220, height: 40, fontSize: 15, color: '#333' },
  searchButton: {
    backgroundColor: '#6D6DFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#6D6DFF', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  /* ⭐️ 내비게이션 안내 패널 (상단 고정) */
  navInfoContainer: {
      position: 'absolute', top: 70, 
      width: '90%', alignSelf: 'center',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#FFFFFF', padding: 20, borderRadius: 15,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
      zIndex: 20,
  },
  navInfoTextContainer: { flex: 1 },
  navTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  navSub: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  stopButton: {
      backgroundColor: '#FF5252', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8
  },
  stopButtonText: { color: '#FFF', fontWeight: 'bold' },

  /* 결과창 */
  resultsBox: {
    position: 'absolute', top: 150, 
    width: '85%', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, paddingVertical: 5, maxHeight: 250,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 10, zIndex: 9,
  },
  resultItem: { padding: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  resultName: { fontSize: 16, fontWeight: '600', color: '#333' },
  
  /* 하단 버튼 */
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