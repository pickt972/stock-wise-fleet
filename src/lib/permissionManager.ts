const CAMERA_PERMISSION_KEY = "camera_permission_granted";

/**
 * Check if camera permission was previously granted (cached)
 */
export const isCameraPermissionGranted = (): boolean => {
  const cached = localStorage.getItem(CAMERA_PERMISSION_KEY);
  return cached === "true";
};

/**
 * Request camera permission (asks only if not cached)
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  // If already granted in cache: skip browser prompt
  if (isCameraPermissionGranted()) {
    return true;
  }
  
  try {
    // First call: browser shows prompt
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    
    // Permission granted
    localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
    
    // Close stream (not needed now)
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    // Permission denied
    console.error("Camera permission denied:", error);
    localStorage.setItem(CAMERA_PERMISSION_KEY, "false");
    return false;
  }
};

/**
 * Revoke cached permission (user wants to reset)
 */
export const revokeCameraPermission = (): void => {
  localStorage.removeItem(CAMERA_PERMISSION_KEY);
};

/**
 * Check actual browser permission status (fallback)
 */
export const checkCameraPermissionStatus = async (): Promise<"granted" | "denied" | "prompt"> => {
  if (!navigator.permissions) return "prompt";
  
  try {
    const result = await navigator.permissions.query({ name: "camera" as PermissionName });
    return result.state;
  } catch {
    return "prompt";
  }
};
