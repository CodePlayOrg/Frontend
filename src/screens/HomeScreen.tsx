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

// ⭐️ 친구 마커 타입 정의
type FriendMarker = {
    name: string;
    latitude: number;
    longitude: number;
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
  const [pathRoute, setPathRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  
  const [classMarkers, setClassMarkers] = useState<ClassMarker[]>([]);

  // ⭐️ 친구 위치 마커 상태
  const [friendMarker, setFriendMarker] = useState<FriendMarker | null>(null);

  useEffect(() => {
    requestLocationPermission();
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
        if (mapRef.current) {
            mapRef.current.animateCameraTo({ latitude, longitude, zoom: 15 });
        }
      },
      (err) => console.log('GPS error:', err),
      { enableHighAccuracy: true },
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
      getCurrentPosition(); 

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
        const params = navRoute.params as any; 

        if (params?.searchQuery) {
            setFriendMarker(null); 
            setQuery(params.searchQuery);
            const coord = await getOneCoordinate(params.searchQuery);
            if (coord) {
                setTimeout(() => {
                    mapRef.current?.animateCameraTo({ latitude: coord.lat, longitude: coord.lng, zoom: 17 });
                }, 500);
            } else {
                setTimeout(() => searchPlace(params.searchQuery, true), 500);
            }
        }
        
        // ⭐️ 친구 위치 데이터 수신
        if (params?.friendLocation) {
            const { lat, lng, name } = params.friendLocation;
            
            setFriendMarker({ 
                name: name,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
            });
            
            setTimeout(() => {
                mapRef.current?.animateCameraTo({ 
                    latitude: parseFloat(lat), 
                    longitude: parseFloat(lng), 
                    zoom: 17 
                });
                Alert.alert("위치 확인", `${name}님의 현재 위치입니다.`);
            }, 500);
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
            Alert.alert("도보 경로", `${target.name}까지 약 ${Math.ceil(totalTime / 60)}분 소요됩니다.`);
        } else {
            Alert.alert("길찾기 실패", "도보 경로를 찾을 수 없습니다.");
        }
    } catch (e) { console.log('길찾기 오류:', e); }
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
            {/* ⭐️ ME: 파란 원 (내 위치 복구됨) */}
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
        {isMapReady && query && !results.length && (
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

        {/* ⭐️ 친구 위치 마커 (보라색 원으로 표시) */}
        {isMapReady && friendMarker && (
            <>
                <NaverMapCircleOverlay
                    latitude={friendMarker.latitude} longitude={friendMarker.longitude}
                    radius={25} color={"rgba(128, 0, 128, 0.2)"} outlineWidth={0} // 보라색 반투명
                />
                <NaverMapCircleOverlay
                    latitude={friendMarker.latitude} longitude={friendMarker.longitude}
                    radius={7} color={"#800080"} outlineWidth={2} outlineColor={"#FFFFFF"} // 진한 보라색
                />
                <NaverMapMarkerOverlay
                    latitude={friendMarker.latitude} longitude={friendMarker.longitude}
                    image={require('../../assets/me_icon.png')} 
                    width={1} height={1} alpha={0} 
                    caption={{ 
                        text: friendMarker.name, // 친구 이름
                        textSize: 14, color: "#800080", haloColor: "#FFFFFF", offset: 10 
                    }}
                    onTap={() => {
                         Alert.alert(
                            friendMarker.name, 
                            "친구의 실시간 위치입니다.",
                            [
                                { text: '닫기', style: 'cancel' },
                                { text: '만나러 가기(길찾기)', onPress: () => getRoute(friendMarker) }
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

      {/* 나머지 UI 코드 (검색창, 리스트, 버튼 등) 유지 */}
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

      {results.length > 0 && (
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
  searchContainer: {
    position: 'absolute', top: 90, 
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 25, shadowColor: '#6B70FF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6, zIndex: 10,
  },
  searchInput: { width: 220, height: 40, fontSize: 15, color: '#333' },
  searchButton: {
    backgroundColor: '#6D6DFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#6D6DFF', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  resultsBox: {
    position: 'absolute', top: 150, 
    width: '85%', alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, paddingVertical: 5, maxHeight: 250,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 10, zIndex: 9,
  },
  resultItem: { padding: 15, borderBottomWidth: 1, borderColor: '#EEE' },
  resultName: { fontSize: 16, fontWeight: '600', color: '#333' },
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