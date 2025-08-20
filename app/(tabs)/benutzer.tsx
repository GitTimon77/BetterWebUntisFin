import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from "@react-navigation/native"; // Navigation Hook importieren
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootTabParamList = {
  index: {};
  benutzer: {};
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'benutzer'>;

async function getData(key: string) {
  try {
    const result = await SecureStore.getItemAsync(key);
    if (result) {
      return result;
    } else {
      console.log("Kein Wert für diesen Schlüssel gefunden");
    }
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten", error);
  }
}

const Benutzer: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [user, setUser] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState<string | null>(null);    
  const [lastImportTime, setLastImportTime] = useState<string | null>(null);

  const navigation = useNavigation();

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = await getData("username"); 
      if (savedUser) {
        setUser(savedUser);
      }
    };
    const loadSchoolYear = async () => {
      const schoolYear = await getData("schoolYear");
        if (schoolYear) {
            setSchoolYear(schoolYear);
        } 
    }
    const loadLastImportTime = async () => {
      const lastImportTime = await getData("lastUpdate");
        if (lastImportTime) {
            setLastImportTime(lastImportTime);
        }
    }
    loadLastImportTime();
    loadSchoolYear();
    loadUser();
  }, []);

  const handleLogout = () => {
    SecureStore.deleteItemAsync('Loginserver');
    SecureStore.deleteItemAsync('Loginname');
    SecureStore.deleteItemAsync('username');
    SecureStore.deleteItemAsync('password');
    navigation.navigate('index' as never); 
  };

  const goToImpressum = () => {
    navigation.navigate("impressum" as never); 
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[{paddingTop: 0, paddingBottom: 0, flex: 1}, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
        <View style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
        <View style={styles.titleContainer}>
            <Text style={styles.title}>Benutzer</Text>
        </View>
        <View style={styles.content}>
            {user ? (
            <Text style={styles.userText}>Eingeloggt als: {user}</Text>
            ) : (
            <Text style={styles.userText}>Benutzer nicht verfügbar</Text>
            )}
            {schoolYear ? (
            <Text style={styles.userText}>Aktuelles Schuljahr: {schoolYear}</Text>
            ) : (
            <Text style={styles.userText}>Kein aktives Schuljahr</Text>
            )}
            {lastImportTime ? (
            <Text style={styles.userText}>Letzter Import: {lastImportTime}</Text>
            ) : (
            <Text style={styles.userText}>Letzter Import nicht verfügbar</Text>
            )}
        </View>

        <TouchableOpacity style={styles.impressumBtn} onPress={goToImpressum}>
            <Text style={styles.impressumText}>Impressum</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        </View>
    </View> 
  );
};

const styles = StyleSheet.create({
  darkBackground: {
    backgroundColor: "#121212",
  },
  lightBackground: {
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    padding: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    margin:20,
  },
  content: {
    backgroundColor: "#2023e46a",
    borderRadius: 10,
    flex: 1, 
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 10,
    marginBottom: 20,
  },
  userText: {
    fontSize: 18,
    paddingBottom: 10,
  },
  impressumBtn: {
    backgroundColor: "#888", // grau
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  impressumText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "#b91414ff",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  logoutText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default Benutzer;
