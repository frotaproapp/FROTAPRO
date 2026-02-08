
const DB_NAME = 'sistema_saude_v5_saas'; 
const DB_VERSION = 3; // Incremented for Alerts Schema

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // NEW: SaaS Core Store
      if (!db.objectStoreNames.contains('organizations')) {
        db.createObjectStore('organizations', { keyPath: 'id' });
      }

      // NEW: Audit Logs
      if (!db.objectStoreNames.contains('audit')) {
        const auditStore = db.createObjectStore('audit', { keyPath: 'id' });
        auditStore.createIndex('organizationId', 'organizationId', { unique: false });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Updated Stores with organizationId Index
      const createStoreWithOrgIndex = (name: string, keyPath: string = 'id') => {
          if (!db.objectStoreNames.contains(name)) {
              const store = db.createObjectStore(name, { keyPath });
              store.createIndex('organizationId', 'organizationId', { unique: false });
              return store;
          }
          try {
             // Try to create index if store exists but index is missing (for v1->v2 migration)
             const store = (event.target as IDBOpenDBRequest).transaction?.objectStore(name);
             if (store && !store.indexNames.contains('organizationId')) {
                 store.createIndex('organizationId', 'organizationId', { unique: false });
             }
          } catch(e) {}
          return null;
      };

      createStoreWithOrgIndex('trips');
      createStoreWithOrgIndex('vehicles');
      createStoreWithOrgIndex('solicitors');
      createStoreWithOrgIndex('professionals');
      createStoreWithOrgIndex('health_plans');
      createStoreWithOrgIndex('trip_types'); 
      createStoreWithOrgIndex('backup_logs');
      createStoreWithOrgIndex('alerts'); // NEW STORE FOR ALERTS
      
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('organizationId', 'organizationId', { unique: false });
        userStore.createIndex('cpf', 'cpf', { unique: false }); 
      }

      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' }); 
      }

      if (!db.objectStoreNames.contains('fs_handles')) {
         db.createObjectStore('fs_handles');
      }
    };
  });
};

export const dbOps = {
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllByOrg<T>(storeName: string, orgId: string): Promise<T[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      // Check if index exists to prevent crashes on legacy stores
      if (store.indexNames.contains('organizationId')) {
          const index = store.index('organizationId');
          const request = index.getAll(orgId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      } else {
          // Fallback: get all and filter (slower but safer)
          const request = store.getAll();
          request.onsuccess = () => {
              const res = request.result as any[];
              resolve(res.filter(item => item.organizationId === orgId));
          };
          request.onerror = () => reject(request.error);
      }
    });
  },

  async put<T>(storeName: string, item: T, key?: string): Promise<T> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      key ? store.put(item, key) : store.put(item);
      
      transaction.oncomplete = () => resolve(item);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
  },

  async delete(storeName: string, id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Explicitly capture request to monitor specific errors
      const request = store.delete(id);
      
      request.onerror = () => {
          console.error(`Error deleting from ${storeName} with id ${id}:`, request.error);
          // Don't reject here, let transaction decide, but log it.
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
  },
  
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async runTransaction(
    storeNames: string[], 
    mode: IDBTransactionMode, 
    callback: (stores: {[name: string]: IDBObjectStore}) => Promise<void>
  ): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode);
      const stores: {[name: string]: IDBObjectStore} = {};
      
      storeNames.forEach(name => {
        stores[name] = transaction.objectStore(name);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));

      Promise.resolve(callback(stores)).catch(err => {
        transaction.abort();
        reject(err);
      });
    });
  },

  async exportAllData(orgId?: string): Promise<{[storeName: string]: any[]}> {
    const db = await initDB();
    const storeNames = Array.from(db.objectStoreNames);
    const exportData: {[key: string]: any[]} = {};

    await this.runTransaction(storeNames, 'readonly', async (stores) => {
       for (const name of storeNames) {
         if (name === 'session' || name === 'fs_handles') continue;

         const request = stores[name].getAll();
         await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => {
                let data = request.result;
                if (orgId && name !== 'organizations' && name !== 'audit' && Array.isArray(data)) {
                    data = data.filter((item: any) => item.organizationId === orgId || !item.organizationId); 
                }
                exportData[name] = data;
                resolve();
            };
            request.onerror = () => reject(request.error);
         });
       }
    });

    return exportData;
  },

  async clearAndRestoreData(importData: {[storeName: string]: any[]} | null): Promise<void> {
    const db = await initDB();
    const storeNames = Array.from(db.objectStoreNames);

    await this.runTransaction(storeNames, 'readwrite', async (stores) => {
       for (const name of storeNames) {
           if (name === 'session' || name === 'fs_handles') continue; 

           stores[name].clear();

           if (importData && importData[name] && Array.isArray(importData[name])) {
               for (const item of importData[name]) {
                   stores[name].put(item);
               }
           }
       }
    });
  }
};
