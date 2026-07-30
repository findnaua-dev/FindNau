import { useState, useEffect, useCallback } from "react";
import { fetchOffices, Office, Service } from "../services/officeService";

export type OfficeWithServices = Office & { services: Service[] };

export function useOffices() {
  const [offices, setOffices] = useState<OfficeWithServices[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOffices();
      setOffices(data);
    } catch (err) {
      console.error('Failed to fetch offices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { offices, loading, refetch: fetchData };
}