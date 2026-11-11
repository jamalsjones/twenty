import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { OBJECT_SPECS, type ObjectKey } from '../src/schema/objects';
import { type AnyRecord, listRecords, SessionExpiredError } from './api';

type Data = Record<string, AnyRecord[]>;

type Store = {
  data: Data;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  records: (objectKey: string) => AnyRecord[];
  find: (objectKey: string, id: unknown) => AnyRecord | undefined;
};

const StoreContext = createContext<Store | null>(null);

export const WORKSPACE_MEMBER = 'workspaceMember';

const pluralOf = (objectKey: string) =>
  objectKey === WORKSPACE_MEMBER
    ? 'workspaceMembers'
    : OBJECT_SPECS[objectKey as ObjectKey].namePlural;

const ALL_OBJECTS = [...Object.keys(OBJECT_SPECS), WORKSPACE_MEMBER];

type StoreProviderProps = { children: ReactNode; onSessionExpired: () => void };

// The whole program fits in memory for a workspace this size, so the console
// loads every object once and derives each screen from it.
export const StoreProvider = ({
  children,
  onSessionExpired,
}: StoreProviderProps) => {
  const [data, setData] = useState<Data>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const lists = await Promise.all(
        ALL_OBJECTS.map((objectKey) => listRecords(pluralOf(objectKey))),
      );

      setData(
        Object.fromEntries(
          ALL_OBJECTS.map((key, index) => [key, lists[index]]),
        ),
      );
      setError(null);
    } catch (loadError) {
      if (loadError instanceof SessionExpiredError) onSessionExpired();
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const store = useMemo<Store>(() => {
    const indexes = new Map<string, Map<string, AnyRecord>>();
    const indexOf = (objectKey: string) => {
      if (!indexes.has(objectKey)) {
        indexes.set(
          objectKey,
          new Map((data[objectKey] ?? []).map((record) => [record.id, record])),
        );
      }

      return indexes.get(objectKey) as Map<string, AnyRecord>;
    };

    return {
      data,
      isLoading,
      error,
      reload,
      records: (objectKey) => data[objectKey] ?? [],
      find: (objectKey, id) =>
        typeof id === 'string' ? indexOf(objectKey).get(id) : undefined,
    };
  }, [data, isLoading, error, reload]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  const store = useContext(StoreContext);

  if (!store) throw new Error('useStore must be used inside StoreProvider');

  return store;
};

export { pluralOf };
