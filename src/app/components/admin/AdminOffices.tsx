import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Search, Trash2, ChevronDown, ChevronUp, Save,
  PlusCircle, MinusCircle, Edit2, X, Building2, Package, Video,
  CheckCircle,
} from 'lucide-react';
import { Office, Service, ServiceRequirement, ServiceStep } from '../../../services/officeService';
import {
  addOffice, updateOffice, deleteOffice,
  addService, updateService, deleteService,
} from '../../../services/officeService';
import { addNotification } from '../../../services/notificationService';
import { useOffices, OfficeWithServices } from '../../../hooks/useOffices';
import { useMapSettingsRealtime, MapFloor } from '../../../services/mapService';
import {
  useBuildingTourRealtime,
  VRTour,
  VRScene,
  VRHotspot,
} from '../../../services/vrTourService';
// ----- direktang Firestore imports (kapalit ng updateBuildingTour) -----
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

// ---------- Empty initializers ----------
const emptyReq: ServiceRequirement = { requirement: '', source: '' };
const emptyStep: ServiceStep = {
  step: 1,
  clientStep: '',
  action: '',
  fee: '',
  processingTime: '',
  personResponsible: '',
};

// ==================== MEMOIZED SERVICE FORM MODAL ====================
const ServiceFormModal = memo(
  function ServiceFormModal({
    officeId,
    service,
    onClose,
    onSaved,
  }: {
    officeId: string;
    service: Service | null;
    onClose: () => void;
    onSaved: () => void;
  }) {
    // --- WALANG BINAGO sa loob ng ServiceFormModal ---
    const init = (s: Service | null) => ({
      name: s?.name || '',
      nameFil: s?.nameFilipino || '',
      info: s?.info || '',
      infoFil: s?.infoFilipino || '',
      type: s?.typeOfTransaction || '',
      typeFil: s?.typeOfTransactionFil || '',
      who: s?.whoMayAvail || '',
      whoFil: s?.whoMayAvailFil || '',
      fee: s?.fee || '',
      time: s?.processingTime || '',
      reqs: s?.requirements?.length ? s.requirements : [{ ...emptyReq }],
      reqsFil: s?.requirementsFilipino?.length ? s.requirementsFilipino : [{ ...emptyReq }],
      steps: s?.steps?.length ? s.steps : [{ ...emptyStep }],
      stepsFil: s?.stepsFilipino?.length ? s.stepsFilipino : [{ ...emptyStep }],
    });

    const [form, setForm] = useState(() => init(service));
    const [saving, setSaving] = useState(false);

    const updateField = (field: keyof typeof form, value: any) =>
      setForm(prev => ({ ...prev, [field]: value }));

    const addReq = (field: 'reqs' | 'reqsFil') =>
      setForm(prev => ({ ...prev, [field]: [...prev[field], { ...emptyReq }] }));

    const removeReq = (field: 'reqs' | 'reqsFil', idx: number) =>
      setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));

    const addStep = (field: 'steps' | 'stepsFil') =>
      setForm(prev => ({
        ...prev,
        [field]: [...prev[field], { ...emptyStep, step: prev[field].length + 1 }],
      }));

    const removeStep = (field: 'steps' | 'stepsFil', idx: number) =>
      setForm(prev => ({
        ...prev,
        [field]: prev[field]
          .filter((_, i) => i !== idx)
          .map((s, i) => ({ ...s, step: i + 1 })),
      }));

    const handleSave = async () => {
      if (!form.name.trim()) return;
      setSaving(true);
      const data: Service = {
        name: form.name,
        nameFilipino: form.nameFil || form.name,
        info: form.info,
        infoFilipino: form.infoFil || form.info,
        typeOfTransaction: form.type,
        typeOfTransactionFil: form.typeFil || form.type,
        whoMayAvail: form.who,
        whoMayAvailFil: form.whoFil || form.who,
        requirements: form.reqs.filter(r => r.requirement.trim()),
        requirementsFilipino: form.reqsFil.filter(r => r.requirement.trim()),
        steps: form.steps
          .filter(s => s.action.trim() || s.clientStep?.trim())
          .map((s, i) => ({ ...s, step: i + 1 })),
        stepsFilipino: form.stepsFil
          .filter(s => s.action.trim() || s.clientStep?.trim())
          .map((s, i) => ({ ...s, step: i + 1 })),
        processingTime: form.time || 'N/A',
        fee: form.fee || 'Free',
      };
      try {
        if (service?.id) {
          await updateService(officeId, service.id, data);
          addNotification({
            title: 'Service Updated',
            message: `${form.name} has been updated.`,
            time: new Date().toLocaleString(),
            read: false,
            type: 'info',
          });
        } else {
          await addService(officeId, data);
          addNotification({
            title: 'New Service Added',
            message: `${form.name} has been added.`,
            time: new Date().toLocaleString(),
            read: false,
            type: 'info',
          });
        }
        onSaved();
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 rounded-t-2xl px-5 py-4 flex items-center justify-between z-10">
            <h3 className="text-base font-semibold text-gray-800">
              {service ? 'Edit Service' : 'New Service'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
            {/* ======= BASIC FIELDS ======= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Service Name (EN) *
                </label>
                <input
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  placeholder="e.g., Business Permit"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Service Name (Filipino)
                </label>
                <input
                  value={form.nameFil}
                  onChange={e => updateField('nameFil', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Info / Description (EN)
                </label>
                <textarea
                  value={form.info}
                  onChange={e => updateField('info', e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-xs resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Info / Description (Filipino)
                </label>
                <textarea
                  value={form.infoFil}
                  onChange={e => updateField('infoFil', e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-xs resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Type of Transaction (EN)
                </label>
                <input
                  value={form.type}
                  onChange={e => updateField('type', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Type of Transaction (Filipino)
                </label>
                <input
                  value={form.typeFil}
                  onChange={e => updateField('typeFil', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Who May Avail (EN)
                </label>
                <input
                  value={form.who}
                  onChange={e => updateField('who', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Who May Avail (Filipino)
                </label>
                <input
                  value={form.whoFil}
                  onChange={e => updateField('whoFil', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Overall Fee</label>
                <input
                  value={form.fee}
                  onChange={e => updateField('fee', e.target.value)}
                  placeholder="₱100.00"
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Processing Time
                </label>
                <input
                  value={form.time}
                  onChange={e => updateField('time', e.target.value)}
                  placeholder="15–30 minutes"
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* ======= REQUIREMENTS EN ======= */}
            <SectionWithAdd label="Requirements (EN) | Where to secure" onAdd={() => addReq('reqs')}>
              {form.reqs.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    value={req.requirement}
                    onChange={e => {
                      const copy = [...form.reqs];
                      copy[idx] = { ...copy[idx], requirement: e.target.value };
                      updateField('reqs', copy);
                    }}
                    placeholder="Requirement"
                    className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={req.source}
                    onChange={e => {
                      const copy = [...form.reqs];
                      copy[idx] = { ...copy[idx], source: e.target.value };
                      updateField('reqs', copy);
                    }}
                    placeholder="Where to secure"
                    className="w-32 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => removeReq('reqs', idx)}
                    disabled={form.reqs.length === 1}
                    className="text-red-400 disabled:opacity-30"
                  >
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
            </SectionWithAdd>

            {/* ======= REQUIREMENTS FIL ======= */}
            <SectionWithAdd label="Requirements (Filipino) | Saan kukunin" onAdd={() => addReq('reqsFil')}>
              {form.reqsFil.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    value={req.requirement}
                    onChange={e => {
                      const copy = [...form.reqsFil];
                      copy[idx] = { ...copy[idx], requirement: e.target.value };
                      updateField('reqsFil', copy);
                    }}
                    placeholder="Kinakailangan"
                    className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={req.source}
                    onChange={e => {
                      const copy = [...form.reqsFil];
                      copy[idx] = { ...copy[idx], source: e.target.value };
                      updateField('reqsFil', copy);
                    }}
                    placeholder="Saan kukunin"
                    className="w-32 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => removeReq('reqsFil', idx)}
                    disabled={form.reqsFil.length === 1}
                    className="text-red-400 disabled:opacity-30"
                  >
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
            </SectionWithAdd>

            {/* ======= CLIENT STEPS EN (5 INPUTS) ======= */}
            <SectionWithAdd label="Client Steps (EN) – Client step | Action unit | Fees | Time | Person" onAdd={() => addStep('steps')}>
              {form.steps.map((st, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <span className="col-span-1 text-xs text-gray-500">{idx + 1}</span>
                  <input
                    value={st.clientStep}
                    onChange={e => {
                      const copy = [...form.steps];
                      copy[idx] = { ...copy[idx], clientStep: e.target.value };
                      updateField('steps', copy);
                    }}
                    placeholder="Client step"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.action}
                    onChange={e => {
                      const copy = [...form.steps];
                      copy[idx] = { ...copy[idx], action: e.target.value };
                      updateField('steps', copy);
                    }}
                    placeholder="Action unit"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.fee}
                    onChange={e => {
                      const copy = [...form.steps];
                      copy[idx] = { ...copy[idx], fee: e.target.value };
                      updateField('steps', copy);
                    }}
                    placeholder="Fee"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.processingTime}
                    onChange={e => {
                      const copy = [...form.steps];
                      copy[idx] = { ...copy[idx], processingTime: e.target.value };
                      updateField('steps', copy);
                    }}
                    placeholder="Time"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.personResponsible}
                    onChange={e => {
                      const copy = [...form.steps];
                      copy[idx] = { ...copy[idx], personResponsible: e.target.value };
                      updateField('steps', copy);
                    }}
                    placeholder="Person"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => removeStep('steps', idx)}
                    disabled={form.steps.length === 1}
                    className="col-span-1 text-red-400 disabled:opacity-30"
                  >
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
            </SectionWithAdd>

            {/* ======= CLIENT STEPS FIL (5 INPUTS) ======= */}
            <SectionWithAdd label="Client Steps (Filipino) – Hakbang | Bayad | Oras | Tao" onAdd={() => addStep('stepsFil')}>
              {form.stepsFil.map((st, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <span className="col-span-1 text-xs text-gray-500">{idx + 1}</span>
                  <input
                    value={st.clientStep}
                    onChange={e => {
                      const copy = [...form.stepsFil];
                      copy[idx] = { ...copy[idx], clientStep: e.target.value };
                      updateField('stepsFil', copy);
                    }}
                    placeholder="Client step"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.action}
                    onChange={e => {
                      const copy = [...form.stepsFil];
                      copy[idx] = { ...copy[idx], action: e.target.value };
                      updateField('stepsFil', copy);
                    }}
                    placeholder="Action unit"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.fee}
                    onChange={e => {
                      const copy = [...form.stepsFil];
                      copy[idx] = { ...copy[idx], fee: e.target.value };
                      updateField('stepsFil', copy);
                    }}
                    placeholder="Bayad"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.processingTime}
                    onChange={e => {
                      const copy = [...form.stepsFil];
                      copy[idx] = { ...copy[idx], processingTime: e.target.value };
                      updateField('stepsFil', copy);
                    }}
                    placeholder="Oras"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    value={st.personResponsible}
                    onChange={e => {
                      const copy = [...form.stepsFil];
                      copy[idx] = { ...copy[idx], personResponsible: e.target.value };
                      updateField('stepsFil', copy);
                    }}
                    placeholder="Tao"
                    className="col-span-2 border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => removeStep('stepsFil', idx)}
                    disabled={form.stepsFil.length === 1}
                    className="col-span-1 text-red-400 disabled:opacity-30"
                  >
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
            </SectionWithAdd>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <Save size={16} className="inline mr-1" />
                {saving ? 'Saving...' : service ? 'Update Service' : 'Save Service'}
              </button>
              <button onClick={onClose} className="px-6 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.officeId === next.officeId &&
    prev.service?.id === next.service?.id &&
    prev.onClose === next.onClose &&
    prev.onSaved === next.onSaved
);

// ==================== Reusable section ====================
const SectionWithAdd = memo(function SectionWithAdd({
  label,
  onAdd,
  children,
}: {
  label: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        <button onClick={onAdd} className="text-xs text-gray-600 flex items-center gap-1 hover:text-gray-800">
          <PlusCircle size={12} /> Add
        </button>
      </div>
      {children}
    </div>
  );
});

// ==================== OFFICE CARD (MEMOIZED) – may VR badge at assignment modal trigger ====================
const OfficeCard = memo(function OfficeCard({
  office,
  isExpanded,
  onToggleExpand,
  onEditOffice,
  onDeleteOffice,
  onOpenServiceModal,
  onDeleteService,
  onOpenVRAssignModal,
  hasVR,
}: {
  office: OfficeWithServices;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onEditOffice: (office: OfficeWithServices) => void;
  onDeleteOffice: (id: string) => void;
  onOpenServiceModal: (officeId: string, service?: Service) => void;
  onDeleteService: (officeId: string, serviceId: string) => void;
  onOpenVRAssignModal: (officeId: string) => void;
  hasVR: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: office.iconBg }}
        >
          {office.shortName?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{office.name}</p>
          <p className="text-xs text-gray-400">{office.floor} · {office.services.length} services</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleExpand(office.id!)}
            className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 px-3 py-1.5 bg-gray-50 border rounded-lg font-medium"
          >
            <Package size={13} /> {office.services.length} Services
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={() => onEditOffice(office)}
            className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100"
          >
            <Edit2 size={14} />
          </button>
          {/* VR button – opens scene assignment modal */}
          <div className="relative">
            <button
              onClick={() => onOpenVRAssignModal(office.id!)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasVR
                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                  : 'bg-purple-50 text-purple-500 hover:bg-purple-100'
              }`}
            >
              <Video size={14} />
            </button>
            {hasVR && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle size={8} className="text-white" />
              </div>
            )}
          </div>
          <button
            onClick={() => onDeleteOffice(office.id!)}
            className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</p>
            <button
              onClick={() => onOpenServiceModal(office.id!)}
              className="flex items-center gap-1 text-xs text-gray-700 font-medium bg-white border rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              <Plus size={12} /> Add Service
            </button>
          </div>
          {office.services.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No services added yet.</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {office.services.map((service, idx) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800">{service.name}</p>
                        {service.nameFilipino && <p className="text-[10px] text-gray-400">{service.nameFilipino}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{service.processingTime}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">{service.fee}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => onOpenServiceModal(office.id!, service)}
                            className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteService(office.id!, service.id!)}
                            className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ==================== VR SCENE ASSIGNMENT MODAL ====================
function VRAssignModal({
  officeId,
  offices,
  buildingTour,
  onClose,
}: {
  officeId: string;
  offices: OfficeWithServices[];
  buildingTour: VRTour;
  onClose: () => void;
}) {
  const office = offices.find(o => o.id === officeId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Pre-select scenes that already have an office hotspot for this office
  useEffect(() => {
    const preselected = new Set<string>();
    buildingTour.scenes.forEach(scene => {
      const hasOfficeHotspot = scene.hotspots?.some(
        h => h.type === 'office' && h.targetOfficeId === officeId
      );
      if (hasOfficeHotspot) preselected.add(scene.id);
    });
    setSelectedIds(preselected);
  }, [buildingTour, officeId]);

  const toggle = (sceneId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!buildingTour) return;
    setSaving(true);
    const updatedScenes = buildingTour.scenes.map(scene => {
      // Remove existing office hotspots for this office
      const otherHotspots = (scene.hotspots || []).filter(
        h => !(h.type === 'office' && h.targetOfficeId === officeId)
      );
      // If selected, add a new office hotspot
      if (selectedIds.has(scene.id)) {
        const newHotspot: VRHotspot = {
          id: `office-${officeId}-${scene.id}`,
          type: 'office',
          longitude: 0,
          latitude: 0,
          label: office?.name || 'Office',
          color: office?.iconBg || '#F97316',
          targetOfficeId: officeId,
          description: office?.description || '',
        };
        otherHotspots.push(newHotspot);
      }
      return { ...scene, hotspots: otherHotspots };
    });

    try {
      // ----- DIREKTANG UPDATE SA FIRESTORE (kapalit ng updateBuildingTour) -----
      const tourRef = doc(db, 'vrTours', 'buildingTour');
      await setDoc(tourRef, { ...buildingTour, scenes: updatedScenes }, { merge: true });
      onClose();
    } catch (err) {
      console.error('Failed to update VR tour', err);
    } finally {
      setSaving(false);
    }
  };

  if (!office) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Assign VR Scenes to {office.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select scenes where this office will appear as a hotspot.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {buildingTour.scenes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No 360° scenes yet. Upload scenes first.
            </p>
          ) : (
            <div className="space-y-2">
              {buildingTour.scenes.map(scene => (
                <label
                  key={scene.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedIds.has(scene.id)
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(scene.id)}
                    onChange={() => toggle(scene.id)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <img
                    src={scene.url}
                    alt={scene.label}
                    className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{scene.label}</p>
                    <p className="text-xs text-gray-400">{scene.hotspots?.length || 0} hotspots</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-5 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function AdminOffices() {
  const navigate = useNavigate();
  const { offices, loading, refetch } = useOffices();

  const [search, setSearch] = useState('');
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [officeName, setOfficeName] = useState('');
  const [officeFloorId, setOfficeFloorId] = useState('ground');
  const [officeDesc, setOfficeDesc] = useState('');
  const [officeIconBg, setOfficeIconBg] = useState('#F97316');

  // Dynamic floors
  const [mapFloors, setMapFloors] = useState<MapFloor[]>([]);
  useEffect(() => {
    const unsub = useMapSettingsRealtime((settings) => {
      if (settings.floors?.length) {
        setMapFloors(settings.floors);
      } else {
        setMapFloors([{ id: 'ground', label: 'Ground Floor', url: '', width: 800, height: 600 }]);
      }
    });
    return () => unsub();
  }, []);

  const [serviceModal, setServiceModal] = useState<{ officeId: string; service?: Service } | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ===== VR DATA =====
  const [buildingTour, setBuildingTour] = useState<VRTour | null>(null);
  useEffect(() => {
    const unsub = useBuildingTourRealtime((data) => setBuildingTour(data));
    return () => unsub();
  }, []);

  // Set of office IDs that have at least one VR hotspot
  const officesWithVR = useMemo(() => {
    const set = new Set<string>();
    if (buildingTour?.scenes) {
      buildingTour.scenes.forEach(scene => {
        scene.hotspots?.forEach(h => {
          if (h.type === 'office' && h.targetOfficeId) {
            set.add(h.targetOfficeId);
          }
        });
      });
    }
    return set;
  }, [buildingTour]);

  // VR assignment modal
  const [assignVRModalOfficeId, setAssignVRModalOfficeId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      offices.filter(
        o =>
          !debouncedSearch ||
          o.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          o.shortName.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [offices, debouncedSearch]
  );

  const allServices = useMemo(
    () => offices.flatMap(o => o.services.map(s => ({ ...s, officeName: o.name, officeId: o.id }))),
    [offices]
  );

  // STABLE CALLBACKS
  const toggleExpand = useCallback((id: string) => setExpandedOffice(prev => (prev === id ? null : id)), []);

  const handleEditOffice = useCallback((office: OfficeWithServices) => {
    if (!office.id) return;
    setOfficeName(office.name);
    setOfficeFloorId(office.floorId || 'ground');
    setOfficeDesc(office.description);
    setOfficeIconBg(office.iconBg);
    setEditingOfficeId(office.id);
    setShowAddOffice(true);
  }, []);

  const handleDeleteOffice = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        await deleteOffice(id);
        addNotification({
          title: 'Office Deleted',
          message: 'An office has been removed.',
          time: new Date().toLocaleString(),
          read: false,
          type: 'alert',
        });
        setDeleteConfirm(null);
        refetch();
      } catch (err) {
        console.error(err);
      }
    },
    [refetch]
  );

  const handleSaveOffice = useCallback(async () => {
    if (!officeName.trim()) return;
    const shortName = officeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    const selectedFloor = mapFloors.find(f => f.id === officeFloorId);
    const data = {
      name: officeName,
      nameFilipino: officeName,
      shortName,
      floor: selectedFloor?.label || 'Ground Floor',
      floorId: officeFloorId,
      description: officeDesc,
      descriptionFilipino: officeDesc,
      iconBg: officeIconBg,
      vrTour: false,
      mapX: 50,
      mapY: 50,
    };
    try {
      if (editingOfficeId) {
        await updateOffice(editingOfficeId, data);
      } else {
        await addOffice(data);
      }
      setShowAddOffice(false);
      setEditingOfficeId(null);
      setOfficeName('');
      setOfficeFloorId('ground');
      setOfficeDesc('');
      refetch();
    } catch (err) {
      console.error(err);
    }
  }, [officeName, officeFloorId, officeDesc, officeIconBg, editingOfficeId, mapFloors, refetch]);

  const openServiceModal = useCallback((officeId: string, service?: Service) => {
    setServiceModal({ officeId, service });
  }, []);

  const closeServiceModal = useCallback(() => {
    setServiceModal(null);
    refetch();
  }, [refetch]);

  const handleDeleteService = useCallback(
    async (officeId: string, serviceId: string) => {
      try {
        await deleteService(officeId, serviceId);
        addNotification({
          title: 'Service Deleted',
          message: 'A service has been removed.',
          time: new Date().toLocaleString(),
          read: false,
          type: 'alert',
        });
        refetch();
      } catch (err) {
        console.error(err);
      }
    },
    [refetch]
  );

  const openVRAssignModal = useCallback((officeId: string) => {
    setAssignVRModalOfficeId(officeId);
  }, []);

  const closeVRAssignModal = useCallback(() => {
    setAssignVRModalOfficeId(null);
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading offices…</div>;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Offices & Services</h2>
          <p className="text-sm text-gray-500">{offices.length} offices · {allServices.length} services</p>
        </div>
        <button
          onClick={() => {
            setEditingOfficeId(null);
            setOfficeName('');
            setOfficeFloorId('ground');
            setOfficeDesc('');
            setShowAddOffice(true);
          }}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700"
        >
          <Plus size={16} /> Add Office
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search offices…"
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
        />
      </div>

      {/* Office list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No offices found.</p>
          <button
            onClick={() => setShowAddOffice(true)}
            className="mt-2 text-sm text-gray-500 underline hover:text-gray-800"
          >
            Add your first office
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(office => (
            <OfficeCard
              key={office.id}
              office={office}
              isExpanded={expandedOffice === office.id}
              onToggleExpand={toggleExpand}
              onEditOffice={handleEditOffice}
              onDeleteOffice={handleDeleteOffice}
              onOpenServiceModal={openServiceModal}
              onDeleteService={handleDeleteService}
              onOpenVRAssignModal={openVRAssignModal}
              hasVR={officesWithVR.has(office.id!)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Office Modal */}
      {showAddOffice && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddOffice(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">{editingOfficeId ? 'Edit Office' : 'Add New Office'}</h3>
              <button
                onClick={() => setShowAddOffice(false)}
                className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Office Name *</label>
                <input
                  value={officeName}
                  onChange={e => setOfficeName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                  placeholder="e.g., Mayor's Office"
                />
              </div>

              {/* Floor dropdown */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                  Floor / Location
                </label>
                <select
                  value={officeFloorId}
                  onChange={e => setOfficeFloorId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  {mapFloors.map(floor => (
                    <option key={floor.id} value={floor.id}>
                      {floor.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                <textarea
                  value={officeDesc}
                  onChange={e => setOfficeDesc(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Color</label>
                <input
                  type="color"
                  value={officeIconBg}
                  onChange={e => setOfficeIconBg(e.target.value)}
                  className="w-16 h-10 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveOffice}
                  className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-700"
                >
                  <Save size={16} className="inline mr-1" />
                  {editingOfficeId ? 'Update Office' : 'Add Office'}
                </button>
                <button
                  onClick={() => setShowAddOffice(false)}
                  className="px-4 border rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Office Confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div className="bg-white rounded-2xl max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Delete Office?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete the office and all its services.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteOffice(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border rounded-xl font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE FORM MODAL */}
      {serviceModal && (
        <ServiceFormModal
          key={serviceModal.service?.id || 'new'}
          officeId={serviceModal.officeId}
          service={serviceModal.service || null}
          onClose={closeServiceModal}
          onSaved={closeServiceModal}
        />
      )}

      {/* ===== VR SCENE ASSIGNMENT MODAL ===== */}
      {assignVRModalOfficeId && buildingTour && (
        <VRAssignModal
          officeId={assignVRModalOfficeId}
          offices={offices}
          buildingTour={buildingTour}
          onClose={closeVRAssignModal}
        />
      )}
    </div>
  );
}