import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/AppNavigator';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};


const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>아이디</Text>
        <TextInput style={styles.input} value={id} onChangeText={setId} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>비밀번호</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.buttonText}>로그인</Text>
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

export default LoginScreen;
