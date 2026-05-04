import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Report } from '../types';

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setReports((data as Report[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReports(prev => [payload.new as Report, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev =>
              prev.map(r => (r.id === payload.new.id ? (payload.new as Report) : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
