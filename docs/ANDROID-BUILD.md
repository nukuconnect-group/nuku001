# Build Android unsigned (AAB) depuis GitHub

Configuration conforme aux exigences Google Play : **compileSdk 36 / targetSdk 36 (Android 16)**,
AGP 8.13, Gradle 8.14.3, JDK 21, Capacitor 8.

Le dossier `android/` n'est pas versionné : il est régénéré à chaque build
(`npx cap add android` + `npx cap sync android`) puis configuré par
`scripts/android-prepare.mjs`.

## 1. Build GitHub sans secrets

Le workflow ne dépend d'aucun secret de keystore.
Il génère directement un **AAB non signé** pour les tests et la signature manuelle ultérieure.

## 2. Lancer un build

- Manuellement : onglet **Actions** → *Android unsigned AAB build + Verify API 36* → **Run workflow**
  (champ `version_name` optionnel, ex. `1.2.0`).
- Ou en poussant un tag : `git tag android-v1.2.0 && git push origin android-v1.2.0`.

Artefact produit (`android-release-unsigned-aab`) :
`app-release-unsigned.aab`.

Le workflow vérifie que l'AAB existe, reste non signé et cible toujours l'API 36.

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
```

Pour le live-reload de développement (pointant vers le sandbox Lovable) :

```bash
npm run android:dev        # CAP_LIVE_RELOAD=1 npx cap sync android
```

Sans `CAP_LIVE_RELOAD`, `capacitor.config.ts` n'expose aucun `server.url` : le build est
100 % embarqué, comme l'exige une release Play Store.

Si besoin, l'AAB peut ensuite être signé manuellement en dehors du workflow.
