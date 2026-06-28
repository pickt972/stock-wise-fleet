/**
 * BarcodeScanner — moteur hybride
 *
 * Stratégie de détection (par ordre de priorité) :
 *   1. BarcodeDetector API (W3C) — natif GPU, instantané, Chrome/Android/Edge
 *   2. ZXing (@zxing/browser)    — fallback JS universel (iOS Safari, Firefox…)
 *
 * Zéro dépendance ajoutée. Portable hors Lovable (Vercel, VPS, Capacitor…).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CameraOff, RotateCcw, Flashlight, FlashlightOff, Maximize2, Minimize2, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BarcodeScannerProps {
  onScanResult: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

type Engine = "native" | "zxing" | "detecting";

// ─── Détection support BarcodeDetector ─────────────────────────────────────────

function isBarcodeDetectorSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

const NATIVE_FORMATS = [
  "code_128", "code_39", "code_93", "codabar",
  "ean_13", "ean_8", "upc_a", "upc_e",
  "itf", "data_matrix", "qr_code", "pdf417", "aztec",
];

// ─── Utilitaires ───────────────────────────────────────────────────────────────

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* silencieux */ }
}

function vibrate() {
  try { navigator.vibrate?.([80, 40, 80]); } catch { /* silencieux */ }
}

// ─── Composant ─────────────────────────────────────────────────────────────────

