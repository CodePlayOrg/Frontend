import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigations/AppNavigator';
//import CustomButton from '../components/CustomButton';

type StartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Start'>;

const StartScreen: React.FC = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <Button title="이미 계정이 있어요" onPress={() => navigation.navigate('Login')} />
      <Button title="계정을 만들래요" onPress={() => navigation.navigate('Signup')} />
    </View>
  );
};

export default StartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
});
