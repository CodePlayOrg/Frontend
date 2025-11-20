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
import { useTimetable, Day } from '../context/TimetableContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const DAYS: Day[] = ['월', '화', '수', '목', '금'];
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i);

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { classes } = useTimetable();

  const [nicknameInput, setNicknameInput] = useState('');
  const [nickname, setNickname] = useState('사용자');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [hasSchedule, setHasSchedule] = useState<boolean>(false);

  const handleSelectFromAlbum = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.8,
    });
    if (result.didCancel) return;
    if (result.errorCode) return;
    const uri = result.assets?.[0]?.uri ?? null;
    if (uri) setProfileImage(uri);
  };

  const handleSetAvatar = () => {
    Alert.alert('아바타 설정하기', '아바타 선택 기능 추가 필요');
  };

  const handleNicknameSubmit = () => {
    if (nicknameInput.trim().length === 0) return;
    setNickname(nicknameInput.trim());
    Keyboard.dismiss();
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '아니요', style: 'cancel' },
      { text: '로그아웃', onPress: () => console.log('Logged out') },
    ]);
  };

  // 정사각형 미리보기
  const TimetablePreview: React.FC = () => {
    const boxSize = 30;
    return (
      <TouchableOpacity
        style={styles.previewWrapper}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Timetable')}
      >
        {/* 요일 헤더 */}
        <View style={styles.previewRow}>
          <View style={[styles.previewCell, { width: boxSize, height: boxSize }]} />
          {DAYS.map(day => (
            <View
              key={day}
              style={[
                styles.previewCell,
                { width: boxSize, height: boxSize, backgroundColor: '#E5E7EB' },
              ]}
            >
              <Text style={{ fontSize: 10 }}>{day}</Text>
            </View>
          ))}
        </View>

        {/* 시간 블록 */}
        {HOURS.map(hour => (
          <View key={hour} style={styles.previewRow}>
            <View
              style={[styles.previewCell, { width: boxSize, height: boxSize, backgroundColor: '#F3F4F6' }]}
            >
              <Text style={{ fontSize: 8 }}>{hour}</Text>
            </View>
            {DAYS.map(day => {
              const classItem = classes.find(c => c.day === day && c.start <= hour && c.end > hour);
              return (
                <View
                  key={day + hour}
                  style={[
                    styles.previewCell,
                    {
                      width: boxSize,
                      height: boxSize,
                      backgroundColor: classItem ? '#60A5FA' : '#fff',
                    },
                  ]}
                >
                  {classItem && <Text style={{ fontSize: 8, color: '#fff' }}>{classItem.name}</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>X</Text>
        </TouchableOpacity>

        {/* 환영 문구 */}
        <Text style={styles.welcomeText}>
          안녕하세요, <Text style={styles.highlight}>{nickname}</Text> 님!
        </Text>

        {/* 프로필 사진 + 버튼 */}
        <View style={styles.profileSection}>
          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : require('../../assets/default_profile.png')
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
            value={nicknameInput}
            onChangeText={setNicknameInput}
            onSubmitEditing={handleNicknameSubmit}
            returnKeyType="done"
          />
        </View>

        {/* 시간표 설정 */}
        <Text style={styles.subTitle}>내 시간표 설정하기</Text>
        <View style={styles.scheduleContainer}>
          {hasSchedule ? (
            <TimetablePreview />
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setHasSchedule(true);
                navigation.navigate('TimetableEdit');
              }}
            >
              <Text style={styles.addText}>시간표 등록하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 로그아웃 버튼 스크롤 끝에 따라가도록 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10 },
  backText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  welcomeText: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  highlight: { color: '#2563EB', textShadowColor: '#93C5FD', textShadowRadius: 4 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#1E3A8A' },
  profileButtons: { marginLeft: 16 },
  AlbumButton: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8 },
  AvataButton: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 14, color: '#555', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#000', borderRadius: 4, padding: 8 },
  subTitle: { fontWeight: '600', color: '#555', marginBottom: 8 },
  scheduleContainer: { backgroundColor: '#F9FAFB', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, marginBottom: 32 },
  addButton: { alignItems: 'center', marginBottom: 16 },
  addText: { color: '#1E3A8A', marginTop: 8 },
  previewWrapper: { marginTop: 16, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, overflow: 'hidden' },
  previewRow: { flexDirection: 'row' },
  previewCell: { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#EEE' },
  logoutButton: { alignSelf: 'center', backgroundColor: '#FEE2E2', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 32, shadowColor: '#F87171', shadowOpacity: 0.4, shadowRadius: 8, marginTop: 24 },
  logoutText: { color: '#DC2626', fontWeight: 'bold' },
});
