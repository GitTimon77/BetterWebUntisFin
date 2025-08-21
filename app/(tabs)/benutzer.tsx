import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { RFPercentage } from "react-native-responsive-fontsize";
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type RootTabParamList = {
  index: {};
  benutzer: {};
  impressum: {};
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

  const navigation = useNavigation<NavigationProp>();

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

  const performLogout = async () => {
    await SecureStore.deleteItemAsync('Loginserver');
    await SecureStore.deleteItemAsync('Loginname');
    await SecureStore.deleteItemAsync('username');
    await SecureStore.deleteItemAsync('password');
    await SecureStore.deleteItemAsync('schoolYear');
    await SecureStore.deleteItemAsync('lastUpdate');
    navigation.navigate('index' as never); 
  };

  const handleLogout = () => {
    Alert.alert(
      "Abmelden bestätigen",
      "Möchten Sie sich wirklich abmelden?",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout }
      ]
    );
  };

  const goToImpressum = () => {
    navigation.navigate("impressum" as never); 
  };

  const insets = useSafeAreaInsets();

  return (
        <SafeAreaView style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
        <View style={styles.titleContainer}>
            <Text style={[styles.title, {color: isDarkMode ? "#fff" : "#000"}]}>Benutzer</Text>
        </View>
        <View style={[styles.content, { backgroundColor: isDarkMode ? "#3c3b77ff" : "#2023e46a" }]}>
            {user ? (
            <Text style={styles.userText}>
                <Text style={styles.userTextFirst}>Eingeloggt als: </Text>{user.toLocaleUpperCase()}</Text>
            ) : (
            <Text style={styles.userText}>Benutzer nicht verfügbar</Text>
            )}
            {schoolYear ? (
            <Text style={styles.userText}><Text style={styles.userTextFirst}>Aktuelles Schuljahr: </Text>{schoolYear}</Text>
            ) : (
            <Text style={styles.userText}>Kein aktives Schuljahr</Text>
            )}
            {lastImportTime ? (
            <Text style={styles.userText}><Text style={styles.userTextFirst}>Letzter Import: </Text>{lastImportTime}</Text>
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
        </SafeAreaView>
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
    paddingTop: 50,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
  },
  title: {
    fontSize: RFPercentage(3.5),
    fontWeight: "bold",
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
    fontSize: RFPercentage(3),
    paddingBottom: 10,
    marginBottom: 10,
  },
  userTextFirst: {
    fontWeight: "bold",
  },
  impressumBtn: {
    backgroundColor: "#888",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  impressumText: {
    color: "#fff",
    fontSize: RFPercentage(2.5),
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
    fontSize: RFPercentage(2.5),
    fontWeight: "bold",
  },
});

export default Benutzer;
