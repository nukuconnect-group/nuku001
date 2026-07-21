# Android Build Setup Guide

Ce guide explique comment configurer la compilation des fichiers **AAB** (Android App Bundle) et **APK** pour NUKUCONNECT.

## 📋 Prérequis

- **Java 11+** (télécharge depuis [adoptopenjdk.com](https://adoptopenjdk.net/))
- **Android SDK** (via Android Studio ou CLI)
- **Node.js 20+**
- **npm** ou **bun**

## 🔧 Configuration Locale

### 1. Installer Android SDK

**macOS:**
```bash
export ANDROID_SDK_ROOT=~/Library/Android/sdk
export ANDROID_HOME=$ANDROID_SDK_ROOT
export PATH=$PATH:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools
```

**Linux:**
```bash
export ANDROID_SDK_ROOT=~/Android/Sdk
export ANDROID_HOME=$ANDROID_SDK_ROOT
export PATH=$PATH:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools
```

### 2. Configurer local.properties

Édite `android/local.properties` et définis le chemin du SDK:

```properties
sdk.dir=/path/to/Android/sdk
```

### 3. Vérifier la configuration

```bash
bash scripts/verify-android-setup.sh
```

## 🔐 Créer un Keystore (Signature)

Le keystore est nécessaire pour signer les builds release.

### Créer un nouveau keystore:

```bash
keytool -genkey -v -keystore nukuconnect.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias nukuconnect
```

**Questions à répondre:**
- **Mot de passe du keystore:** (à noter!)
- **Mot de passe de la clé:** (à noter!)
- **Prénom et nom:** (le vôtre)
- **Unité organisationnelle:** (NUKUCONNECT)
- **Organisation:** (NUKUCONNECT)
- **Ville:** (votre ville)
- **État/Province:** (votre état)
- **Code du pays:** (votre code, ex: CI, BJ, TG)

### Variables d'environnement:

```bash
export CM_KEYSTORE_PATH="$(pwd)/nukuconnect.jks"
export CM_KEYSTORE_PASSWORD="votre-mot-de-passe-keystore"
export CM_KEY_ALIAS="nukuconnect"
export CM_KEY_PASSWORD="votre-mot-de-passe-clé"
```

## 🏗️ Build Local

### Build AAB (pour Google Play):

```bash
cd android
./gradlew bundleRelease
# Le fichier AAB sera dans: app/build/outputs/bundle/release/
```

### Build APK (pour tester):

```bash
cd android
./gradlew assembleRelease
# Le fichier APK sera dans: app/build/outputs/apk/release/
```

### Build Debug (développement):

```bash
cd android
./gradlew assembleDebug
# Le fichier APK sera dans: app/build/outputs/apk/debug/
```

## 🚀 Build via GitHub Actions

### 1. Ajouter les Secrets GitHub

Va sur: **Settings → Secrets and variables → Actions**

Ajoute ces 4 secrets:

| Nom | Valeur |
|-----|--------|
| `ANDROID_KEYSTORE_PATH` | `/Users/yourname/nukuconnect.jks` (chemin complet du keystore) |
| `ANDROID_KEYSTORE_PASSWORD` | `votre-mot-de-passe-keystore` |
| `ANDROID_KEY_ALIAS` | `nukuconnect` |
| `ANDROID_KEY_PASSWORD` | `votre-mot-de-passe-clé` |

### 2. Déclencher le Build

**Option A: Push sur main (build AAB automatiquement)**
```bash
git push origin main
```

**Option B: Workflow manuel**
- Va sur: **Actions → Android Build → Run workflow**
- Choisis: `aab`, `apk`, ou `both`

### 3. Récupérer les artifacts

Une fois le build terminé:
- Va sur **Actions → dernière exécution → Artifacts**
- Télécharge `android-aab` ou `android-apk`

## 📤 Publier sur Google Play

### 1. Créer un compte Google Play

Inscris-toi sur [Google Play Console](https://play.google.com/console)

### 2. Obtenir l'empreinte SHA-256

```bash
keytool -list -v -keystore nukuconnect.jks -alias nukuconnect | grep SHA256
```

### 3. Enregistrer l'app

- Crée une nouvelle app sur Play Console
- Enregistre l'empreinte SHA-256 du certificat
- Configure les permissions, icône, descriptions, etc.

### 4. Upload l'AAB

- Va dans **Release → Internal testing**
- Upload le fichier AAB
- Crée une release et publie

## ❌ Troubleshooting

### Build échoue avec "Keystore not found"

**Cause:** La variable `CM_KEYSTORE_PATH` n'est pas définie ou le chemin est incorrect.

**Solution:**
```bash
# Vérifier le chemin
ls -la /path/to/nukuconnect.jks

# Redéfinir la variable
export CM_KEYSTORE_PATH="/chemin/complet/nukuconnect.jks"
```

### Erreur "Invalid keystore password"

**Cause:** Le mot de passe est incorrect.

**Solution:**
```bash
# Tester le keystore
keytool -list -keystore nukuconnect.jks
# Entre le mot de passe quand demandé
```

### Build APK échoue

**Cause:** Gradle cache corrompu.

**Solution:**
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Certificat expiré

**Cause:** L'alias du keystore a expiré (10 000 jours par défaut).

**Solution:** Crée un nouveau keystore avec `keytool -genkey`

## 📚 Ressources

- [Android Build Documentation](https://developer.android.com/studio/build)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Google Play Console](https://play.google.com/console)
- [Gradle Documentation](https://gradle.org/releases/)

## ✅ Checklist de Déploiement

- [ ] Keystore créé et sécurisé
- [ ] Secrets GitHub configurés
- [ ] local.properties défini
- [ ] Build AAB local réussi
- [ ] Build APK local réussi
- [ ] GitHub Actions build réussi
- [ ] Artifacts téléchargés et testés
- [ ] Google Play Console configuré
- [ ] AAB publié sur Play Console

---

**Questions?** Contacte l'équipe dev! 🚀
