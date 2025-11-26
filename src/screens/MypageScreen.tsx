import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Keyboard,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTimetable, Day } from '../context/TimetableContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
const UPDATE_NICKNAME_API_URL = 'http://3.34.70.142:3001/users/update_name';
const USER_INFO_API_URL = 'http://3.34.70.142:3001/users/set_name';
const DAYS: Day[] = ['월', '화', '수', '목', '금'];

const PERIOD_TO_MINUTE: Record<string, number> = {
  "1A": 9 * 60 + 0, "1B": 9 * 60 + 30, "2A": 10 * 60 + 0, "2B": 10 * 60 + 30,
  "3A": 11 * 60 + 0, "3B": 11 * 60 + 30, "4A": 12 * 60 + 0, "4B": 12 * 60 + 30,
  "5A": 13 * 60 + 0, "5B": 13 * 60 + 30, "6A": 14 * 60 + 0, "6B": 14 * 60 + 30,
  "7A": 15 * 60 + 0, "7B": 15 * 60 + 30, "8A": 16 * 60 + 0, "8B": 16 * 60 + 30,
  "9A": 17 * 60 + 0, "9B": 17 * 60 + 30, "10A": 18 * 60 + 0, "10B": 18 * 60 + 25,
  "11A": 18 * 60 + 55, "11B": 19 * 60 + 20, "12A": 19 * 60 + 50, "12B": 20 * 60 + 15,
  "13A": 20 * 60 + 45, "13B": 21 * 60 + 10, "14A": 21 * 60 + 40, "14B": 22 * 60 + 5,
};

