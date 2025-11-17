import React from 'react';
import { TimetableProvider } from './src/context/TimetableContext';
import AppNavigator from './src/navigations/AppNavigator';

const App = () => {
  return(
  <TimetableProvider>
    <AppNavigator />
  </TimetableProvider>);
};

export default App;
