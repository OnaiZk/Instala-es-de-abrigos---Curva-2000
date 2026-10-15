import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CobliFleetVehicle,
  fetchCobliFleetDevices,
  normalizePlate,
  getCobliApiKey,
  setCobliApiKey
} from '../api/cobliApi';
import { DailyReport, Vehicle, VehicleLog, User, OpecDevice } from '../types';
import {
  Car,
  Navigation,
  RefreshCw,
  Search,
  X,
  MapPin,
  Gauge,
  Power,
  Clock,
  Users,
  Smartphone,
  ExternalLink,
  Maximize2,
  Minimize2,
  Layers,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Radio,
  Filter,
  Crosshair
} from 'lucide-react';

interface CobliFleetMapProps {
  dailyReports: DailyReport[];
  vehicles: Vehicle[];
  vehicleLogs: VehicleLog[];
  users: User[];
  opecDevices: OpecDevice[];
  selectedDate: string;
  onSelectReport?: (report: DailyReport) => void;
}

export interface EnrichedFleetVehicle extends CobliFleetVehicle {
  matchedReport?: DailyReport;
  matchedLeader?: User;
  matchedTechnicians: User[];
  matchedOpec?: OpecDevice;
  matchedInternalVehicle?: Vehicle;
  matchedActiveLog?: VehicleLog;
  totalActivities: number;
  totalPieces: number;
}

declare global {
  interface Window {
    L: any;
  }
}