const parseClasses = (classes: any[]) => {
  const parsed: { day: string; startMin: number; endMin: number; name: string }[] = [];
  classes.forEach(cls => {
    // ⭐️ number 또는 id 확인
    const pk = (cls as any).number ?? cls.id;
    const rawTime = (cls as any).time;
    if (pk === undefined || !rawTime) return;

    const regex = /([월화수목금])\s*([0-9A-Z,]+)/g;
    let match;
    while ((match = regex.exec(String(rawTime))) !== null) {
      const day = match[1];
      const periods = match[2].split(',').map(p => p.trim()).filter(p => p);
      if (periods.length > 0) {
        periods.sort((a, b) => (PERIOD_TO_MINUTE[a] || 0) - (PERIOD_TO_MINUTE[b] || 0));
        const startMin = PERIOD_TO_MINUTE[periods[0]];
        const endMin = (PERIOD_TO_MINUTE[periods[periods.length - 1]] || 0) + 30;
        if (startMin !== undefined) parsed.push({ day, startMin, endMin, name: cls.name });
      }
    }
  });
  return parsed;
};

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { classes } = useTimetable();
    const [nicknameInput, setNicknameInput] = useState('');
    const [nickname, setNickname] = useState('사용자');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [hasSchedule, setHasSchedule] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => { setHasSchedule(classes.length > 0); }, [classes]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const storedName = await AsyncStorage.getItem('userName'); 
                if (storedName) { setNickname(storedName); setNicknameInput(storedName); }
                const userToken = await AsyncStorage.getItem('userToken');
                if (!userToken) { setIsInitialLoading(false); return; }
                
                const response = await axios.get(USER_INFO_API_URL, { headers: { 'Authorization': `Bearer ${userToken}` } });
                const userName = response.data.name; 
                const safeName = (userName && userName.trim().length > 0) ? userName : '사용자'; 
                setNickname(safeName); setNicknameInput(safeName);
                await AsyncStorage.setItem('userName', safeName);
            } catch (e) { console.error(e); } finally { setIsInitialLoading(false); }
        };
        fetchUserData();
    }, []);

    const handleSelectFromAlbum = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
        const uri = result.assets?.[0]?.uri ?? null;
        if (uri) setProfileImage(uri);
    };
    const handleSetAvatar = () => Alert.alert('알림', '준비중입니다.');
    const handleNicknameSubmit = async () => { /* 기존 로직 */ };
    const handleLogout = () => Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [{text:'취소'},{text:'확인'}]);

    const TimetablePreview: React.FC = () => {
        const boxSize = 30;
        const parsedClasses = useMemo(() => parseClasses(classes), [classes]);
        const dynamicHours = useMemo(() => {
            let maxHour = 18; 
            parsedClasses.forEach(c => {
                const endH = Math.ceil(c.endMin / 60);
                if (endH > maxHour) maxHour = endH;
            });
            return Array.from({ length: maxHour - 9 + 1 }, (_, i) => 9 + i);
        }, [parsedClasses]);

        return (
        <TouchableOpacity style={styles.previewWrapper} onPress={() => navigation.navigate('Timetable')}>
            <View style={styles.previewRow}>
            <View style={[styles.previewCell, { width: boxSize, height: boxSize }]} />
            {DAYS.map(day => (
                <View key={day} style={[styles.previewCell, { width: boxSize, height: boxSize, backgroundColor: '#E5E7EB' }]}>
                <Text style={{ fontSize: 10 }}>{day}</Text>
                </View>
            ))}
            </View>
            {dynamicHours.map(hour => {
            const rowStartMin = hour * 60;
            const rowEndMin = (hour + 1) * 60;
            return (
                <View key={hour} style={styles.previewRow}>
                    <View style={[styles.previewCell, { width: boxSize, height: boxSize, backgroundColor: '#F3F4F6' }]}>
                    <Text style={{ fontSize: 8 }}>{hour}</Text>
                    </View>
                    {DAYS.map(day => {
                        const isOccupied = parsedClasses.some(c => c.day === day && (c.startMin < rowEndMin && c.endMin > rowStartMin));
                        return (
                            <View key={day + hour} style={[styles.previewCell, { width: boxSize, height: boxSize, backgroundColor: isOccupied ? '#60A5FA' : '#fff' }]} />
                        );
                    })}
                </View>
            );
            })}
        </TouchableOpacity>
        );
    };

    if (isInitialLoading) return <View style={styles.loadingContainer}><Text>로딩중...</Text></View>;

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>X</Text>
                </TouchableOpacity>
                <Text style={styles.welcomeText}>안녕하세요, <Text style={styles.highlight}>{nickname}</Text> 님!</Text>
                
                <View style={styles.profileSection}>
                    <Image source={profileImage ? { uri: profileImage } : require('../../assets/default_profile.png')} style={styles.profileImage}/>
                    <View style={styles.profileButtons}>
                        <TouchableOpacity style={styles.AlbumButton} onPress={handleSelectFromAlbum}><Text>앨범 선택</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.AvataButton} onPress={handleSetAvatar}><Text>아바타 설정</Text></TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                     <Text style={styles.label}>별명 변경</Text>
                     <TextInput style={styles.input} value={nicknameInput} onChangeText={setNicknameInput} />
                </View>

                <Text style={styles.subTitle}>내 시간표</Text>
                <View style={styles.scheduleContainer}>
                    {hasSchedule ? <TimetablePreview /> : (
                        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('TimetableEdit')}>
                            <Text style={styles.addText}>시간표 등록하기</Text>
                        </TouchableOpacity>
                    )}
                </View>

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
    container: { flex: 1, padding: 24, paddingTop: 80, backgroundColor: '#fff' },
    backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10 },
    backText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    welcomeText: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
    highlight: { color: '#2563EB' },
    profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    profileImage: { width: 100, height: 100, backgroundColor: '#BFDBFE', borderRadius: 50, borderWidth: 1, borderColor: '#DDD' },
    profileButtons: { marginLeft: 16 },
    AlbumButton: { backgroundColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 8 },
    AvataButton: { backgroundColor: '#E5E7EB', borderRadius: 8, padding: 10 },
    inputContainer: { marginBottom: 24 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 14, color: '#555', marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#CCC', borderRadius: 4, padding: 8 },
    subTitle: { fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 20 },
    scheduleContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 32 },
    addButton: { alignItems: 'center', padding: 10 },
    addText: { color: '#1E3A8A', fontWeight: 'bold' },
    previewWrapper: { marginTop: 10, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, overflow: 'hidden' },
    previewRow: { flexDirection: 'row' },
    previewCell: { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#EEE' },
    logoutButton: { alignSelf: 'center', backgroundColor: '#FEE2E2', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 30 },
    logoutText: { color: '#DC2626', fontWeight: 'bold' },
});