export function BarcodeScanner({ onScanResult, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const rafRef         = useRef<number | null>(null);
  const zxingCtrlRef   = useRef<IScannerControls | null>(null);
  const lockedRef      = useRef(false);
  const mountedRef     = useRef(false);

  const [engine, setEngine]           = useState<Engine>("detecting");
  const [isScanning, setIsScanning]   = useState(false);
  const [hasTorch, setHasTorch]       = useState(false);
  const [torchOn, setTorchOn]         = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [permDenied, setPermDenied]   = useState(false);
  const [lastCode, setLastCode]       = useState("");
  const [lastFormat, setLastFormat]   = useState("");

  const { toast } = useToast();

  // ── Nettoyage complet ────────────────────────────────────────────────────────

  const stopAll = useCallback(() => {
    // Annuler la boucle RAF (moteur natif)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Arrêter ZXing
    try { zxingCtrlRef.current?.stop(); } catch { /* silencieux */ }
    zxingCtrlRef.current = null;
    // Éteindre la torche puis stopper le stream
    const stream = streamRef.current;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        try { track.applyConstraints({ advanced: [{ torch: false } as any] }); } catch { /* silencieux */ }
        stream.getTracks().forEach((t) => t.stop());
      }
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  // ── Callback résultat (partagé natif + ZXing) ────────────────────────────────

  const handleCode = useCallback((text: string, format: string) => {
    if (!mountedRef.current || lockedRef.current) return;
    lockedRef.current = true;
    setLastCode(text);
    setLastFormat(format);
    stopAll();
    vibrate();
    playBeep();
    toast({ title: "✅ Code détecté", description: `${format} — ${text}` });
    setTimeout(() => { try { onScanResult(text); } catch { /* silencieux */ } }, 80);
  }, [onScanResult, stopAll, toast]);

  // ── Obtenir le flux caméra ───────────────────────────────────────────────────

  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      return stream;
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPermDenied(true);
        toast({ title: "Permission refusée", description: "Autorisez la caméra dans les réglages du navigateur.", variant: "destructive" });
      } else {
        toast({ title: "Erreur caméra", description: "Impossible d'accéder à la caméra.", variant: "destructive" });
      }
      return null;
    }
  }, [toast]);

  const attachStreamToVideo = (stream: MediaStream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.setAttribute("playsinline", "true");
    videoRef.current.muted = true;
    return new Promise<void>((resolve) => {
      videoRef.current!.onloadedmetadata = () => {
        videoRef.current!.play().then(resolve).catch(resolve);
      };
    });
  };

  const detectTorchSupport = (stream: MediaStream) => {
    try {
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities() as any;
      setHasTorch(!!caps?.torch);
    } catch { setHasTorch(false); }
  };

  // ── MOTEUR 1 : BarcodeDetector (natif) ──────────────────────────────────────

  const startNative = useCallback(async () => {
    const stream = await getStream();
    if (!stream || !mountedRef.current) return;
    await attachStreamToVideo(stream);
    detectTorchSupport(stream);

    let detector: any;
    try {
      detector = new (window as any).BarcodeDetector({ formats: NATIVE_FORMATS });
    } catch {
      // BarcodeDetector instanciation impossible malgré la détection — fallback ZXing
      startZXing();
      return;
    }

    setEngine("native");
    setIsScanning(true);

    const loop = async () => {
      if (!mountedRef.current || lockedRef.current) return;
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const codes: any[] = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            handleCode(codes[0].rawValue, codes[0].format ?? "barcode");
            return; // ne pas relancer la boucle
          }
        } catch { /* frame ignorée */ }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [getStream, handleCode]);

  // ── MOTEUR 2 : ZXing (fallback universel) ───────────────────────────────────

  const startZXing = useCallback(async () => {
    const stream = await getStream();
    if (!stream || !mountedRef.current) return;
    if (videoRef.current) videoRef.current.srcObject = stream;
    detectTorchSupport(stream);

    setEngine("zxing");
    setIsScanning(true);

    const reader = new BrowserMultiFormatReader();
    try {
      const ctrl = await reader.decodeFromStream(
        stream,
        videoRef.current!,
        (result, err) => {
          if (result) handleCode(result.getText(), result.getBarcodeFormat()?.toString() ?? "barcode");
          if (err && (err as any).name !== "NotFoundException") {
            // Ignorer les frames sans code — comportement normal
          }
        }
      );
      zxingCtrlRef.current = ctrl;
    } catch (e) {
      console.error("ZXing start error:", e);
      toast({ title: "Erreur scanner", description: "Impossible de démarrer le scanner.", variant: "destructive" });
      setIsScanning(false);
    }
  }, [getStream, handleCode, toast]);

  // ── Démarrage avec détection automatique du moteur ──────────────────────────

  const start = useCallback(() => {
    lockedRef.current = false;
    setLastCode("");
    setLastFormat("");
    setEngine("detecting");
    if (isBarcodeDetectorSupported()) {
      startNative();
    } else {
      startZXing();
    }
  }, [startNative, startZXing]);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      mountedRef.current = true;
      start();
    } else {
      mountedRef.current = false;
      stopAll();
    }
    return () => {
      mountedRef.current = false;
      stopAll();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Torche ───────────────────────────────────────────────────────────────────

  const toggleTorch = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    try {
      const track = stream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch {
      toast({ title: "Torche indisponible", description: "Cet appareil ne supporte pas la torche.", variant: "destructive" });
    }
  };

  // ── Fullscreen ───────────────────────────────────────────────────────────────

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch { /* silencieux */ }
  };

  // ── UI ───────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const engineLabel = engine === "native" ? "⚡ Natif" : engine === "zxing" ? "ZXing" : "…";
  const engineColor = engine === "native" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4"
    >
      <Card className="w-full max-w-md bg-background shadow-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner
            </span>
            <div className="flex items-center gap-2">
              {engine !== "detecting" && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${engineColor}`}>
                  {engineLabel}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={() => { stopAll(); onClose(); }}>✕</Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {permDenied ? (
            <div className="text-center p-6 text-muted-foreground">
              <CameraOff className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="font-medium">Accès caméra refusé</p>
              <p className="text-sm mt-1">Autorisez la caméra dans les réglages de votre navigateur puis actualisez.</p>
            </div>
          ) : (
            <>
              {/* Viewfinder */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

                {/* Visée */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-32">
                    {/* Coins animés */}
                    {[
                      "top-0 left-0 border-t-2 border-l-2",
                      "top-0 right-0 border-t-2 border-r-2",
                      "bottom-0 left-0 border-b-2 border-l-2",
                      "bottom-0 right-0 border-b-2 border-r-2",
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-5 h-5 border-primary ${cls}`} />
                    ))}
                    {/* Ligne de scan animée */}
                    {isScanning && (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-primary/70"
                        style={{ animation: "scan-line 1.8s ease-in-out infinite", top: "50%" }}
                      />
                    )}
                  </div>
                </div>

                {/* Badge statut */}
                <div className="absolute top-2 left-2">
                  <Badge variant={isScanning ? "default" : "secondary"} className="text-[10px]">
                    {isScanning ? "Scan en cours…" : "Arrêté"}
                  </Badge>
                </div>
              </div>

              {/* Dernier code */}
              {lastCode && (
                <div className="p-3 bg-success/8 border border-success/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-success">Code détecté</p>
                    {lastFormat && <Badge variant="outline" className="text-[10px]">{lastFormat}</Badge>}
                  </div>
                  <p className="text-sm font-mono text-foreground break-all">{lastCode}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={start} variant="outline" size="sm" className="flex-1 gap-1.5">
                  <RotateCcw className="h-4 w-4" />
                  Relancer
                </Button>
                {hasTorch && (
                  <Button onClick={toggleTorch} variant={torchOn ? "default" : "outline"} size="sm" className="gap-1.5">
                    {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                  </Button>
                )}
                <Button onClick={toggleFullscreen} variant="outline" size="sm">
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Centrez le code dans le cadre • Détection automatique
                {engine === "native" && <span className="ml-2 text-success font-medium">⚡ Moteur natif actif</span>}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-28px); opacity: 0.3; }
          50%       { transform: translateY(28px);  opacity: 1; }
        }
      `}</style>
    </div>
  );
}
