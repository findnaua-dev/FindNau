import { useEffect, useState } from "react";
import { useAnnouncementsRealtime, Announcement } from "../services/announcementService";
import { ANNOUNCEMENTS } from "../app/data/mockData";

const fallbackAnnouncements: Announcement[] = ANNOUNCEMENTS as Announcement[];

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(fallbackAnnouncements);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = useAnnouncementsRealtime((data) => {
      const nextAnnouncements = data && data.length > 0 ? data : fallbackAnnouncements;
      setAnnouncements(nextAnnouncements);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { announcements, loading };
}