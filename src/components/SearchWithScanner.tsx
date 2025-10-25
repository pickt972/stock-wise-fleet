import { useState } from "react";
import { Camera } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { BarcodeScanner } from "./scanner/BarcodeScanner";

interface SearchWithScannerProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onScan?: (scannedValue: string) => void;
  disabled?: boolean;
  className?: string;
}

export const SearchWithScanner = ({
  placeholder = "Chercher...",
  value,
  onChange,
  onScan,
  disabled = false,
  className = ""
}: SearchWithScannerProps) => {
  const [showScanner, setShowScanner] = useState(false);
  
  const handleScanSuccess = (scannedCode: string) => {
    onChange(scannedCode);
    setShowScanner(false);
    
    if (onScan) {
      onScan(scannedCode);
    }
  };
  
  return (
    <>
      <div className={`flex gap-2 w-full ${className}`}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 h-11 border-2"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowScanner(true)}
          disabled={disabled}
          className="w-11 h-11 border-2 hover:bg-blue-50"
          title="Scanner article"
        >
          <Camera className="w-5 h-5" />
        </Button>
      </div>
      
      <BarcodeScanner
        isOpen={showScanner}
        onScanResult={handleScanSuccess}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
};
