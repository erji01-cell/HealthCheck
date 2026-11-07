import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 100;

export default function usePagedRecords({ client, enabled, table, columns, dateColumn }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const nextOffset = useRef(0);
  const inFlight = useRef(false);
  const requestId = useRef(0);
  const loadedIds = useRef(new Set());

  const loadPage = useCallback(async (offset) => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      // 1件余分に取得し、全件数を数えずに続きを判定する。
      const { data, error: queryError } = await client.from(table).select(columns)
        .order(dateColumn, { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE);
      if (currentRequest !== requestId.current) return;
      if (queryError) throw queryError;
      const pageRows = (data || []).slice(0, PAGE_SIZE);
      if (offset === 0) loadedIds.current.clear();
      pageRows.forEach(row => loadedIds.current.add(row.id));
      setRows(previous => offset === 0 ? pageRows : [...new Map([...previous, ...pageRows].map(row => [row.id, row])).values()]);
      nextOffset.current = offset + pageRows.length;
      setHasMore((data || []).length > PAGE_SIZE);
    } catch (queryError) {
      if (currentRequest !== requestId.current) return;
      console.error('一覧の取得に失敗:', queryError);
      setError('一覧を取得できませんでした。もう一度お試しください。');
    } finally {
      if (currentRequest === requestId.current) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  }, [client, enabled, table, columns, dateColumn]);

  useEffect(() => {
    nextOffset.current = 0;
    loadedIds.current.clear();
    setRows([]);
    setHasMore(false);
    setError('');
    setLoading(false);
    if (enabled) loadPage(0);
    return () => {
      requestId.current += 1;
      inFlight.current = false;
    };
  }, [enabled, loadPage]);

  const removeRecord = (id) => {
    requestId.current += 1;
    inFlight.current = false;
    setLoading(false);
    if (loadedIds.current.delete(id)) nextOffset.current = Math.max(0, nextOffset.current - 1);
    setRows(previous => previous.filter(row => row.id !== id));
  };

  return {
    rows, loading, hasMore, error, removeRecord,
    loadMore: () => loadPage(nextOffset.current),
    reload: () => loadPage(0),
  };
}
