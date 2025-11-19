const CAMERA_PERMISSION_KEY = "camera_permission_granted";

// Déduplication: évite plusieurs prompts simultanés
let requestPromise: Promise<boolean> | null = null;

/**
 * Vérifie si la permission caméra a déjà été accordée (cache localStorage)
 */
export const isCameraPermissionGranted = (): boolean => {
  if (typeof window === "undefined") return false;
  const cached = localStorage.getItem(CAMERA_PERMISSION_KEY);
  return cached === "true";
};

/**
 * Demande la permission caméra une seule fois (dédupliquée)
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  // ÉTAPE 1: Vérifier le statut réel de la permission dans le navigateur
  const browserStatus = await checkCameraPermissionStatus();
  
  if (browserStatus === "granted") {
    // Permission déjà accordée par le navigateur → synchroniser le cache
    console.log("✅ Permission caméra déjà accordée (navigateur)");
    localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
    return true;
  }

  if (browserStatus === "denied") {
    // Permission refusée par le navigateur → ne pas redemander
    console.log("❌ Permission caméra refusée par le navigateur");
    localStorage.setItem(CAMERA_PERMISSION_KEY, "false");
    return false;
  }

  // ÉTAPE 2: Vérifier le cache localStorage (optimisation)
  if (isCameraPermissionGranted()) {
    console.log("✅ Permission caméra déjà accordée (cache)");
    return true;
  }

  // ÉTAPE 3: Une requête est déjà en cours → réutiliser la même promise
  if (requestPromise) {
    console.log("⏳ Requête de permission déjà en cours, en attente...");
    return requestPromise;
  }

  // ÉTAPE 4: Nouvelle demande (une seule fois)
  requestPromise = (async () => {
    try {
      console.log("🎥 Demande de permission caméra...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // Permission accordée
      localStorage.setItem(CAMERA_PERMISSION_KEY, "true");

      // Fermer immédiatement le stream
      stream.getTracks().forEach((track) => track.stop());

      console.log("✅ Permission caméra accordée");
      return true;
    } catch (error) {
      console.error("❌ Permission caméra refusée:", error);
      localStorage.setItem(CAMERA_PERMISSION_KEY, "false");
      return false;
    } finally {
      // Réinitialiser la promise pour futurs appels
      requestPromise = null;
    }
  })();

  return requestPromise;
};

/**
 * Réinitialise le cache de permission
 */
export const revokeCameraPermission = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CAMERA_PERMISSION_KEY);
};

/**
 * Vérifie l'état actuel de la permission dans le navigateur (fallback)
 */
export const checkCameraPermissionStatus = async (): Promise<"granted" | "denied" | "prompt"> => {
  if (typeof navigator === "undefined" || !(navigator as any).permissions) return "prompt";
  try {
    const result = await (navigator as any).permissions.query({ name: "camera" as PermissionName });
    return result.state;
  } catch {
    return "prompt";
  }
};
