import React, { useMemo, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Alert,
  LayoutChangeEvent,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔹 API 설정
const API_BASE_URL = 'http://3.34.70.142:3001/users';

type Day = '월' | '화' | '수' | '목' | '금'; 
const DAYS: Day[] = ['월', '화', '수', '목', '금'];
const TIME_COL_WIDTH = 40; 
const CELL_HEIGHT = 50; 

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TimetableRouteProp = RouteProp<RootStackParamList, 'Timetable'>;

interface ParsedClass {
  id: string; 
  name: string;
  professor: string;
  location: string;
  day: string;
  startMin: number;
  endMin: number;
  timeString: string;
}

const getBlockColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % PASTEL_COLORS.length);
    return PASTEL_COLORS[index];
};

const parseClasses = (classes: any[]): ParsedClass[] => {
  const parsed: ParsedClass[] = [];
  classes.forEach(cls => {
    const rawTime = (cls as any).time;
    const pk = (cls as any).number ?? cls.id;
    if (pk === undefined || !rawTime) return;

    const regex = /([월화수목금])\s*([0-9A-Z,]+)/g;
    let match;
    while ((match = regex.exec(String(rawTime))) !== null) {
      const day = match[1];
      const periods = match[2].split(',').map(p => p.trim()).filter(p => p);
      if (periods.length > 0) {
        periods.sort((a, b) => (PERIOD_TO_MINUTE[a] || 0) - (PERIOD_TO_MINUTE[b] || 0));
        const startMin = PERIOD_TO_MINUTE[periods[0]];
        const endTimeKey = periods[periods.length - 1];
        // 마지막 교시 시작시간 + 50분 = 종료시간 (가정)
        const endMin = (PERIOD_TO_MINUTE[endTimeKey] || 0) + 50; 
        
        if (startMin !== undefined) {
          parsed.push({
            id: String(pk),
            name: cls.name,
            professor: cls.professor || '교수 미정',
            location: cls.location || '장소 미정',
            day,
            startMin,
            endMin,
            timeString: cls.time
          });
        }
      }
    }
  });
  return parsed;
};

const getBuildingName = (location: string): string => {
    if (!location || location === '장소 미정') return '';
    let cleanLoc = location.replace(/산격동캠퍼스|상주캠퍼스|동인동캠퍼스/g, '').trim();
    if (cleanLoc.includes('(')) cleanLoc = cleanLoc.split('(')[0].trim();
    const parts = cleanLoc.split(' ').filter((p: string) => p.trim() !== '');
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (!part.match(/^[\d-]+호?$/) && !part.match(/^[A-Z]?\d+$/)) {
            return part.replace(/\d+호?$/, ''); 
        }
    }
    return location;
};


const TimetableScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TimetableRouteProp>();
  const friendId = route.params?.friendId; // 친구 ID (없으면 내 시간표)
  
  const [currentClasses, setCurrentClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState<ParsedClass | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [timetableWidth, setTimetableWidth] = useState(0); 
  
  const titleText = friendId ? '친구 시간표' : '내 시간표';

  // ⭐️ [핵심] 화면 포커스 시 DB 데이터 로드
  useFocusEffect(
    useCallback(() => {
        const fetchTimetable = async () => {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            // 내 시간표 or 친구 시간표 URL 결정
            const url = friendId ? `${API_BASE_URL}/timetable/${friendId}` : `${API_BASE_URL}/timetable`;

            try {
                const response = await axios.get(url, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                
                const data = response.data?.timetable || response.data || [];
                setCurrentClasses(data);
            } catch (e) {
                console.error(`시간표 로드 오류:`, e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimetable();
    }, [friendId]) 
  );

  const parsedClasses = useMemo(() => parseClasses(currentClasses), [currentClasses]);
  
  const dynamicHours = useMemo(() => {
    let maxHour = 18; 
    parsedClasses.forEach(c => {
        const endH = Math.ceil(c.endMin / 60); 
        if (endH > maxHour) maxHour = endH;
    });
    return Array.from({ length: Math.max(1, maxHour - 9 + 1) }, (_, i) => 9 + i);
  }, [parsedClasses]);

  const columnWidth = timetableWidth > TIME_COL_WIDTH 
    ? (timetableWidth - TIME_COL_WIDTH) / DAYS.length 
    : 0;

  const getTopOffset = (startMin: number) => {
    return ((startMin - 9 * 60) / 60) * CELL_HEIGHT;
  }

  const getHeight = (startMin: number, endMin: number) => {
    return ((endMin - startMin) / 60) * CELL_HEIGHT;
  }

  const handleClassPress = (cls: ParsedClass) => {
      setSelectedClass(cls);
      setModalVisible(true);
  };

  const handleOpenMap = (buildingName: string) => {
      setModalVisible(false);
      if (!buildingName) {
          Alert.alert("알림", "위치 정보가 없습니다.");
          return;
      }
      navigation.navigate('Home', { searchQuery: buildingName });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{titleText}</Text>
        
        {isLoading ? (
            <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={{ marginTop: 10, color: '#555' }}>불러오는 중...</Text>
            </View>
        ) : (
            <View 
                style={styles.table}
                onLayout={(e: LayoutChangeEvent) => setTimetableWidth(e.nativeEvent.layout.width)}
            >
              {/* 헤더 */}
              <View style={styles.headerRow}>
                <View style={[styles.headerCell, { width: TIME_COL_WIDTH }]}>
                  <Text style={styles.headerText}>시간</Text>
                </View>
                {DAYS.map((day) => (
                  <View key={day} style={[styles.headerCell, { width: columnWidth }]}>
                    <Text style={styles.headerText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* 바디 */}
              <View style={{ position: 'relative' }}>
                {dynamicHours.map((hour) => (
                    <View key={hour} style={styles.row}>
                        <View style={[styles.cell, { width: TIME_COL_WIDTH, backgroundColor: '#F9FAFB' }]}>
                            <Text style={styles.timeText}>{hour}</Text>
                        </View>
                        {DAYS.map((day) => (
                            <View key={day + hour} style={[styles.cell, { width: columnWidth }]} />
                        ))}
                    </View>
                ))}

                {/* 강의 블록 */}
                {timetableWidth > 0 && parsedClasses.map((cls, index) => {
                    const dayIndex = DAYS.indexOf(cls.day as Day);
                    if (dayIndex === -1) return null;

                    const top = getTopOffset(cls.startMin);
                    const height = getHeight(cls.startMin, cls.endMin);
                    const left = TIME_COL_WIDTH + (dayIndex * columnWidth);

                    return (
                        <TouchableOpacity
                            key={`${cls.id}-${index}`}
                            style={[
                                styles.absoluteBlock,
                                {
                                    top: top + 1, 
                                    left: left + 1,
                                    width: columnWidth - 2,
                                    height: height - 2,
                                    backgroundColor: getBlockColor(cls.id) 
                                }
                            ]}
                            onPress={() => handleClassPress(cls)}
                        >
                            <Text style={styles.blockName} numberOfLines={1}>{cls.name}</Text>
                            <Text style={styles.blockLoc} numberOfLines={1}>
                                {getBuildingName(cls.location)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
              </View>
            </View>
        )}
        
        {/* 내 시간표일 때만 버튼 표시 */}
        {!friendId && (
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('TimetableEdit')}>
              <Text style={styles.addText}>강의 추가하기</Text>
            </TouchableOpacity>
        )}
      </ScrollView>

      {/* 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedClass?.name}</Text>
                
                <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>교수님</Text>
                    <Text style={styles.modalValue}>{selectedClass?.professor}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>시간</Text>
                    <Text style={styles.modalValue}>{selectedClass?.timeString}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>장소</Text>
                    <Text style={styles.modalValue}>{selectedClass?.location}</Text>
                </View>

                <TouchableOpacity 
                    style={styles.mapButton}
                    onPress={() => {
                        const building = getBuildingName(selectedClass?.location || '');
                        handleOpenMap(building);
                    }}
                >
                    <Text style={styles.mapButtonText}>📍 학교 지도에서 확인하기</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.closeButtonText}>닫기</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
};

export default TimetableScreen;

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 50, paddingBottom: 100 },   
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#DDD', marginTop: 10 },
  headerRow: { flexDirection: 'row', backgroundColor: '#E5E7EB' },
  headerCell: { height: 40, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#DDD' },
  headerText: { textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  
  row: { flexDirection: 'row' },
  cell: { height: CELL_HEIGHT, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#555', textAlign: 'center' },

  absoluteBlock: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      padding: 2,
      opacity: 0.9,
      zIndex: 10,
  },
  blockName: { fontSize: 11, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  blockLoc: { fontSize: 9, color: '#555', textAlign: 'center' },

  addButton: { marginTop: 30, alignSelf: 'center', padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#DDD', width: '100%', alignItems: 'center' },
  addText: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  modalInfoRow: { flexDirection: 'row', width: '100%', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 5 },
  modalLabel: { width: 60, fontWeight: 'bold', color: '#666' },
  modalValue: { flex: 1, color: '#333' },
  mapButton: { marginTop: 20, backgroundColor: '#6D6DFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, width: '100%', alignItems: 'center' },
  mapButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  closeButton: { marginTop: 10, paddingVertical: 10 },
  closeButtonText: { color: '#999', fontWeight: '600' }
});