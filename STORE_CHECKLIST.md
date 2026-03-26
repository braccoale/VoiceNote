# SiteVoice — Checklist Pubblicazione Store

## Prerequisiti una-tantum

### Account e strumenti
- [ ] Account **Expo** su https://expo.dev (gratuito)
- [ ] **Apple Developer Program** ($99/anno) — obbligatorio per App Store
- [ ] **Google Play Console** ($25 una tantum) — obbligatorio per Play Store
- [ ] EAS CLI installato: `npm install -g eas-cli`
- [ ] Login EAS: `eas login`
- [ ] Inizializzare progetto EAS: `eas build:configure` → aggiorna `extra.eas.projectId` in app.json

---

## App Store (iOS)

### Configurazione (già fatto in app.json)
- [x] Bundle ID: `com.braccoale.sitevoice`
- [x] iOS Deployment Target: 16.0
- [x] Permission strings in italiano (NSMicrophoneUsageDescription, ecc.)
- [x] Privacy Manifest (NSPrivacyAccessedAPITypes) — obbligatorio da maggio 2024
- [x] UIBackgroundModes: audio
- [x] ITSAppUsesNonExemptEncryption: false

### Da fare prima del build
- [ ] Icona app 1024x1024 PNG senza trasparenza → `assets/images/icon.png`
- [ ] Splash screen → `assets/images/splash-icon.png`
- [ ] Screenshot iPhone 6.9" (almeno 3) per App Store Connect
- [ ] Screenshot iPhone 6.5" (almeno 3)
- [ ] Screenshot iPad 13" (se supportsTablet=true)

### Su App Store Connect (https://appstoreconnect.apple.com)
- [ ] Creare App Record con Bundle ID `com.braccoale.sitevoice`
- [ ] Compilare metadati:
  - Nome app: "SiteVoice"
  - Sottotitolo (30 car.): "Diario di Cantiere Vocale"
  - Descrizione (4000 car. max)
  - Keywords (100 car. max): "cantiere,giornale,vocale,artigiani,edilizia,report"
  - URL Supporto (obbligatorio)
  - URL Privacy Policy (obbligatorio)
- [ ] Sezione Privacy:
  - Raccolta dati: seleziona "Audio" (registrazione vocale processata via API)
  - Nessun tracciamento utente
- [ ] Categoria: Business o Produttività
- [ ] Rating: 4+ (nessun contenuto sensibile)
- [ ] Pricing: Free (o freemium)
- [ ] Certificati: EAS li gestisce automaticamente con `eas build`

### Build + Submit
```bash
npm run build:ios        # Build su EAS Cloud (~20 min)
npm run submit:ios       # Submit automatico a App Store Connect
```

---

## Google Play (Android)

### Configurazione (già fatto in app.json)
- [x] Package: `com.braccoale.sitevoice`
- [x] minSdkVersion: 26 (Android 8.0)
- [x] targetSdkVersion: 35
- [x] Permessi: RECORD_AUDIO, CAMERA, READ_MEDIA_IMAGES
- [x] Permessi bloccati: LOCATION (non usata)
- [x] Adaptive Icon configurata
- [x] Edge-to-edge enabled

### Da fare prima del build
- [ ] `google-services.json` reale da Firebase Console (sostituire il placeholder):
  1. Vai su https://console.firebase.google.com
  2. Crea progetto → Aggiungi app Android → package: `com.braccoale.sitevoice`
  3. Scarica `google-services.json` → metti nella root del progetto
- [ ] Icona app 512x512 PNG
- [ ] Feature graphic 1024x500 PNG
- [ ] Screenshot telefono (almeno 2, max 8): 16:9 o 9:16
- [ ] Screenshot tablet 7" (consigliato)

### Su Google Play Console (https://play.google.com/console)
- [ ] Creare app con package `com.braccoale.sitevoice`
- [ ] Compilare scheda store:
  - Nome app: "SiteVoice"
  - Descrizione breve (80 car.)
  - Descrizione completa (4000 car.)
  - Categoria: Business
- [ ] Dichiarazione di utilizzo dei permessi:
  - RECORD_AUDIO: "Registrazione note vocali per report di cantiere"
  - CAMERA: "Documentazione fotografica del cantiere"
- [ ] Privacy Policy URL (obbligatorio)
- [ ] Data safety form:
  - Audio: raccolto, elaborato tramite API di terze parti (OpenAI)
  - Dati non condivisi per scopi pubblicitari
- [ ] Classificazione contenuti: completare questionario
- [ ] Target audience: Adults (18+)
- [ ] Service Account per submit automatico:
  1. Google Play Console → Setup → API access
  2. Crea Service Account
  3. Scarica JSON → salva come `google-play-service-account.json` (NON committare)

### Build + Submit
```bash
npm run build:android    # Genera AAB su EAS Cloud
npm run submit:android   # Submit a Google Play (track: internal)
```

---

## Privacy Policy (OBBLIGATORIO per entrambi gli store)

Devi pubblicare una Privacy Policy online. Contenuto minimo:
- Quali dati raccoglie l'app (audio, testo trascritto)
- Come vengono processati (OpenAI Whisper + GPT-4o)
- Dove vengono salvati (Supabase, dispositivo locale)
- Diritti dell'utente (cancellazione, export)
- Contatto

Servizi gratuiti per crearla: https://privacypolicygenerator.info

---

## EAS Secrets (variabili d'ambiente per le build)

Imposta questi segreti su EAS (non in chiaro nei file):
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "tua_anon_key"
eas secret:create --scope project --name EXPO_PUBLIC_FUNCTION_SECRET --value "vo_secret_2024_change_me"
```

---

## Flusso completo di rilascio

```
1. npm run build:all          → build iOS + Android in parallelo su EAS
2. Testa su dispositivo reale con build preview
3. npm run submit:ios         → invia a App Store (review ~1-2 giorni)
4. npm run submit:android     → invia a Play Store (review ~3-7 giorni)
5. npm run update             → aggiornamenti OTA senza review (per fix minori)
```
