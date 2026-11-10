import { useCallback, useEffect, useState } from 'react';

type AsyncState<TData> = {
  data: TData | null;
  error: string | null;
  isLoading: boolean;
};

// Front components have no host data layer, so each widget loads its own
// records on mount; this is the one place an effect is the right tool.
export const useAsync = <TData>(load: () => Promise<TData>, key: string) => {
  const [state, setState] = useState<AsyncState<TData>>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    load()
      .then((data) => {
        if (isCurrent) setState({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { ...state, reload };
};
