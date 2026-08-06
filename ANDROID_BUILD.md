# Nuku Connect Android Unsigned AAB Build

Ce projet est configuré pour générer automatiquement un build Android AAB non signé.

## 🚀 Déclenchement automatique du Build

Le workflow GitHub Actions se déclenche automatiquement à chaque `git push` sur la branche `main`.

Pour lancer un build manuellement :
1. Allez dans **Actions** → **Android unsigned AAB build + Verify API 36**
2. Cliquez **Run workflow**

## 📦 Artefacts produits

- `app-release-unsigned.aab` - Android App Bundle non signé

## ✅ Configuration

- ✅ JDK 21 + Gradle 8.14.3
- ✅ Android SDK 36 (Android 16)
- ✅ Capacitor 8
- ✅ Aucune dépendance aux secrets de keystore

## 🔑 Signature

Le workflow n'utilise aucun secret de keystore.
Le fichier généré peut être signé manuellement plus tard si nécessaire.
