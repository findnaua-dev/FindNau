import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Phone, Mail, MapPin, ShieldAlert, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function AdminHelpCenterSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [contactInfo, setContactInfo] = useState<any[]>([]);
  const [emergencyHotlines, setEmergencyHotlines] = useState<any[]>([]);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'settings', 'helpCenter');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContactInfo(data.contactInfo || []);
          setEmergencyHotlines(data.emergencyHotlines || []);
        } else {
          // Default data kung wala pa sa Firestore
          setContactInfo([
            { id: 'c1', label: 'Phone', value: '(043) 284-0000', icon: 'phone' },
            { id: 'c2', label: 'Email', value: 'info@naujan.gov.ph', icon: 'mail' },
            { id: 'c3', label: 'Address', value: 'Barangay Santiago\nNaujan, Oriental Mindoro 5204', icon: 'map' },
          ]);
          setEmergencyHotlines([
            { id: 'e1', name: 'Police Station', number: '911' },
            { id: 'e2', name: 'Fire Department', number: '(043) 123-4567' },
          ]);
        }
      } catch (err) {
        console.error("Error fetching help center data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'helpCenter');
      await setDoc(docRef, { contactInfo, emergencyHotlines }, { merge: true });
      alert('Help Center settings saved successfully!');
    } catch (err) {
      console.error("Error saving data:", err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const addContactInfo = () => {
    setContactInfo([...contactInfo, { id: `c${Date.now()}`, label: '', value: '', icon: 'phone' }]);
  };

  const addHotline = () => {
    // Inalis ang description dito
    setEmergencyHotlines([...emergencyHotlines, { id: `e${Date.now()}`, name: '', number: '' }]);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Help Center Settings</h2>
          <p className="text-sm text-gray-500">Manage contact info and emergency hotlines shown to users.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* CONTACT INFO SECTION */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Information</h3>
          <button onClick={addContactInfo} className="text-xs text-orange-500 font-medium flex items-center gap-1 hover:text-orange-600">
            <Plus size={14} /> Add Contact
          </button>
        </div>
        <div className="space-y-3">
          {contactInfo.map((info, idx) => (
            <div key={info.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <select
                value={info.icon}
                onChange={(e) => {
                  const copy = [...contactInfo];
                  copy[idx].icon = e.target.value;
                  setContactInfo(copy);
                }}
                className="border rounded-lg px-2 py-1.5 text-xs bg-white"
              >
                <option value="phone">Phone</option>
                <option value="mail">Mail</option>
                <option value="map">MapPin</option>
              </select>
              <input
                value={info.label}
                onChange={(e) => {
                  const copy = [...contactInfo];
                  copy[idx].label = e.target.value;
                  setContactInfo(copy);
                }}
                placeholder="Label (e.g. Phone)"
                className="w-32 border rounded-lg px-2 py-1.5 text-xs"
              />
              <input
                value={info.value}
                onChange={(e) => {
                  const copy = [...contactInfo];
                  copy[idx].value = e.target.value;
                  setContactInfo(copy);
                }}
                placeholder="Value (e.g. (043) 284-0000)"
                className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
              />
              <button
                onClick={() => setContactInfo(contactInfo.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* EMERGENCY HOTLINES SECTION */}
      <div className="bg-white rounded-2xl border border-red-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert size={16} /> Emergency Hotlines
          </h3>
          <button onClick={addHotline} className="text-xs text-red-500 font-medium flex items-center gap-1 hover:text-red-600">
            <Plus size={14} /> Add Hotline
          </button>
        </div>
        <div className="space-y-3">
          {emergencyHotlines.map((hotline, idx) => (
            <div key={hotline.id} className="flex items-center gap-3 bg-red-50/50 p-3 rounded-xl border border-red-100">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <input
                value={hotline.name}
                onChange={(e) => {
                  const copy = [...emergencyHotlines];
                  copy[idx].name = e.target.value;
                  setEmergencyHotlines(copy);
                }}
                placeholder="Agency Name (e.g. Police Station)"
                className="w-48 border rounded-lg px-2 py-1.5 text-xs"
              />
              <input
                value={hotline.number}
                onChange={(e) => {
                  const copy = [...emergencyHotlines];
                  copy[idx].number = e.target.value;
                  setEmergencyHotlines(copy);
                }}
                placeholder="Number (e.g. 911)"
                className="w-32 border rounded-lg px-2 py-1.5 text-xs"
              />
              <button
                onClick={() => setEmergencyHotlines(emergencyHotlines.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 p-1 ml-auto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}