import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function OfflineSyncStatus() {
  const { isOnline, isSyncing, pendingCount, syncPendingOperations } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline">En ligne</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connecté - Toutes les données sont synchronisées</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline">Hors ligne</span>
                {pendingCount > 0 && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span>{pendingCount}</span>
                  </>
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mode hors ligne actif</p>
            {pendingCount > 0 && (
              <p className="text-xs">{pendingCount} opération(s) en attente de synchronisation</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={syncPendingOperations}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
              <Badge variant="secondary" className="ml-1">
                {pendingCount}
              </Badge>
              <span className="hidden sm:inline">
                {isSyncing ? "Synchronisation..." : "À synchroniser"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{pendingCount} opération(s) en attente de synchronisation</p>
            <p className="text-xs">Cliquez pour synchroniser maintenant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
