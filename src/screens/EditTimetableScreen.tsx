import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTimetable } from '../context/TimetableContext';

// 시간표 시간대
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i);
const DAYS = ['월', '화', '수', '목', '금'];

const EditTimetableScreen: React.FC = () => {
  const navigation = useNavigation();
  const { classes, addClass, removeClass } = useTimetable();

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState(classes); // 기존 저장된 시간표 그대로

  //강의 검색
  const searchLectures = async (text: string) => {
    setSearchText(text);

    if (text.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      // 실제 백엔드 URL로 교체
      const res = await fetch(`https://YOUR_BACKEND_SERVER/lectures?query=${text}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.log('검색 오류: ', e);
    }
  };

  // 검색 결과 선택 시 시간표에 추가
  const handleSelectLecture = (lecture: any) => {
    // 이미 추가되어 있으면 무시
    if (selectedClasses.find((c) => c.id === lecture.id)) return;

    setSelectedClasses((prev) => [...prev, lecture]);
    addClass({
      id: lecture.id,
      name: lecture.name,
      day: lecture.day,
      start: lecture.start,
      end: lecture.end,
    });
  };

  // 저장 후 뒤로가기
  const handleSave = () => {
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>시간표 바꾸기</Text>

      {/* ===========================
          시간표 그리드
      ============================ */}
      <View style={styles.timetable}>
        {/* 요일 헤더 */}
        <View style={styles.row}>
          <View style={[styles.cell, styles.headerCell]} />
          {DAYS.map((day) => (
            <View key={day} style={[styles.cell, styles.headerCell]}>
              <Text style={styles.headerText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* 시간 + 수업칸 */}
        {HOURS.map((hour) => (
          <View key={hour} style={styles.row}>
            <View style={[styles.cell, styles.timeCell]}>
              <Text>{hour}</Text>
            </View>

            {DAYS.map((day) => {
              const lec = selectedClasses.find(
                (l) => l.day === day && l.start <= hour && l.end > hour
              );

              return (
                <TouchableOpacity
                  key={day + hour}
                  style={[styles.cell, styles.classCell, lec && { backgroundColor: '#60A5FA' }]}
                  onPress={() => {
                    if (lec) {
                      Alert.alert(
                        '강의 삭제',
                        `${lec.name}을(를) 삭제하시겠습니까?`,
                        [
                          { text: '취소', style: 'cancel' },
                          {
                            text: '삭제',
                            style: 'destructive',
                            onPress: () => {
                              removeClass(lec.id); // Context에서 삭제
                              setSelectedClasses((prev) =>
                                prev.filter((c) => c.id !== lec.id)
                              );
                            },
                          },
                        ]
                      );
                    }
                  }}
                >
                  {lec && <Text style={styles.classText}>{lec.name}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* ===========================
          검색창
      ============================ */}
      <Text style={styles.label}>강의 검색</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="강의명 또는 교수명을 입력하세요"
        value={searchText}
        onChangeText={searchLectures}
      />

      {/* ===========================
          검색 결과 리스트
      ============================ */}
      <View style={styles.list}>
        {searchResults.map((lecture) => (
          <TouchableOpacity
            key={lecture.id}
            style={styles.listItem}
            onPress={() => handleSelectLecture(lecture)}
          >
            <Text style={styles.listTitle}>{lecture.name}</Text>
            <Text style={styles.listSub}>
              {lecture.professor} · {lecture.day} {lecture.start}:00~{lecture.end}:00
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===========================
          저장 버튼
      ============================ */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>완료</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditTimetableScreen;

const styles = StyleSheet.create({
  container: {
    padding: 30,
    backgroundColor: '#fff',
  },
  title: {
    marginTop: 50,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  timetable: {
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
    backgroundColor: '#F3F4F6',
  },
  headerText: {
    fontWeight: 'bold',
  },
  timeCell: {
    backgroundColor: '#F9FAFB',
  },
  classCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  classText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  list: {
    marginTop: 12,
  },
  listItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  listTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  listSub: {
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 30,
  },
  saveText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
