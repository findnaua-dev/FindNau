import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  User,
  Mail,
  MapPin,
  ChevronRight,
  LogOut,
  History,
  Navigation,
  Pencil,
  X,
  CheckCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';
import {
  ORIENTAL_MINDORO,
  getBarangaysByMunicipality,
} from '../../../data/orientalMindoro';

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { user, setUser, t, lang, visitedOffices } = useApp();
  const { offices } = useOffices();

  /* ✅ Editable location */
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [municipalityInput, setMunicipalityInput] = useState('');
  const [barangayInput, setBarangayInput] = useState('');
  const [purokInput, setPurokInput] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentMunicipality = (user as any)?.municipality || '';
  const currentBarangay = (user as any)?.barangay || '';
  const currentPurok = (user as any)?.purok || '';
  const currentProvince = (user as any)?.province || 'Oriental Mindoro';

  const displayLocation =
    currentMunicipality && currentBarangay
      ? `${currentBarangay}${
          currentPurok ? `, Purok ${currentPurok}` : ''
        }, ${currentMunicipality}, ${currentProvince}`
      : t('Tap to set your location', 'I-tap para itakda ang lokasyon');

  const openLocationModal = () => {
    setMunicipalityInput(currentMunicipality || '');
    setBarangayInput(currentBarangay || '');
    setPurokInput(currentPurok || '');
    setBarangaySearch('');
    setLocationError('');
    setShowLocationModal(true);
  };

  /* Barangay options para sa napiling municipality */
  const barangayOptions = municipalityInput
    ? getBarangaysByMunicipality(municipalityInput)
    : [];

  const filteredBarangays = barangaySearch.trim()
    ? barangayOptions.filter((b) =>
        b.toLowerCase().includes(barangaySearch.trim().toLowerCase())
      )
    : barangayOptions;

  const handleSaveLocation = async () => {
    if (!user || (user as any)?.role === 'guest') return;

    const trimmedMunicipality = municipalityInput.trim();
    const trimmedBarangay = barangayInput.trim();
    const trimmedPurok = purokInput.trim();

    if (!trimmedMunicipality) {
      setLocationError(
        t('Please select your municipality.', 'Pakipili ang iyong munisipyo.')
      );
      return;
    }
    if (!trimmedBarangay) {
      setLocationError(
        t('Please select your barangay.', 'Pakipili ang iyong barangay.')
      );
      return;
    }

    setSavingLocation(true);
    setLocationError('');

    try {
      const uid = (user as any)?.uid;
      if (uid) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          municipality: trimmedMunicipality,
          barangay: trimmedBarangay,
          purok: trimmedPurok,
          province: currentProvince,
          updatedAt: new Date(),
        });
      }

      setUser({
        ...(user as any),
        municipality: trimmedMunicipality,
        barangay: trimmedBarangay,
        purok: trimmedPurok,
        province: currentProvince,
      });

      setShowLocationModal(false);
      setSuccessMessage(
        t('Location updated successfully!', 'Matagumpay na na-update ang lokasyon!')
      );
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error('Failed to save location:', err);
      setLocationError(
        err?.message ||
          t(
            'Failed to save location. Try again.',
            'Hindi na-save ang lokasyon. Subukan muli.'
          )
      );
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const recentOffices = visitedOffices
    .map((id) => offices.find((o) => o.id === id))
    .filter(Boolean) as typeof offices;

  const menuItems = [
    {
      icon: Navigation,
      label: t('Directions', 'Direksyon'),
      action: () => navigate('/directions'),
      value: '',
    },
  ];

  return (
    <UserScreenLayout>
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-green-500/30 max-w-[92vw]">
            <CheckCircle size={18} className="flex-shrink-0" />
            <p className="text-xs font-semibold leading-tight">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold text-gray-800">
            {t('My Profile', 'Aking Profile')}
          </h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-orange-100 mb-4">
              {user?.name?.charAt(0).toUpperCase() || 'G'}
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              {user?.name || 'Guest'}
            </h2>
            {user?.email && (
              <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  user?.role === 'guest' ? 'bg-gray-400' : 'bg-green-400'
                }`}
              />
              <span className="text-xs text-gray-500 capitalize">
                {user?.role === 'guest'
                  ? t('Guest User', 'Bisita')
                  : user?.role === 'admin'
                  ? 'Administrator'
                  : t('Registered User', 'Rehistradong User')}
              </span>
            </div>
          </div>

          {user?.role === 'guest' && (
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              {t('Create Account / Sign In', 'Gumawa ng Account / Mag-Sign In')}
            </button>
          )}
        </div>

        {/* Profile info */}
        {user?.role !== 'guest' && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center gap-3 p-4">
              <User size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">
                  {t('Full Name', 'Buong Pangalan')}
                </p>
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Mail size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">
                  {t('Email Address', 'Email Address')}
                </p>
                <p className="text-sm font-medium text-gray-800">{user?.email}</p>
              </div>
            </div>

            {/* ✅ Editable Location */}
            <button
              onClick={openLocationModal}
              className="w-full flex items-start gap-3 p-4 hover:bg-orange-50/50 transition-colors text-left"
            >
              <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">
                  {t('Location', 'Lokasyon')}
                </p>
                <p
                  className={`text-sm font-medium mt-0.5 ${
                    currentMunicipality && currentBarangay
                      ? 'text-gray-800'
                      : 'text-gray-400 italic'
                  }`}
                >
                  {displayLocation}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <Pencil size={13} className="text-orange-500" />
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          </div>
        )}

        {/* Recently visited */}
        {recentOffices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('Recently Visited', 'Kamakailan Binisita')}
              </p>
            </div>
            <div className="space-y-2">
              {recentOffices.slice(0, 3).map((office) => (
                <button
                  key={office.id}
                  onClick={() => navigate(`/office/${office.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-orange-200 transition-all"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: office.iconBg }}
                  >
                    {office.shortName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {lang === 'en' ? office.name : office.nameFilipino}
                    </p>
                    <p className="text-[11px] text-gray-400">{office.floor}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Settings', 'Mga Setting')}
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-gray-500" />
                  </div>
                  <p className="flex-1 text-sm text-gray-700">{item.label}</p>
                  {item.value && (
                    <span className="text-xs text-gray-400">{item.value}</span>
                  )}
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* App info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
            <MapPin size={18} className="text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-800">FindNau</p>
          <p className="text-xs text-gray-400">
            Version 1.0.0 · Naujan, Oriental Mindoro
          </p>
          <p className="text-xs text-gray-300 mt-1">
            © 2026 Municipality of Naujan
          </p>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          {t('Sign Out', 'Mag-Sign Out')}
        </button>
      </div>

      {/* ============ LOCATION MODAL ============ */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !savingLocation && setShowLocationModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <MapPin size={16} className="text-orange-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">
                  {t('Set Your Location', 'Itakda ang Lokasyon')}
                </h3>
              </div>
              <button
                onClick={() => !savingLocation && setShowLocationModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed flex-shrink-0">
              {t(
                'Select your municipality and barangay. This helps us show the nearest office or service.',
                'Piliin ang iyong munisipyo at barangay. Nakakatulong ito para maipakita ang pinakamalapit na opisina o serbisyo.'
              )}
            </p>

            {/* Scrollable content */}
            <div className="overflow-y-auto -mx-1 px-1 flex-1">
              {/* Municipality dropdown */}
              <label className="block mb-3">
                <span className="text-xs font-medium text-gray-700 mb-1.5 block">
                  {t('Municipality / City', 'Munisipyo / Lungsod')}{' '}
                  <span className="text-red-500">*</span>
                </span>
                <select
                  value={municipalityInput}
                  onChange={(e) => {
                    setMunicipalityInput(e.target.value);
                    setBarangayInput('');
                    setBarangaySearch('');
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 text-gray-800"
                >
                  <option value="">
                    {t('Select municipality…', 'Pumili ng munisipyo…')}
                  </option>
                  {ORIENTAL_MINDORO.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Barangay picker — searchable dropdown */}
              {municipalityInput && (
                <div className="mb-3">
                  <span className="text-xs font-medium text-gray-700 mb-1.5 block">
                    {t('Barangay', 'Barangay')}{' '}
                    <span className="text-red-500">*</span>
                  </span>

                  {/* Selected barangay display */}
                  {barangayInput && (
                    <div className="mb-2 flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={13} className="text-orange-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-orange-700 truncate">
                          {barangayInput}
                        </p>
                      </div>
                      <button
                        onClick={() => setBarangayInput('')}
                        className="text-orange-400 hover:text-orange-600 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Search box */}
                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={barangaySearch}
                      onChange={(e) => setBarangaySearch(e.target.value)}
                      placeholder={t('Search barangay…', 'Maghanap ng barangay…')}
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50"
                    />
                  </div>

                  {/* Barangay list */}
                  <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                    {filteredBarangays.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">
                        {t('No barangay found.', 'Walang nahanap na barangay.')}
                      </p>
                    ) : (
                      filteredBarangays.map((b) => {
                        const isSelected = b === barangayInput;
                        return (
                          <button
                            key={b}
                            onClick={() => setBarangayInput(b)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-orange-50 text-orange-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">{b}</span>
                            {isSelected && (
                              <CheckCircle
                                size={14}
                                className="text-orange-500 flex-shrink-0"
                              />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Purok / Sitio (optional) */}
              {municipalityInput && barangayInput && (
                <label className="block mb-3">
                  <span className="text-xs font-medium text-gray-700 mb-1.5 block">
                    {t('Purok / Sitio', 'Purok / Sitio')}{' '}
                    <span className="text-gray-400 font-normal">
                      ({t('optional', 'opsyonal')})
                    </span>
                  </span>
                  <input
                    type="text"
                    value={purokInput}
                    onChange={(e) => setPurokInput(e.target.value)}
                    placeholder={t('e.g., Purok 3', 'hal., Purok 3')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50"
                  />
                </label>
              )}
            </div>

            {/* Error */}
            {locationError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 flex-shrink-0">
                {locationError}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSaveLocation}
              disabled={
                savingLocation ||
                !municipalityInput.trim() ||
                !barangayInput.trim()
              }
              className="mt-4 w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
            >
              {savingLocation ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('Saving...', 'Sine-save...')}</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  {t('Save Location', 'I-save ang Lokasyon')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </UserScreenLayout>
  );
}