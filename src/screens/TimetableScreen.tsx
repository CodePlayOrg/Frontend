import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTimetable, Day } from '../context/TimetableContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';

const DAYS: Day[] = ['월', '화', '수', '목', '금'];
const TIME_COL_WIDTH = 40; 

const PERIOD_TO_MINUTE: Record<string, number> = {
  "1A": 9 * 60 + 0, "1B": 9 * 60 + 30, "2A": 10 * 60 + 0, "2B": 10 * 60 + 30,
  "3A": 11 * 60 + 0, "3B": 11 * 60 + 30, "4A": 12 * 60 + 0, "4B": 12 * 60 + 30,
  "5A": 13 * 60 + 0, "5B": 13 * 60 + 30, "6A": 14 * 60 + 0, "6B": 14 * 60 + 30,
  "7A": 15 * 60 + 0, "7B": 15 * 60 + 30, "8A": 16 * 60 + 0, "8B": 16 * 60 + 30,
  "9A": 17 * 60 + 0, "9B": 17 * 60 + 30, "10A": 18 * 60 + 0, "10B": 18 * 60 + 25,
  "11A": 18 * 60 + 55, "11B": 19 * 60 + 20, "12A": 19 * 60 + 50, "12B": 20 * 60 + 15,
  "13A": 20 * 60 + 45, "13B": 21 * 60 + 10, "14A": 21 * 60 + 40, "14B": 22 * 60 + 5,
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TimetableEdit'>;

interface ParsedClass {
  name: string;
  day: string;
  startMin: number;
  endMin: number;
}

const parseClasses = (classes: any[]): ParsedClass[] => {
  const parsed: ParsedClass[] = [];
  classes.forEach(cls => {
    // number 또는 id 확인
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
        if (startMin !== undefined) {
          parsed.push({ name: cls.name, day, startMin, endMin });
        }
      }
    }
  });
  return parsed;
};

const TimetableScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { classes } = useTimetable();
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>내 시간표</Text>
      
      <View style={styles.table}>
        <View style={styles.row}>
          <View style={[styles.headerCell, { width: TIME_COL_WIDTH }]}>
            <Text style={styles.headerText}>시간</Text>
          </View>
          {DAYS.map((day) => (
            <View key={day} style={[styles.headerCell, styles.flexCell]}>
              <Text style={styles.headerText}>{day}</Text>
            </View>
          ))}
        </View>

        {dynamicHours.map((hour) => {
           const rowStartMin = hour * 60;
           const rowEndMin = (hour + 1) * 60;
           return (
            <View key={hour} style={styles.row}>
              <View style={[styles.cell, { width: TIME_COL_WIDTH, backgroundColor: '#F9FAFB' }]}>
                <Text style={styles.timeText}>{hour}</Text>
              </View>
              {DAYS.map((day) => {
                const foundClass = parsedClasses.find(
                  (c) => c.day === day && 
                         (c.startMin < rowEndMin && c.endMin > rowStartMin)
                );
                return (
                  <View key={day + hour} style={[styles.cell, styles.flexCell, foundClass ? styles.activeCell : null]}>
                    {foundClass && (
                      <Text style={styles.classText} numberOfLines={2}>{foundClass.name}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('TimetableEdit')}>
        <Text style={styles.addText}>강의 추가하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default TimetableScreen;

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 50, paddingBottom: 100, backgroundColor: '#fff' },   
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#DDD', marginTop: 10 },
  row: { flexDirection: 'row' },
  headerCell: { height: 40, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#DDD' },
  cell: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#DDD' },
  flexCell: { flex: 1 }, 
  headerText: { textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  timeText: { fontSize: 12, color: '#555' },
  activeCell: { backgroundColor: '#E0E7FF' },
  classText: { fontWeight: '700', color: '#1E3A8A', fontSize: 10, textAlign: 'center' },
  addButton: { marginTop: 30, alignSelf: 'center', padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#DDD', width: '100%', alignItems: 'center' },
  addText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});