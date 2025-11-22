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
} from 'react-native';
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';

import Geolocation from '@react-native-community/geolocation';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';

const NAVER_CLIENT_ID = "m3ckbz520a";   // 🔥 API KEY 넣기
const NAVER_CLIENT_SECRET = "a9mqDAN0HWYWh1tqsPQ5rJYma53n7MMgtHZ79kqG";  // 🔥 API KEY 넣기

type Place = {
  name: string;
  x: string; // longitude
  y: string; // latitude
};

const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const mapRef = useRef<NaverMapViewRef>(null);

  const [location, setLocation] = useState({
    latitude: 35.8883,  // 기본값: 경북대 중앙
    longitude: 128.6106,
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // 🔐 위치 권한 요청
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

  // 📍 현재 위치 가져오기
  const getCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
      },
      (err) => console.log('GPS error:', err),
      { enableHighAccuracy: true },
    );
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setMapKey((prev) => prev + 1);
    }, []),
  );

  // 🔍 네이버 장소 검색 API
  const searchPlace = async () => {
    if (!query.trim()) return;

    try {
      const url = `https://naveropenapi.apigw.ntruss.com/map-place/v1/search?query=${encodeURIComponent(
        query,
      )}&coordinate=128.6106,35.8883`;

      const response = await fetch(url, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
          'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
        },
      });

      const json = await response.json();

      setResults(json.places || []);
    } catch (e) {
      console.log('검색 API 오류', e);
    }
  };

  // 📍 장소 선택 → 지도 이동 + 마커 표시
  const moveToPlace = (place: Place) => {
    const lat = parseFloat(place.y);
    const lon = parseFloat(place.x);

    setLocation({ latitude: lat, longitude: lon });

    mapRef.current?.animateCameraTo({
      latitude: lat,
      longitude: lon,
      zoom: 16,
    });

    setResults([]); // 검색창 닫기
  };

  // 🧭 네이버 길찾기 API
  const getRoute = async (goal: Place) => {
    const start = `${location.longitude},${location.latitude}`;
    const end = `${goal.x},${goal.y}`;

    const url = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${end}`;

    const response = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
      },
    });

    const json = await response.json();

    const path = json.route.traoptimal[0].path.map((p: number[]) => ({
      longitude: p[0],
      latitude: p[1],
    }));

    setRoute(path);
  };

  return (
    <View style={styles.container}>
      {/* 지도 */}
      <NaverMapView
        key={mapKey}
        ref={mapRef}
        style={styles.map}
        initialCamera={{
          latitude: location.latitude,
          longitude: location.longitude,
          zoom: 14,
        }}
        onInitialized={() => setIsMapReady(true)}
        isShowLocationButton
        isShowCompass
      >
        {isMapReady && (
          <NaverMapMarkerOverlay
            latitude={location.latitude}
            longitude={location.longitude}
            caption={{ text: 'ME' }}
          />
        )}

        {/* 🚗 길 안내 경로 */}
        {route.length > 0 && (
          <NaverMapPathOverlay
            coords={route}
            width={6}
            color="#2563EB"
          />
        )}
      </NaverMapView>

      {/* 🔍 검색창 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="건물을 검색하세요"
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.searchButton} onPress={searchPlace}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* ▼ 검색결과 목록 */}
      {results.length > 0 && (
        <View style={styles.resultsBox}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => moveToPlace(item)}
                onLongPress={() => getRoute(item)} // 길찾기: 길게 누르면 실행
              >
                <Text style={styles.resultName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 하단 버튼 */}
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
  container: { flex: 1 },
  map: { flex: 1 },

  searchContainer: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 0,
    borderWidth: 4,
    borderColor: '#7288FF',
  },
  searchInput: { width: 250, height: 40, paddingHorizontal: 10 },
  searchButton: {
    backgroundColor: '#7288FF',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginLeft: 10,
  },

  resultsBox: {
    position: 'absolute',
    top: 130,
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 250,
  },
  resultItem: { padding: 12 },
  resultName: { fontSize: 16, fontWeight: '600' },

  bottomButtons: {
    position: 'absolute',
    bottom: 70,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 150,
  },
  friendButton: {
    backgroundColor: '#7288FF',
    borderRadius: 30,
    width: 100, height: 100,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#000',
  },
  profileButton: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 100, height: 100,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#000',
  },
  buttonIcon: { width: 45, height: 45, tintColor: '#000' },
  buttonIcon_ME: { width: 60, height: 60, tintColor: '#000' },
});
