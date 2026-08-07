import { useState, useEffect, useMemo, memo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Save, X, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAnnouncements } from '../../../hooks/useAnnouncements';
import {
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  Announcement,
} from '../../../services/announcementService';
import { addNotification } from '../../../services/notificationService';

const emptyAnnouncement: Announcement = {
  title: '',
  titleFilipino: '',
  content: '',
  contentFilipino: '',
  category: 'Announcement',
  urgent: false,
  date: new Date().toLocaleDateString(),
};

const categoryOptions = ['Notice', 'Health', 'Announcement', 'Business', 'Tax'];

const catColors: Record<string, string> = {
  Notice: 'bg-blue-100 text-blue-700',
  Health: 'bg-green-100 text-green-700',
  Announcement: 'bg-orange-100 text-orange-700',
  Business: 'bg-purple-100 text-purple-700',
  Tax: 'bg-red-100 text-red-700',
};

export default function AdminAnnouncements() {
  const { announcements, loading } = useAnnouncements();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Announcement>({ ...emptyAnnouncement });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      if (editing?.id) {
        await updateAnnouncement(editing.id, form);
        addNotification({
          title: 'Announcement Updated',
          message: `"${form.title}" has been updated.`,
          time: new Date().toLocaleString(),
          read: false,
          type: 'info',
        });
      } else {
        await addAnnouncement({ ...form, date: form.date || new Date().toLocaleDateString() });
        addNotification({
          title: 'New Announcement',
          message: `"${form.title}" published.`,
          time: new Date().toLocaleString(),
          read: false,
          type: 'info',
        });
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyAnnouncement });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncement(id);
    setDeleteConfirm(null);
  };

  const filtered = useMemo(() => {
    if (!search) return announcements;
    const q = search.toLowerCase();
    return announcements.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.titleFilipino.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.contentFilipino.toLowerCase().includes(q)
    );
  }, [announcements, search]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading announcements…</div>;

  return (
    <div className="space-y-5 max-w-5xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Announcements</h2>
          <p className="text-sm text-gray-400">{announcements.length} total</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ ...emptyAnnouncement });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search announcements…"
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(ann => (
          <div key={ann.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-start justify-between p-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColors[ann.category] || 'bg-gray-100 text-gray-600'}`}>
                    {ann.category}
                  </span>
                  {ann.urgent && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                      <AlertCircle size={10} /> Urgent
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExpanded(expanded === ann.id ? null : ann.id!)}
                  className="text-left w-full"
                >
                  <div className="flex items-center gap-2">
                    {expanded === ann.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{ann.title}</p>
                      <p className="text-xs text-gray-400">{ann.titleFilipino}</p>
                    </div>
                  </div>
                </button>
                {expanded === ann.id && (
                  <div className="mt-3 pl-8 border-l-2 border-orange-200 space-y-2">
                    <p className="text-sm text-gray-600"><strong>EN:</strong> {ann.content}</p>
                    <p className="text-sm text-gray-600"><strong>FIL:</strong> {ann.contentFilipino}</p>
                    <p className="text-xs text-gray-400">Published: {ann.date}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => { setForm({ ...ann }); setEditing(ann); setShowForm(true); }}
                  className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(ann.id!)}
                  className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No announcements found.</p>
            <button onClick={() => setShowForm(true)} className="text-orange-500 text-sm mt-1">Create one</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold text-gray-800">
                {editing ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Title (EN) *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    placeholder="e.g., New Office Hours"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Title (Filipino)</label>
                  <input
                    value={form.titleFilipino}
                    onChange={e => setForm({ ...form, titleFilipino: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                    placeholder="e.g., Bagong Oras ng Opisina"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Content (EN) *</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    rows={4}
                    className="w-full border rounded-lg px-3 py-2 text-xs resize-none"
                    placeholder="Full announcement text..."
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Content (Filipino)</label>
                  <textarea
                    value={form.contentFilipino}
                    onChange={e => setForm({ ...form, contentFilipino: e.target.value })}
                    rows={4}
                    className="w-full border rounded-lg px-3 py-2 text-xs resize-none"
                    placeholder="Buong teksto ng anunsyo..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.urgent}
                      onChange={e => setForm({ ...form, urgent: e.target.checked })}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-xs text-gray-700">Urgent</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Date</label>
                <input
                  type="text"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  placeholder="MM/DD/YYYY"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-600"
                >
                  <Save size={16} />
                  {editing ? 'Update' : 'Publish'}
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
            <h3 className="text-base font-semibold text-gray-800 mb-2">Delete Announcement?</h3>
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