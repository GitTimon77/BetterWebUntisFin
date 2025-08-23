import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';

type RootTabParamList = {
  stundenplan: {};
  impressum: {};
  login: {};
  index: {};
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'index'>;
type LoginScreenRouteProp = RouteProp<RootTabParamList, 'index'>;

const SchoolQuery: React.FC<{ route: any }> = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const route = useRoute<LoginScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [schools, setSchools] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      fetchSchools(searchTerm);
    } else {
      setSchools([]);
    }
  }, [searchTerm]);

  const fetchSchools = async (query: string) => {
    try {
      const response = await fetch('https://mobile.webuntis.com/ms/schoolquery2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          id: 'wu.schulsuche-1726509083569',
          jsonrpc: '2.0',
          method: 'searchSchool',
          params: [{ search: query }],
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Schulen');
      }

      const data = await response.json();
      setSchools(data.result.schools || []);
      setError(null);
    } catch (err) {
      setError('Fehler beim Abrufen der Daten.');
    }
  };

  // Entscheide, ob mittig oder oben NUR anhand der Query
  const isCentered = searchTerm.length <= 2;

  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[
          styles.content,
          isCentered ? styles.centeredContent : styles.topContent
        ]}>
          <View style={styles.innerContent}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: isDarkMode ? "#fff" : "#121212" }]}>Schule suchen</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDarkMode ? "#222" : "#fff",
                    color: isDarkMode ? "#fff" : "#121212",
                    borderColor: isDarkMode ? "#444" : "gray"
                  }
                ]}
                value={searchTerm}
                onChangeText={(text) => setSearchTerm(text)}
                placeholder="Schule suchen..."
                placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
              />
            </View>
            {error && !isCentered &&
              <Text style={[styles.errorText, { color: isDarkMode ? "#ff7373" : "red" }]}>{error}</Text>
            }
            <FlatList
              data={schools}
              keyExtractor={(item) => item.loginName.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    saveData("Loginname", item.loginName);
                    saveData("Loginserver", item.server);
                    navigation.navigate('login', {});
                  }}
                  style={[
                    styles.schoolItem,
                    { backgroundColor: isDarkMode ? "#121212" : "#ffffff" }
                  ]}
                >
                  <Text style={{ color: isDarkMode ? "#e0e0e0" : "#232323" }}>{item.displayName}</Text>
                  <Text style={{ color: isDarkMode ? "#e0e0e0" : "#232323" }}>{item.address}</Text>
                </TouchableOpacity>
              )}
              style={styles.flatList}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  darkBackground: {
    backgroundColor: "#121212",
  },
  lightBackground: {
    backgroundColor: "#ffffff",
  },
  header: {
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centeredContent: {
    justifyContent: 'center',
  },
  topContent: {
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  innerContent: {
    width: '100%',
    maxHeight: height - 220,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 8,
    width: '100%',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  schoolItem: {
    paddingVertical: 10,
    width: '100%',
  },
  flatList: {
    width: '100%',
  },
});


async function saveData(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Fehler beim Speichern der Daten', error);
  }
}

export default SchoolQuery;
