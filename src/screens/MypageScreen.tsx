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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ProfileScreen: React.FC = () => {
    // 사용자 정보 상태
    const [nickname, setNickname] = useState<string>(''); // 별명
    const [profileImage, setProfileImage] = useState<string | null>(null); // 프로필 사진
    const [hasSchedule, setHasSchedule] = useState<boolean>(false); // 시간표 등록 여부

    // 프로필 사진 변경 함수
  const handleSelectFromAlbum = () => {
    Alert.alert('앨범에서 가져오기', '앨범에서 사진을 선택하는 기능이 추가될 예정입니다.');
  };
  const handleSetAvatar = () => {
    Alert.alert('아바타 설정하기', '아바타를 선택하는 기능이 추가될 예정입니다.');
  };
  // 시간표 등록
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
        <Text style={styles.welcomeText}>
          안녕하세요, <Text style={styles.highlight}>{nickname ? nickname : '사용자'}
          </Text>{' '}
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
        </View>
        </View>
        
        {/* 닉네임 입력 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>친구에게 보이는 별명</Text>
        <TextInput
          style={styles.input}
          placeholder="별명을 입력하세요"
          value={nickname}
          onChangeText={setNickname}
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
      paddingTop: 80, // 🔹 상단 여백 늘림 (기존 24 → 80)
      paddingBottom: 40, // 🔹 하단 여백 추가
      backgroundColor: '#fff',
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