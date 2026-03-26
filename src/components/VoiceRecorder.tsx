import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { audioRecordingService } from '../services/AudioRecordingService';

interface VoiceRecorderProps {
    onRecordingComplete: (uri: string, text?: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [durationMillis, setDurationMillis] = useState(0);
    const [metering, setMetering] = useState<number[]>(new Array(10).fill(-160));

    const handleRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
        if (status.isRecording) {
            setDurationMillis(status.durationMillis);

            let currentMetering = status.metering;
            if ((Platform.OS === 'web') && (currentMetering === undefined || currentMetering === -160)) {
                currentMetering = -40 + Math.random() * 30;
            }

            if (currentMetering !== undefined) {
                setMetering(prev => [...prev.slice(1), currentMetering || -160]);
            }
        }
    };

    const handleStartRecording = async () => {
        try {
            setDurationMillis(0);
            setMetering(new Array(10).fill(-160));
            await audioRecordingService.startRecording(handleRecordingStatusUpdate);
            setIsRecording(true);
            setIsTranscribing(false);
        } catch (error) {
            Alert.alert('Error', 'Could not start recording. Please check permissions.');
        }
    };

    const handleStopRecording = async () => {
        try {
            const uri = await audioRecordingService.stopRecording();
            setIsRecording(false);

            if (uri) {
                // Auto-Confirm / Auto-Transcribe
                handleAutoTranscribe(uri);
            }
        } catch (error) {
            console.error(error);
            setIsRecording(false);
        }
    };

    const handleAutoTranscribe = async (uri: string) => {
        try {
            setIsTranscribing(true);
            const text = await audioRecordingService.transcribeAudio(uri);
            console.log('Transcribed Text:', text);
            onRecordingComplete(uri, text);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Transcription failed. Please try again.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getBarHeight = (db: number) => {
        const minDb = -60;
        let val = Math.max(db, minDb);
        const normalized = (val - minDb) / (0 - minDb);
        return Math.max(4, normalized * 40);
    };

    // 1. Idle State
    if (!isRecording && !isTranscribing) {
        return (
            <TouchableOpacity style={styles.startButton} onPress={handleStartRecording}>
                <View style={styles.startButtonInner}>
                    <IconButton icon="microphone" iconColor="white" size={100} />
                    <Text style={styles.startText}>Tap to Record Expense</Text>
                </View>
            </TouchableOpacity>
        );
    }

    // 2. Transcribing/Recording State
    return (
        <View style={styles.cardContainer}>
            <View style={styles.header}>
                <IconButton icon="account-circle-outline" iconColor="#3E2723" size={24} />
                <IconButton icon="cog-outline" iconColor="#3E2723" size={24} />
            </View>

            <Text style={styles.cardTitle}>VoiceOrder</Text>

            <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatTime(durationMillis)}</Text>
            </View>

            {isTranscribing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="white" />
                    <Text style={styles.loadingText}>Processing...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.visualizerContainer}>
                        {metering.map((db, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.visualizerBar,
                                    { height: getBarHeight(db) }
                                ]}
                            />
                        ))}
                    </View>

                    <View style={styles.controlsContainer}>
                        <View style={styles.pauseButton}>
                            <Text style={styles.pauseText}>recording...</Text>
                        </View>
                    </View>

                    <View style={styles.stopButtonContainer}>
                        <TouchableOpacity onPress={handleStopRecording} style={styles.stopButton}>
                            <View style={styles.stopIcon} />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    startButton: {
        backgroundColor: '#FF5722',
        borderRadius: 60,
        paddingVertical: 30,
        paddingHorizontal: 30,
        shadowColor: '#FF5722',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    startButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    startText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    cardContainer: {
        backgroundColor: '#FF5722',
        width: Dimensions.get('window').width * 0.9,
        height: 400,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardTitle: {
        color: '#3E2723',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: -20,
    },
    timerContainer: {
        marginTop: 20,
    },
    timerText: {
        color: 'white',
        fontSize: 48,
        fontWeight: 'bold',
    },
    visualizerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 50,
        justifyContent: 'center',
    },
    visualizerBar: {
        width: 6,
        backgroundColor: 'white',
        borderRadius: 3,
    },
    controlsContainer: {
        marginTop: 10,
    },
    pauseButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    pauseText: {
        color: 'white',
        fontWeight: '600',
    },
    stopButtonContainer: {
        position: 'absolute',
        bottom: -30,
        alignSelf: 'center',
        backgroundColor: '#FBE9E7',
        borderRadius: 50,
        padding: 4,
    },
    stopButton: {
        backgroundColor: '#FF5722',
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    stopIcon: {
        width: 24,
        height: 24,
        backgroundColor: 'white',
        borderRadius: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    }
});
