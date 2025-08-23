import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';

type RootTabParamList = {
  '(tabs)': {};
  stundenplan: {};
  impressum: {};
  login: {};
  index: {};
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'login'>;
type LoginScreenRouteProp = RouteProp<RootTabParamList, 'login'>;

let globalSessionId = '';

const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    maxRedirects: 0,
    withCredentials: true,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    validateStatus: (status) => status >= 200 && status < 303,
  });

  instance.interceptors.request.use(request => {
    if (globalSessionId) {
      request.headers['Cookie'] = `JSESSIONID=${globalSessionId}`;
    }
    return request;
  });

  instance.interceptors.response.use(response => {
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const jsessionidMatch = setCookie.find(cookie => cookie.startsWith('JSESSIONID='));
      if (jsessionidMatch) {
        globalSessionId = jsessionidMatch.split(';')[0].split('=')[1];
      }
    }
    return response;
  });

  return instance;
};

const LoginScreen: React.FC = () => {
  const route = useRoute<LoginScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const handleLogin = async () => {
    const school = await getData('Loginname');
    const server = await getData('Loginserver');
    const axiosInstance = createAxiosInstance(`https://${server}`);
    if (!username || !password || !school || !server) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus.');
      return;
    }

    setIsLoading(true);

    try {
      const loginResponse = await axiosInstance({
        method: "POST",
        url: `/WebUntis/jsonrpc.do`,
        params: { school },
        data: {
          id: "1",
          method: "authenticate",
          params: {
            user: username,
            password: password,
            client: "1"
          },
          jsonrpc: "2.0"
        }
      });

      const loginData = loginResponse.data;
      
      if (loginData.result && loginData.result.sessionId) {
        await handleLogout();
        
        saveData("username", username);
        saveData("password", password);
        navigation.navigate("(tabs)", {});
      } else {
        Alert.alert('Fehler', 'Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  async function saveData(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Fehler beim Speichern der Daten', error);
    }
  }

  async function getData(key: string) {
    try {
      const result = await SecureStore.getItemAsync(key);
      if (result) {
        return result;
      } else {
        console.log('Kein Wert für diesen Schlüssel gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Daten', error);
    }
  }

  const handleLogout = async () => {
    try {
      const school = await getData('Loginname');
      const server = await getData('Loginserver');
      const axiosInstance = createAxiosInstance(`https://${server}`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const data = await axiosInstance({
        method: "POST",
        url: `/WebUntis/jsonrpc.do`,
        params: { school },
        data: {
          id: "2",
          method: "logout",
          params: {},
          jsonrpc: "2.0"
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollViewContent, { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#121212' }]}>Login für WebUntis</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? '#222' : '#ffffff',
                  borderColor: isDarkMode ? '#555' : '#cccccc',
                  color: isDarkMode ? '#fff' : '#000'
                }
              ]}
              placeholder="Benutzername"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? '#222' : '#ffffff',
                  borderColor: isDarkMode ? '#555' : '#cccccc',
                  color: isDarkMode ? '#fff' : '#000'
                }
              ]}
              placeholder="Passwort"
              placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: isDarkMode ? '#0a84ff' : '#007AFF' }
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Einloggen</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
