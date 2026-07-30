import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Save, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useFaqsRealtime, addFaq, updateFaq, deleteFaq, Faq } from '../../../services/faqService';

const emptyFaq: Faq = {
  question: '',
  questionFilipino: '',
  answer: '',
  answerFilipino: '',
};

export default function AdminFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState<Faq>({ ...emptyFaq });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const unsub = useFaqsRealtime(setFaqs);
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.question.trim()) return;
    if (editing?.id) {
      await updateFaq(editing.id, form);
    } else {
      await addFaq(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ ...emptyFaq });
  };

  const handleDelete = async (id: string) => {
    await deleteFaq(id);
    setDeleteConfirm(null);
  };

  const filtered = faqs.filter(f =>
    !search ||
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.questionFilipino.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">FAQ Management</h2>
          <p className="text-sm text-gray-400">{faqs.length} frequently asked questions</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ ...emptyFaq }); setShowForm(true); }}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600"
        >
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          id="faq-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search FAQs..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          aria-label="Search FAQs"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(faq => (
          <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-start justify-between p-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(expanded === faq.id ? null : faq.id!)}
                    className="text-left flex-1"
                    aria-expanded={expanded === faq.id ? "true" : "false"}
                    aria-label={`Toggle answer for ${faq.question}`}
                  >
                    <div className="flex items-center gap-2">
                      {expanded === faq.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{faq.question}</p>
                        <p className="text-xs text-gray-400">{faq.questionFilipino}</p>
                      </div>
                    </div>
                  </button>
                </div>
                {expanded === faq.id && (
                  <div className="mt-3 pl-8 border-l-2 border-orange-200">
                    <p className="text-sm text-gray-600 mb-2"><strong>EN:</strong> {faq.answer}</p>
                    <p className="text-sm text-gray-600"><strong>FIL:</strong> {faq.answerFilipino}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => { setForm({ ...faq }); setEditing(faq); setShowForm(true); }}
                  className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"
                  aria-label="Edit FAQ"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(faq.id!)}
                  className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400"
                  aria-label="Delete FAQ"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold text-gray-800">
                {editing ? 'Edit FAQ' : 'New FAQ'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="faq-question-en" className="text-xs font-medium text-gray-600 block mb-1">
                    Question (English) *
                  </label>
                  <input
                    id="faq-question-en"
                    value={form.question}
                    onChange={e => setForm({ ...form, question: e.target.value })}
                    placeholder="e.g., What are the office hours?"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label htmlFor="faq-question-fil" className="text-xs font-medium text-gray-600 block mb-1">
                    Question (Filipino)
                  </label>
                  <input
                    id="faq-question-fil"
                    value={form.questionFilipino}
                    onChange={e => setForm({ ...form, questionFilipino: e.target.value })}
                    placeholder="e.g., Ano ang oras ng opisina?"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="faq-answer-en" className="text-xs font-medium text-gray-600 block mb-1">
                    Answer (English)
                  </label>
                  <textarea
                    id="faq-answer-en"
                    value={form.answer}
                    onChange={e => setForm({ ...form, answer: e.target.value })}
                    rows={3}
                    placeholder="Full answer..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="faq-answer-fil" className="text-xs font-medium text-gray-600 block mb-1">
                    Answer (Filipino)
                  </label>
                  <textarea
                    id="faq-answer-fil"
                    value={form.answerFilipino}
                    onChange={e => setForm({ ...form, answerFilipino: e.target.value })}
                    rows={3}
                    placeholder="Buong sagot..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-600"
                >
                  <Save size={16} />
                  {editing ? 'Update FAQ' : 'Add FAQ'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Delete FAQ?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}