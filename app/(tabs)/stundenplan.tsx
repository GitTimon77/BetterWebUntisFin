import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import axios, { AxiosInstance } from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
//import DropdownMenu from './DropdownMenu';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

type RootTabParamList = {
  Stundenplan: {};
  Filter: {};
};

interface FetchTimetableParams {
  school: string;         
  username: string;        
  password: string;       
  axiosInstance: any;       
}

type TableScreenRouteProp = RouteProp<RootTabParamList, 'Stundenplan'>;

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
  type?: any;
}

interface TimeGrid {
  day: number;
  timeUnits: Array<{ endTime: number; name: string; startTime: number }>;
}

interface Holidays {
  endDate: number;
  startDate: number;
  id: number;
  longName: string;
  name: string;
}

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

const Stundenplan: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const route = useRoute<TableScreenRouteProp>();
  const [timetable, setTimetable] = useState<Lesson[]>([]);
  const [timeGrid, setTimeGrid] = useState<TimeGrid[]>([]);
  const [holidays, setHolidays] = useState<Holidays[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<number>(getCurrentMonday());
  const [markedCourses, setMarkedCourses] = useState<string[]>([]);

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

        const axiosInstance = createAxiosInstance(`https://${loginserver}`);
        await fetchTimetable({ school, username, password, axiosInstance });

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

  function getCurrentMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.getFullYear() * 10000 + (monday.getMonth() + 1) * 100 + monday.getDate();
  }

  function isHoliday(date: number): string | null {
    for (const holiday of holidays) {
      if (date >= holiday.startDate && date <= holiday.endDate) {
        return holiday.longName || holiday.name;
      }
    }
    return null;
  }

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prevDate => {
      const year = Math.floor(prevDate / 10000);
      const month = Math.floor((prevDate % 10000) / 100) - 1;
      const day = prevDate % 100;
      const date = new Date(Date.UTC(year, month, day));
      date.setUTCDate(date.getUTCDate() + (direction === 'next' ? 7 : -7));
      return parseInt(date.toISOString().slice(0, 10).replace(/-/g, ''), 10);
    });
  };

  function getFridayOfWeek(currentWeekStart: number) {
    const year = Math.floor(currentWeekStart / 10000);
    const month = Math.floor((currentWeekStart % 10000) / 100) - 1;
    const day = currentWeekStart % 100;
    const date = new Date(year, month, day);
    const daysUntilFriday = (5 - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + daysUntilFriday);
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
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

        const timeGridResponse = await axiosInstance({
          method: "POST",
          url: `/WebUntis/jsonrpc.do`,
          params: { school },
          data: {
            id: "3",
            method: "getTimegridUnits",
            params: {},
            jsonrpc: "2.0"
          }
        });

        const timeGridData = timeGridResponse.data;
        setTimeGrid(timeGridData.result);

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
                startDate: currentWeekStart,
                endDate: getFridayOfWeek(currentWeekStart),
                showInfo: true,
                showSubstText: true,
                showLsText: true,
                showLsNumber: true,
                showStudentgroup: true,
                showBooking: true,
                "teacherFields": ["id", "name", "longname", "externalkey"],
                "roomFields": ["id", "name", "longname", "externalkey"],
                "subjectFields": ["id", "name", "longname", "externalkey"],
                "klasseFields": ["id", "name", "longname", "externalkey"]
              }
            },
            jsonrpc: "2.0"
          }
        });

        const timetableData = timetableResponse.data;
        setTimetable(timetableData.result);

        const holidayresponse = await axiosInstance({
          method: "POST",
          url: `/WebUntis/jsonrpc.do`,
          params: { school },
          data: {
            id: "3",
            method: "getHolidays",
            jsonrpc: "2.0"
          }
        });

        const holidayData = holidayresponse.data;
        setHolidays(holidayData.result);

        await axiosInstance({
          method: "POST",
          url: `/WebUntis/jsonrpc.do`,
          params: { school },
          data: {
            id: "4",
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

  const formatTime = useCallback((time: number) => {
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const formatDate = useCallback((dateNumber: number) => {
    if (dateNumber <= 0) return 'Ungültiges Datum';
    const year = Math.floor(dateNumber / 10000);
    const month = Math.floor((dateNumber % 10000) / 100) - 1;
    const day = dateNumber % 100;
    const date = new Date(year, month, day);
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }, []);

  const { groupedTimetable, sortedDates } = useMemo(() => {
    if (!Array.isArray(timetable) || timetable.length === 0) {
      return { groupedTimetable: {}, sortedDates: [] };
    }

    let filtered = timetable;
    if (markedCourses.length > 0) {
      filtered = timetable.filter(lesson => {
        const courseKey = `${lesson.su[0]?.id}-${lesson.te[0]?.orgid || lesson.te[0]?.id}`;
        return markedCourses.includes(courseKey);
      });
    }

    const grouped = filtered.reduce((acc, lesson) => {
      const dateKey = lesson.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(lesson);
      return acc;
    }, {} as Record<number, Lesson[]>);

    Object.values(grouped).forEach(lessons => lessons.sort((a, b) => a.startTime - b.startTime));

    const sorted = Object.keys(grouped)
      .map(Number)
      .filter(date => date > 0)
      .sort((a, b) => a - b);

    return { groupedTimetable: grouped, sortedDates: sorted };
  }, [timetable, markedCourses]);

  const LessonCell: React.FC<{ lesson: Lesson }> = React.memo(({ lesson }) => {
    const isSubstitution = lesson.te[0]?.orgid != null;
    const isCancelled = lesson.code === 'cancelled';
    const isNormal = !isCancelled && !isSubstitution;

    return (
      <View style={[
        styles.lesson,
        isSubstitution && styles.substitutedLesson,
        isCancelled && styles.cancelledLesson,
        isNormal && (isDarkMode ? styles.normalLessonDark : styles.normalLessonLight)
      ]}>
        <Text style={isDarkMode ? styles.lessonTextDark : styles.lessonTextLight}>
          {lesson.su[0]?.name || <Text>Veranstaltung</Text>}
        </Text>
        <Text style={isDarkMode ? styles.lessonTextDark : styles.lessonTextLight}>
          {lesson.ro[0]?.name || lesson.kl[0]?.name}
        </Text>
        {lesson.te.map((teacher, index) => (
          <Text key={index} style={isDarkMode ? styles.lessonTextDark : styles.lessonTextLight}>
            {teacher.name || teacher.orgname}
            {isSubstitution && teacher.name && (
              <Text style={isDarkMode ? styles.lessonTextDark : styles.lessonTextLight}>
                {` (${teacher.orgname})`}
              </Text>
            )}
          </Text>
        ))}
        {isSubstitution && <Text style={styles.substitutedText}>Änderung</Text>}
        {isCancelled && <Text style={styles.substitutedText}>Entfällt</Text>}
        {lesson.lstext != null && (
          <Text style={isDarkMode ? styles.lessonTextDark : styles.lessonTextLight}>
            Lesson Text: {lesson.lstext}
          </Text>
        )}
      </View>
    );
  });

  if (loading) return (
    <View style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <ActivityIndicator size="large" color={isDarkMode ? "#ffffff" : "#0000ff"} />
    </View>
  );

  if (error) return <Text style={[styles.errorText, isDarkMode ? styles.textDark : styles.textLight]}>{error}</Text>;

  const daysArray = [];
const startDate = new Date(
  Math.floor(currentWeekStart / 10000),               
  Math.floor((currentWeekStart % 10000) / 100) - 1,   
  currentWeekStart % 100                              
);

const endDate = new Date(
  Math.floor(getFridayOfWeek(currentWeekStart) / 10000),                
  Math.floor((getFridayOfWeek(currentWeekStart) % 10000) / 100) - 1, 
  getFridayOfWeek(currentWeekStart) % 100                 
);

for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
  daysArray.push(
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  );
}


  console.log(daysArray);

  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => changeWeek('prev')} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? "white" : "black"} />
        </TouchableOpacity>
        <Text style={[styles.title, isDarkMode ? styles.textDark : styles.textLight]}>Stundenplan</Text>
        <TouchableOpacity onPress={() => changeWeek('next')} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={24} color={isDarkMode ? "white" : "black"} />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <ScrollView horizontal>
          <View>
            <View style={styles.headerRow}>
              <View style={[styles.timeCell, isDarkMode ? styles.cellDark : styles.cellLight]}>
                <Text style={[styles.headerText, isDarkMode ? styles.textDark : styles.textLight]}>Zeit</Text>
              </View>
              {daysArray.map(date => {
                const holidayName = isHoliday(date);
                return (
                  <View
                    key={date}
                    style={[
                      styles.dateCell,
                      isDarkMode ? styles.cellDark : styles.cellLight,
                      holidayName && styles.holidayCell
                    ]}
                  >
                    <Text style={[styles.headerText, isDarkMode ? styles.textDark : styles.textLight]}>
                      {formatDate(date)}
                    </Text>
                    {holidayName && (
                      <Text style={[styles.holidayText, isDarkMode ? styles.textDark : styles.textLight]}>
                        {holidayName}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            {timeGrid[0]?.timeUnits.map((timeUnit) => (
              <View key={`${timeUnit.startTime}-${timeUnit.endTime}`} style={styles.row}>
                <View style={[styles.timeCell, isDarkMode ? styles.cellDark : styles.cellLight]}>
                  <Text style={[styles.timeText, isDarkMode ? styles.textDark : styles.textLight]}>
                    {`${formatTime(timeUnit.startTime)} - ${formatTime(timeUnit.endTime)}`}
                  </Text>
                </View>
                {sortedDates.map(date => {
                  const lessons = groupedTimetable[date]?.filter(
                    l => (l.startTime >= timeUnit.startTime && l.startTime < timeUnit.endTime) ||
                         (l.startTime <= timeUnit.startTime && l.endTime >= timeUnit.endTime)
                  ) || [];
                  return (
                    <View key={`${date}-${timeUnit.startTime}-${timeUnit.endTime}`}
                          style={[styles.dateCell, isDarkMode ? styles.cellDark : styles.cellLight]}>
                      {lessons.map(lesson => (
                        <LessonCell key={lesson.id} lesson={lesson} />
                      ))}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 60
  },
  darkBackground: {
    backgroundColor: '#121212'
  },
  lightBackground: {
    backgroundColor: '#ffffff'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  arrowButton: {
    padding: 10
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  headerRow: {
    flexDirection: 'row'
  },
  row: {
    flexDirection: 'row'
  },
  timeCell: {
    width: 80,
    padding: 5,
    justifyContent: 'center',
    borderWidth: 1
  },
  dateCell: {
    width: 120,
    padding: 5,
    borderWidth: 1
  },
  cellDark: {
    borderColor: '#444'
  },
  cellLight: {
    borderColor: '#ddd'
  },
  headerText: {
    fontWeight: 'bold'
  },
  timeText: {
    fontSize: 12
  },
  lesson: {
    padding: 2,
    marginBottom: 2,
    borderWidth: 2,
    borderRadius: 5
  },
  substitutedLesson: {
    backgroundColor: '#FFA3A3',
    borderColor: '#FF7979'
  },
  cancelledLesson: {
    backgroundColor: '#B8B8B8',
    borderColor: '#999999'
  },
  normalLessonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDEDED'
  },
  normalLessonDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444'
  },
  lessonTextLight: {
    fontSize: 10,
    color: '#000000'
  },
  lessonTextDark: {
    fontSize: 10,
    color: '#ffffff'
  },
  substitutedText: {
    color: '#cc0000',
    fontWeight: 'bold',
    fontSize: 10,
    marginTop: 2
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center'
  },
  textDark: {
    color: '#ffffff'
  },
  textLight: {
    color: '#000000'
  },
  holidayCell: {
    backgroundColor: '#FFD700', // Goldene Farbe für Ferien
    borderColor: '#FFA500' // Orange als Umrandung
  },
  holidayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF4500', // Rot-Orange für den Text
    textAlign: 'center'
  }
});

export default Stundenplan;