
import { HistoryItem } from '../types';

const DB_NAME = 'BookScopeDB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
        reject(new Error("IndexedDB is not supported in this browser."));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create an object store with 'id' as the key path
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to open database: ${request.error?.message}`));
  });
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as HistoryItem[];
        // Sort by timestamp descending (newest first)
        const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sortedItems);
      };
      
      request.onerror = () => reject(new Error(`Failed to load history: ${request.error?.message}`));
    });
  } catch (error) {
    console.error("Error accessing IndexedDB:", error);
    return [];
  }
};

export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  try {
    const db = await openDB();
    
    // 1. Save the new item
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save item: ${request.error?.message}`));
    });

    // 2. Prune old items to keep the database size reasonable (e.g., keep last 20)
    // We reload the history to check count, then delete if necessary
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
        const items = getAllRequest.result as HistoryItem[];
        if (items.length > 20) {
            // Sort to find oldest
            items.sort((a, b) => b.timestamp - a.timestamp);
            const toDelete = items.slice(20);
            
            toDelete.forEach(oldItem => {
                store.delete(oldItem.id);
            });
        }
    };

  } catch (error) {
    console.error("Error saving to IndexedDB:", error);
    // Suppress error to avoid crashing the app flow, but log it
  }
};

export const deleteHistoryItem = async (id: string): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete item: ${request.error?.message}`));
    });
    
    // Return updated list
    return await getHistory();
  } catch (error) {
    console.error("Error deleting from IndexedDB:", error);
    return [];
  }
};
