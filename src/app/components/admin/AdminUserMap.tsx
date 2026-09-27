import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Users, TrendingUp } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const MUNICIPALITY_COORDS: Record<string, [number, number]> = {
  'Calapan City': [13.4108, 121.1803],
  Baco: [13.3575, 121.0992],
  Bansud: [12.8667, 121.4667],
  Bongabong: [12.75, 121.4833],
  Bulalacao: [12.3308, 121.3428],
  Gloria: [12.9833, 121.4667],
  Mansalay: [12.5167, 121.4333],
  Naujan: [13.3167, 121.3],
  Pinamalayan: [13.0333, 121.4833],
  Pola: [13.15, 121.4333],
  'Puerto Galera': [13.5, 120.95],
  Roxas: [12.5833, 121.5167],
  'San Teodoro': [13.4333, 121.0167],
  Socorro: [13.05, 121.4],
  Victoria: [13.1667, 121.2833],
};

const KNOWN_BARANGAY_COORDS: Record<string, [number, number]> = {
  'Malaya, Naujan': [13.2206, 121.2816],
  'Barcenaga, Naujan': [13.2744, 121.2387],
  'Pinagsabangan II, Naujan': [13.2695, 121.2614],
};

interface BarangayPoint {
  key: string;
  barangay: string;
  municipality: string;
  count: number;
  coords: [number, number];
}

interface Props {
  userDocs: any[];
  compact?: boolean;
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^brgy\.?\s*/i, '')
    .replace(/^barangay\s+/i, '')
    .replace(/\s+/g, ' ');
}

function getKnownBarangayCoords(
  barangay: string,
  municipality: string
): [number, number] | null {
  const normalizedBarangay = normalizeName(barangay);
  const normalizedMunicipality = normalizeName(municipality);

  for (const [key, coords] of Object.entries(KNOWN_BARANGAY_COORDS)) {
    const [knownBarangay, knownMunicipality] =
      key.split(',').map((item) => normalizeName(item));

    if (
      knownBarangay === normalizedBarangay &&
      knownMunicipality === normalizedMunicipality
    ) {
      return coords;
    }
  }

  return null;
}

