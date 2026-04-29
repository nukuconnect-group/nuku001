/**
 * Helpers around getUserMedia : permissions + messages clairs.
 *
 * Distingue les cas :
 *  - refus explicite (NotAllowedError / SecurityError)
 *  - matériel introuvable (NotFoundError / OverconstrainedError)
 *  - déjà utilisé par une autre app (NotReadableError)
 *  - navigateur incompatible / contexte non sécurisé (HTTP)
 */

export type MediaErrorReason =
  | "denied"
  | "not-found"
  | "in-use"
  | "insecure-context"
  | "unsupported"
  | "unknown";

export interface MediaPermissionError {
  reason: MediaErrorReason;
  /** Titre court, prêt à être passé à un toast / dialog */
  title: string;
  /** Description longue, expliquant clairement à l'utilisateur quoi faire */
  description: string;
  /** L'erreur native, utile pour les logs */
  cause?: unknown;
}

/**
 * Construit un MediaPermissionError à partir d'une erreur getUserMedia,
 * en adaptant le message au type de média demandé (audio / vidéo / les deux).
 */
export function describeMediaError(
  err: unknown,
  kind: "audio" | "video" | "audio-video",
): MediaPermissionError {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name || "";
  const msg = e?.message || "";

  // Contexte non sécurisé (HTTP) : getUserMedia n'existe pas
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      return {
        reason: "insecure-context",
        title: "Connexion non sécurisée",
        description:
          "Les appels nécessitent une connexion sécurisée (HTTPS). Ouvrez l'application via une URL https:// pour autoriser le micro et la caméra.",
        cause: err,
      };
    }
    return {
      reason: "unsupported",
      title: "Navigateur non compatible",
      description:
        "Votre navigateur ne prend pas en charge les appels audio/vidéo. Essayez Chrome, Edge, Safari ou Firefox récent.",
      cause: err,
    };
  }

  if (name === "NotAllowedError" || name === "SecurityError" || /denied/i.test(msg)) {
    if (kind === "audio") {
      return {
        reason: "denied",
        title: "Accès au micro refusé",
        description:
          "Pour passer un appel, autorisez Nukuconnect à utiliser votre micro. Cliquez sur l'icône 🔒 ou 🎙️ à gauche de la barre d'adresse, puis activez « Microphone » et rechargez la page.",
        cause: err,
      };
    }
    if (kind === "video") {
      return {
        reason: "denied",
        title: "Accès à la caméra refusé",
        description:
          "Pour activer la vidéo, autorisez Nukuconnect à utiliser votre caméra. Cliquez sur l'icône 🔒 ou 📷 à gauche de la barre d'adresse, puis activez « Caméra » et rechargez la page.",
        cause: err,
      };
    }
    return {
      reason: "denied",
      title: "Accès au micro et à la caméra refusé",
      description:
        "Pour démarrer un appel vidéo, autorisez Nukuconnect à utiliser votre micro et votre caméra. Cliquez sur l'icône 🔒 à gauche de l'URL, activez « Microphone » et « Caméra » puis rechargez la page.",
      cause: err,
    };
  }

  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
    return {
      reason: "not-found",
      title: kind === "audio" ? "Aucun micro détecté" : "Aucune caméra détectée",
      description:
        kind === "audio"
          ? "Aucun microphone n'est connecté à votre appareil. Branchez un micro ou un casque puis réessayez."
          : kind === "video"
            ? "Aucune caméra n'est disponible. Vérifiez que la caméra n'est pas désactivée par un commutateur physique ou par les paramètres système."
            : "Le micro ou la caméra requis pour l'appel sont introuvables. Vérifiez vos périphériques et réessayez.",
      cause: err,
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError" || /in use|already/i.test(msg)) {
    return {
      reason: "in-use",
      title: "Périphérique occupé",
      description:
        "Votre micro ou votre caméra est déjà utilisé par une autre application (Zoom, Meet, Teams…). Fermez les autres applications puis réessayez.",
      cause: err,
    };
  }

  return {
    reason: "unknown",
    title: "Impossible de démarrer l'appel",
    description:
      msg ||
      "Une erreur inattendue s'est produite lors de l'accès au micro ou à la caméra. Vérifiez les autorisations du navigateur puis réessayez.",
    cause: err,
  };
}

/**
 * Wrapper autour de getUserMedia qui :
 *  - applique automatiquement un fallback audio-only si la caméra n'est pas dispo
 *    quand on demandait audio+video (`videoFallbackToAudio = true`).
 *  - renvoie une erreur structurée (`MediaPermissionError`) en cas d'échec définitif.
 */
export async function requestUserMedia(
  constraints: MediaStreamConstraints,
  options: { videoFallbackToAudio?: boolean } = {},
): Promise<{ stream: MediaStream; downgradedToAudio: boolean }> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    const kind = constraints.video && constraints.audio
      ? "audio-video"
      : constraints.video ? "video" : "audio";
    throw describeMediaError(new Error("getUserMedia unavailable"), kind);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream, downgradedToAudio: false };
  } catch (err: unknown) {
    const wantsVideo = !!constraints.video;
    const wantsAudio = !!constraints.audio;

    // Fallback : si on voulait audio+vidéo et que seule la vidéo échoue (caméra absente / occupée),
    // on retente en audio seul afin que l'appel reste possible.
    if (wantsVideo && wantsAudio && options.videoFallbackToAudio) {
      const e = err as { name?: string } | null;
      const name = e?.name || "";
      const isCameraIssue =
        name === "NotFoundError" ||
        name === "OverconstrainedError" ||
        name === "DevicesNotFoundError" ||
        name === "NotReadableError";
      if (isCameraIssue) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio });
          return { stream: audioOnly, downgradedToAudio: true };
        } catch (audioErr) {
          throw describeMediaError(audioErr, "audio");
        }
      }
    }

    const kind: "audio" | "video" | "audio-video" =
      wantsVideo && wantsAudio ? "audio-video" : wantsVideo ? "video" : "audio";
    throw describeMediaError(err, kind);
  }
}

export function isMediaPermissionError(e: unknown): e is MediaPermissionError {
  return !!e && typeof e === "object" && "reason" in (e as Record<string, unknown>) && "title" in (e as Record<string, unknown>);
}
