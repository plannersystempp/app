import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useUrlState<T extends string | number>(key: string, initialState: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramValue = searchParams.get(key);

  const value = paramValue !== null 
    ? (typeof initialState === 'number' ? Number(paramValue) : paramValue) as T
    : initialState;

  const setValue = useCallback((newValue: T) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newValue === '' || newValue === null || newValue === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(newValue));
      }
      return newParams;
    });
  }, [key, setSearchParams]);

  return [value, setValue] as const;
}