function createBarangayIcon(
  count: number,
  isSelected: boolean
) {
  const size =
    count >= 100
      ? 30
      : count >= 50
        ? 28
        : count >= 10
          ? 25
          : 22;

  const color = isSelected
    ? '#C2410C'
    : '#F97316';

  const fontSize =
    count >= 100
      ? 8
      : count >= 10
        ? 8
        : 7;

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 2C7.6 2 4 5.6 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.4-3.6-8-8-8z"
        fill="${color}"
        stroke="#FFFFFF"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      <circle
        cx="12"
        cy="10"
        r="3"
        fill="#FFFFFF"
      />
    </svg>
  `;

  return L.divIcon({
    html: `
      <div
        style="
          position:relative;
          width:${size}px;
          height:${size}px;
          filter:drop-shadow(0 1px 3px rgba(0,0,0,0.30));
        "
      >
        ${svg}

        <span
          style="
            position:absolute;
            top:${Math.round(size * 0.41)}px;
            left:0;
            width:${size}px;
            text-align:center;
            font-size:${fontSize}px;
            font-weight:700;
            color:#FFFFFF;
            pointer-events:none;
            font-family:Arial, sans-serif;
            line-height:1;
          "
        >
          ${count > 99 ? '99+' : count}
        </span>
      </div>
    `,
    className: 'barangay-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

async function geocodeBarangay(
  barangay: string,
  municipality: string
): Promise<[number, number] | null> {
  const knownCoords = getKnownBarangayCoords(
    barangay,
    municipality
  );

  if (knownCoords) {
    return knownCoords;
  }

  try {
    const query = encodeURIComponent(
      `${barangay}, ${municipality}, Oriental Mindoro, Philippines`
    );

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const lat = Number(results[0].lat);
    const lon = Number(results[0].lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return null;
    }

    return [lat, lon];
  } catch {
    return null;
  }
}

export default function AdminUserMap({
  userDocs,
  compact = false,
}: Props) {
  const [
    barangayCoordinates,
    setBarangayCoordinates,
  ] = useState<
    Record<string, [number, number]>
  >({});

  const [selectedBarangay, setSelectedBarangay] =
    useState<string | null>(null);

  const [loadingCoordinates, setLoadingCoordinates] =
    useState(false);

  const barangayGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        barangay: string;
        municipality: string;
        count: number;
      }
    >();

    userDocs.forEach((user) => {
      const barangay =
        user.barangay?.trim();

      const municipality =
        user.municipality?.trim();

      if (!barangay || !municipality) {
        return;
      }

      const key =
        `${normalizeName(barangay)},${normalizeName(
          municipality
        )}`;

      if (!map.has(key)) {
        map.set(key, {
          barangay,
          municipality,
          count: 0,
        });
      }

      map.get(key)!.count += 1;
    });

    return Array.from(map.entries());
  }, [userDocs]);

  useEffect(() => {
    let cancelled = false;

    async function loadBarangayCoordinates() {
      if (barangayGroups.length === 0) {
        return;
      }

      setLoadingCoordinates(true);

      const coordinates: Record<
        string,
        [number, number]
      > = {};

      for (const [
        key,
        barangay,
      ] of barangayGroups) {
        const knownCoords =
          getKnownBarangayCoords(
            barangay.barangay,
            barangay.municipality
          );

        if (knownCoords) {
          coordinates[key] = knownCoords;
          continue;
        }

        const found =
          await geocodeBarangay(
            barangay.barangay,
            barangay.municipality
          );

        if (found) {
          coordinates[key] = found;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1100)
        );
      }

      if (!cancelled) {
        setBarangayCoordinates(coordinates);
        setLoadingCoordinates(false);
      }
    }

    loadBarangayCoordinates();

    return () => {
      cancelled = true;
    };
  }, [barangayGroups]);

  const barangayStats =
    useMemo<BarangayPoint[]>(() => {
      return barangayGroups
        .map(([key, data]) => {
          const coords =
            barangayCoordinates[key];

          if (!coords) {
            return null;
          }

          return {
            key,
            barangay: data.barangay,
            municipality: data.municipality,
            count: data.count,
            coords,
          };
        })
        .filter(
          (item): item is BarangayPoint =>
            item !== null
        )
        .sort(
          (a, b) => b.count - a.count
        );
    }, [
      barangayGroups,
      barangayCoordinates,
    ]);

  const municipalityStats = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        barangays: Set<string>;
      }
    >();

    userDocs.forEach((user) => {
      const municipality =
        user.municipality?.trim();

      if (!municipality) {
        return;
      }

      if (!map.has(municipality)) {
        map.set(municipality, {
          count: 0,
          barangays: new Set(),
        });
      }

      const entry =
        map.get(municipality)!;

      entry.count += 1;

      if (user.barangay) {
        entry.barangays.add(
          user.barangay.trim()
        );
      }
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        barangayCount:
          data.barangays.size,
        coords:
          MUNICIPALITY_COORDS[name] ||
          null,
      }))
      .sort(
        (a, b) => b.count - a.count
      );
  }, [userDocs]);

  const withoutLocation = useMemo(
    () =>
      userDocs.filter(
        (user) =>
          !user.barangay &&
          !user.municipality
      ).length,
    [userDocs]
  );

  const mapCenter: [
    number,
    number
  ] = [13.1, 121.3];

  const totalBarangays =
    barangayGroups.length;

  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <MapPin
                size={14}
                className="text-orange-500"
              />
            </div>

            <div>

              <h3 className="text-sm font-semibold text-gray-800">
                User Distribution Map
              </h3>

              <p className="text-xs text-gray-400">
                {userDocs.length -
                  withoutLocation}{' '}
                users with location ·{' '}
                {totalBarangays}{' '}
                barangays
              </p>

            </div>

          </div>

        </div>

        <div
          style={{
            height: '320px',
            width: '100%',
          }}
        >

          <MapContainer
            center={mapCenter}
            zoom={9}
            style={{
              height: '100%',
              width: '100%',
            }}
            scrollWheelZoom={true}
          >

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {barangayStats.map(
              (barangay) => {
                const isSelected =
                  selectedBarangay ===
                  barangay.key;

                return (
                  <Marker
                    key={barangay.key}
                    position={
                      barangay.coords
                    }
                    icon={createBarangayIcon(
                      barangay.count,
                      isSelected
                    )}
                    eventHandlers={{
                      click: () =>
                        setSelectedBarangay(
                          barangay.key
                        ),
                    }}
                  >

                    <Popup>

                      <div
                        style={{
                          minWidth: 180,
                        }}
                      >

                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {barangay.barangay}
                        </p>

                        <p
                          style={{
                            margin:
                              '2px 0 0',
                            fontSize: 11,
                            color: '#666',
                          }}
                        >
                          {barangay.municipality}
                        </p>

                        <p
                          style={{
                            margin:
                              '7px 0 0',
                            fontSize: 12,
                          }}
                        >
                          <strong
                            style={{
                              color:
                                '#F97316',
                            }}
                          >
                            {barangay.count}
                          </strong>{' '}
                          user
                          {barangay.count !==
                          1
                            ? 's'
                            : ''}
                        </p>

                      </div>

                    </Popup>

                  </Marker>
                );
              }
            )}

          </MapContainer>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-3 gap-3">

        <div className="bg-white rounded-2xl border border-gray-100 p-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users
                size={16}
                className="text-blue-600"
              />
            </div>

            <div className="min-w-0">

              <p className="text-xl font-bold text-gray-800">
                {userDocs.length -
                  withoutLocation}
              </p>

              <p className="text-[11px] text-gray-400">
                With Location
              </p>

            </div>

          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <MapPin
                size={16}
                className="text-orange-500"
              />
            </div>

            <div className="min-w-0">

              <p className="text-xl font-bold text-gray-800">
                {totalBarangays}
              </p>

              <p className="text-[11px] text-gray-400">
                Barangays
              </p>

            </div>

          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp
                size={16}
                className="text-green-600"
              />
            </div>

            <div className="min-w-0">

              <p className="text-sm font-bold text-gray-800 truncate">
                {barangayStats[0]
                  ?.barangay ||
                  '—'}
              </p>

              <p className="text-[11px] text-gray-400">
                Top Barangay
              </p>

            </div>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-2 overflow-hidden">

          <div
            style={{
              height: '480px',
              width: '100%',
            }}
            className="rounded-xl overflow-hidden"
          >

            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{
                height: '100%',
                width: '100%',
              }}
              scrollWheelZoom={true}
            >

              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {barangayStats.map(
                (barangay) => {

                  const isSelected =
                    selectedBarangay ===
                    barangay.key;

                  return (
                    <Marker
                      key={barangay.key}
                      position={
                        barangay.coords
                      }
                      icon={createBarangayIcon(
                        barangay.count,
                        isSelected
                      )}
                      eventHandlers={{
                        click: () =>
                          setSelectedBarangay(
                            barangay.key
                          ),
                      }}
                    >

                      <Popup>

                        <div
                          style={{
                            minWidth: 190,
                          }}
                        >

                          <p
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {barangay.barangay}
                          </p>

                          <p
                            style={{
                              margin:
                                '3px 0 0',
                              fontSize: 11,
                              color: '#666',
                            }}
                          >
                            {barangay.municipality}
                          </p>

                          <div
                            style={{
                              marginTop: 8,
                              paddingTop: 7,
                              borderTop:
                                '1px solid #eee',
                            }}
                          >

                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                              }}
                            >

                              <strong
                                style={{
                                  color:
                                    '#F97316',
                                  fontSize: 15,
                                }}
                              >
                                {barangay.count}
                              </strong>{' '}

                              registered user
                              {barangay.count !==
                              1
                                ? 's'
                                : ''}

                            </p>

                          </div>

                        </div>

                      </Popup>

                    </Marker>
                  );
                }
              )}

            </MapContainer>

          </div>

          {loadingCoordinates && (
            <div className="px-3 py-2 text-[11px] text-gray-400">
              Locating barangays...
            </div>
          )}

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">

          <h3 className="text-sm font-semibold text-gray-800 mb-1">
            Top Barangays
          </h3>

          <p className="text-xs text-gray-400 mb-3">
            Users with location data
          </p>

          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">

            {barangayStats.length ===
            0 ? (

              <div className="text-center py-8">

                <MapPin
                  size={28}
                  className="mx-auto text-gray-200 mb-2"
                />

                <p className="text-xs text-gray-400">
                  Wala pang location data.
                </p>

              </div>

            ) : (

              barangayStats
                .slice(0, 30)
                .map(
                  (
                    barangay,
                    index
                  ) => (

                    <div
                      key={
                        barangay.key
                      }
                      className="flex items-center justify-between gap-2 py-1.5"
                    >

                      <div className="flex items-center gap-2 min-w-0">

                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            index === 0
                              ? 'bg-orange-500 text-white'
                              : index === 1
                                ? 'bg-orange-300 text-white'
                                : index === 2
                                  ? 'bg-orange-200 text-orange-700'
                                  : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0">

                          <p className="text-xs text-gray-700 truncate">
                            {
                              barangay.barangay
                            }
                          </p>

                          <p className="text-[10px] text-gray-400 truncate">
                            {
                              barangay.municipality
                            }
                          </p>

                        </div>

                      </div>

                      <span className="text-xs font-bold text-gray-800 flex-shrink-0">
                        {
                          barangay.count
                        }
                      </span>

                    </div>
                  )
                )

            )}

          </div>

        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        <div className="px-4 py-3 border-b border-gray-50">

          <h3 className="text-sm font-semibold text-gray-800">
            Municipality Breakdown
          </h3>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr className="bg-gray-50 border-b border-gray-100">

                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  #
                </th>

                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Municipality
                </th>

                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Users
                </th>

                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Barangays
                </th>

                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Share
                </th>

              </tr>

            </thead>

            <tbody>

              {municipalityStats.map(
                (municipality, index) => {

                  const share =
                    userDocs.length > 0
                      ? (
                          (municipality.count /
                            userDocs.length) *
                          100
                        ).toFixed(1)
                      : '0.0';

                  return (
                    <tr
                      key={
                        municipality.name
                      }
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >

                      <td className="px-4 py-3 text-xs text-gray-400">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {
                          municipality.name
                        }
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {
                          municipality.count
                        }
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        {
                          municipality.barangayCount
                        }
                      </td>

                      <td className="px-4 py-3">

                        <div className="flex items-center gap-2">

                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">

                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{
                                width: `${share}%`,
                              }}
                            />

                          </div>

                          <span className="text-[11px] text-gray-500">
                            {share}%
                          </span>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}