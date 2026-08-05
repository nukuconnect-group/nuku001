# Build Android (AAB + APK) depuis GitHub

Configuration conforme aux exigences Google Play : **compileSdk 36 / targetSdk 36 (Android 16)**,
AGP 8.13, Gradle 8.14.3, JDK 21, Capacitor 8.

Le dossier `android/` n'est pas versionné : il est régénéré à chaque build
(`npx cap add android` + `npx cap sync android`) puis configuré par
`scripts/android-prepare.mjs`.

## 1. Secrets GitHub à créer

Repository → Settings → Secrets and variables → Actions :

| Secret | Contenu |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload-keystore.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | alias de la clé (ex. `nukuconnect`) |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |

Sans keystore, le workflow produit quand même un AAB/APK **non signé** (utile pour tester).

## 2. Lancer un build

- Manuellement : onglet **Actions** → *Android release (AAB + APK)* → **Run workflow**
  (champ `version_name` optionnel, ex. `1.2.0`).
- Ou en poussant un tag : `git tag android-v1.2.0 && git push origin android-v1.2.0`.

Artefacts produits (`android-release`) :
`app-release.aab`, `app-release.apk`, `mapping.txt`.

Le workflow vérifie l'empreinte SHA‑256 du certificat embarqué dans l'AAB
et échoue si elle ne correspond pas au keystore fourni.

## 3. Identité de l'application

- `applicationId` : **`com.nukuconnect.app`** (correspond à `public/.well-known/assetlinks.json`).
- App Links `https://nukuconnect.com` et `https://www.nukuconnect.com` avec `autoVerify="true"`.

> L'ancien identifiant `app.lovable.7cbf…` était invalide pour Android (segment commençant par un
> chiffre) : `npx cap add android` refusait de générer le projet. Il a été remplacé par
> `com.nukuconnect.app`, déjà déclaré dans `assetlinks.json`.

## 4. Build en local

```bash
npm ci
npm run android:build      # build web + cap sync + config SDK 36
cd android && ./gradlew bundleRelease   # AAB
cd android && ./gradlew assembleRelease # APK
```

Pour le live-reload de développement (pointant vers le sandbox Lovable) :

```bash
npm run android:dev        # CAP_LIVE_RELOAD=1 npx cap sync android
```

Sans `CAP_LIVE_RELOAD`, `capacitor.config.ts` n'expose aucun `server.url` : le build est
100 % embarqué, comme l'exige une release Play Store.
