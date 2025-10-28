import React, {useEffect, useState} from 'react';
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
import MapView, { Marker, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';


type Coordinates = {
    latitude: number;
    longitude: number;
  };
  
const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    
    const [region, setRegion] = useState<Region>({
        latitude: 37.5665,
        longitude: 126.9780,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });//초깃값은 서울로 설정, 앱 실행 직후 위치를 못 받아오면 이 좌표가 보임

    const [myLocation, setMyLocation] = useState<Coordinates | null>(null);

    //iOS & Android 위치 권한 요청 및 현재 위치 설정
    const requestLocationPermission = async () => {
        if (Platform.OS === 'ios') {
        // @ts-ignore
        Geolocation.requestAuthorization('whenInUse');
        getCurrentPosition();
        } else {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            getCurrentPosition();
        } else {
            console.log('위치 권한 거부됨');
        }
        }
    };

    const getCurrentPosition = () => { //위치 가져오기
        Geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                setRegion({
                    ...region,
                    latitude,
                    longitude,
                });
                setMyLocation({ latitude, longitude });
            },
            error => {
                console.log('위치 가져오기 실패: ', error);
            },
            {enableHighAccuracy: true, timeout : 15000, maximumAge : 10000} //GPS 우선 사용, 응답 대기 시간, 캐시 허용 시간

        );
    };
    useEffect(() => {
        requestLocationPermission();
    }, []);

    return (
        <View style={styles.container}>
          {/* 지도 영역 */}
          <MapView
            style={styles.map}
            region={region}
            showsUserLocation={true}
            onRegionChangeComplete={setRegion}
          >
            {myLocation && (
              <Marker coordinate={myLocation} title="내 위치" />
            )}
          </MapView>
    
          {/* 상단 검색창 */}
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} placeholder="장소를 검색하세요" />
            <TouchableOpacity style={styles.searchButton}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Search</Text>
            </TouchableOpacity>
          </View>
    
          {/* 하단 버튼 2개 */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.friendButton}>
            <Image
      source={require('../../assets/friend_icon.png')}
      style={styles.buttonIcon}
    />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
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
    paddingHorizontal: 15, // 텍스트가 잘 들어가도록 약간 넓혀줌
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
    boxShadow :  "0 4px 6px rgba(0, 0, 0, 0.3), inset 0 4px 6px rgba(0, 0, 0, 0.3)",
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
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3), inset 0 4px 6px rgba(0, 0, 0, 0.3)", 
  },
  buttonIcon: {
    width:45,  
    height: 45,
    tintColor: '#000000', 
  },
  buttonIcon_ME: {
    width:60,  
    height: 60,
    tintColor: '#000000', 
  },
  
});
