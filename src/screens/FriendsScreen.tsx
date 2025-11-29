import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch, // 타입 참조용
  Modal,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigations/AppNavigator';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ✅ [사용자 스타일] 색상 상수 적용
const PRIMARY = '#7288FF';

type FriendStatus = '수업 중' | '수업 없음';

// ✅ [사용자 정의] Course 타입
type Course = {
  id: string;
  name: string;      
  location: string; 
  status: 'active' | 'scheduled' | 'finished';
  time: string;      
};

type Friend = {
  id: string;
  name: string;
  studentId: string;
  status: FriendStatus;
  isFavorite: boolean;
  isOn: boolean;
};

type FriendsNav = StackNavigationProp<RootStackParamList, 'Friends'>;

const FriendsScreen: React.FC = () => {
  const navigation = useNavigation<FriendsNav>();
  const API_URL = 'http://3.34.70.142:3001/users';

  // --- [친구의 로직 유지] ---
  const [friends, setFriends] = useState<Friend[]>([]); 
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true); 
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');

  // --- [사용자 로직 적용] 상세 데이터 ---
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [friendCourses, setFriendCourses] = useState<Course[] | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null); // 사용자 UI용

  const [sheetAnim] = useState(new Animated.Value(0));

  // 1. 친구 목록 가져오기 (친구 코드)
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
        setFriends(data.my_friend_list_show);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 상세 시간표 가져오기 (사용자 로직 + 친구 Axios)
  const fetchFriendCourses = async (friendId: string) => {
    setIsLoadingCourses(true);
    setFriendCourses(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // 엔드포인트가 확실하지 않으므로 에러 처리 필수
      const response = await axios.get(`${API_URL}/${friendId}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setFriendCourses(response.data);
    } catch (error) {
      setFriendCourses([]); 
    } finally {
      setIsLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const filteredFriends = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return friends;
    return friends.filter((f) =>
      f.name.toLowerCase().includes(trimmed.toLowerCase()),
    );
  }, [friends, query]);

  // 로직 함수들 (Toggle, Add)
  const toggleFavorite = (id: string) => {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
  };
  const toggleSwitch = (id: string) => {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, isOn: !f.isOn } : f));
  };

  const handleAddFriend = async () => {
    const name = newName.trim();
    const studentId = newStudentId.trim();
    if (!name || !studentId) { Alert.alert('입력 오류', '이름과 학번을 모두 입력해주세요.'); return; }
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await axios.post(`${API_URL}/add_friend`, {
        name, studentId
      }, {
        headers: { 'Content-Type': 'application/json', 'token': token },
      });
      Alert.alert('알림', response.data); 
      
      const newFriend: Friend = {
        id: Date.now().toString(), 
        name, studentId, status: '수업 없음', isFavorite: false, isOn: true,
      };
      setFriends((prev) => [newFriend, ...prev]);
      setNewName(''); setNewStudentId(''); setIsAddModalVisible(false);
    } catch (error) {
      Alert.alert('오류', '친구 추가에 실패했습니다.');
    }
  };

  const openDetailSheet = (friend: Friend) => {
    setSelectedFriend(friend);
    setSelectedFriendId(friend.id);
    setIsDetailVisible(true);
    fetchFriendCourses(friend.id); // 데이터 로드 트리거

    sheetAnim.setValue(300);
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const closeDetailSheet = () => {
    Animated.timing(sheetAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setIsDetailVisible(false);
        setSelectedFriend(null);
        setSelectedFriendId(null);
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
      {/* ✅ [UI 적용] 상단 네비게이션 텍스트 (화살표 포함) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.previousText}>← Previous</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.screenTitle}>친구 보기</Text>

      {/* ✅ [UI 적용] 중앙 카드 스타일 변경 (사용자 디자인) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.searchTitle}>친구 검색하기</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="이름 입력"
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
            <Text style={{ color: PRIMARY }}>목록을 불러오는 중...</Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.friendList}
          showsVerticalScrollIndicator={false}
        >
          {filteredFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
            </View>
          ) : (
            filteredFriends.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.friendRow,
                  f.id === selectedFriendId && styles.friendRowSelected,
                ]}
                activeOpacity={0.9}
                onPress={() => handlePressFriend(f)}
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
                  <Text style={styles.friendSub}>
                    {f.status === '수업 중' ? '수업 중' : '수업 없음'}
                  </Text>
                </View>

                {/* ✅ [UI 적용] 커스텀 애니메이션 토글 버튼 */}
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
          <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => {}} 
              style={styles.addCardShadow} 
          >
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                 <TouchableOpacity
                  onPress={() => setIsAddModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.addCardClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addField}>
                <Text style={styles.addLabel}>친구 이름</Text>
                <TextInput
                  style={styles.addInput}
                  placeholder="입력"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.addField}>
                <Text style={styles.addLabel}>학번</Text>
                <TextInput
                  style={styles.addInput}
                  placeholder="입력"
                  value={newStudentId}
                  onChangeText={setNewStudentId}
                />
              </View>

              <TouchableOpacity
                style={styles.addSubmit}
                onPress={handleAddFriend}
                activeOpacity={0.9}
              >
                <Text style={styles.addSubmitText}>추가하기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 상세 바텀시트 모달 */}
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
              <Text style={styles.detailName} numberOfLines={1}>
                {selectedFriend?.name ?? ''}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* ✅ [UI 적용] 상세 시간표 동적 렌더링 */}
            <View style={styles.detailCourses}>
              {isLoadingCourses ? (
                <Text style={styles.emptyText}>과목 정보를 불러오는 중...</Text>
              ) : friendCourses && friendCourses.length > 0 ? (
                friendCourses.map((course) => (
                  <View 
                    key={course.id} 
                    style={[
                      styles.courseCard, 
                      course.status === 'active' ? styles.courseActive : styles.courseDark
                    ]}
                  >
                    <Text style={course.status === 'active' ? styles.courseTitle : styles.courseTitleDark}>
                      {course.name}
                    </Text>

                    <View style={[
                        styles.courseBadge, 
                        course.status === 'active' ? styles.badgeActive : styles.badgeDark
                      ]}>
                      <Text style={styles.courseBadgeText}>
                        {course.status === 'active' ? '수업 중' : '수업 예정'}
                      </Text>
                    </View>
                    
                    <Text style={styles.courseSub}>{course.time}</Text>
                    <Text style={styles.courseSubDark}>{course.location}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>등록된 시간표가 없습니다.</Text>
              )}
            </View>

            <View style={styles.detailBottom}>
              <Text style={styles.locationShareText}>위치 공유 중…</Text>

              <TouchableOpacity
                style={styles.mapButton}
                activeOpacity={0.9}
                onPress={() => {
                  closeDetailSheet();
                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.mapButtonText}>
                  {(selectedFriend?.name ?? '친구') + ' 님을 지도에서 보기'}
                </Text>
              </TouchableOpacity>

              <View style={styles.detailButtonsRow}>
                <TouchableOpacity 
                    style={styles.timeTableButton}
                    activeOpacity={0.8}
                    onPress={() => {
                        closeDetailSheet();
                        if (selectedFriend) navigation.navigate('Timetable', { friendId: selectedFriend.id });
                    }}
                >
                   <Text style={styles.timeTableButtonText}>시간표 보기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default FriendsScreen;

// ✅ [스타일 전면 교체] 사용자(txt) 파일의 스타일 적용
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5FB',
  },
  topBar: {
    paddingTop: 10,
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
    fontSize: 20,
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
    paddingVertical: 10,
    marginBottom: 6,
  },
  starWrap: {
    marginRight: 8,
  },
  star: {
    fontSize: 20,
    color: '#C5CAD8',
  },
  starActive: {
    color: '#FFC107',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3050',
    marginBottom: 2,
  },
  friendSub: {
    fontSize: 11,
    color: '#8A90AA',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#777E9E',
  },
  // 커스텀 토글 스타일
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
  // 친구 추가 모달
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardShadow: {
    width: '82%',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.01)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 30,
    elevation: 10,
  },
  addCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  addCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCardTitle: {
    flex: 1,
    fontSize: 13,
    color: '#A0A6C6',
  },
  addCardClose: {
    fontSize: 16,
    color: '#A0A6C6',
  },
  addField: {
    marginBottom: 10,
  },
  addLabel: {
    fontSize: 12,
    color: '#6D7392',
    marginBottom: 4,
  },
  addInput: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E4F4',
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: '#FBFBFF',
  },
  addSubmit: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 상세 바텀시트
  detailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  detailBackdropTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  detailSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D4EA',
    marginBottom: 8,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  detailClose: {
    fontSize: 18,
    color: '#A0A6C6',
    width: 24,
  },
  detailName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#2B3153',
    textAlign: 'center', 
  },
  detailCourses: {
    marginTop: 8,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  courseActive: {
    backgroundColor: '#1F2645',
  },
  courseDark: {
    backgroundColor: '#13172C',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  courseSub: {
    fontSize: 11,
    color: '#C8CBE8',
  },
  courseTitleDark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  courseSubDark: {
    fontSize: 11,
    color: '#C8CBE8',
  },
  courseBadge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#2E3456',
  },
  badgeActive: {
    backgroundColor: '#E86E79', 
  },
  badgeDark: {
    backgroundColor: '#2E3456', 
  },
  courseBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  detailBottom: {
    marginTop: 12,
  },
  locationShareText: {
    fontSize: 12,
    color: '#858AB0',
    marginBottom: 8,
  },
  mapButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailButtonsRow: {
    alignItems: 'center',
  },
  timeTableButton: {
    width: '60%',
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeTableButtonText: {
    fontSize: 13,
    color: '#4A4E71',
    fontWeight: '500',
  },
});