#!/usr/bin/env node
/**
 * Prépare le projet Android natif pour un build de production (AAB / APK).
 *
 * - Force compileSdk / targetSdk 36 (Android 16) + minSdk 23
 * - Injecte les intent-filters App Links (autoVerify) pour nukuconnect.com
 * - Applique versionCode / versionName
 *
 * À exécuter APRÈS `npx cap sync android`.
 * Aucune logique métier de l'application n'est touchée.
 */
import fs from 'node:fs';
import path from 'node:path';

const ANDROID_DIR = 'android';
const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

if (!fs.existsSync(ANDROID_DIR)) {
  fail("Dossier 'android' introuvable. Lancez `npx cap add android` puis `npx cap sync android`.");
}

/* ------------------------------------------------------------------ */
/* 1. variables.gradle : SDK 36                                        */
/* ------------------------------------------------------------------ */
const variablesPath = path.join(ANDROID_DIR, 'variables.gradle');
const SDK = {
  minSdkVersion: 23,
  compileSdkVersion: 36,
  targetSdkVersion: 36,
};

let variables = fs.existsSync(variablesPath)
  ? fs.readFileSync(variablesPath, 'utf8')
  : 'ext {\n}\n';

for (const [key, value] of Object.entries(SDK)) {
  const re = new RegExp(`${key}\\s*=\\s*\\d+`);
  if (re.test(variables)) {
    variables = variables.replace(re, `${key} = ${value}`);
  } else {
    variables = variables.replace(/ext\s*{/, `ext {\n    ${key} = ${value}`);
  }
}
fs.writeFileSync(variablesPath, variables);
console.log('✅ variables.gradle : compileSdk/targetSdk = 36, minSdk = 23');

/* ------------------------------------------------------------------ */
/* 2. AndroidManifest : App Links                                      */
/* ------------------------------------------------------------------ */
const manifestPath = path.join(ANDROID_DIR, 'app/src/main/AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) fail(`AndroidManifest.xml introuvable (${manifestPath}).`);

let manifest = fs.readFileSync(manifestPath, 'utf8');
if (manifest.includes('android:host="nukuconnect.com"')) {
  console.log('✅ App Links déjà présents dans le manifest');
} else {
  const block = ['nukuconnect.com', 'www.nukuconnect.com']
    .map(
      (host) => `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${host}" />
            </intent-filter>`,
    )
    .join('');

  const pattern = /(<activity\b[^>]*MainActivity[\s\S]*?)(\s*<\/activity>)/;
  if (!pattern.test(manifest)) fail('Balise <activity ... MainActivity> introuvable dans le manifest.');
  manifest = manifest.replace(pattern, `$1${block}$2`);
  fs.writeFileSync(manifestPath, manifest);
  console.log('✅ App Links (autoVerify) injectés pour nukuconnect.com');
}

/* ------------------------------------------------------------------ */
/* 3. build.gradle : versionCode / versionName                         */
/* ------------------------------------------------------------------ */
const appGradlePath = path.join(ANDROID_DIR, 'app/build.gradle');
if (!fs.existsSync(appGradlePath)) fail(`app/build.gradle introuvable (${appGradlePath}).`);

const versionCode = Number(process.env.ANDROID_VERSION_CODE || Math.floor(Date.now() / 60000));
const versionName = process.env.ANDROID_VERSION_NAME || `1.0.${versionCode}`;

let appGradle = fs.readFileSync(appGradlePath, 'utf8');
appGradle = appGradle
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

/* ------------------------------------------------------------------ */
/* 4. build.gradle : signingConfigs release (env-driven)               */
/* ------------------------------------------------------------------ */
/* Compatible GitHub Actions (ANDROID_*) et Codemagic (CM_*).           */
if (!appGradle.includes('signingConfigs')) {
  const signingBlock = `
    signingConfigs {
        release {
            def ksPath = System.getenv("ANDROID_KEYSTORE_PATH") ?: System.getenv("CM_KEYSTORE_PATH")
            if (ksPath && file(ksPath).exists()) {
                storeFile file(ksPath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: System.getenv("CM_KEY_PASSWORD")
            }
        }
    }
`;
  appGradle = appGradle.replace(/\n(\s*)buildTypes\s*{/, `\n${signingBlock}\n$1buildTypes {`);

  appGradle = appGradle.replace(
    /(release\s*{\s*\n)(\s*)minifyEnabled/,
    `$1$2if (signingConfigs.release.storeFile != null) {\n$2    signingConfig signingConfigs.release\n$2}\n$2minifyEnabled`,
  );

  if (!appGradle.includes('signingConfigs')) fail("Impossible d'injecter signingConfigs dans app/build.gradle.");
  console.log('✅ signingConfigs.release injecté (variables d\'environnement)');
} else {
  console.log('✅ signingConfigs déjà présent');
}

fs.writeFileSync(appGradlePath, appGradle);
console.log(`✅ versionCode = ${versionCode}, versionName = ${versionName}`);

console.log('🎉 Projet Android prêt pour le build release.');

