import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabTwoScreen() {
    const colorScheme = useColorScheme() || 'light';

    return (
        <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
            <View style={styles.titleContainer}>
                <Ionicons name="information-circle-outline" size={24} color={Colors[colorScheme].text} />
                <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Impressum</Text>
            </View>
            <Text style={[styles.text, { color: Colors[colorScheme].text }]}>Angaben gemäß § 5 TMG:</Text>
            <Text style={[styles.text, { color: Colors[colorScheme].text }]}>Timon Bauerfeld</Text>
            <Text style={[styles.text, { color: Colors[colorScheme].text }]}>NRW, Deutschland</Text>
            <Text style={[styles.text, { color: Colors[colorScheme].text }]}>E-Mail: timon.dev@t-online.de</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    text: {
        fontSize: 16,
        marginBottom: 10,
    },
    headerImage: {
        opacity: 0.1,
        position: 'absolute',
        bottom: 20,
        right: 20,
    },
});

const Colors = {
    light: {
        background: '#FFFFFF',
        text: '#000000',
    },
    dark: {
        background: '#000000',
        text: '#FFFFFF',
    },
};
