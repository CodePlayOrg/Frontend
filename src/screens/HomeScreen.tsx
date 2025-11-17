import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Text,
  Image,
} from 'react-native';
import { NaverMapView, NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';

import Geolocation from '@react-native-community/geolocation';
import { useNavigation , useFocusEffect} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [location, setLocation] = useState({
    latitude: 37.5665,
    longitude: 126.9780,
  });

  // iOS & Android 위치 권한 요청 및 현재 위치 설정
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      // @ts-ignore
      Geolocation.requestAuthorization('whenInUse');
      getCurrentPosition();
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한 요청',
          message: '현재 위치를 표시하려면 위치 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getCurrentPosition();
      } else {
        console.log('위치 권한 거부됨');
      }
    }
  };

  // 위치 가져오기
  const getCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        console.log('현재 위치:', latitude, longitude);

      },
      (error) => {
        console.log('위치 가져오기 실패: ', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 화면에 다시 들어올 때마다 맵을 새로 마운트
      setMapKey(prev => prev + 1);
    }, []),
  );

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  return (
    <View style={styles.container}>
      {/* ✅ 네이버 지도 표시 */}
      

      <NaverMapView
        key={mapKey} 
        style={styles.map}
        initialCamera={{
          latitude: location.latitude,
          longitude: location.longitude,
          zoom: 14,
        }}
        isShowLocationButton={true}
        isShowCompass={true}
        onInitialized={() => {
        console.log('지도 초기화 완료');
        setIsMapReady(true);
      }}
      >
        {isMapReady && (
        <NaverMapMarkerOverlay
          latitude={location.latitude}
          longitude={location.longitude}
          caption={{ text: 'ME' }}
        />
      )}
      </NaverMapView>

      {/* 🔍 상단 검색창 */}
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="장소를 검색하세요" />
        <TouchableOpacity style={styles.searchButton}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* 👇 하단 버튼 2개 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={styles.friendButton}
          onPress={() => navigation.navigate('Friends')}
          >
          <Image
            source={require('../../assets/friend_icon.png')}
            style={styles.buttonIcon}
            
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={require('../../assets/me_icon.png')}
            style={styles.buttonIcon_ME}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#7288FF',
    elevation: 5,
  },
  searchInput: {
    width: 260,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  searchButton: {
    backgroundColor: '#7288FF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginLeft: 8,
  },
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
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  profileButton: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  buttonIcon: {
    width: 45,
    height: 45,
    tintColor: '#000000',
  },
  buttonIcon_ME: {
    width: 60,
    height: 60,
    tintColor: '#000000',
  },
});
