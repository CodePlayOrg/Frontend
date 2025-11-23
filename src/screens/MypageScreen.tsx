import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const UPDATE_NICKNAME_API_URL = 'http://3.34.70.142:3001/users/update_name';
const USER_INFO_API_URL = 'http://3.34.70.142:3001/users/set_name';

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    // 사용자 정보 상태
    const [nicknameInput, setNicknameInput] = useState(''); // 사용자가 입력 중인 텍스트
    const [nickname, setNickname] = useState('사용자'); // 실제 표시될 닉네임
    const [profileImage, setProfileImage] = useState<string | null>(null); // 프로필 사진
    const [hasSchedule, setHasSchedule] = useState<boolean>(false); // 시간표 등록 여부
    const [isUpdating, setIsUpdating] = useState(false); // ⭐️ 닉네임 업데이트 로딩 상태 추가
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    useEffect(() => {
        const loadInitialData = async () => {
            // 로그인 성공 시 AsyncStorage에 저장했던 닉네임을 불러옵니다.
            const storedName = await AsyncStorage.getItem('userName'); 
            
            if (storedName) {
                setNickname(storedName);        // 표시될 닉네임을 저장된 이름으로 설정
                setNicknameInput(storedName);   // 입력 필드의 값도 저장된 이름으로 설정
            } else {
                // 저장된 이름이 없으면 '사용자'로 설정
                setNickname('사용자');
            }
        };

        loadInitialData();
    }, []); // 빈 배열 []: 컴포넌트가 처음 로드될 때 (화면 진입 시) 한 번만 실행

    useEffect(() => {
        const fetchInitialUserInfo = async () => {
            const userToken = await AsyncStorage.getItem('userToken');

            if (!userToken) {
                // 토큰이 없으면 로그인 화면으로 리다이렉트하거나, 기본값으로 설정
                setNickname('게스트');
                setIsInitialLoading(false);
                return;
            }

            try {
                const response = await axios.get(USER_INFO_API_URL, {
                    headers: {
                        'Authorization': `Bearer ${userToken}` 
                    }
                });
                
                // ⭐️ 백엔드 응답에서 이름(name) 추출 (백엔드 JSON 구조에 맞춰 수정 필요)
                const userName = response.data.name; 
                const safeName = (userName && userName.trim().length > 0) ? userName : '사용자'; 
                
                setNickname(safeName);
                setNicknameInput(safeName);
                
                // AsyncStorage에도 안전한 이름 저장
                await AsyncStorage.setItem('userName', safeName);

            } catch (error) {
                console.error('초기 사용자 정보 로드 실패:', error);
                // API 호출 실패 시 사용자에게 알림
                Alert.alert('정보 로드 실패', '사용자 정보를 불러오지 못했습니다. 다시 로그인해주세요.');
            } finally {
                setIsInitialLoading(false);
            }
        };

        fetchInitialUserInfo();
    }, []); // 빈 배열: 마운트 시 한 번만 실행
    // 프로필 사진 변경 함수
  const handleSelectFromAlbum = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',     // 사진만 선택
      maxWidth: 500,          // 이미지 크기 제한 (선택사항)
      maxHeight: 500,
      quality: 0.8,           // 이미지 압축률
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      console.error('앨범에서 사진을 가져오기 실패했습니다.', result.errorMessage);
      return;
    }
    const uri = result.assets?.[0]?.uri ?? null;
    if (uri) {
      setProfileImage(uri);
    } else {
      console.warn('선택된 이미지의 URI를 찾을 수 없습니다.');
    }
  };
  const handleSetAvatar = () => {
    Alert.alert('아바타 설정하기', '아바타를 선택하는 기능 추가해야되메.');
  };
  /*const handleRemoveProfileImage = () => {
    setProfileImage(null); // 상태 초기화
    Alert.alert('사진 삭제', '프로필 사진이 기본 이미지로 변경되었습니다.');
  };*/ //아바타 기능 못하겠으면 일단 나중에 추가
  // 시간표 등록
  //닉네임 변경
  const handleNicknameSubmit = async () => {
        const newNickname = nicknameInput.trim();

        if (newNickname.length === 0) return;
        
        setIsUpdating(true); // 로딩 시작
        Keyboard.dismiss(); // 키보드 숨기기

        const userToken = await AsyncStorage.getItem('userToken');
    
        if (!userToken) {
          Alert.alert('인증 오류', '로그인이 필요합니다.');
          setIsUpdating(false);
          return;
        }

        try {
            // 🚨 주의: 실제 환경에서는 인증 토큰 등을 헤더에 담아야 합니다.
            const response = await axios.post(UPDATE_NICKNAME_API_URL, {
              nickname: newNickname, 
            }, {
            // ⭐️ 2. Axios 세 번째 인자(config)에 headers 추가
              headers: {
                // Bearer 스키마를 사용하여 토큰을 전송합니다. (가장 일반적인 방식)
                'Authorization': `Bearer ${userToken}` 
              }
            });

            // HTTP 2xx 성공 응답을 받은 경우
            if (response.status === 200 || response.status === 201) {
                // ⭐️ 백엔드 성공 후, 화면의 닉네임을 최종적으로 업데이트
                setNickname(newNickname); 
                await AsyncStorage.setItem('userName', newNickname);
                Alert.alert('성공', `닉네임이 '${newNickname}'(으)로 변경되었습니다.`);
            } else {
                // 2xx 외의 상태 코드는 Axios의 catch 블록에서 처리되지만, 명시적으로 처리 가능
                Alert.alert('오류', '닉네임 변경 요청에 실패했습니다.');
            }
            
        } catch (error) {
            const axiosError = error as AxiosError;
            let errorMessage = '닉네임 변경 중 네트워크 오류가 발생했습니다.';

            if (axiosError.response) {
                const responseData: unknown = axiosError.response.data; 
                // 안전한 에러 메시지 추출 (백엔드 응답 형식에 따라 수정 필요)
                if (typeof responseData === 'object' && responseData !== null) {
                    const data = responseData as { [key: string]: any }; 
                    errorMessage = data.message 
                                   ?? data.error    
                                   ?? '이미 사용 중이거나 유효하지 않은 닉네임입니다.'; 
                }
            }
            
            Alert.alert('변경 실패', errorMessage);
            console.error('닉네임 변경 에러:', axiosError);

        } finally {
            setIsUpdating(false); // 로딩 종료
        }
  };
  const handleRegisterSchedule = () => {
    setHasSchedule(true);
  };
  // 로그아웃
  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '아니요', style: 'cancel' },
      { text: '로그아웃', onPress: () => console.log('Logged out') },
    ]);
  };
  if (isInitialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>정보를 불러오는 중...</Text> 
            </View>
        );
    }
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>X</Text>
      </TouchableOpacity>
        <Text style={styles.welcomeText}>
          안녕하세요, <Text style={styles.highlight}>{nickname}</Text>
          {' '}
          님!
        </Text>

        <View style={styles.profileSection}>
        <Image
          source={
            profileImage
              ? { uri: profileImage }
              : require('../../assets/default_profile.png') // 기본 이미지
          }
          style={styles.profileImage}
        />
          <View style={styles.profileButtons}>
          <TouchableOpacity style={styles.AlbumButton} onPress={handleSelectFromAlbum}>
            <Text>앨범에서 가져오기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.AvataButton} onPress={handleSetAvatar}>
            <Text>아바타 설정하기</Text>
          </TouchableOpacity>
          {/*<TouchableOpacity style={styles.deleteButton} onPress={handleRemoveProfileImage}>
            <Text style={styles.deleteText}>사진 삭제</Text>
        </TouchableOpacity>*/}
        </View>
        </View>
        
        {/* 닉네임 입력 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>친구에게 보이는 별명</Text>
        <TextInput
          style={styles.input}
          placeholder="별명을 입력하세요"
          value={nicknameInput}
          onChangeText={setNicknameInput}
          onSubmitEditing={handleNicknameSubmit} //엔터로 닉네임 설정 완료
          returnKeyType="done"
        />
      </View>

        {/* 시간표 등록 섹션 */}
      <Text style={styles.subTitle}>내 시간표 설정하기</Text>
      <View style={styles.scheduleContainer}>
        {hasSchedule ? (
          <TouchableOpacity onPress={() => Alert.alert('시간표 수정')}>
            <Text style={styles.scheduleText}>대충 시간표 보임 + 시간표 수정</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={handleRegisterSchedule}>
            <Icon name="add" size={32} color="#2563EB" />
            <Text style={styles.addText}>시간표 등록하기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 로그아웃 버튼 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
  );
};
export default ProfileScreen;

