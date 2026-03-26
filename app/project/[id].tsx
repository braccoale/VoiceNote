import { audioRecordingService } from '@/src/services/AudioRecordingService';
import { mockAIService } from '@/src/services/MockAIService';
import { generateSiteReportPDF } from '@/src/services/PDFService';
import { projectStore } from '@/src/store';
import { Project, ReportPhoto, SiteReport } from '@/src/types';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ArrowLeft, Calendar, Camera, Download, Mic, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureScreen from 'react-native-signature-canvas';

export default function ProjectDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | undefined>();

    // State for Real Recording
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState("00:00");

    // State for Photos
    const [pendingPhotos, setPendingPhotos] = useState<ReportPhoto[]>([]);

    // State for Report Details Modal
    const [selectedReport, setSelectedReport] = useState<SiteReport | null>(null);
    const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);

    // Ref for Signature
    const signatureRef = useRef(null);

    // Handle Orientation for Signature
    useEffect(() => {
        const lockOrientation = async () => {
            if (isSignatureModalVisible) {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            } else {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
        lockOrientation();

        return () => {
            // Safety enforce portrait on unmount
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, [isSignatureModalVisible]);


    useEffect(() => {
        if (typeof id === 'string') {
            const p = projectStore.getProject(id);
            setProject(p);
        }
    }, [id]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            let seconds = 0;
            interval = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                const secs = (seconds % 60).toString().padStart(2, '0');
                setRecordingDuration(`${mins}:${secs}`);
            }, 1000);
        } else {
            setRecordingDuration("00:00");
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    if (!project) {
        return (
            <SafeAreaView style={styles.containerCenter}>
                <Text style={styles.textLight}>Progetto non trovato</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.btnSmall}>
                    <Text style={styles.textBtn}>Torna Indietro</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const pickImage = async (viewMode: 'recording' | 'modal' = 'recording') => {
        const options = [
            { text: "Fotocamera", onPress: () => launchCamera(viewMode) },
            { text: "Galleria", onPress: () => launchLibrary(viewMode) },
            { text: "Annulla", style: "cancel" }
        ];
        Alert.alert("Aggiungi Foto", "Scegli la sorgente", options as any);
    };

    const launchCamera = async (viewMode: 'recording' | 'modal') => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permesso negato", "Serve accesso alla fotocamera.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true,
            allowsEditing: true,
        });
        handleImageResult(result, viewMode);
    };

    const launchLibrary = async (viewMode: 'recording' | 'modal') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            base64: true,
            allowsEditing: true,
        });
        handleImageResult(result, viewMode);
    };

    const handleImageResult = (result: ImagePicker.ImagePickerResult, viewMode: 'recording' | 'modal') => {
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const newPhoto: ReportPhoto = {
                uri: asset.uri,
                base64: asset.base64 || "",
                caption: ""
            };

            if (viewMode === 'recording') {
                setPendingPhotos([...pendingPhotos, newPhoto]);
            } else if (viewMode === 'modal' && selectedReport) {
                const updatedPhotos = [...(selectedReport.photos || []), newPhoto];
                setSelectedReport({ ...selectedReport, photos: updatedPhotos });
            }
        }
    };

    const startRecording = async () => {
        try {
            await audioRecordingService.startRecording();
            setIsRecording(true);
        } catch (error) {
            Alert.alert("Errore", "Impossibile avviare la registrazione.");
        }
    };

    const stopRecording = async () => {
        try {
            const uri = await audioRecordingService.stopRecording();
            setIsRecording(false);
            if (uri) {
                handleProcessRecording(uri);
            }
        } catch (error) {
            setIsRecording(false);
            Alert.alert("Errore", "Errore durante lo stop della registrazione.");
        }
    };

    const handleProcessRecording = async (uri: string) => {
        setIsProcessing(true);
        try {
            const response = await audioRecordingService.transcribeAudio(uri);
            const text = typeof response === 'string' ? response : response.text;
            const data = typeof response === 'object' && response.data ? response.data : null;

            createReportFromSmartAI(text || "(Audio inudibile)", data);
        } catch (error) {
            Alert.alert("Errore AI", "Impossibile elaborare la registrazione.");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const createReportFromSmartAI = (text: string, aiData: any) => {
        // Fallback to local analysis if server returned text but no data
        let safeData = aiData;
        if (!safeData || Object.keys(safeData).length === 0) {
            safeData = mockAIService.analyzeText(text);
        }

        // Final safety check for individual fields (in case partial data)
        const mergedData = {
            weather: safeData?.weather && safeData.weather !== "-" ? safeData.weather : "Non rilevato",
            personnel: safeData?.personnel && safeData.personnel !== "-" ? safeData.personnel : "Non rilevato",
            activities: safeData?.activities && safeData.activities !== "-" ? safeData.activities : "Nessuna attività rilevata",
            issues: safeData?.issues && safeData.issues !== "-" ? safeData.issues : "Nessuna criticità rilevata",
            directives: safeData?.directives && safeData.directives !== "-" ? safeData.directives : "Nessuna direttiva",
            title: safeData?.title
        };

        const newReport: SiteReport = {
            id: Math.random().toString(),
            projectId: project.id,
            date: new Date().toISOString(),
            rawTranscription: text,
            data: mergedData,
            photos: pendingPhotos // Attach pending photos
        };

        projectStore.addReport(project.id, newReport);
        setPendingPhotos([]); // Clear pending photos
        const updated = projectStore.getProject(project.id);
        if (updated) {
            setProject({ ...updated, reports: [...updated.reports] });
        }

        // Use timeout to allow state update before trying to open modal (though mostly not needed with React 18, safe for RN)
        setTimeout(() => setSelectedReport(newReport), 100);
    };

    const handleDeleteReport = (reportId: string) => {
        Alert.alert(
            "Elimina Report",
            "Sei sicuro di voler cancellare questo report? Non sarà più recuperabile.",
            [
                { text: "Annulla", style: "cancel" },
                {
                    text: "Elimina",
                    style: "destructive",
                    onPress: () => {
                        if (project) {
                            projectStore.deleteReport(project.id, reportId);
                            const updated = projectStore.getProject(project.id);
                            if (updated) {
                                setProject({ ...updated, reports: [...updated.reports] });
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleExportPDF = async (report: SiteReport) => {
        if (project) {
            try {
                await generateSiteReportPDF(project, report);
            } catch (e) {
                Alert.alert("Errore", "Impossibile generare il PDF. Riprova.");
            }
        }
    };

    // --- RENDER ---
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* TODAY'S REPORT CARD */}
                <View style={styles.todayCard}>
                    <Text style={styles.todayCardTitle}>Report Lavoro</Text>
                    <Text style={styles.todayCardDate}>
                        {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </Text>
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} // Blue
                        onPress={() => setIsRecording(true)} // Open Recording Overlay
                    >
                        <Mic color="white" size={28} style={{ marginRight: 15 }} />
                        <Text style={styles.actionBtnText}>Aggiungi Audio</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#84cc16' }]} // Green
                        onPress={() => pickImage('recording')}
                    >
                        <Camera color="white" size={28} style={{ marginRight: 15 }} />
                        <Text style={styles.actionBtnText}>Scatta Foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#f97316' }]} // Orange
                        onPress={() => {
                            // Create an empty report to start editing manually
                            const newLocalReport: SiteReport = {
                                id: Math.random().toString(),
                                projectId: project.id,
                                date: new Date().toISOString(),
                                rawTranscription: "Inserimento Manuale",
                                data: {
                                    weather: "Non rilevato",
                                    personnel: "",
                                    activities: "",
                                    issues: "",
                                    directives: "",
                                    title: "Nuova Nota"
                                },
                                photos: []
                            };
                            setSelectedReport(newLocalReport);
                        }}
                    >
                        <View style={{ marginRight: 15 }}>
                            {/* Icon for Text */}
                            <View style={{ width: 20, height: 2, backgroundColor: 'white', marginBottom: 4 }} />
                            <View style={{ width: 20, height: 2, backgroundColor: 'white', marginBottom: 4 }} />
                            <View style={{ width: 14, height: 2, backgroundColor: 'white' }} />
                        </View>
                        <Text style={styles.actionBtnText}>Inserisci Testo</Text>
                    </TouchableOpacity>
                </View>

                {/* LIST SUMMARY */}
                <Text style={styles.sectionTitle}>RIEPILOGO</Text>

                {project.reports.length === 0 ? (
                    <Text style={styles.emptyText}>Nessuna attività registrata oggi.</Text>
                ) : (
                    project.reports.slice().reverse().map((report, idx) => (
                        <TouchableOpacity
                            key={report.id}
                            style={styles.listItem}
                            onPress={() => setSelectedReport(report)}
                        >
                            <View style={styles.listIconBox}>
                                <Calendar color="#64748b" size={20} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.listTitle} numberOfLines={1}>
                                    {report.data.title || report.data.activities || "Report"}
                                </Text>
                                <Text style={styles.listDate}>
                                    {new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {report.photos && report.photos.length > 0 && ` • ${report.photos.length} Foto`}
                                </Text>
                            </View>
                            <ArrowLeft color="#94a3b8" size={16} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* --- RECORDING OVERLAY (MODAL-LIKE) --- */}
            {isRecording && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', zIndex: 50 }]}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={styles.recHeader}>
                            <TouchableOpacity
                                onPress={() => setIsRecording(false)}
                                style={styles.btnCloseRec}
                            >
                                <ArrowLeft color="black" size={24} />
                                <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '500' }}>Home</Text>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Nuova Entry</Text>
                            <View style={{ width: 80 }} />
                        </View>

                        <View style={styles.recBody}>
                            <Text style={styles.recTitle}>Registra il pasto</Text>
                            <Text style={styles.recSubtitle}>Tieni premuto per parlare</Text>

                            <View style={styles.micContainer}>
                                {/* Timer floats above */}
                                <Text style={styles.timerFloat}>
                                    {isProcessing ? "Elaborazione..." : recordingDuration}
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPressIn={startRecording}
                                    onPressOut={stopRecording}
                                    style={[
                                        styles.micButtonBig,
                                        isProcessing && { opacity: 0.5 }
                                    ]}
                                    disabled={isProcessing}
                                >
                                    <Mic color="white" size={40} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.holdText}>Hold</Text>
                        </View>
                    </SafeAreaView>
                </View>
            )}

            {/* REPORT DETAILS MODAL */}
            <Modal
                visible={!!selectedReport}
                animationType="slide"
                transparent={!isSignatureModalVisible}
                onRequestClose={() => {
                    if (isSignatureModalVisible) {
                        setIsSignatureModalVisible(false);
                    } else {
                        setSelectedReport(null);
                    }
                }}
            >
                {isSignatureModalVisible ? (
                    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Firma Digitale</Text>
                            <TouchableOpacity onPress={() => setIsSignatureModalVisible(false)} style={{ padding: 5 }}>
                                <X color="#64748b" size={28} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <SignatureScreen
                                ref={signatureRef}
                                onOK={(signature) => {
                                    if (selectedReport) {
                                        const updated = { ...selectedReport, signature };
                                        setSelectedReport(updated);
                                        setIsSignatureModalVisible(false);
                                    }
                                }}
                                onEmpty={() => console.log("Empty signature")}
                                descriptionText="Firma qui sopra"
                                clearText="Pulisci"
                                confirmText="SALVA FIRMA"
                                webStyle={`
                                    .m-signature-pad--footer { position: fixed; bottom: 0; width: 100%; height: 80px; display: flex; align-items: center; justify-content: space-around; background-color: white; border-top: 1px solid #e2e8f0; }
                                    .m-signature-pad--body { height: calc(100% - 80px); }
                                    .button { background-color: #f97316; color: white; border-radius: 8px; padding: 10px 20px; font-weight: bold; }
                                    .button.clear { background-color: #e2e8f0; color: #334155; border: 1px solid #ccc; }
                                `}
                            />
                        </View>
                    </SafeAreaView>
                ) : (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {selectedReport && (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View>
                                            <Text style={styles.modalTitle}>Dettagli Report</Text>
                                            <Text style={{ color: '#64748b', fontSize: 12 }}>Modifica i campi per correggere</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedReport(null)}>
                                            <X color="#64748b" size={24} />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView style={styles.modalBody}>
                                        <Text style={styles.fieldLabel}>TITOLO (Max 3 parole)</Text>
                                        <TextInput
                                            style={[styles.inputField, { fontWeight: 'bold' }]}
                                            value={selectedReport.data.title}
                                            onChangeText={(t) => setSelectedReport({
                                                ...selectedReport,
                                                data: { ...selectedReport.data, title: t }
                                            })}
                                        />

                                        <Text style={styles.fieldLabel}>METEO</Text>
                                        <TextInput
                                            style={styles.inputField}
                                            value={selectedReport.data.weather}
                                            onChangeText={(t) => setSelectedReport({
                                                ...selectedReport,
                                                data: { ...selectedReport.data, weather: t }
                                            })}
                                        />

                                        <Text style={styles.fieldLabel}>PERSONALE</Text>
                                        <TextInput
                                            style={styles.inputField}
                                            value={selectedReport.data.personnel}
                                            multiline
                                            onChangeText={(t) => setSelectedReport({
                                                ...selectedReport,
                                                data: { ...selectedReport.data, personnel: t }
                                            })}
                                        />

                                        <Text style={styles.fieldLabel}>RELAZIONE LAVORI</Text>
                                        <View style={styles.boxValue}>
                                            <TextInput
                                                style={styles.textInputArea}
                                                value={selectedReport.data.activities}
                                                multiline
                                                scrollEnabled={false}
                                                onChangeText={(t) => setSelectedReport({
                                                    ...selectedReport,
                                                    data: { ...selectedReport.data, activities: t }
                                                })}
                                            />
                                        </View>

                                        <Text style={styles.fieldLabel}>CRITICITÀ</Text>
                                        <View style={[styles.boxValue, { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}>
                                            <TextInput
                                                style={[styles.textInputArea, { color: '#991b1b' }]}
                                                value={selectedReport.data.issues}
                                                multiline
                                                scrollEnabled={false}
                                                onChangeText={(t) => setSelectedReport({
                                                    ...selectedReport,
                                                    data: { ...selectedReport.data, issues: t }
                                                })}
                                            />
                                        </View>

                                        <Text style={styles.fieldLabel}>DIRETTIVE</Text>
                                        <View style={[styles.boxValue, { borderColor: '#f59e0b', backgroundColor: '#fffbeb' }]}>
                                            <TextInput
                                                style={[styles.textInputArea, { color: '#92400e' }]}
                                                value={selectedReport.data.directives}
                                                multiline
                                                scrollEnabled={false}
                                                onChangeText={(t) => setSelectedReport({
                                                    ...selectedReport,
                                                    data: { ...selectedReport.data, directives: t }
                                                })}
                                            />
                                        </View>

                                        {/* PHOTO SECTION IN MODAL */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 }}>
                                            <Text style={styles.fieldLabel}>FOTO ({selectedReport.photos?.length || 0})</Text>
                                            <TouchableOpacity onPress={() => pickImage('modal')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Plus size={16} color="#f97316" />
                                                <Text style={{ color: '#f97316', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>AGGIUNGI</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView horizontal style={{ marginVertical: 10 }}>
                                            {selectedReport.photos?.map((photo, idx) => (
                                                <View key={idx} style={{ marginRight: 10, width: 120 }}>
                                                    <Image source={{ uri: photo.uri }} style={{ width: 120, height: 120, borderRadius: 8, marginBottom: 4 }} />
                                                    <TextInput
                                                        placeholder="Didascalia..."
                                                        style={{ fontSize: 10, borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 2 }}
                                                        value={photo.caption}
                                                        onChangeText={(t) => {
                                                            const newPhotos = [...(selectedReport.photos || [])];
                                                            newPhotos[idx].caption = t;
                                                            setSelectedReport({ ...selectedReport, photos: newPhotos });
                                                        }}
                                                    />
                                                    <TouchableOpacity
                                                        style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 }}
                                                        onPress={() => {
                                                            const newPhotos = selectedReport.photos?.filter((_, i) => i !== idx);
                                                            setSelectedReport({ ...selectedReport, photos: newPhotos });
                                                        }}
                                                    >
                                                        <X color="white" size={12} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </ScrollView>

                                        <View style={{ height: 20 }} />

                                        {/* --- SIGNATURE SECTION --- */}
                                        <View style={{ marginBottom: 20 }}>
                                            <Text style={styles.fieldLabel}>FIRMA DIRETTORE LAVORI</Text>

                                            {selectedReport.signature ? (
                                                <View>
                                                    <Image
                                                        source={{ uri: selectedReport.signature }}
                                                        style={{ width: '100%', height: 150, resizeMode: 'contain', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8 }}
                                                    />
                                                    <TouchableOpacity
                                                        style={{ marginTop: 8, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center' }}
                                                        onPress={() => {
                                                            const updated = { ...selectedReport, signature: undefined };
                                                            setSelectedReport(updated);
                                                        }}
                                                    >
                                                        <Trash2 color="#ef4444" size={14} />
                                                        <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>ELIMINA FIRMA</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.btnSignature}
                                                    onPress={() => setIsSignatureModalVisible(true)}
                                                >
                                                    <Plus color="white" size={20} />
                                                    <Text style={styles.btnSignatureText}>AGGIUNGI FIRMA</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 15 }} />

                                        <Text style={styles.fieldLabel}>TRASCRIZIONE ORIGINALE</Text>
                                        <View style={styles.boxValue}>
                                            <Text style={[styles.textValue, { fontSize: 13, color: '#64748b', fontStyle: 'italic' }]}>
                                                &quot;{selectedReport.rawTranscription}&quot;
                                            </Text>
                                        </View>

                                        <View style={{ height: 20 }} />
                                    </ScrollView>

                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                        {/* SAVE AND ADD AS NEW OR JUST UPDATE */}
                                        <TouchableOpacity
                                            style={[styles.modalBtnPdf, { backgroundColor: '#10b981', flex: 1 }]}
                                            onPress={() => {
                                                if (project && selectedReport) {
                                                    const exists = project.reports.find(r => r.id === selectedReport.id);
                                                    if (exists) {
                                                        projectStore.updateReport(project.id, selectedReport);
                                                    } else {
                                                        projectStore.addReport(project.id, selectedReport);
                                                    }
                                                    // Force re-render list
                                                    setProject({ ...project, reports: [...project.reports] });
                                                    setSelectedReport(null);
                                                }
                                            }}
                                        >
                                            <Text style={styles.modalBtnText}>Salva & Chiudi</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalBtnPdf, { flex: 1 }]}
                                            onPress={() => handleExportPDF(selectedReport)}
                                        >
                                            <Download color="white" size={20} style={{ marginRight: 8 }} />
                                            <Text style={styles.modalBtnText}>PDF</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </Modal>

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    containerCenter: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    btnBack: {
        padding: 8,
        backgroundColor: '#1e293b',
        borderRadius: 8,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    textLight: {
        color: 'white',
        fontSize: 16,
        marginBottom: 20,
    },
    btnSmall: {
        backgroundColor: '#f97316',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    textBtn: {
        color: 'white',
        fontWeight: 'bold',
    },

    // --- NEW UI STYLES ---
    todayCard: {
        backgroundColor: '#3b82f6', // Bright Blue
        borderRadius: 20,
        padding: 24,
        height: 150,
        marginBottom: 20,
        justifyContent: 'flex-start',
    },
    todayCardTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    todayCardDate: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
    },

    actionsContainer: {
        gap: 12,
        marginBottom: 30,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        borderRadius: 16,
        paddingHorizontal: 20,
        // Shadows
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },

    // Recording Overlay
    recHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    btnCloseRec: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 50,
    },
    recTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#0f172a',
    },
    recSubtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 40,
    },
    micContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    micButtonBig: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow for button
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    timerFloat: {
        position: 'absolute',
        top: -40,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6',
        fontVariant: ['tabular-nums'],
    },
    holdText: {
        fontSize: 32,
        fontWeight: '300',
        color: '#334155',
        marginTop: 10,
    },

    // List Styles
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    emptyText: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 10,
    },
    listItem: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    listIconBox: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    listTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    listDate: {
        color: '#94a3b8',
        fontSize: 12,
    },

    // Old Modal Styles (kept for compatibility or reuse)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        height: '80%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    modalBody: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: 'bold',
        marginBottom: 6,
        letterSpacing: 1,
        marginTop: 10,
    },
    fieldValue: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
        marginBottom: 10,
    },
    boxValue: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#cbd5e1',
        marginBottom: 10,
    },
    textValue: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 22,
    },
    btnSignature: {
        backgroundColor: '#334155',
        height: 60,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    btnSignatureText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    modalBtnPdf: {
        backgroundColor: '#f97316',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    modalBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputField: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#334155',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 10,
    },
    textInputArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    btnPdf: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    btnPdfText: {
        color: '#f97316',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    reportItem: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },
    reportRowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reportIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    reportTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
        flexShrink: 1,
    },
    deleteButtonAbs: {
        padding: 8,
    },
    reportPreview: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
    },
    reportDateFooter: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 5,
        textAlign: 'right',
    },

});
