import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigations/AppNavigator';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ⭐️ [추가] 웹소켓 훅 가져오기
import { useWebSocket } from '../context/WebSocketContext';

const PRIMARY = '#7288FF';

type FriendStatus = '수업 중' | '수업 없음';

type Friend = {
  id: string; // username
  name: string;
  studentId: string;
  status: FriendStatus;
  isFavorite: boolean;
  isOn: boolean; // 위치 공유 허용 여부
};

type FriendsNav = StackNavigationProp<RootStackParamList, 'Friends'>;

const FriendsScreen: React.FC = () => {
  const navigation = useNavigation<FriendsNav>();
  const API_URL = 'http://3.34.70.142:3001/users';

  // ⭐️ [추가] 실시간 친구 위치 데이터 가져오기
  const { friendLocations } = useWebSocket();

  // --- 상태 관리 ---
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [sheetAnim] = useState(new Animated.Value(0));

  // 1. 친구 목록 가져오기 (토글 상태 반영됨)
  const fetchFriends = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/my_friend_list_show`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = response.data;
      if (data.my_friend_list_show) {
        const mappedFriends: Friend[] = data.my_friend_list_show.map((item: any, index: number) => ({
          id: item.username || `temp_${index}`, 
          name: item.name || '이름 없음',
          studentId: item.studentId || '',
          status: item.status || '수업 없음',
          isFavorite: false, 
          // ⭐️ 서버에서 준 isLocationShared 값을 사용 (없으면 false)
          isOn: item.isLocationShared === true, 
        }));
         setFriends(mappedFriends);
      }
    } catch (error) {
      console.error("친구 목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const filteredFriends = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return friends;
    return friends.filter((f) =>
      f.name.toLowerCase().includes(trimmed.toLowerCase())
    );
  }, [friends, query]);

  const toggleFavorite = (id: string) => {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
  };

  // ⭐️ 위치 공유 스위치 토글 (서버 저장)
  const toggleSwitch = async (friendId: string) => {
    const targetFriend = friends.find(f => f.id === friendId);
    if (!targetFriend) return;

    const newState = !targetFriend.isOn;

    // UI 먼저 업데이트
    setFriends((prev) => prev.map((f) => f.id === friendId ? { ...f, isOn: newState } : f));

    try {
        const token = await AsyncStorage.getItem('userToken');
        await axios.post(`${API_URL}/location/share`, {
            friendId: friendId,
            isShared: newState
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`스위치 변경 성공: ${friendId} -> ${newState}`);
    } catch (e) {
        Alert.alert("오류", "설정 변경에 실패했습니다.");
        // 실패 시 롤백
        setFriends((prev) => prev.map((f) => f.id === friendId ? { ...f, isOn: !newState } : f));
    }
  };

  // ⭐️ [수정됨] 웹소켓 데이터로 실시간 위치 확인
  const handleViewRealtimeLocation = () => {
      if (!selectedFriend) return;

      // 1. WebSocketContext에 저장된 친구의 최신 위치 확인
      const liveLocation = friendLocations[selectedFriend.id];

      if (liveLocation) {
          closeDetailSheet();
          console.log(`📍 친구(${selectedFriend.name}) 위치 발견:`, liveLocation);
          
          // 2. Home 화면으로 이동하며 좌표 전달
          navigation.navigate('Home', { 
              friendLocation: { 
                  lat: liveLocation.latitude, 
                  lng: liveLocation.longitude, 
                  name: selectedFriend.name 
              } 
          });
      } else {
          // 3. 데이터가 없으면 (친구가 오프라인이거나 위치 공유 안 함)
          Alert.alert(
              "위치 확인 불가", 
              `${selectedFriend.name} 님의 실시간 위치 정보가 없습니다.\n(친구가 위치 공유를 허용하지 않았습니다.)`
          );
      }
  };

  const handleAddFriend = async () => {
    const name = newName.trim();
    const studentId = newStudentId.trim();
    if (!name || !studentId) { 
      Alert.alert('입력 오류', '이름과 학번을 모두 입력해주세요.'); return; 
    }
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await axios.post(`${API_URL}/add_friend`, {
        name, studentId
      }, {
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
      });
      
      Alert.alert('성공', response.data);
      fetchFriends(); 
      setNewName(''); setNewStudentId(''); setIsAddModalVisible(false);
    } catch (error) {
      Alert.alert('오류', '친구 추가에 실패했습니다.');
    }
  };

  const openDetailSheet = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsDetailVisible(true);
    sheetAnim.setValue(300);
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const closeDetailSheet = () => {
    Animated.timing(sheetAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setIsDetailVisible(false);
        setSelectedFriend(null);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_evt, gesture) => { if (gesture.dy > 0) sheetAnim.setValue(gesture.dy); },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > 120) closeDetailSheet();
        else Animated.timing(sheetAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const handlePressFriend = (friend: Friend) => {
    openDetailSheet(friend);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.previousText}>← Previous</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.screenTitle}>친구 목록</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.searchTitle}>친구 검색</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="이름 검색"
              placeholderTextColor="#C0C5E0"
              value={query}
              onChangeText={setQuery}
            />
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => setIsAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.plusText}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {isLoading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
             <ActivityIndicator size="small" color={PRIMARY} />
             <Text style={{ color: PRIMARY, marginTop: 5 }}>로딩 중...</Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.friendList}
          showsVerticalScrollIndicator={false}
        >
          {filteredFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>친구가 없습니다.</Text>
            </View>
          ) : (
            filteredFriends.map((f) => (
              <TouchableOpacity
                key={f.id} 
                style={[
                  styles.friendRow,
                  selectedFriend?.id === f.id && styles.friendRowSelected,
                ]}
                activeOpacity={0.9}
                onPress={() => openDetailSheet(f)}
              >
                <TouchableOpacity
                  style={styles.starWrap}
                  onPress={() => toggleFavorite(f.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.star, f.isFavorite && styles.starActive]}>
                    {f.isFavorite ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={styles.friendSub}>{f.status}</Text>
                </View>

                {/* 위치 공유 스위치 */}
                <View style={{ alignItems: 'center', marginRight: 5 }}>
                    <Text style={{fontSize: 10, color: '#8A90AA', marginBottom: 2}}>위치공유</Text>
                    <TouchableOpacity
                    style={[styles.toggleButton, f.isOn && styles.toggleButtonActive]}
                        activeOpacity={0.8}
                        onPress={() => toggleSwitch(f.id)}
                    >
                    <Animated.View
                        style={[
                        styles.toggleThumb,
                        { transform: [{ translateX: f.isOn ? 18 : 0 }] },
                        ]}
                        />
                    </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        )}
      </View>

      {/* 친구 추가 모달 */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsAddModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.addCardShadow}>
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                 <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                  <Text style={styles.addCardClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addField}>
                <Text style={styles.addLabel}>친구 이름</Text>
                <TextInput style={styles.addInput} placeholder="입력" value={newName} onChangeText={setNewName} />
              </View>
              <View style={styles.addField}>
                <Text style={styles.addLabel}>학번</Text>
                <TextInput style={styles.addInput} placeholder="입력" value={newStudentId} onChangeText={setNewStudentId} />
              </View>

              <TouchableOpacity style={styles.addSubmit} onPress={handleAddFriend}>
                <Text style={styles.addSubmitText}>추가하기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 상세 바텀시트 */}
      <Modal
        visible={isDetailVisible}
        transparent
        animationType="none"
        onRequestClose={closeDetailSheet}
      >
        <View style={styles.detailBackdrop}>
          <TouchableOpacity
            style={styles.detailBackdropTouchable}
            onPress={closeDetailSheet}
            activeOpacity={1}
          />

          <Animated.View
            style={[
              styles.detailSheet,
              { transform: [{ translateY: sheetAnim }] },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.handleBar} />

            <View style={styles.detailHeaderRow}>
              <TouchableOpacity onPress={closeDetailSheet}>
                <Text style={styles.detailClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailName}>{selectedFriend?.name}</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.detailBottom}>
              <Text style={styles.locationShareText}>
                  {selectedFriend?.isOn 
                    ? `${selectedFriend.name}님에게 내 위치를 공유 중입니다.` 
                    : "현재 위치를 공유하지 않습니다."}
              </Text>

              {/* ⭐️ 실시간 위치 보기 버튼 */}
              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleViewRealtimeLocation}
              >
                <Text style={styles.mapButtonText}>📍 실시간 위치 보기</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default FriendsScreen;

// 스타일 (기존 유지)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5FB',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  previousText: {
    color: '#4A4E71',
    fontSize: 14,
  },
  screenTitle: {
    marginTop: 38,    
    marginBottom: 38,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 22,
    paddingLeft: 35,
    color: PRIMARY,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 10,    
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingHorizontal: 14,
    paddingTop: 25,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
    flex: 1,
    marginBottom: 40,
  },
  cardHeader: {
    paddingHorizontal: 5,
    paddingBottom: 8,
  },
  searchTitle: {
    fontSize: 14,
    color: '#9BA2C2',
    paddingHorizontal: 7,
    marginBottom: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    fontSize: 18,
  },
  plusButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  plusText: {
    fontSize: 25,
    color: PRIMARY,
    marginTop: -2,
    fontWeight: 'bold',
    height: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#E3E7FF',
    marginHorizontal: 2,
    marginBottom: 6,
  },
  friendRowSelected: {
    backgroundColor: '#EDF0FF',
  },
  friendList: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderColor: '#EEE'
  },
  starWrap: {
    marginRight: 12,
  },
  star: {
    fontSize: 22,
    color: '#C5CAD8',
  },
  starActive: {
    color: '#FFC107',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3050',
    marginBottom: 4,
  },
  friendSub: {
    fontSize: 12,
    color: '#8A90AA',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#777E9E',
  },
  toggleButton: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 3,
    justifyContent: 'center',
    backgroundColor: '#C0C5E0',
  },
  toggleButtonActive: {
    backgroundColor: PRIMARY,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardShadow: {
    width: '85%',
  },
  addCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    elevation: 10,
  },
  addCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  addCardClose: {
    fontSize: 20,
    color: '#A0A6C6',
    fontWeight: 'bold'
  },
  addField: {
    marginBottom: 15,
  },
  addLabel: {
    fontSize: 13,
    color: '#6D7392',
    marginBottom: 5,
  },
  addInput: {
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1E4F4',
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#FBFBFF',
  },
  addSubmit: {
    marginTop: 10,
    height: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  detailBackdropTouchable: {
    flex: 1,
  },
  detailSheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#FFFFFF',
    padding: 25,
    paddingBottom: 40,
    minHeight: 200, 
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D4EA',
    marginBottom: 15,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailClose: {
    fontSize: 20,
    color: '#A0A6C6',
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B3153',
  },
  detailBottom: {
    marginTop: 10,
    gap: 10,
  },
  locationShareText: {
    fontSize: 14,
    color: '#858AB0',
    textAlign: 'center',
    marginBottom: 10,
  },
  mapButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailButtonsRow: {
    alignItems: 'center',
  },
  timeTableButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E5E7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeTableButtonText: {
    fontSize: 16,
    color: '#4A4E71',
    fontWeight: '500',
  },
});