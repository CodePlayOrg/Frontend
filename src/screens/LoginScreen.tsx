import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/AppNavigator';
import axios, { AxiosError } from 'axios'; // ⭐️ Axios import
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

// **API Endpoint는 실제 백엔드 주소로 변경해야 합니다.**
const LOGIN_API_URL = 'http://3.34.70.142:3001/users/login'; 

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!id || !password) {
      Alert.alert('오류', '아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(LOGIN_API_URL, {
        username: id, 
        password: password,
      });

      if (response.status === 200) {
        // 백엔드가 JWT 토큰이나 사용자 정보를 반환했다면 여기서 저장합니다.
        const { token } = response.data; // data는 response.json() 또는 response.data 입니다.

        await AsyncStorage.setItem('userToken', token);
// 토큰을 'userToken'이라는 키로 AsyncStorage에 저장합니다.
        console.log('로그인 성공:', response.data); 
        
        // ⭐️ 홈 화면으로 이동 (스택을 초기화하며 이동하는 것이 일반적)
        // 'Home' 대신 실제 홈 화면의 라우트 이름을 사용하세요.
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }], 
        });
        
        // Alert.alert('성공', '로그인에 성공했습니다.'); // 성공 알림은 생략할 수 있습니다.
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      
      let errorMessage = '알 수 없는 오류가 발생했습니다.';

      if (axiosError.response) {
        // ⭐️ responseData 타입을 더 광범위하게 지정합니다. 
        // string | object | undefined 등 여러 가능성을 포괄하기 위함입니다.
        const responseData: unknown = axiosError.response.data; 
        
        // 1. responseData가 문자열인지 안전하게 확인합니다.
        if (typeof responseData === 'string' && responseData.length > 0) {
            errorMessage = responseData;
        } 
        // 2. responseData가 객체인지 안전하게 확인합니다.
        else if (typeof responseData === 'object' && responseData !== null) {
            // 객체임을 확인했으므로, 필드에 접근할 수 있도록 타입 단언을 사용합니다.
            const data = responseData as { [key: string]: any }; 

            // 안전한 필드 접근 및 폴백 (?? 연산자 사용)
            errorMessage = data.message 
                           ?? data.error 
                           ?? data.detail  
                           ?? '아이디 또는 비밀번호가 일치하지 않습니다.';
            
        } else {
            // 응답 본문이 비어있거나 예상치 못한 형식인 경우 (null, undefined 등)
            errorMessage = `로그인 요청에 실패했습니다. (상태 코드: ${axiosError.response.status})`;
        }
        
      } else if (axiosError.request) {
        // 요청은 보냈으나 응답을 받지 못한 경우 (네트워크 오류 등)
        errorMessage = '네트워크 연결 상태를 확인해주세요.';
      } 
      
      Alert.alert('로그인 실패', errorMessage);
      console.error('로그인 에러:', axiosError);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>아이디</Text>
        <TextInput 
          style={styles.input} 
          value={id} 
          onChangeText={setId} 
          autoCapitalize="none" // 대문자 자동 변환 방지
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>비밀번호</Text>
        <TextInput 
          style={styles.input} 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin} // Axios 호출 함수 연결
        disabled={isLoading} 
      >
        <Text style={styles.buttonText}>{isLoading ? '로그인 중...' : '로그인'}</Text>
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