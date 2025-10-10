import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineStorage, PendingOperation } from "@/lib/offlineStorage";
import { useToast } from "@/hooks/use-toast";

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Initialiser le stockage
  useEffect(() => {
    offlineStorage.init().catch(console.error);
  }, []);

  // Mettre à jour le compteur d'opérations en attente
  const updatePendingCount = useCallback(async () => {
    try {
      const operations = await offlineStorage.getPendingOperations();
      setPendingCount(operations.length);
    } catch (error) {
      console.error("Erreur lors de la récupération des opérations:", error);
    }
  }, []);

  // Synchroniser les opérations en attente
  const syncPendingOperations = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let errorCount = 0;

    try {
      const operations = await offlineStorage.getPendingOperations();
      
      if (operations.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`Synchronisation de ${operations.length} opération(s)...`);

      // Trier par timestamp pour respecter l'ordre
      operations.sort((a, b) => a.timestamp - b.timestamp);

      for (const operation of operations) {
        try {
          await syncOperation(operation);
          await offlineStorage.markAsSynced(operation.id);
          syncedCount++;
        } catch (error: any) {
          console.error(`Erreur lors de la sync de l'opération ${operation.id}:`, error);
          await offlineStorage.markAsError(operation.id, error.message);
          errorCount++;
        }
      }

      // Nettoyer les opérations synchronisées
      await offlineStorage.cleanupSyncedOperations(7);

      if (syncedCount > 0) {
        toast({
          title: "Synchronisation réussie",
          description: `${syncedCount} opération(s) synchronisée(s)`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Erreurs de synchronisation",
          description: `${errorCount} opération(s) en erreur`,
          variant: "destructive",
        });
      }

      await updatePendingCount();
    } catch (error) {
      console.error("Erreur générale de synchronisation:", error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, toast, updatePendingCount]);

  // Synchroniser une opération individuelle
  const syncOperation = async (operation: PendingOperation) => {
    const { type, table, data } = operation;

    switch (type) {
      case 'insert': {
        const { error: insertError } = await supabase.from(table as any).insert(data);
        if (insertError) throw insertError;
        break;
      }

      case 'update': {
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from(table as any)
          .update(updateData)
          .eq('id', id);
        if (updateError) throw updateError;
        break;
      }

      case 'delete': {
        const { error: deleteError } = await supabase
          .from(table as any)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
      }

      default:
        throw new Error(`Type d'opération inconnu: ${type}`);
    }
  };

  // Ajouter une opération hors ligne
  const addOfflineOperation = useCallback(async (
    type: 'insert' | 'update' | 'delete',
    table: string,
    data: any
  ) => {
    try {
      await offlineStorage.addPendingOperation({ type, table, data });
      await updatePendingCount();
      
      toast({
        title: "Sauvegardé localement",
        description: "L'opération sera synchronisée dès que possible",
      });

      // Essayer de synchroniser immédiatement si en ligne
      if (isOnline) {
        setTimeout(() => syncPendingOperations(), 1000);
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'opération:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'opération",
        variant: "destructive",
      });
    }
  }, [isOnline, syncPendingOperations, toast, updatePendingCount]);

  // Gérer les changements de connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("Connexion détectée, synchronisation...");
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("Hors ligne");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Synchroniser au chargement si en ligne
    if (isOnline) {
      updatePendingCount();
      syncPendingOperations();
    }

    // Synchroniser périodiquement (toutes les 2 minutes)
    const interval = setInterval(() => {
      if (isOnline) {
        syncPendingOperations();
      }
    }, 2 * 60 * 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, syncPendingOperations, updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addOfflineOperation,
    syncPendingOperations,
  };
}
