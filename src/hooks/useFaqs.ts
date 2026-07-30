import { useEffect, useState } from "react";
import { useFaqsRealtime, Faq } from "../services/faqService";

export function useFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = useFaqsRealtime((data) => {
      setFaqs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { faqs, loading };
}