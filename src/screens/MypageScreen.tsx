import React, { useState } from 'react';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;


const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    // 사용자 정보 상태
    const [nicknameInput, setNicknameInput] = useState(''); // 사용자가 입력 중인 텍스트
    const [nickname, setNickname] = useState('사용자'); // 실제 표시될 닉네임
    const [profileImage, setProfileImage] = useState<string | null>(null); // 프로필 사진
    const [hasSchedule, setHasSchedule] = useState<boolean>(false); // 시간표 등록 여부

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
  const handleNicknameSubmit = () => {
    if (nicknameInput.trim().length === 0) return;
    setNickname(nicknameInput.trim()); // 입력한 닉네임을 실제 닉네임으로 반영
    Keyboard.dismiss();
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