import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
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

type FriendStatus = '수업 중' | '수업 없음';

type Friend = {
  id: string;
  name: string;
  studentId: string;
  status: FriendStatus;
  isFavorite: boolean;
  isOn: boolean;
};

type FriendsNav = StackNavigationProp<RootStackParamList, 'Friends'>;


const CARD_BORDER = '#C8D3FF';
const PRIMARY = '#7288FF';

const FriendsScreen: React.FC = () => {
  const navigation = useNavigation<FriendsNav>();

  const API_URL = 'http://3.34.70.142:3001/users';

  // ✅ 초기 친구 목록을 빈 배열로 변경
  const [friends, setFriends] = useState<Friend[]>([]); 
  const [query, setQuery] = useState('');
  // ✅ 로딩 상태 추가
  const [isLoading, setIsLoading] = useState(true); 
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');

  // 상세 바텀시트 상태
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  // 바텀시트 애니메이션 & 드래그
  const [sheetAnim] = useState(new Animated.Value(0));

  const fetchFriends = async () => {
    // ⚠️ 토큰 키가 'userToken'이라고 가정합니다. 실제 키를 사용하세요.
    const token = await AsyncStorage.getItem('userToken'); 

    if (!token) {
      setIsLoading(false);
      console.error('인증 토큰을 찾을 수 없습니다. 로그인 상태를 확인하세요.');
      return;
    }

    try {
      // ✅ fetch 대신 axios.get 사용
      const response = await axios.get(`${API_URL}/my_friend_list_show`, {
        headers: {
          'Content-Type': 'application/json',
          // ⚠️ 이전에 백엔드는 'token' 헤더를 사용하도록 설계되었으나, 
          // 요청하신 대로 표준 'Authorization' 헤더를 사용합니다.
          // 백엔드 코드가 'Authorization' 헤더를 받도록 수정되었는지 확인해야 합니다.
          'Authorization': `Bearer ${token}`, 
        },
      });

      // Axios는 응답 데이터가 response.data에 자동으로 담깁니다.
      const data = response.data;
      
      // 백엔드가 { my_friend_list_show: Friend[] } 형태를 반환한다고 가정
      if (data.my_friend_list_show) {
        setFriends(data.my_friend_list_show);
      }
    } catch (error) {
      // Axios는 4xx/5xx 오류 시 catch로 넘어오며, error 객체에 상세 정보가 포함됩니다.
      if (axios.isAxiosError(error) && error.response) {
          console.error('친구 목록 Axios 오류! 상태 코드:', error.response.status);
          console.error('서버 오류 응답 본문:', error.response.data);
      } else {
          console.error('친구 목록을 불러오는 데 실패했습니다:', error);
      }
    } finally {
      // 로딩 상태 해제
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
      f.name.toLowerCase().includes(trimmed.toLowerCase()),
    );
  }, [friends, query]);


  const toggleFavorite = (id: string) => {
    setFriends((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, isFavorite: !f.isFavorite } : f,
      ),
    );
  };

  const toggleSwitch = (id: string) => {
    setFriends((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, isOn: !f.isOn } : f,
      ),
    );
  };

  const handleAddFriend = async () => {
    const name = newName.trim();
    const studentId = newStudentId.trim();

    if (!name || !studentId) {
      Alert.alert('친구 이름과 학번을 모두 입력해주세요.');
      return;
    }

    const token = await AsyncStorage.getItem('userToken');

    if (!token) {
      Alert.alert('로그인 정보가 유효하지 않습니다.');
      return;
    }
    
    // 💡 API_URL 확인: 현재 'http://localhost:3001/users' 이므로,
    // 실제 엔드포인트는 '/users/add_friend'가 됩니다.
    // 백엔드 라우터가 /users 경로에 마운트되어 있다고 가정합니다.
    const endpoint = `${API_URL}/add_friend`; 

    try {
      // 1. 서버에 친구 추가 요청
      // 백엔드가 name과 studentId를 req.body로 요구하므로 이 둘을 전송합니다.
      const response = await axios.post(endpoint, {
        name: name,         // 👈 백엔드에 맞춰 name 전송
        studentId: studentId, // 👈 백엔드에 맞춰 studentId 전송
      }, {
        headers: {
          'Content-Type': 'application/json',
          // ⚠️ 백엔드가 req.headers.token을 요구하므로, 
          // 헤더 이름을 'token'으로 변경하고 Bearer 프리픽스를 제거합니다.
          'token': token, 
        },
      });

      // 2. 서버 응답 처리 (성공 시 res.send(메시지)를 받습니다.)
      
      // 서버 응답 메시지를 사용자에게 표시
      const serverMessage = response.data; // 서버가 보낸 문자열 메시지
      Alert.alert(serverMessage); 

      // 3. 클라이언트 상태 업데이트 (화면에 바로 표시)
      // 서버에서 친구 추가에 성공했으므로, 현재 목록에 추가합니다.
      const newFriend: Friend = {
        id: Date.now().toString(), 
        name: name,
        studentId: studentId,
        status: '수업 없음',
        isFavorite: false,
        isOn: true,
      };
      
      setFriends((prev) => [newFriend, ...prev]);
      
      // 4. 입력 필드 초기화 및 모달 닫기
      setNewName('');
      setNewStudentId('');
      setIsAddModalVisible(false);

    } catch (error) {
      let errorMessage = '알 수 없는 오류로 친구 추가에 실패했습니다.';
      
      if (axios.isAxiosError(error) && error.response) {
        console.error('친구 추가 오류:', error.response.status, error.response.data);
        
        // 400, 404 등 오류 시 서버에서 보낸 메시지(res.status(400).send('...'))를 사용
        errorMessage = error.response.data || `서버 오류: ${error.response.status}`;
      } else {
        console.error('친구 추가 실패:', error);
      }
      Alert.alert(errorMessage);
    }
  };

  const openDetailSheet = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsDetailVisible(true);
    sheetAnim.setValue(300);
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDetailSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsDetailVisible(false);
        setSelectedFriend(null);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        return Math.abs(gesture.dy) > 4;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) {
          sheetAnim.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > 120) {
          // 충분히 내리면 닫기
          closeDetailSheet();
        } else {
          // 아니라면 다시 원위치
          Animated.timing(sheetAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handlePressFriend = (friend: Friend) => {
    openDetailSheet(friend);
  };

  return (
    <View style={styles.container}>
      {/* 상단 네비게이션 텍스트 영역 (Previous / 친구 보기) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.previousText}>Previous</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.screenTitle}>친구 보기</Text>

      {/* 중앙 카드 (검색 + 친구 목록) */}
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

        {/* ✅ 로딩 상태 처리 부분 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>친구 목록을 불러오는 중…</Text>
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
                  f.status === '수업 중' && styles.friendRowActive,
                ]}
                activeOpacity={0.9}
                onPress={() => handlePressFriend(f)}
              >
                <TouchableOpacity
                  style={styles.starWrap}
                  onPress={() => toggleFavorite(f.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.star,
                      f.isFavorite && styles.starActive,
                    ]}
                  >
                    {f.isFavorite ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={styles.friendSub}>
                    {f.status === '수업 중' ? '수업 중' : '수업 없음'}
                  </Text>
                </View>

                <Switch
                  value={f.isOn}
                  onValueChange={() => toggleSwitch(f.id)}
                />
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
        <View style={styles.modalBackdrop}>
          <View style={styles.addCardShadow}>
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                <Text style={styles.addCardTitle}>친구 검색하기</Text>
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
          </View>
        </View>
      </Modal>

      {/* 친구 상세 바텀시트 모달 */}
      <Modal
        visible={isDetailVisible}
        transparent
        animationType="none"
        onRequestClose={closeDetailSheet}
      >
        {/* 반투명 배경 제거, 투명 */}
        <View style={styles.detailBackdrop}>
          {/* 위쪽 투명 영역 (탭하면 닫힘) */}
          <TouchableOpacity
            style={styles.detailBackdropTouchable}
            onPress={closeDetailSheet}
            activeOpacity={1}
          />

          {/* 드래그 가능한 바텀시트 */}
          <Animated.View
            style={[
              styles.detailSheet,
              { transform: [{ translateY: sheetAnim }] },
            ]}
            {...panResponder.panHandlers}
          >
            {/* 상단 핸들 바(드래그 느낌용) */}
            <View style={styles.handleBar} />

            {/* 헤더: X + 가운데 정렬 이름 */}
            <View style={styles.detailHeaderRow}>
              <TouchableOpacity onPress={closeDetailSheet}>
                <Text style={styles.detailClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailName} numberOfLines={1}>
                {selectedFriend?.name ?? ''}
              </Text>
              {/* 오른쪽 빈 뷰로 좌우 균형 맞추기 */}
              <View style={{ width: 24 }} />
            </View>

            {/* 수업 카드들 (예시) */}
            <View style={styles.detailCourses}>
              <View style={[styles.courseCard, styles.courseActive]}>
                <View style={styles.courseLeft}>
                  <View style={styles.courseIconCircle}>
                    <Text style={styles.courseIconText}>◻︎</Text>
                  </View>
                  <View>
                    <Text style={styles.courseTitle}>컴퓨터구조</Text>
                    <Text style={styles.courseSub}>융복 507</Text>
                  </View>
                </View>
                <View style={styles.courseRight}>
                  <View style={[styles.courseBadge, styles.courseBadgeActive]}>
                    <Text style={styles.courseBadgeText}>수업 중</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.courseCard, styles.courseDark]}>
                <View style={styles.courseLeft}>
                  <View style={styles.courseIconCircleDark}>
                    <Text style={styles.courseIconTextDark}>◻︎</Text>
                  </View>
                  <View>
                    <Text style={styles.courseTitleDark}>확률과 통계</Text>
                    <Text style={styles.courseSubDark}>융복 403</Text>
                  </View>
                </View>
                <View style={styles.courseRight}>
                  <View style={styles.courseBadge}>
                    <Text style={styles.courseBadgeText}>14:30 예정</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 위치 공유 + 버튼들 */}
            <View style={styles.detailBottom}>
              <Text style={styles.locationShareText}>위치 공유 중…</Text>

              {/* 여기서 지도에서 보기 버튼처럼 */}
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

              {/* 아래에는 가운데 정렬된 시간표 보기 버튼만 */}
              <View style={styles.detailButtonsRow}>
                <View style={styles.timeTableButton}>
                  <Text style={styles.timeTableButtonText}>시간표 보기</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default FriendsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5FB',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  previousText: {
    color: '#4A4E71',
    fontSize: 14,
  },
  screenTitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 22,
    color: '#3B3F63',
  },

  // 메인 카드
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  cardHeader: {
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  searchTitle: {
    fontSize: 11,
    color: '#9BA2C2',
    marginBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FF',
    paddingHorizontal: 14,
    fontSize: 13,
  },
  plusButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: CARD_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  plusText: {
    fontSize: 20,
    color: PRIMARY,
    marginTop: -2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E3E7FF',
    marginHorizontal: 2,
    marginBottom: 6,
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
  friendRowActive: {
    backgroundColor: '#EDF0FF',
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

  // 상세 바텀시트 모달
  detailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent', // 🔹 반투명 검정 제거
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
    textAlign: 'center', // 🔹 가운데 정렬
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
  courseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseRight: {
    marginLeft: 8,
  },
  courseIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2F3659',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  courseIconText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  courseIconCircleDark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252C4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  courseIconTextDark: {
    fontSize: 16,
    color: '#FFFFFF',
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
  courseBadgeActive: {
    backgroundColor: '#E86E79',
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

  // 아래에는 시간표 보기 버튼만, 가운데 정렬
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
  loadingContainer: { // ✅ 추가된 스타일
    paddingVertical: 40,
    alignItems: 'center',
    height: 200, // 카드의 최소 높이를 유지하기 위해 적절히 설정
    justifyContent: 'center',
  },
  loadingText: { // ✅ 추가된 스타일
    fontSize: 14,
    color: PRIMARY, // PRIMARY는 상단에 정의된 '#7288FF'
    fontWeight: '500',
  },
});
