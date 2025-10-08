import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SignupScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>회원가입 화면</Text>
    </View>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 22, fontWeight: '600' },
});
