import { maskSivPlate } from "@/lib/vehicleFormatting";
import { useState, useRef, useCallback } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { requestCameraPermission } from "@/lib/permissionManager";

interface LicensePlateScannerProps {
  onPlateDetected: (plate: string) => void;
  disabled?: boolean;
}

export function LicensePlateScanner({ onPlateDetected, disabled }: LicensePlateScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const permissionGranted = await requestCameraPermission();
      if (!permissionGranted) {
        toast({
          title: "Permission refusée",
          description: "Autorisez l'accès à la caméra pour scanner les plaques",
          variant: "destructive",
        });
        setIsOpen(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Erreur caméra:", error);
      toast({ title: "Erreur", description: "Impossible d'accéder à la caméra", variant: "destructive" });
      setIsOpen(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      // Import dynamique de tesseract.js pour éviter le chargement au démarrage
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("fra", 1, {
        logger: () => {},
      });

      // Configuration optimisée pour les plaques d'immatriculation
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
      });

      const { data } = await worker.recognize(canvas);
      await worker.terminate();

      // Chercher un pattern de plaque dans le texte détecté
      const text = data.text.toUpperCase().replace(/\s+/g, "");
      const plateRegex = /[A-Z]{2}[^A-Z0-9]*[0-9]{3}[^A-Z0-9]*[A-Z]{2}/;
      const match = text.match(plateRegex);

      if (match) {
        const plate = maskSivPlate(match[0]);
        onPlateDetected(plate);
        toast({ title: "✅ Plaque détectée", description: plate });
        stopCamera();
        setIsOpen(false);
      } else {
        toast({
          title: "Plaque non détectée",
          description: "Rapprochez la caméra de la plaque et réessayez",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur OCR:", error);
      toast({ title: "Erreur", description: "Impossible de lire la plaque", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [onPlateDetected, stopCamera, toast]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(startCamera, 100);
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleOpen}
        disabled={disabled}
        className="w-11 h-11 border-2 hover:bg-blue-50 shrink-0"
        title="Scanner la plaque d'immatriculation"
      >
        <Camera className="w-5 h-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner la plaque
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Zone de visée pour la plaque */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-primary w-72 h-16 rounded border-dashed opacity-80" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <p className="text-sm text-muted-foreground text-center">
              Centrez la plaque dans le cadre puis appuyez sur "Capturer"
            </p>

            <div className="flex gap-2">
              <Button
                onClick={captureAndProcess}
                disabled={!isCameraReady || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lecture en cours...
                  </>
                ) : (
                  "📸 Capturer la plaque"
                )}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
