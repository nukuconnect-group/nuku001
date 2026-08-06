# Nuku Connect Android Build

Ce projet est configuré pour générer automatiquement des builds Android AAB et APK.

## 🚀 Déclenchement automatique du Build

Le workflow GitHub Actions se déclenche automatiquement à chaque `git push` sur la branche `main`.

Pour lancer un build manuellement :
1. Allez dans **Actions** → **Android signed build**
2. Cliquez **Run workflow**

## 📦 Artefacts produits

- `app-release.aab` - Android App Bundle (Google Play Store)
- `app-release.apk` - APK signé (installation directe)
- `mapping.txt` - ProGuard obfuscation mapping

## ✅ Configuration

- ✅ JDK 21 + Gradle 8.14.3
- ✅ Android SDK 36 (Android 16)
- ✅ Capacitor 8
- ✅ Signature automatique avec keystore

## 🔑 Secrets requis

Voir Settings → Secrets and variables :
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