const loadLeafletAssets = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById('leaflet-js-cdn') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js-cdn';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const formatRelativeTime = (ms: number | null): string => {
  if (!ms) return 'Sem sinal recente';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `Há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours}h ${diffMin % 60}m`;
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const CobliFleetMap: React.FC<CobliFleetMapProps> = ({
  dailyReports,
  vehicles,
  vehicleLogs,
  users,
  opecDevices,
  selectedDate,
  onSelectReport
}) => {
  const [cobliVehicles, setCobliVehicles] = useState<CobliFleetVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'ignition_on' | 'ignition_off' | 'with_report'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [showPlateLabels, setShowPlateLabels] = useState<boolean>(true);
  const [mapLayerType, setMapLayerType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Selected vehicle on map/sidebar
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // API Key modal
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getCobliApiKey());

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const markersMapRef = useRef<Record<string, any>>({});
  const hasInitialFitRef = useRef<boolean>(false);

  const loadTelemetry = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const data = await fetchCobliFleetDevices();
      setCobliVehicles(data);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Error fetching Cobli telemetry:', err);
      setError(err?.message || 'Não foi possível carregar os dados da Cobli.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTelemetry(false);
  }, [loadTelemetry]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadTelemetry(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadTelemetry]);

  // Cross-reference Cobli live vehicles with DailyReports, VehicleLogs, and internal Vehicles
  const enrichedVehicles: EnrichedFleetVehicle[] = useMemo(() => {
    return cobliVehicles.map(cv => {
      const norm = cv.normalizedPlate;

      // Find matching report on selectedDate
      const matchedReport = norm
        ? dailyReports.find(r => {
            if (normalizePlate(r.carPlate) === norm) return true;
            return r.activities?.some(a => normalizePlate(a.carPlate) === norm);
          })
        : undefined;

      const matchedLeader = matchedReport
        ? users.find(u => u.id === matchedReport.userId)
        : undefined;

      // Collect all technicians in that report
      const techIds = new Set<string>();
      if (matchedReport) {
        matchedReport.technicianIds?.forEach(id => techIds.add(id));
        matchedReport.activities?.forEach(a => {
          if (!a.carPlate || normalizePlate(a.carPlate) === norm) {
            a.technicianIds?.forEach(id => techIds.add(id));
          }
        });
      }
      const matchedTechnicians = Array.from(techIds)
        .map(id => users.find(u => u.id === id))
        .filter((u): u is User => Boolean(u));

      const matchedOpec = matchedReport?.opecId
        ? opecDevices.find(o => o.id === matchedReport.opecId)
        : undefined;

      const matchedInternalVehicle = norm
        ? vehicles.find(v => normalizePlate(v.plate) === norm)
        : undefined;

      const matchedActiveLog = norm
        ? vehicleLogs.find(l => normalizePlate(l.plate) === norm && l.isActive)
        : undefined;

      const totalActivities = matchedReport?.activities?.length || 0;
      const totalPieces =
        matchedReport?.activities?.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0) || 0;

      return {
        ...cv,
        matchedReport,
        matchedLeader,
        matchedTechnicians,
        matchedOpec,
        matchedInternalVehicle,
        matchedActiveLog,
        totalActivities,
        totalPieces
      };
    });
  }, [cobliVehicles, dailyReports, vehicles, vehicleLogs, users, opecDevices]);

  // Available branch groups
  const branchGroups = useMemo(() => {
    const set = new Set<string>();
    enrichedVehicles.forEach(v => {
      if (v.branchGroup) set.add(v.branchGroup);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [enrichedVehicles]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return enrichedVehicles
      .filter(v => {
        if (branchFilter !== 'ALL' && v.branchGroup !== branchFilter) return false;

        if (statusFilter === 'moving' && !(v.ignitionOn && v.speed > 0)) return false;
        if (statusFilter === 'ignition_on' && !v.ignitionOn) return false;
        if (statusFilter === 'ignition_off' && v.ignitionOn) return false;
        if (statusFilter === 'with_report' && !v.matchedReport && !v.matchedActiveLog) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const leaderName = v.matchedLeader?.name?.toLowerCase() || '';
          const driverName = (v.matchedReport?.driverName || v.matchedActiveLog?.userName || v.driverNameCobli || '').toLowerCase();
          const techNames = v.matchedTechnicians.map(t => t.name.toLowerCase()).join(' ');
          const routeName = (v.matchedReport?.route || '').toLowerCase();
          const opecCode = (v.matchedOpec?.assetCode || '').toLowerCase();

          const matches =
            v.rawLabel.toLowerCase().includes(q) ||
            v.cleanPlate.toLowerCase().includes(q) ||
            v.normalizedPlate.toLowerCase().includes(q) ||
            (v.fleetNumber && v.fleetNumber.toLowerCase().includes(q)) ||
            v.fullModel.toLowerCase().includes(q) ||
            v.branchGroup.toLowerCase().includes(q) ||
            leaderName.includes(q) ||
            driverName.includes(q) ||
            techNames.includes(q) ||
            routeName.includes(q) ||
            opecCode.includes(q);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort priority: Moving > Ignition On > Linked to report > Ignition Off
        const score = (x: EnrichedFleetVehicle) =>
          (x.ignitionOn && x.speed > 0 ? 100 : 0) +
          (x.ignitionOn ? 50 : 0) +
          (x.matchedReport ? 25 : 0);
        return score(b) - score(a) || a.cleanPlate.localeCompare(b.cleanPlate);
      });
  }, [enrichedVehicles, branchFilter, statusFilter, searchQuery]);

  const selectedVehicle = useMemo(() => {
    if (!selectedDeviceId) return null;
    return enrichedVehicles.find(v => v.deviceId === selectedDeviceId) || null;
  }, [enrichedVehicles, selectedDeviceId]);

  // Metrics
  const stats = useMemo(() => {
    const total = enrichedVehicles.length;
    const withGps = enrichedVehicles.filter(v => v.latitude !== null && v.longitude !== null).length;
    const ignitionOn = enrichedVehicles.filter(v => v.ignitionOn).length;
    const moving = enrichedVehicles.filter(v => v.ignitionOn && v.speed > 0).length;
    const ignitionOff = total - ignitionOn;
    const linkedToOperation = enrichedVehicles.filter(v => v.matchedReport || v.matchedActiveLog).length;
    return { total, withGps, ignitionOn, moving, ignitionOff, linkedToOperation };
  }, [enrichedVehicles]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    loadLeafletAssets()
      .then(L => {
        if (!isMounted || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [-23.5505, -46.6333],
          zoom: 11,
          zoomControl: false
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        // Google Maps Road Tile Layer (identical look to Cobli's Google Map)
        const tileUrl =
          mapLayerType === 'hybrid'
            ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

        tileLayerRef.current = L.tileLayer(tileUrl, {
          maxZoom: 20,
          attribution: '&copy; Google Maps &bull; Telemetria Cobli'
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      })
      .catch(err => {
        console.error('Error loading Leaflet:', err);
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Roadmap / Satellite Hybrid layer
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapLayerType === 'hybrid'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 20,
      attribution: '&copy; Google Maps &bull; Telemetria Cobli'
    }).addTo(mapInstanceRef.current);
  }, [mapLayerType]);

  // Fit bounds helper
  const fitMapToVehicles = useCallback((vehiclesToFit: EnrichedFleetVehicle[]) => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    const validCoords = vehiclesToFit
      .filter(v => typeof v.latitude === 'number' && typeof v.longitude === 'number')
      .map(v => [v.latitude as number, v.longitude as number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }
  }, []);

  // Render Markers whenever filteredVehicles or selection changes
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!L || !map || !layerGroup) return;

    layerGroup.clearLayers();
    markersMapRef.current = {};

    filteredVehicles.forEach(vehicle => {
      if (typeof vehicle.latitude !== 'number' || typeof vehicle.longitude !== 'number') return;

      const isMoving = vehicle.ignitionOn && vehicle.speed > 0;
      const isSelected = vehicle.deviceId === selectedDeviceId;
      const hasReport = Boolean(vehicle.matchedReport || vehicle.matchedActiveLog);

      const bgColor = isMoving
        ? '#10b981' // Emerald 500
        : vehicle.ignitionOn
        ? '#3b82f6' // Blue 500
        : '#334155'; // Slate 700

      const ringColor = isSelected
        ? '#FA3A00'
        : hasReport
        ? '#f97316'
        : '#ffffff';

      const fleetTag = vehicle.fleetNumber ? ` (${vehicle.fleetNumber})` : '';
      const speedBadge = isMoving ? ` • ${vehicle.speed} km/h` : '';

      const labelHtml = showPlateLabels
        ? `<div style="
            position: absolute;
            bottom: 38px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background: ${isSelected ? '#FA3A00' : 'rgba(15, 23, 42, 0.92)'};
            color: #ffffff;
            font-family: Inter, sans-serif;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 9999px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.28);
            border: 1.5px solid ${isMoving ? '#34d399' : hasReport ? '#fb923c' : 'rgba(255,255,255,0.2)'};
            pointer-events: none;
            letter-spacing: 0.02em;
          ">
            ${vehicle.cleanPlate}${fleetTag}${speedBadge}
          </div>`
        : '';

      const pulseHtml = isMoving
        ? `<span style="
            position: absolute;
            inset: -5px;
            border-radius: 9999px;
            background: rgba(16, 185, 129, 0.35);
            animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></span>`
        : '';

      const html = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          ${labelHtml}
          ${pulseHtml}
          <div style="
            width: ${isSelected ? '34px' : '30px'};
            height: ${isSelected ? '34px' : '30px'};
            border-radius: 9999px;
            background: ${bgColor};
            border: 3px solid ${ringColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: transform 0.2s ease;
            transform: scale(${isSelected ? 1.15 : 1});
          ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'cobli-custom-vehicle-marker',
        html,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([vehicle.latitude, vehicle.longitude], {
        icon,
        zIndexOffset: isSelected ? 1000 : isMoving ? 500 : 100
      });

      marker.on('click', () => {
        setSelectedDeviceId(vehicle.deviceId);
        map.flyTo([vehicle.latitude, vehicle.longitude], Math.max(map.getZoom(), 15), {
          duration: 0.6
        });
      });

      marker.addTo(layerGroup);
      markersMapRef.current[vehicle.deviceId] = marker;
    });

    if (!hasInitialFitRef.current && filteredVehicles.length > 0) {
      hasInitialFitRef.current = true;
      fitMapToVehicles(filteredVehicles);
    }
  }, [filteredVehicles, selectedDeviceId, showPlateLabels, fitMapToVehicles]);

  // Handle fullscreen resize
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 250);
    }
  }, [isFullscreen]);

  const handleFocusVehicle = (vehicle: EnrichedFleetVehicle) => {
    setSelectedDeviceId(vehicle.deviceId);
    if (mapInstanceRef.current && typeof vehicle.latitude === 'number' && typeof vehicle.longitude === 'number') {
      mapInstanceRef.current.flyTo([vehicle.latitude, vehicle.longitude], 16, {
        duration: 0.7
      });
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setCobliApiKey(apiKeyInput);
    setShowKeyModal(false);
    loadTelemetry(false);
  };

  return (
    <div
      className={`flex flex-col gap-4 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-4 md:p-6 overflow-y-auto'
          : ''
      }`}
    >
      {/* Top Telemetry KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
              Frota Total Cobli
            </span>
            <span className="text-2xl font-black mt-0.5 block">{stats.total}</span>
            <span className={`text-[10px] font-bold ${statusFilter === 'all' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stats.withGps} com GPS ativo
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusFilter === 'all' ? 'bg-white/10 text-white' : 'bg-slate-200/70 text-slate-700'}`}>
            <Car size={20} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ignition_on' ? 'all' : 'ignition_on')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
            statusFilter === 'ignition_on' || statusFilter === 'moving'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200 text-slate-800'
          }`}
        >
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${statusFilter === 'ignition_on' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Ignição Ligada Agora
            </span>
            <span className="text-2xl font-black mt-0.5 block">{stats.ignitionOn}</span>
            <span className={`text-[10px] font-bold ${statusFilter === 'ignition_on' ? 'text-white' : 'text-emerald-600'}`}>
              {stats.moving} em movimento agora
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusFilter === 'ignition_on' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
            <Power size={20} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ignition_off' ? 'all' : 'ignition_off')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
            statusFilter === 'ignition_off'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md'
              : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${statusFilter === 'ignition_off' ? 'text-slate-300' : 'text-slate-400'}`}>
              Desligados / Parados
            </span>
            <span className="text-2xl font-black mt-0.5 block">{stats.ignitionOff}</span>
            <span className={`text-[10px] font-bold ${statusFilter === 'ignition_off' ? 'text-slate-200' : 'text-slate-500'}`}>
              Estacionados ou na base
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusFilter === 'ignition_off' ? 'bg-white/10 text-white' : 'bg-slate-200/70 text-slate-600'}`}>
            <Clock size={20} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'with_report' ? 'all' : 'with_report')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
            statusFilter === 'with_report'
              ? 'bg-primary text-white border-primary shadow-md'
              : 'bg-orange-50/60 hover:bg-orange-50 border-orange-200 text-slate-800'
          }`}
        >
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${statusFilter === 'with_report' ? 'text-orange-100' : 'text-primary'}`}>
              Com Relatório ({selectedDate})
            </span>
            <span className="text-2xl font-black mt-0.5 block">{stats.linkedToOperation}</span>
            <span className={`text-[10px] font-bold ${statusFilter === 'with_report' ? 'text-white' : 'text-orange-700'}`}>
              Cruzados com equipe do dia
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusFilter === 'with_report' ? 'bg-white/20 text-white' : 'bg-orange-100 text-primary'}`}>
            <Users size={20} />
          </div>
        </button>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        {/* Search & Branch Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar placa, nº frota (ex: 75), líder, motorista ou modelo..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Branch / Group Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter size={13} className="text-slate-400 shrink-0 mr-1" />
            {branchGroups.map(group => (
              <button
                key={group}
                onClick={() => setBranchFilter(group)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                  branchFilter === group
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {group === 'ALL' ? 'Todas Filiais' : group}
              </button>
            ))}
          </div>
        </div>

        {/* Map Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {lastSyncTime && (
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Radio size={12} className={autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
              Sincronizado às {lastSyncTime.toLocaleTimeString('pt-BR')}
            </span>
          )}

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
            title="Atualizar automaticamente a cada 15 segundos"
          >
            {autoRefresh ? 'Ao Vivo (15s)' : 'Pausado'}
          </button>

          <button
            onClick={() => setShowPlateLabels(!showPlateLabels)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
              showPlateLabels
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            Placas no Mapa
          </button>

          <button
            onClick={() => setMapLayerType(mapLayerType === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all"
          >
            <Layers size={12} />
            {mapLayerType === 'roadmap' ? 'Satélite' : 'Mapa Ruas'}
          </button>

          <button
            onClick={() => fitMapToVehicles(filteredVehicles)}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all"
            title="Enquadrar todos os veículos filtrados"
          >
            <Crosshair size={12} />
            Centralizar
          </button>

          <button
            onClick={() => loadTelemetry(false)}
            disabled={refreshing}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-all"
            title="Atualizar agora"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-primary' : ''} />
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition-all"
            title="Configurar Chave de API Cobli"
          >
            <KeyRound size={14} />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Expandir Mapa em Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setShowKeyModal(true)}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase"
          >
            Verificar Chave API
          </button>
        </div>
      )}

      {/* Main Split View: Interactive Map + Live Vehicle Sidebar */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${isFullscreen ? 'flex-1 min-h-[75vh]' : 'min-h-[580px]'}`}>
        {/* Map Column */}
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner min-h-[460px] lg:min-h-[580px]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[460px] lg:min-h-[580px] z-10" />

          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={28} className="animate-spin text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                Conectando à telemetria Cobli em tempo real...
              </span>
            </div>
          )}

          {/* Legend Overlay (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-lg flex flex-wrap items-center gap-3 text-[10px] font-black text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Em Movimento ({stats.moving})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Ligado / Parado ({stats.ignitionOn - stats.moving})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              Desligado ({stats.ignitionOff})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-orange-500 bg-white inline-block" />
              Com Equipe no Dia ({stats.linkedToOperation})
            </span>
          </div>

          {/* Selected Vehicle Floating Detail Card on Map */}
          {selectedVehicle && (
            <div className="absolute top-3 left-3 right-14 sm:right-auto sm:w-96 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono text-xs font-black rounded-lg">
                      {selectedVehicle.cleanPlate}
                    </span>
                    {selectedVehicle.fleetNumber && (
                      <span className="px-2 py-0.5 bg-orange-50 text-primary border border-orange-200 text-[10px] font-black rounded-lg">
                        FROTA {selectedVehicle.fleetNumber}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase">
                      {selectedVehicle.branchGroup}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800 mt-1.5">
                    {selectedVehicle.fullModel} {selectedVehicle.year ? `(${selectedVehicle.year})` : ''}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedDeviceId(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Live Telemetry Stats */}
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Status Ignição</span>
                  <span
                    className={`text-[11px] font-black flex items-center gap-1 mt-0.5 ${
                      selectedVehicle.ignitionOn ? 'text-emerald-600' : 'text-slate-600'
                    }`}
                  >
                    <Power size={11} />
                    {selectedVehicle.ignitionOn
                      ? selectedVehicle.speed > 0
                        ? 'Movimento'
                        : 'Ligado'
                      : 'Desligado'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Velocidade</span>
                  <span className="text-[11px] font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Gauge size={11} className="text-primary" />
                    {selectedVehicle.speed} km/h
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Sinal GPS</span>
                  <span className="text-[10px] font-bold text-slate-700 block mt-0.5 truncate">
                    {formatRelativeTime(selectedVehicle.lastUpdatedMs)}
                  </span>
                </div>
              </div>

              {/* Linked Team / Daily Report Details */}
              {selectedVehicle.matchedReport ? (
                <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3 space-y-1.5 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Equipe Alocada ({selectedDate})
                    </span>
                    <span className="text-[10px] font-black text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                      {selectedVehicle.matchedReport.route || 'Matriz'}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-800">
                    <span className="text-slate-500">Líder:</span>{' '}
                    {selectedVehicle.matchedLeader?.name || 'Líder Responsável'}
                  </p>
                  {selectedVehicle.matchedReport.driverName && (
                    <p className="text-[11px] font-bold text-slate-800">
                      <span className="text-slate-500">Motorista:</span> {selectedVehicle.matchedReport.driverName}
                    </p>
                  )}
                  {selectedVehicle.matchedTechnicians.length > 0 && (
                    <p className="text-[11px] font-bold text-slate-800">
                      <span className="text-slate-500">Técnicos:</span>{' '}
                      {selectedVehicle.matchedTechnicians.map(t => t.name).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-orange-200/60 text-[10px] font-black text-slate-700">
                    <span>
                      Produção: {selectedVehicle.totalPieces} itens ({selectedVehicle.totalActivities} ativ.)
                    </span>
                    {selectedVehicle.matchedOpec && (
                      <span className="flex items-center gap-1 text-purple-700">
                        <Smartphone size={11} /> {selectedVehicle.matchedOpec.assetCode}
                      </span>
                    )}
                  </div>
                </div>
              ) : selectedVehicle.matchedActiveLog ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs mb-3">
                  <span className="text-[10px] font-black uppercase text-blue-700 block">
                    Check-in de Frota Ativo
                  </span>
                  <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                    Condutor: {selectedVehicle.matchedActiveLog.userName} ({selectedVehicle.matchedActiveLog.shift})
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-500 font-semibold mb-3">
                  Nenhum relatório diário vinculado a esta placa na data {selectedDate}.
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {selectedVehicle.latitude !== null && selectedVehicle.longitude !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedVehicle.latitude},${selectedVehicle.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Abrir no Google Maps
                  </a>
                )}
                {selectedVehicle.matchedReport && onSelectReport && (
                  <button
                    onClick={() => onSelectReport(selectedVehicle.matchedReport!)}
                    className="py-2 px-3 bg-primary hover:bg-primary-600 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye size={12} />
                    Relatório
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Vehicle List */}
        <div className="lg:col-span-4 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col overflow-hidden max-h-[580px]">
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Veículos Listados ({filteredVehicles.length})
              </h3>
              <p className="text-[10px] font-semibold text-slate-400">
                Clique em um veículo para focar no mapa ao vivo
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70">
            {filteredVehicles.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                Nenhum veículo encontrado para os filtros aplicados.
              </div>
            ) : (
              filteredVehicles.map(v => {
                const isSelected = v.deviceId === selectedDeviceId;
                const isMoving = v.ignitionOn && v.speed > 0;

                return (
                  <button
                    key={v.deviceId}
                    onClick={() => handleFocusVehicle(v)}
                    className={`w-full text-left p-3.5 transition-all hover:bg-white flex flex-col gap-2 ${
                      isSelected ? 'bg-orange-50/90 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[11px] font-black rounded-md">
                          {v.cleanPlate}
                        </span>
                        {v.fleetNumber && (
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-black rounded">
                            #{v.fleetNumber}
                          </span>
                        )}
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                          {v.branchGroup}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 shrink-0 ${
                          isMoving
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : v.ignitionOn
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isMoving
                              ? 'bg-emerald-600 animate-ping'
                              : v.ignitionOn
                              ? 'bg-blue-600'
                              : 'bg-slate-500'
                          }`}
                        />
                        {isMoving ? `${v.speed} km/h` : v.ignitionOn ? 'Ligado' : 'Desligado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                      <span className="truncate">{v.fullModel}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(v.lastUpdatedMs)}
                      </span>
                    </div>

                    {v.matchedReport && (
                      <div className="px-2.5 py-1.5 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center justify-between text-[10px]">
                        <span className="font-black text-slate-800 truncate">
                          Líder: {v.matchedLeader?.name || 'Responsável'}
                          {v.matchedReport.driverName ? ` • Mot: ${v.matchedReport.driverName}` : ''}
                        </span>
                        <span className="font-black text-primary shrink-0 ml-2">
                          {v.totalPieces} itens
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Configurar Chave API Cobli */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveApiKey}
            className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound size={18} className="text-primary" />
                Chave de Integração Cobli
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Insira a chave de API (`cobli-api-key`) gerada em <strong>painel.cobli.co/apis</strong> para sincronizar a frota em tempo real.
            </p>
            <input
              type="text"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Ex: Hf0BgNy.6c922154-..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/20"
              >
                Salvar e Sincronizar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
