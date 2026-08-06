# Android Build Setup Guide

Ce guide explique comment configurer la compilation d'un fichier **AAB non signé** (Android App Bundle) pour NUKUCONNECT.

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

## 🔐 Signature

Le build décrit ici est **complètement non signé**.
Aucun keystore ni secret n'est nécessaire pour générer l'AAB.
Si une signature est requise plus tard, elle doit être appliquée manuellement après génération.

## 🏗️ Build Local

### Build AAB unsigned:

```bash
cd android
./gradlew bundleRelease
# Le fichier AAB sera dans: app/build/outputs/bundle/release/
```

### Build Debug (développement):

```bash
cd android
./gradlew assembleDebug
# Le fichier APK sera dans: app/build/outputs/apk/debug/
```

## 🚀 Build via GitHub Actions

### 1. Déclencher le Build

**Option A: Push sur main (build AAB automatiquement)**
```bash
git push origin main
```

**Option B: Workflow manuel**
- Va sur: **Actions → Android unsigned AAB build + Verify API 36 → Run workflow**

### 2. Récupérer les artifacts

Une fois le build terminé:
- Va sur **Actions → dernière exécution → Artifacts**
- Télécharge `android-release-unsigned-aab`

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

### Build AAB échoue

**Cause:** Gradle cache corrompu.

**Solution:**
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

## 📚 Ressources

- [Android Build Documentation](https://developer.android.com/studio/build)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Google Play Console](https://play.google.com/console)
- [Gradle Documentation](https://gradle.org/releases/)

## ✅ Checklist de Déploiement

- [ ] local.properties défini
- [ ] Build AAB local réussi
- [ ] GitHub Actions build réussi
- [ ] Artifacts téléchargés et testés
- [ ] Signature manuelle effectuée si nécessaire

---

**Questions?** Contacte l'équipe dev! 🚀
