import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, Result } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScanResult: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanResult, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [lastScanResult, setLastScanResult] = useState<string>("");
  const { toast } = useToast();

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
      const reader = new BrowserMultiFormatReader();
      setCodeReader(reader);

      // Demander les permissions de caméra avec contrainte stricte pour la caméra arrière
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Force l'utilisation de la caméra arrière
        } 
      });
      
      setHasPermission(true);
      
      // Arrêter le stream temporaire
      stream.getTracks().forEach(track => track.stop());

      // Obtenir la liste des caméras disponibles
      const videoDevices = await reader.listVideoInputDevices();
      
      // Filtrer pour ne garder que les caméras arrière
      const backCameras = videoDevices.filter(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment') ||
        !device.label.toLowerCase().includes('front')
      );
      
      // Si aucune caméra arrière détectée, utiliser la première disponible
      const camerasToUse = backCameras.length > 0 ? backCameras : videoDevices;
      setDevices(camerasToUse);
      
      if (camerasToUse.length > 0) {
        const deviceId = camerasToUse[0].deviceId;
        setSelectedDeviceId(deviceId);
        startScanning(reader, deviceId);
      }
    } catch (error) {
      console.error('Erreur d\'initialisation du scanner:', error);
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

    try {
      setIsScanning(true);
      
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result: Result | null, error?: Error) => {
          if (result) {
            const scannedText = result.getText();
            setLastScanResult(scannedText);
            onScanResult(scannedText);
            
            toast({
              title: "Code scanné !",
              description: `Code détecté: ${scannedText}`,
            });

            // Arrêter le scan après détection réussie
            stopScanning();
          }
          
          if (error && !(error.name === 'NotFoundException')) {
            console.error('Erreur de scan:', error);
          }
        }
      );

    } catch (error) {
      console.error('Erreur lors du démarrage du scan:', error);
      setIsScanning(false);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le scanner",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (codeReader) {
      codeReader.reset();
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (!codeReader || devices.length <= 1) return;

    const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    
    stopScanning();
    setSelectedDeviceId(nextDeviceId);
    startScanning(codeReader, nextDeviceId);
  };

  const restartScanning = () => {
    if (codeReader && selectedDeviceId) {
      stopScanning();
      startScanning(codeReader, selectedDeviceId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background">
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
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
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
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {lastScanResult}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={restartScanning}
                  disabled={!codeReader}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Relancer
                </Button>
                
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Pointez la caméra vers un code-barres ou QR code
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}