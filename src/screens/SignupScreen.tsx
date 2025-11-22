import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native'; // Alert import
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/AppNavigator';
import axios, { AxiosError } from 'axios'; // ⭐️ Axios import

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

type Props = {
  navigation: SignupScreenNavigationProp;
};

type FormData = {
  name: string;
  studentId: string;
  id: string; // 사용할 아이디
  password: string;
  confirm: string; // 비밀번호 확인
};

// **API Endpoint는 실제 백엔드 회원가입 주소로 변경해야 합니다.**
const SIGNUP_API_URL = 'http://3.34.70.142:3001/users/register'; 

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [form, setForm] = useState<FormData>({
    name: '',
    studentId: '',
    id: '',
    password: '',
    confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  const handleChange = (key: keyof FormData, value: string) => {
    const trimmedValue = value.trim(); 
    setForm({ ...form, [key]: trimmedValue });
  };

  /**
   * ⭐️ 회원가입 처리 함수
   */
  const handleSignup = async () => {
    const { name, studentId, id, password, confirm } = form;

    // 1. 유효성 검사
    if (!name || !studentId || !id || !password || !confirm) {
      Alert.alert('필수 입력', '모든 필드를 입력해 주세요.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('비밀번호 불일치', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // ⭐️ Axios POST 요청
      const response = await axios.post(SIGNUP_API_URL, {
        // 백엔드에서 요구하는 필드명에 맞춰 데이터를 전송합니다.
        name,
        studentId,
        username: id, // 백엔드 필드명에 맞게 key 변경 (ex: username, userId 등)
        password,
        confirmPassword: confirm,
      });

      // HTTP 상태 코드가 2xx (성공)일 때 실행
      console.log('회원가입 성공:', response.data);
      
      // ⭐️ 성공 시 로그인 화면으로 이동
      Alert.alert('회원가입 성공', '회원가입이 완료되었습니다. 로그인 해주세요.');
      navigation.navigate('Login');

    } catch (error) {
      // ⭐️ 안전한 에러 처리 로직 (이전 답변에서 개선된 로직 적용)
      const axiosError = error as AxiosError;
      let errorMessage = '알 수 없는 오류가 발생했습니다.';

      if (axiosError.response) {
        const responseData: unknown = axiosError.response.data; 

        if (typeof responseData === 'string' && responseData.length > 0) {
            errorMessage = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
            const data = responseData as { [key: string]: any }; 
            errorMessage = data.message 
                           ?? data.error    
                           ?? data.detail  
                           ?? '이미 사용 중인 아이디 또는 학번입니다.'; // 회원가입 에러 메시지 예시
        } else {
            errorMessage = `회원가입 요청에 실패했습니다. (상태 코드: ${axiosError.response?.status || '알 수 없음'})`;
        }
        
      } else if (axiosError.request) {
        errorMessage = '네트워크 연결 상태를 확인해주세요.';
      } 
      
      Alert.alert('회원가입 실패', errorMessage);
      console.error('회원가입 에러:', axiosError);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {[
        { label: '이름', key: 'name' },
        { label: '학번', key: 'studentId' },
        { label: '아이디', key: 'id', autoCapitalize: 'none' as const },
        { label: '비밀번호', key: 'password'},
        { label: '비밀번호 확인', key: 'confirm'},
      ].map((item) => (
        <View key={item.key} style={styles.inputGroup}>
          <Text style={styles.label}>{item.label}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry={false}
            onChangeText={(text) => handleChange(item.key as keyof FormData, text)}
            value={form[item.key as keyof FormData]}
            autoCapitalize={item.autoCapitalize || 'sentences'} // autoCapitalize 추가
          />
        </View>
      ))}

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSignup} // ⭐️ handleSignup 함수 연결
        disabled={isLoading} // 로딩 중 버튼 비활성화
      >
        <Text style={styles.buttonText}>{isLoading ? '가입 중...' : '만들기'}</Text>
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