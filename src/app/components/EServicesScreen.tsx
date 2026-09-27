import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, ChevronRight, ArrowLeft, Clock, FileText, SlidersHorizontal } from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';
import { Service } from '../../services/officeService';

type SortOption = 'name-asc' | 'name-desc' | 'services-desc';

export default function EServicesScreen() {
  const navigate = useNavigate();
  const { t, lang } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const { offices, loading } = useOffices();

  const query = searchQuery.trim().toLowerCase();
  const tokens = useMemo(() => {
    if (!query) return [];
    return query.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
  }, [query]);

  // Get unique floors for filter dropdown
  const availableFloors = useMemo(() => {
    const floors = new Set<string>();
    offices.forEach(office => floors.add(office.floor));
    return Array.from(floors).sort();
  }, [offices]);

  const filteredOffices = useMemo(() => {
    let result = offices;

    if (floorFilter !== 'all') {
      result = result.filter(office => office.floor === floorFilter);
    }

    if (tokens.length) {
      result = result.filter(office => {
        const searchStr = [
          office.name,
          office.nameFilipino,
          office.shortName,
          office.floor,
          office.description,
          office.descriptionFilipino,
          ...office.services.flatMap(s => [s.name, s.nameFilipino, s.info, s.infoFilipino, s.typeOfTransaction, s.whoMayAvail]),
        ].join(' ').toLowerCase();
        return tokens.every(token => searchStr.includes(token));
      });
    }

    const sorted = [...result];
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'services-desc':
        sorted.sort((a, b) => b.services.length - a.services.length);
        break;
      default:
        break;
    }
    return sorted;
  }, [offices, tokens, sortBy, floorFilter]);

  const matchingServices = useMemo(() => {
    if (!tokens.length) return [];
    const results: Array<{ service: Service; office: (typeof offices)[number] }> = [];
    offices.forEach(office => {
      office.services.forEach(service => {
        const searchStr = [
          service.name,
          service.nameFilipino,
          service.info,
          service.infoFilipino,
          service.typeOfTransaction,
          service.typeOfTransactionFil,
          service.whoMayAvail,
          service.whoMayAvailFil,
          office.name,
          office.nameFilipino,
          office.shortName,
          office.floor,
        ].join(' ').toLowerCase();
        if (tokens.every(token => searchStr.includes(token))) {
          results.push({ service, office });
        }
      });
    });
    return results;
  }, [offices, tokens]);

  const totalServices = useMemo(() => offices.reduce((sum, o) => sum + o.services.length, 0), [offices]);

  const handleServiceClick = (officeId: string, serviceId: string) =>
    navigate(`/office/${officeId}/service/${serviceId}`);

  /* ✅ Preview lang na 2 services sa loob ng bawat office card */
  const SERVICE_PREVIEW_COUNT = 2;

  if (loading) {
    return (
      <UserScreenLayout>
        <div className="p-8 text-center text-gray-400">Loading...</div>
      </UserScreenLayout>
    );
  }

  return (
    <UserScreenLayout>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {t('Municipal Offices & Services', 'Mga Tanggapan at Serbisyo')}
            </h1>
            <p className="text-xs text-gray-400">
              {offices.length} {t('offices', 'tanggapan')} · {totalServices} {t('services', 'serbisyo')}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('Search offices or services...', 'Maghanap ng opisina o serbisyo...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 flex-shrink-0">
            <SlidersHorizontal size={13} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-gray-600 focus:outline-none"
            >
              <option value="name-asc">{t('Name A-Z', 'Pangalan A-Z')}</option>
              <option value="name-desc">{t('Name Z-A', 'Pangalan Z-A')}</option>
              <option value="services-desc">{t('Most Services', 'Maraming Serbisyo')}</option>
            </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 flex-shrink-0">
            <span className="text-xs text-gray-400">{t('Floor', 'Palapag')}:</span>
            <select
              value={floorFilter}
              onChange={e => setFloorFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-600 focus:outline-none"
            >
              <option value="all">{t('All Floors', 'Lahat ng Palapag')}</option>
              {availableFloors.map(floor => (
                <option key={floor} value={floor}>{floor}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 pb-8 space-y-4">
        {query && (
          <div className="text-xs text-gray-400">
            {filteredOffices.length} {t('office(s) and', 'opisina at')} {matchingServices.length}{' '}
            {t('service(s) found for', 'serbisyong nahanap para sa')} "{searchQuery}"
          </div>
        )}

        {/* Matching Services Section */}
        {query && matchingServices.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-orange-500" />
              {t('Matching Services', 'Mga Serbisyong Nakatugma')}
            </h3>
            <div className="space-y-2">
              {matchingServices.map(({ service, office }) => (
                <button
                  key={`${office.id}-${service.id}`}
                  onClick={() => handleServiceClick(office.id!, service.id!)}
                  className="w-full bg-white rounded-xl border border-gray-100 p-3.5 text-left hover:border-orange-200 hover:shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {lang === 'en' ? service.name : service.nameFilipino}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {lang === 'en' ? office.name : office.nameFilipino} · {office.floor}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Clock size={10} /> {service.processingTime}
                        </span>
                        <span className="text-[11px] font-medium text-orange-500">{service.fee}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Offices Section */}
        {filteredOffices.length === 0 ? (
          <div className="text-center py-16">
            <Search size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t('No offices found.', 'Walang nahanap na opisina.')}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {t('Try adjusting filters or search term.', 'Subukan mong baguhin ang filter o search term.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOffices.map(office => {
              const previewServices = office.services.slice(0, SERVICE_PREVIEW_COUNT);
              const extraServicesCount = office.services.length - previewServices.length;

              return (
                <button
                  key={office.id}
                  onClick={() => navigate(`/office/${office.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-orange-200 hover:shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: office.iconBg }}
                    >
                      {office.shortName.length <= 3 ? office.shortName : office.shortName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-tight">
                            {lang === 'en' ? office.name : office.nameFilipino}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{office.floor}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                          {office.services.length} {t('service(s)', 'serbisyo')}
                        </span>
                      </div>

                      {/* ✅ Preview: 2 services lang + "+X more" */}
                      {!query && office.services.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          {previewServices.map((s, idx) => (
                            <span key={s.id || idx} className="text-[11px] text-gray-400 flex items-center">
                              {lang === 'en' ? s.name : s.nameFilipino}
                              {idx < previewServices.length - 1 && (
                                <span className="mx-1 text-gray-300">·</span>
                              )}
                            </span>
                          ))}
                          {extraServicesCount > 0 && (
                            <span className="text-[11px] text-orange-500 font-medium ml-1">
                              +{extraServicesCount} {t('more', 'pa')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </UserScreenLayout>
  );
}