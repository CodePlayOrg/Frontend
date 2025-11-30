import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  LayoutChangeEvent,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import { useTimetable } from '../context/TimetableContext'; // ❌ Context 제거
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://3.34.70.142:3001/users'; 
const DAYS = ['월', '화', '수', '목', '금'];
const CELL_HEIGHT = 40; 
const TIME_CELL_WIDTH = 35;

const PASTEL_COLORS = [
  "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9",
  "#BAE1FF", "#E2C2FF", "#FFC4E1", "#C4FAF8",
  "#DCD3FF", "#FFCCF9", "#C2FFE3", "#FDFD96",
];

const PERIOD_TO_MINUTE: Record<string, number> = {
  "1A": 9 * 60 + 0, "1B": 9 * 60 + 30, "2A": 10 * 60 + 0, "2B": 10 * 60 + 30,
  "3A": 11 * 60 + 0, "3B": 11 * 60 + 30, "4A": 12 * 60 + 0, "4B": 12 * 60 + 30,
  "5A": 13 * 60 + 0, "5B": 13 * 60 + 30, "6A": 14 * 60 + 0, "6B": 14 * 60 + 30,
  "7A": 15 * 60 + 0, "7B": 15 * 60 + 30, "8A": 16 * 60 + 0, "8B": 16 * 60 + 30,
  "9A": 17 * 60 + 0, "9B": 17 * 60 + 30, "10A": 18 * 60 + 0, "10B": 18 * 60 + 25,
  "11A": 18 * 60 + 55, "11B": 19 * 60 + 20, "12A": 19 * 60 + 50, "12B": 20 * 60 + 15,
  "13A": 20 * 60 + 45, "13B": 21 * 60 + 10, "14A": 21 * 60 + 40, "14B": 22 * 60 + 5,
};

interface ParsedClassTime {
    pk: string; 
    name: string;
    professor: string;
    day: string;
    start: string;
    end: string;
}

const parseClassTime = (classData: any): ParsedClassTime[] => {
  const pk = classData.number !== undefined ? classData.number : classData.id;
  const rawTime = classData.time;
  if (pk === undefined || !rawTime) return [];
  const parsedTimes: ParsedClassTime[] = [];
  const regex = /([월화수목금])\s*([0-9A-Z,]+)/g;
  let match;
  while ((match = regex.exec(String(rawTime))) !== null) {
    const day = match[1]; 
    const periods = match[2].split(',').map(p => p.trim()).filter(p => p);
    if (periods.length > 0) {
      periods.sort((a, b) => (PERIOD_TO_MINUTE[a] || 0) - (PERIOD_TO_MINUTE[b] || 0));
      const start = periods[0];
      const end = periods[periods.length - 1];
      if (PERIOD_TO_MINUTE[start] !== undefined && PERIOD_TO_MINUTE[end] !== undefined) {
        parsedTimes.push({
            pk: String(pk), name: classData.name, professor: classData.professor, day, start, end,
          });
      }
    }
  }
  return parsedTimes;
};

const getBlockColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % PASTEL_COLORS.length);
    return PASTEL_COLORS[index];
};

const EditTimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // ⭐️ Context 대신 로컬 상태(dbClasses) 사용
  const [dbClasses, setDbClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]); 
  const [timetableWidth, setTimetableWidth] = useState(0); 

  // ⭐️ [신규] 화면 들어올 때 DB에서 내 시간표 불러오기
  useFocusEffect(
    useCallback(() => {
        const fetchMyTimetable = async () => {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/timetable`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setDbClasses(res.data.timetable || []);
            } catch (e) {
                console.error('시간표 로드 실패', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyTimetable();
    }, [])
  );

  const parsedClassesForRendering = useMemo(() => {
    return dbClasses.flatMap(lec => parseClassTime(lec));
  }, [dbClasses]);

  const dynamicHours = useMemo(() => {
    let maxHour = 18; 
    parsedClassesForRendering.forEach(cls => {
        const endMinute = PERIOD_TO_MINUTE[cls.end];
        if (endMinute) {
            const endH = Math.ceil(endMinute / 60); 
            if (endH > maxHour) maxHour = endH;
        }
    });
    return Array.from({ length: Math.max(1, maxHour - 9 + 1) }, (_, i) => 9 + i);
  }, [parsedClassesForRendering]);

  const columnWidth = timetableWidth > TIME_CELL_WIDTH 
    ? (timetableWidth - TIME_CELL_WIDTH) / DAYS.length 
    : 0;

  const searchLectures = async () => {
    if (!searchText.trim()) {
      Alert.alert("알림", "검색어를 입력하세요.");
      return;
    }
    try {
      const res = await axios.get(`http://3.34.70.142:3001/times/search`, {
        params: { timename: searchText },
      });
      setSearchResults(res.data);
    } catch (e) {
      Alert.alert("오류", "검색 중 문제가 발생했습니다.");
    }
  };

  // ⭐️ [강의 추가] DB 저장 + 시간 충돌 검사
  const handleSelectLecture = async (lec: any) => {
    const lecPK = lec.number !== undefined ? lec.number : lec.id;
    if (lecPK === undefined) { Alert.alert("오류", "강의 ID 없음"); return; }
    
    // 1. 중복 검사 (dbClasses 기준)
    const isDuplicate = dbClasses.find(c => {
        const cPK = (c as any).number !== undefined ? (c as any).number : c.id;
        return String(cPK) === String(lecPK);
    });
    if (isDuplicate) { Alert.alert("알림", "이미 추가된 강의입니다."); return; }
    
    // 2. 시간 파싱 & 충돌 검사
    const newLectureTimes = parseClassTime(lec);
    if (newLectureTimes.length === 0) { Alert.alert("알림", "시간 정보 없음"); return; }

    const existingTimes = dbClasses.flatMap(c => parseClassTime(c));
    for (const newTime of newLectureTimes) {
        const newStart = PERIOD_TO_MINUTE[newTime.start];
        const newEnd = PERIOD_TO_MINUTE[newTime.end];
        for (const existTime of existingTimes) {
            if (newTime.day === existTime.day) {
                const existStart = PERIOD_TO_MINUTE[existTime.start];
                const existEnd = PERIOD_TO_MINUTE[existTime.end];
                if (newStart < existEnd && newEnd > existStart) {
                    Alert.alert("시간표 겹침!", `'${existTime.name}' 수업과 시간이 겹칩니다.`);
                    return; 
                }
            }
        }
    }

    // ⭐️ 3. [DB 저장]
    try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        await axios.post(`${API_BASE_URL}/timetable/add`, 
            { number: lecPK }, 
            { headers: { 'Authorization': `Bearer ${token}` } } 
        );

        // 로컬 상태 업데이트 (즉시 반영)
        const classToSave = { ...lec, number: lecPK, id: lecPK };
        setDbClasses(prev => [...prev, classToSave]);
        Alert.alert("성공", "추가되었습니다.");

    } catch (e: any) {
        const msg = e.response?.data?.message || "저장 실패";
        Alert.alert("오류", msg);
    }
  };

  // ⭐️ [강의 삭제] DB 삭제
  const handleCellPress = (parsedLec: ParsedClassTime) => {
    Alert.alert(
      "강의 삭제",
      `'${parsedLec.name}' 강의를 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
             const target = dbClasses.find(c => String((c as any).number ?? c.id) === parsedLec.pk);
             const targetId = target ? ((target as any).number ?? target.id) : parsedLec.pk;
             
             try {
                 const token = await AsyncStorage.getItem('userToken');
                 if (!token) return;
                 await axios.delete(`${API_BASE_URL}/timetable/${targetId}`, {
                     headers: { 'Authorization': `Bearer ${token}` }
                 });
                 // 로컬 상태 업데이트
                 setDbClasses(prev => prev.filter(c => String((c as any).number ?? c.id) !== String(targetId)));
             } catch (e) {
                 Alert.alert("오류", "삭제 실패");
             }
          }
        }
      ]
    );
  };

  const getTopOffset = (start: string) => ((PERIOD_TO_MINUTE[start] - 9 * 60) / 60) * CELL_HEIGHT;
  const getHeight = (start: string, end: string) => {
    let diff = PERIOD_TO_MINUTE[end] - PERIOD_TO_MINUTE[start];
    if (diff === 0) diff = 30; 
    return (diff / 60) * CELL_HEIGHT;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerArea}>
        <Text style={styles.title}>시간표 수정</Text>
      </View>

      <View style={styles.topSection}>
        <View style={styles.headerRow}>
            <View style={[styles.headerCell, { width: TIME_CELL_WIDTH }]} /> 
            {DAYS.map(day => (
              <View key={day} style={[styles.headerCell, { width: columnWidth }]}>
                <Text style={styles.headerText}>{day}</Text>
              </View>
            ))}
        </View>

        {/* 로딩 중일 때 인디케이터 표시 */}
        {isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        ) : (
            <ScrollView style={styles.timetableScroll} nestedScrollEnabled={true}>
                <View
                style={styles.timetableContent}
                onLayout={(e: LayoutChangeEvent) => setTimetableWidth(e.nativeEvent.layout.width)}
                >
                    {dynamicHours.map(hour => (
                    <View key={hour} style={styles.row}>
                        <View style={[styles.cell, styles.timeCell, { width: TIME_CELL_WIDTH }]}> 
                            <Text style={{fontSize: 10, color: '#666'}}>{hour}</Text>
                        </View>
                        {DAYS.map(day => (
                            <View key={day + hour} style={[styles.cell, { width: columnWidth }]} />
                        ))}
                    </View>
                    ))}

                    {timetableWidth > 0 && columnWidth > 0 && parsedClassesForRendering.map((lec, idx) => { 
                    const dayIndex = DAYS.indexOf(lec.day as any);
                    if (dayIndex === -1) return null; 
                    const top = getTopOffset(lec.start);
                    const height = getHeight(lec.start, lec.end);

                    return (
                        <TouchableOpacity
                        key={`${lec.pk}-${idx}`}
                        style={[
                            styles.absoluteClass,
                            {
                            left: TIME_CELL_WIDTH + dayIndex * columnWidth + 1, 
                            top: top + 1, 
                            height: height - 2, 
                            width: columnWidth - 2, 
                            backgroundColor: getBlockColor(lec.pk),
                            }
                        ]}
                        onPress={() => handleCellPress(lec)}
                        >
                            <Text style={styles.classText} numberOfLines={1}>{lec.name}</Text>
                        </TouchableOpacity>
                    );
                    })}
                </View>
            </ScrollView>
        )}
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.label}>강의 검색</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { flex: 1 }]}
            placeholder="강의명 또는 교수명"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity style={styles.searchButton} onPress={searchLectures}>
            <Text style={styles.searchButtonText}>검색</Text>
          </TouchableOpacity>
        </View>

        <FlatList
            data={searchResults}
            keyExtractor={(item, index) => String((item as any).number || item.id || index)}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleSelectLecture(item)}
                >
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.listSub}>{item.professor} · {item.time}</Text>
                </TouchableOpacity>
            )}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 10 }}
        />
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.saveButton} onPress={() => navigation.goBack()}>
            <Text style={styles.saveText}>완료</Text>
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
};

export default EditTimetableScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  headerArea: { paddingTop: 70, paddingBottom: 10, alignItems: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 20, fontWeight: 'bold' },
  topSection: { height: '45%', borderBottomWidth: 1, borderColor: '#EEE' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#DDD', backgroundColor: '#F3F4F6' },
  headerCell: { height: 35, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderColor: '#DDD' },
  headerText: { fontWeight: 'bold', fontSize: 12 },
  timetableScroll: { flex: 1 },
  timetableContent: { position: 'relative' },
  row: { flexDirection: 'row' },
  cell: { height: CELL_HEIGHT, borderWidth: 0.5, borderColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  timeCell: { backgroundColor: '#FAFAFA', borderRightWidth: 1, borderColor: '#DDD' },
  absoluteClass: { position: 'absolute', borderRadius: 4, padding: 2, justifyContent: 'center', alignItems: 'center', opacity: 0.9, zIndex: 10 },
  classText: { color: '#333', fontWeight: '700', fontSize: 10, textAlign: 'center' },
  middleSection: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  label: { fontWeight: '600', marginBottom: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchInput: { borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, fontSize: 14, height: 45 },
  searchButton: { marginLeft: 8, backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, justifyContent: 'center' },
  searchButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  list: { flex: 1 },
  listItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE' },
  listTitle: { fontWeight: '600', fontSize: 14 },
  listSub: { color: '#666', fontSize: 12, marginTop: 2 },
  bottomSection: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#FFF' },
  saveButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10 },
  saveText: { color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
});