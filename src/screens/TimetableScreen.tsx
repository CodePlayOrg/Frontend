import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTimetable, Day } from '../context/TimetableContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations/AppNavigator';


const DAYS: Day[] = ['월', '화', '수', '목', '금'];
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 9~18시

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TimetableEdit'>;


const TimetableScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { classes } = useTimetable();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>내 시간표</Text>
      
      <View style={styles.table}>
        {/* 요일 헤더 */}
        <View style={styles.row}>
          <View style={[styles.cell, styles.headerCell]}>
            <Text style={styles.headerText}>시간</Text>
          </View>

          {DAYS.map((day) => (
            <View key={day} style={[styles.cell, styles.headerCell]}>
              <Text style={styles.headerText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* 시간 + 수업 */}
        {HOURS.map((hour) => (
          <View key={hour} style={styles.row}>
            {/* 왼쪽 시간 표시 */}
            <View style={[styles.cell, styles.timeCell]}>
              <Text>{hour}</Text>
            </View>

            {/* 요일 칸 */}
            {DAYS.map((day) => {
              const classItem = classes.find(
                (c) => c.day === day && c.start <= hour && c.end > hour
              );

              return (
                <View key={day + hour} style={[styles.cell, styles.classCell]}>
                  {classItem && (
                    <Text style={styles.classText}>{classItem.name}</Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <TouchableOpacity
    style={styles.addButton}
    onPress={() => navigation.navigate('TimetableEdit')}
  >
    <Text style={styles.addText}>강의 추가하기</Text>
  </TouchableOpacity>
    </ScrollView>
  );
};

export default TimetableScreen;

const styles = StyleSheet.create({
  container: {
    padding: 30,
    paddingBottom: 300, // 아래 공간 늘리기
    backgroundColor: '#fff',
    justifyContent: 'flex-end',
  },   
  title: {
    marginTop: 50,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: '#DDD',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
  },
  addButton: {
    marginTop: 20, // 시간표와 간격
    alignSelf: 'center', // 가운데 정렬
    padding: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  addText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 8,
    minHeight: 50, 
    justifyContent: 'center',
  },
  
  headerCell: {
    backgroundColor: '#E5E7EB',
  },
  headerText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  timeCell: {
    backgroundColor: '#F3F4F6',
  },
  classCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  classText: {
    fontWeight: '700',
    color: '#1E3A8A',
  },
});
