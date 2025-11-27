import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTimetable } from '../context/TimetableContext';
import axios from 'axios';

// ====================== 상수 및 파싱 로직 ======================
const DAYS = ['월', '화', '수', '목', '금'];
const CELL_HEIGHT = 40; 
const TIME_CELL_WIDTH = 35;

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
  // ⭐️ [중요] DB 모델에 맞춰 'number'를 최우선으로 가져옵니다.
  // Context 호환성을 위해 id가 있다면 그것도 고려합니다.
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
            pk: String(pk), // PK는 문자열로 취급
            name: classData.name,
            professor: classData.professor,
            day,
            start,
            end,
          });
      }
    }
  }
  return parsedTimes;
};

const EditTimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { classes, addClass, removeClass } = useTimetable();

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]); 
  const [timetableWidth, setTimetableWidth] = useState(0); 

  // 렌더링용 데이터
  const parsedClassesForRendering = useMemo(() => {
    return classes.flatMap(lec => parseClassTime(lec));
  }, [classes]);

  // 동적 시간 (18시 이후 자동 확장)
  const dynamicHours = useMemo(() => {
    let maxHour = 18; 
    parsedClassesForRendering.forEach(cls => {
        const endMinute = PERIOD_TO_MINUTE[cls.end];
        if (endMinute) {
            const endH = Math.ceil(endMinute / 60); 
            if (endH > maxHour) maxHour = endH;
        }
    });
    return Array.from({ length: maxHour - 9 + 1 }, (_, i) => 9 + i);
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

  // ⭐️ [강의 추가] 여기가 삭제 문제 해결의 핵심입니다.
  const handleSelectLecture = (lec: any) => {
    // DB에서 온 데이터에는 'number'만 있고 'id'가 없을 수 있습니다.
    const lecPK = lec.number; 
    
    if (lecPK === undefined) {
        Alert.alert("오류", "강의 고유번호(number)가 없습니다.");
        return;
    }
    
    // 중복 검사
    const isDuplicate = classes.find(c => {
        const cPK = (c as any).number !== undefined ? (c as any).number : c.id;
        return String(cPK) === String(lecPK);
    });

    if (isDuplicate) {
      Alert.alert("알림", "이미 추가된 강의입니다.");
      return;
    }
    
    const parsedTime = parseClassTime(lec);
    if (parsedTime.length === 0) {
        Alert.alert("알림", "시간 정보를 읽을 수 없습니다.");
        return;
    }

    // ⭐️ [FIX] Context에 저장할 때 id 속성을 강제로 만들어줍니다.
    // 이렇게 하면 removeClass가 id를 찾을 때 number 값을 참조하게 됩니다.
    const classToSave = {
        ...lec,
        id: lec.number, // number 값을 id로 복사
    };

    addClass(classToSave); 
  };

  // ⭐️ [강의 삭제]
  const handleCellPress = (parsedLec: ParsedClassTime) => {
    Alert.alert(
      "강의 삭제",
      `'${parsedLec.name}' 강의를 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
             // parsedLec.pk는 위에서 number 값으로 설정되었습니다.
             // addClass할 때 id=number로 넣었으므로, removeClass에 pk를 그대로 주면 삭제됩니다.
             removeClass(parsedLec.pk);
          }
        }
      ]
    );
  };

  const getTopOffset = (start: string) => {
    const minute = PERIOD_TO_MINUTE[start];
    return minute ? ((minute - 9 * 60) / 60) * CELL_HEIGHT : 0;
  }

  const getHeight = (start: string, end: string) => {
    const startMinute = PERIOD_TO_MINUTE[start];
    const endMinute = PERIOD_TO_MINUTE[end];
    if (!startMinute || !endMinute) return 0;
    let diff = endMinute - startMinute;
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

      {/* 상단: 시간표 (45% 높이) */}
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
            <View style={[styles.headerCell, { width: TIME_CELL_WIDTH }]} /> 
            {DAYS.map(day => (
              <View key={day} style={[styles.headerCell, { width: columnWidth }]}>
                <Text style={styles.headerText}>{day}</Text>
              </View>
            ))}
        </View>

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
                const dayIndex = DAYS.indexOf(lec.day);
                const key = `${lec.pk}-${lec.day}-${lec.start}-${idx}`; 
                if (dayIndex === -1) return null; 

                const top = getTopOffset(lec.start);
                const height = getHeight(lec.start, lec.end);

                return (
                    <TouchableOpacity
                    key={key}
                    style={[
                        styles.absoluteClass,
                        {
                        left: TIME_CELL_WIDTH + dayIndex * columnWidth + 1, 
                        top: top + 1, 
                        height: height - 2, 
                        width: columnWidth - 2, 
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
      </View>

      {/* 중간: 검색 (Flex 1) */}
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
            keyExtractor={(item, index) => String((item as any).number || index)}
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

      {/* 하단: 완료 버튼 */}
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
  headerArea: { paddingTop: 50, paddingBottom: 10, alignItems: 'center', backgroundColor: '#FFF' },
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
  absoluteClass: { 
      position: 'absolute', backgroundColor: '#2563EB', borderRadius: 4, padding: 2, 
      justifyContent: 'center', alignItems: 'center', opacity: 0.9, zIndex: 10 
  },
  classText: { color: '#FFF', fontWeight: '700', fontSize: 10, textAlign: 'center' },

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