const styles = StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: '#fff',
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 80, // 상단 여백 늘림 (기존 24 → 80)
      paddingBottom: 40, // 하단 여백 추가
      backgroundColor: '#fff',
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      zIndex: 10,
      padding: 10,
    },
    backText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
    },
    highlight: {
      color: '#2563EB',
      textShadowColor: '#93C5FD',
      textShadowRadius: 4,
    },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    profileImage: {
      width: 120,
      height: 120,
      backgroundColor: '#BFDBFE',
      borderRadius: 60,
      borderWidth: 2,
      borderColor: '#1E3A8A',
    },
    profileButtons: {
      marginLeft: 16,
    },
    AlbumButton: {
      backgroundColor: '#E5E7EB',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    AvataButton: {
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    deleteButton: {
      backgroundColor: '#FEE2E2',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    deleteText: {
      color: '#DC2626',
      fontWeight: 'bold',
      textAlign: 'center',
    },    
    inputContainer: {
      marginBottom: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    label: {
      fontSize: 14,
      color: '#555',
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: '#000',
      borderRadius: 4,
      padding: 8,
    },
    subTitle: {
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    scheduleContainer: {
      backgroundColor: '#F9FAFB',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      marginBottom: 32,
    },
    addButton: {
        alignItems: 'center',
      },
      addText: {
        color: '#1E3A8A',
        marginTop: 8,
      },
    scheduleText: {
      fontWeight: 'bold',
      fontSize: 16,
      textAlign: 'center',
    },
    logoutButton: {
      alignSelf: 'center',
      backgroundColor: '#FEE2E2',
      borderRadius: 30,
      paddingVertical: 12,
      paddingHorizontal: 32,
      shadowColor: '#F87171',
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    logoutText: {
      color: '#DC2626',
      fontWeight: 'bold',
    },
  });