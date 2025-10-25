// Gestion du stockage local avec IndexedDB pour le mode hors ligne

const DB_NAME = 'StockAutoOfflineDB';
const DB_VERSION = 1;

export interface PendingOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  synced: boolean;
  error?: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les opérations en attente
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const operationsStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          operationsStore.createIndex('synced', 'synced', { unique: false });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store pour le cache des données
        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
          cacheStore.createIndex('table', 'table', { unique: false });
        }
      };
    });
  }

  // Ajouter une opération en attente
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    if (!this.db) await this.init();

    const id = `${operation.type}_${operation.table}_${Date.now()}_${Math.random()}`;
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.add(pendingOp);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // Récupérer toutes les opérations non synchronisées
  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readonly');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(0)); // 0 = false pour IndexedDB

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Marquer une opération comme synchronisée
  async markAsSynced(operationId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.get(operationId);

      request.onsuccess = () => {
        const operation = request.result;
        if (operation) {
          operation.synced = true;
          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Marquer une opération comme en erreur
  async markAsError(operationId: string, error: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.get(operationId);

      request.onsuccess = () => {
        const operation = request.result;
        if (operation) {
          operation.error = error;
          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Supprimer une opération
  async deleteOperation(operationId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.delete(operationId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Mettre en cache des données
  async cacheData(table: string, key: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.put({
        key: `${table}_${key}`,
        table,
        data,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Récupérer des données en cache
  async getCachedData(table: string, key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.get(`${table}_${key}`);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Nettoyer les opérations synchronisées anciennes
  async cleanupSyncedOperations(olderThanDays: number = 7): Promise<void> {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(1)); // 1 = true pour IndexedDB

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const operation = cursor.value as PendingOperation;
          if (operation.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
