import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Result } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, RotateCcw, Flashlight, FlashlightOff, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestCameraPermission } from "@/lib/permissionManager";

interface BarcodeScannerProps {
  onScanResult: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanResult, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [scannerControls, setScannerControls] = useState<IScannerControls | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [lastScanResult, setLastScanResult] = useState<string>("");
  const isProcessingRef = useRef(false);
  const lastScanResultRef = useRef<string>("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Demander/valider la permission via le permissionManager (dédupliqué)
      const permissionGranted = await requestCameraPermission();

      if (!permissionGranted) {
        setHasPermission(false);
        toast({
          title: "Permission refusée",
          description: "Veuillez autoriser l'accès à la caméra dans les paramètres",
          variant: "destructive",
        });
        return;
      }

      const reader = new BrowserMultiFormatReader();
      setCodeReader(reader);

      setHasPermission(true);

      // Obtenir la liste des caméras disponibles (méthode statique)
      const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      // Filtrer uniquement les caméras arrière connues
      const backCameras = videoDevices.filter((device) =>
        device.label.toLowerCase().includes("back") ||
        device.label.toLowerCase().includes("rear") ||
        device.label.toLowerCase().includes("environment")
      );
      setDevices(backCameras);

      if (backCameras.length > 0) {
        const deviceId = backCameras[0].deviceId;
        setSelectedDeviceId(deviceId);
        startScanning(reader, deviceId);
      } else {
        // Fallback strict: utiliser les contraintes pour forcer la caméra arrière
        startScanning(reader);
      }
    } catch (error) {
      console.error("Erreur d'initialisation du scanner:", error);
      setHasPermission(false);
      toast({
        title: "Erreur de caméra",
        description: "Impossible d'accéder à la caméra arrière. Vérifiez les permissions.",
        variant: "destructive",
      });
    }
  };

  const startScanning = async (reader: BrowserMultiFormatReader, deviceId?: string) => {
    if (!videoRef.current) return;

    const handleResult = (result: Result | null, error?: Error) => {
      if (result) {
        const scannedText = result.getText();
        // Ignore duplicate consecutive results
        if (scannedText === lastScanResultRef.current) {
          return;
        }
        if (isProcessingRef.current) {
          return;
        }
        isProcessingRef.current = true;
        lastScanResultRef.current = scannedText;
        setLastScanResult(scannedText);

        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        playBeep();
        stopScanning();
        setTimeout(() => {
          try {
            onScanResult(scannedText);
          } finally {
            isProcessingRef.current = false;
          }
        }, 100);
      }

      if (error) {
        const msg = (error as any)?.message || '';
        if (error.name === "NotFoundException" || msg.includes("No MultiFormat Readers")) {
          return;
        }
        console.error("Erreur de scan:", error);
      }
    };

    try {
      setIsScanning(true);

      if (deviceId) {
        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          handleResult
        );
        setScannerControls(controls);
        
        // Vérifier si la torche est disponible
        checkTorchSupport();
        return;
      }

      // Fallback strict à la caméra arrière via contraintes
      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16/9 },
          },
          audio: false,
        } as any,
        videoRef.current,
        handleResult
      );
      setScannerControls(controls);
      checkTorchSupport();
    } catch (error: any) {
      // Fallback si 'exact' n'est pas supporté
      if (error?.name === "OverconstrainedError" || error?.name === "ConstraintNotSatisfiedError") {
        try {
          const controls = await codeReader?.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false } as any,
            videoRef.current,
            handleResult
          );
          if (controls) {
            setScannerControls(controls);
            return;
          }
        } catch (e) {
          console.error("Fallback constraints error:", e);
        }
      }
      console.error("Erreur lors du démarrage du scan:", error);
      setIsScanning(false);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le scanner (caméra arrière requise)",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    try {
      // BUG FIX #2: Désactiver le torch AVANT d'arrêter le stream
      if (torchEnabled) {
        try {
          const stream = videoRef.current?.srcObject as MediaStream;
          if (stream) {
            const track = stream.getVideoTracks()[0];
            track.applyConstraints({
              advanced: [{ torch: false } as any]
            });
          }
        } catch (e) {
          console.error("Erreur désactivation torch:", e);
        }
        setTorchEnabled(false);
      }

      // BUG FIX #3: Quitter le fullscreen AVANT d'arrêter le stream
      if (isFullscreen) {
        try {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        } catch (e) {
          console.error("Erreur sortie fullscreen:", e);
        }
        setIsFullscreen(false);
      }

      // Arrêter le scanner
      try {
        scannerControls?.stop();
      } catch (e) {
        console.error("Erreur arrêt scanner controls:", e);
      }

      // BUG FIX #1: Stop any remaining video tracks as extra safety (arrêt complet du MediaStream)
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Erreur arrêt track:", e);
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }

      setScannerControls(null);
      setIsScanning(false);
      setHasTorch(false);
    } catch (error) {
      // BUG FIX #5: Catch global pour éviter les erreurs non gérées
      console.error("Erreur critique lors de l'arrêt du scanner:", error);
    }
  };

  const switchCamera = async () => {
    if (!codeReader || devices.length <= 1) return;

    try {
      const currentIndex = devices.findIndex((device) => device.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDeviceId = devices[nextIndex].deviceId;

      stopScanning();
      
      // BUG FIX #4: Attendre un peu pour permettre le cleanup complet avant de redémarrer
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSelectedDeviceId(nextDeviceId);
      await startScanning(codeReader, nextDeviceId);
    } catch (error) {
      // BUG FIX #5: Gestion d'erreur pour éviter les plantages
      console.error("Erreur lors du changement de caméra:", error);
      toast({
        title: "Erreur",
        description: "Impossible de changer de caméra",
        variant: "destructive",
      });
    }
  };

  const restartScanning = async () => {
    if (codeReader && selectedDeviceId) {
      try {
        stopScanning();
        
        // BUG FIX #4: Attendre un peu pour permettre le cleanup complet avant de redémarrer
        await new Promise(resolve => setTimeout(resolve, 300));
        
        await startScanning(codeReader, selectedDeviceId);
      } catch (error) {
        // BUG FIX #5: Gestion d'erreur pour éviter les plantages
        console.error("Erreur lors du redémarrage du scanner:", error);
        toast({
          title: "Erreur",
          description: "Impossible de redémarrer le scanner",
          variant: "destructive",
        });
      }
    }
  };

  const checkTorchSupport = async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        setHasTorch(capabilities?.torch || false);
      }
    } catch (error) {
      setHasTorch(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        
        // BUG FIX #5: Vérifier que le track est bien actif avant d'appliquer les contraintes
        if (!track || track.readyState !== 'live') {
          throw new Error("Track vidéo non actif");
        }
        
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any]
        });
        setTorchEnabled(!torchEnabled);
      }
    } catch (error) {
      console.error("Erreur torche:", error);
      toast({
        title: "Torche non disponible",
        description: "Votre appareil ne supporte pas la torche ou la caméra n'est pas active",
        variant: "destructive",
      });
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      // BUG FIX #5: Gestion d'erreur pour le fullscreen
      console.error("Erreur fullscreen:", error);
      toast({
        title: "Erreur",
        description: "Impossible de basculer en plein écran",
        variant: "destructive",
      });
    }
  };

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Silently fail if audio is not available
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-md bg-background shadow-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner de code-barres
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {hasPermission === false ? (
            <div className="text-center p-6 text-muted-foreground">
              <CameraOff className="h-12 w-12 mx-auto mb-4" />
              <p>Accès à la caméra refusé</p>
              <p className="text-sm">Veuillez autoriser l'accès à la caméra et actualiser la page</p>
            </div>
          ) : (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

                {/* Overlay de visée */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-primary w-64 h-32 rounded-lg border-dashed opacity-70">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                  </div>
                </div>

                {/* Indicateur de statut */}
                <div className="absolute top-2 left-2">
                  <Badge variant={isScanning ? "default" : "secondary"}>
                    {isScanning ? "En cours de scan..." : "Arrêté"}
                  </Badge>
                </div>
              </div>

              {lastScanResult && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Dernier code scanné:</p>
                  <p className="text-sm text-muted-foreground font-mono break-all">{lastScanResult}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={restartScanning} disabled={!codeReader} variant="outline" size="sm" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Relancer
                </Button>
                {hasTorch && (
                  <Button onClick={toggleTorch} variant="outline" size="sm">
                    {torchEnabled ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                  </Button>
                )}
                <Button onClick={toggleFullscreen} variant="outline" size="sm">
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Pointez la caméra vers un code-barres ou QR code</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  {hasTorch && <span>• Torche disponible</span>}
                  <span>• Détection automatique</span>
                  <span>• Haute résolution</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
