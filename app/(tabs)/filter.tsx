import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckBox } from 'react-native-elements';

type RootTabParamList = {
  Stundenplan: {};
  Filter: {};
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'Filter'>;

interface FetchTimetableParams {
  school: string;         
  username: string;        
  password: string;       
  axiosInstance: any;       
}

interface Lesson {
  id: number;
  date: number;
  startTime: number;
  endTime: number;
  kl: Array<{ id: number; name: string; longname: string }>;
  te: Array<{ id: number; name: string; longname: string; orgid?: number; orgname?: string }>;
  su: Array<{ id: number; name: string; longname: string }>;
  ro: Array<{ id: number; name: string; longname?: string }>;
  code?: string;
  lstype?: string;
  info?: string;
  substText: string;
  lstext: string;
  lsnumber: number;
  startflags: string;
  activityType: string;
  sg: string;
  bkRemark?: string;
  bkText?: string;
}

interface Course {
  subjectId: number;
  teacherId: number;
  subject: string;
  teacher: string;
}

let globalSessionId = '';
let globalUsername: string;

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

const Filter: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [timetable, setTimetable] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markedCourses, setMarkedCourses] = useState<string[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<number>(getPreviousMonday());

  useEffect(() => {
    const fetchDataBeforeTimetable = async () => {
      try {
        setLoading(true);
        const [loginserver, school, username, password] = await Promise.all([
          getData('Loginserver'),
          getData('Loginname'),
          getData('username'),
          getData('password')
        ]);

        if (!loginserver || !school || !username || !password) {
          setError('Daten konnten nicht abgerufen werden. Bitte überprüfen Sie die gespeicherten Werte.');
          return;
        }
        globalUsername = username;

        const axiosInstance = createAxiosInstance(`https://${loginserver}`);
        await fetchTimetable({ school, username, password, axiosInstance });
        
        // Laden der markierten Kurse
        const savedMarkedCourses = await AsyncStorage.getItem(`markedCourses${username}`);
        if (savedMarkedCourses) {  
          setMarkedCourses(JSON.parse(savedMarkedCourses));
        }
      } catch (error) {
        setError('Fehler beim Laden der Daten.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataBeforeTimetable();
  }, [currentWeekStart]);

  async function getData(key: string) {
    try {
      const result = await SecureStore.getItemAsync(key);
      if (result) {
        console.log('Gespeicherter Wert:', result);
        return result;
      } else {
        console.log('Kein Wert für diesen Schlüssel gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Daten', error);
    }
  }

  function getPreviousMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceLastMonday = (dayOfWeek + 6) % 7 + 14;
    const previousMonday = new Date(today);
    previousMonday.setDate(today.getDate() - daysSinceLastMonday);
    const year = previousMonday.getFullYear();
    const month = String(previousMonday.getMonth() + 1).padStart(2, '0');
    const day = String(previousMonday.getDate()).padStart(2, '0');
    return parseInt(`${year}${month}${day}`);
  }

  function getNextNextFriday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilNextFriday);
    nextFriday.setDate(nextFriday.getDate() + 14);
    const year = nextFriday.getFullYear();
    const month = String(nextFriday.getMonth() + 1).padStart(2, '0');
    const day = String(nextFriday.getDate()).padStart(2, '0');
    return parseInt(`${year}${month}${day}`);
  }

  const fetchTimetable = async ({ school, username, password, axiosInstance }: FetchTimetableParams) => {
    try {
      const loginResponse = await axiosInstance({
        method: "POST",
        url: `/WebUntis/jsonrpc.do`,
        params: { school },
        data: {
          id: "1",
          method: "authenticate",
          params: { user: username, password, client: "1" },
          jsonrpc: "2.0"
        }
      });

      const loginData = loginResponse.data;
      if (loginData.result && loginData.result.sessionId) {
        const UserInfos = loginData.result;
        const timetableResponse = await axiosInstance({
          method: "POST",
          url: `/WebUntis/jsonrpc.do`,
          params: { school },
          data: {
            id: "2",
            method: "getTimetable",
            params: {
              options: {
                element: { id: UserInfos.personId, type: UserInfos.personType },
                startDate: getPreviousMonday(),
                endDate: getNextNextFriday(),
                onlyBaseTimetable: true,
                "teacherFields": ["id", "name", "longname", "externalkey"],
                "roomFields": ["id", "name", "longname", "externalkey"],
                "subjectFields": ["id", "name", "longname", "externalkey"],
                "klasseFields": ["id", "name", "longname", "externalkey"]
              }
            },
            jsonrpc: "2.0"
          }
        });

        const timetableData = timetableResponse.data.result.filter((lesson: { su: any[]; te: any[]; }) => {
          return lesson.su.some(subject => !lesson.te.map(teacher => teacher.name).includes(subject.name)) ||
                 lesson.te.some(teacher => !lesson.su.map(subject => subject.name).includes(teacher.name));
        });

        setTimetable(timetableData);

        await axiosInstance({
          method: "POST",
          url: `/WebUntis/jsonrpc.do`,
          params: { school },
          data: {
            id: "3",
            method: "logout",
            params: {},
            jsonrpc: "2.0"
          }
        });
      } else {
        setError('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
      }
    } catch (error) {
      setError('Fehler beim Abrufen des Stundenplans.');
      console.error('Fehler beim Abrufen des Stundenplans:', error);
    }
  };

  const uniqueCourses = useMemo(() => {
    const coursesMap = new Map<string, Course>();

    timetable.forEach(lesson => {
      lesson.su.forEach(subject => {
        lesson.te.forEach(teacher => {
          const key = `${subject.id}-${teacher.id}`;
          if (!coursesMap.has(key)) {
            coursesMap.set(key, {
              subjectId: subject.id,
              teacherId: teacher.id,
              subject: subject.name,
              teacher: teacher.name
            });
          }
        });
      });
    });

    return Array.from(coursesMap.values());
  }, [timetable]);

  const toggleCourseSelection = async (subjectId: number, teacherId: number) => {
    const courseKey = `${subjectId}-${teacherId}`;
    setMarkedCourses(prevMarked => {
      const newMarked = prevMarked.includes(courseKey)
        ? prevMarked.filter(key => key !== courseKey)
        : [...prevMarked, courseKey];
      
      // Speichern in AsyncStorage
      AsyncStorage.setItem(`markedCourses${globalUsername}`, JSON.stringify(newMarked));      
      return newMarked;
    });
  };

  function BackToTimetable() {
    navigation.navigate('Stundenplan', {});
  }

  if (loading) return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );  
  if (error) return <Text style={styles.errorText}>{error}</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.arrowContainer}>
          <TouchableOpacity onPress={BackToTimetable} style={styles.arrowButton}>
            <Ionicons name="chevron-back" size={24} color="black" />
            <Text style={styles.backText}>Zurück</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Filter</Text>
        </View>
        <View style={styles.placeholderContainer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.lessonsContainer}>
          {uniqueCourses.map((course, index) => (
            <View key={index} style={styles.lessonRow}>
              <CheckBox
                checked={markedCourses.includes(`${course.subjectId}-${course.teacherId}`)}
                onPress={() => toggleCourseSelection(course.subjectId, course.teacherId)}
              />
              <Text style={styles.lessonText}>
                {`${course.subject}, Teacher: ${course.teacher}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 50,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 2,
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
  },
  arrowContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  arrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  lessonsContainer: {
    alignItems: 'center',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  lessonText: {
    fontSize: 15
  },
  substitutedText: {
    color: '#cc0000',
    fontWeight: 'bold',
    fontSize: 10,
    marginTop: 2
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center'
  }
});

export default Filter;
