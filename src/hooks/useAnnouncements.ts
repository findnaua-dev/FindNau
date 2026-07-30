import { useEffect, useState } from "react";
import { useAnnouncementsRealtime, Announcement } from "../services/announcementService";

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = useAnnouncementsRealtime((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { announcements, loading };
}