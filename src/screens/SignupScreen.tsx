import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/AppNavigator';

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

type Props = {
  navigation: SignupScreenNavigationProp;
};

type FormData = {
  name: string;
  studentId: string;
  id: string;
  password: string;
  confirm: string;
};

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [form, setForm] = useState<FormData>({
    name: '',
    studentId: '',
    id: '',
    password: '',
    confirm: '',
  });

  const handleChange = (key: keyof FormData, value: string) => {
    setForm({ ...form, [key]: value });
  };

  return (
    <View style={styles.container}>
      {[
        { label: '이름', key: 'name' },
        { label: '학번', key: 'studentId' },
        { label: '아이디', key: 'id' },
        { label: '비밀번호', key: 'password', secure: true },
        { label: '비밀번호 확인', key: 'confirm', secure: true },
      ].map((item) => (
        <View key={item.key} style={styles.inputGroup}>
          <Text style={styles.label}>{item.label}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry={item.secure}
            onChangeText={(text) => handleChange(item.key as keyof FormData, text)}
            value={form[item.key as keyof FormData]}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>만들기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, backgroundColor: 'white', justifyContent: 'center' },
  inputGroup: { marginBottom: 15 },
  label: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  input: {
    backgroundColor: '#d9d9d9',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  button: {
    backgroundColor: '#5E8BFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});

export default SignupScreen;
