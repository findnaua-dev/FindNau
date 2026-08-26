import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Megaphone, AlertCircle, Search, X, ChevronDown, ChevronUp
} from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { Announcement } from '../../services/announcementService';

const catColors: Record<string, string> = {
  Notice: 'bg-blue-100 text-blue-700',
  Health: 'bg-green-100 text-green-700',
  Announcement: 'bg-orange-100 text-orange-700',
  Business: 'bg-purple-100 text-purple-700',
  Tax: 'bg-red-100 text-red-700',
};

export default function AnnouncementsScreen() {
  const navigate = useNavigate();
  const { t, lang } = useApp();
  const { announcements, loading } = useAnnouncements();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const filtered = announcements.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.titleFilipino.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.contentFilipino.toLowerCase().includes(q)
    );
  });

  const urgent = filtered.filter(a => a.urgent);
  const normal = filtered.filter(a => !a.urgent);

  return (
    <UserScreenLayout>
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {t('Announcements', 'Mga Anunsyo')}
            </h1>
            <p className="text-xs text-gray-400">
              {announcements.length} {t('total', 'kabuuan')}
            </p>
          </div>
        </div>
        <div className="relative pb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('Search announcements...', 'Maghanap ng anunsyo...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-6">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-16">{t('Loading…', 'Naglo-load…')}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t('No announcements found.', 'Walang nahanap na anunsyo.')}
            </p>
          </div>
        ) : (
          <>
            {/* Urgent announcements */}
            {urgent.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <AlertCircle size={13} /> {t('Urgent', 'Apurahan')}
                </h3>
                <div className="space-y-3">
                  {urgent.map(ann => (
                    <button
                      key={ann.id}
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="w-full bg-orange-50 border border-orange-100 rounded-2xl p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                          {ann.category}
                        </span>
                        <span className="text-[11px] text-gray-400">{ann.date}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mb-1">
                        {lang === 'en' ? ann.title : ann.titleFilipino}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {lang === 'en' ? ann.content : ann.contentFilipino}
                      </p>
                      {ann.imageUrl && (
                        <img
                          src={ann.imageUrl}
                          alt=""
                          className="mt-3 w-full h-32 object-cover rounded-xl border border-orange-100"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Normal announcements */}
            <div>
              {urgent.length > 0 && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('All Announcements', 'Lahat ng Anunsyo')}
                </h3>
              )}
              <div className="space-y-3">
                {normal.map(ann => {
                  const isExpanded = expandedId === ann.id;
                  return (
                    <div key={ann.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div
                        onClick={() => setSelectedAnnouncement(ann)}
                        className="p-4 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColors[ann.category] || 'bg-gray-100 text-gray-600'}`}>
                            {ann.category}
                          </span>
                          <span className="text-[11px] text-gray-400">{ann.date}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">
                          {lang === 'en' ? ann.title : ann.titleFilipino}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {lang === 'en' ? ann.content : ann.contentFilipino}
                        </p>
                        {ann.imageUrl && (
                          <img
                            src={ann.imageUrl}
                            alt=""
                            className="mt-3 w-full h-32 object-cover rounded-xl border border-gray-100"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="float-right text-gray-400"
            >
              <X size={20} />
            </button>
            {selectedAnnouncement.imageUrl && (
              <img
                src={selectedAnnouncement.imageUrl}
                alt="Announcement"
                className="w-full h-48 object-cover rounded-2xl mb-4 border border-gray-100"
              />
            )}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                selectedAnnouncement.urgent
                  ? 'bg-red-50 text-red-500'
                  : catColors[selectedAnnouncement.category] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {selectedAnnouncement.category}
            </span>
            <h2 className="text-lg font-bold mt-2">
              {lang === 'en' ? selectedAnnouncement.title : selectedAnnouncement.titleFilipino}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{selectedAnnouncement.date}</p>
            <p className="text-sm text-gray-600 mt-4 whitespace-pre-line">
              {lang === 'en' ? selectedAnnouncement.content : selectedAnnouncement.contentFilipino}
            </p>
            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="mt-6 w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium"
            >
              {t('Close', 'Isara')}
            </button>
          </div>
        </div>
      )}
    </UserScreenLayout>
  );
}