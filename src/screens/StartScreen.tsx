import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/AppNavigator';

type StartScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Start'>;

type Props = {
  navigation: StartScreenNavigationProp;
};

const StartScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Image
        //source={require('../../assets/start-image.png')} // 이미지 경로 수정 필요
        //style={styles.image}
      />

      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>이미 계정이 있어요</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signupButton}
        onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.signupText}>계정을 만들래요</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  image: { width: 250, height: 250, marginBottom: 60, resizeMode: 'contain' },
  loginButton: {
    backgroundColor: '#5E8BFF',
    width: '80%',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  signupButton: {
    backgroundColor: '#d9d9d9',
    width: '80%',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  loginText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  signupText: { color: '#111', fontWeight: 'bold', fontSize: 18 },
});

export default StartScreen;
