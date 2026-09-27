import { useState, useEffect, useCallback } from "react";
import { useOfficesRealtime, Office, Service } from "../services/officeService";
import { OFFICES } from "../app/data/mockData";

export type OfficeWithServices = Office & { services: Service[] };

const fallbackOffices: OfficeWithServices[] = OFFICES as unknown as OfficeWithServices[];

export function useOffices() {
  const [offices, setOffices] = useState<OfficeWithServices[]>(fallbackOffices);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = useOfficesRealtime((data) => {
      setOffices(data.length > 0 ? data : fallbackOffices);
      setLoading(false);
    });
    return unsubscribe;
  }, [refreshKey]);

  return { offices, loading, refetch: () => setRefreshKey((key) => key + 1) };
}