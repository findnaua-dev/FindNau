import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Eye, AlertCircle } from 'lucide-react';
import {
  useAnnouncementsRealtime,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  Announcement,
} from '../../../services/announcementService';

const emptyAnnouncement: Announcement = {
  title: '',
  titleFilipino: '',
  date: new Date().toISOString().split('T')[0],
  content: '',
  contentFilipino: '',
  category: 'Announcement',
  urgent: false,
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Announcement>({ ...emptyAnnouncement });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Announcement | null>(null);

  useEffect(() => {
    const unsub = useAnnouncementsRealtime(setAnnouncements);
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editing?.id) {
      await updateAnnouncement(editing.id, form);
    } else {
      await addAnnouncement(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ ...emptyAnnouncement });
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncement(id);
    setDeleteConfirm(null);
  };

  const filtered = announcements.filter(
    a =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.titleFilipino.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    Notice: 'bg-blue-50 text-blue-600',
    Health: 'bg-green-50 text-green-600',
    Announcement: 'bg-orange-50 text-orange-500',
    Business: 'bg-purple-50 text-purple-600',
    Tax: 'bg-red-50 text-red-500',
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Announcements</h2>
          <p className="text-sm text-gray-400">{announcements.length} announcements</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ ...emptyAnnouncement }); setShowForm(true); }}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600"
        >
          <Plus size={16} /> Add Announcement
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[a.category] || 'bg-gray-100 text-gray-500'}`}>
                    {a.category}
                  </span>
                  {a.urgent && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 flex items-center gap-1">
                      <AlertCircle size={10} /> Urgent
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">{a.date}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">{a.title}</h3>
                <p className="text-xs text-gray-400 mb-2">{a.titleFilipino}</p>
                <p className="text-sm text-gray-600 line-clamp-3">{a.content}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setViewing(a)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                  title="View"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => { setForm({ ...a }); setEditing(a); setShowForm(true); }}
                  className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(a.id!)}
                  className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewing(null)} className="float-right text-gray-400"><X size={20} /></button>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[viewing.category]}`}>{viewing.category}</span>
            <h2 className="text-xl font-bold mt-2">{viewing.title}</h2>
            {viewing.titleFilipino && <p className="text-sm text-gray-500">{viewing.titleFilipino}</p>}
            <p className="text-xs text-gray-400 mt-1">{viewing.date}</p>
            <p className="text-sm text-gray-600 mt-4 whitespace-pre-line">{viewing.content}</p>
            {viewing.contentFilipino && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-500">Filipino version:</p>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{viewing.contentFilipino}</p>
              </div>
            )}
            <button onClick={() => setViewing(null)} className="mt-6 w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Title (English) *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm"
                    placeholder="Announcement title"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Title (Filipino)</label>
                  <input
                    value={form.titleFilipino}
                    onChange={e => setForm({ ...form, titleFilipino: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm"
                    placeholder="Pamagat ng anunsyo"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white"
                  >
                    {Object.keys(categoryColors).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.urgent}
                      onChange={e => setForm({ ...form, urgent: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-xs font-medium text-gray-600">Urgent</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Content (English)</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    rows={4}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none"
                    placeholder="Detailed content..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Content (Filipino)</label>
                  <textarea
                    value={form.contentFilipino}
                    onChange={e => setForm({ ...form, contentFilipino: e.target.value })}
                    rows={4}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none"
                    placeholder="Nilalaman..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-600"
                >
                  <Save size={16} />
                  {editing ? 'Update Announcement' : 'Add Announcement'}
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
          <div className="bg-white rounded-2xl max-w-sm p-6 shadow-xl">
            <h3 className="text-base font-semibold mb-2">Delete Announcement?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium"
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