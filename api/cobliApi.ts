export interface CobliRawDevice {
  esn: string;
  cobli_id?: string;
  type?: string;
  fleet_id?: string;
  vehicle?: {
    id?: string;
    vehicle_id?: string;
    device_id?: string;
    license_plate?: string;
    brand?: string;
    model?: string;
    year?: number | null;
    speed_limit_in_kmh?: number | null;
    groups?: Array<{
      id: string;
      name: string;
    }> | null;
  } | null;
  driver?: {
    id?: string;
    name?: string;
  } | null;
  last_location?: {
    device_id?: string;
    time?: number;
    time_in_millis?: number;
    latitude?: number;
    longitude?: number;
    heading?: number;
    speed?: number;
    ignition_on?: boolean;
    cobli_ingested_at?: number;
    processed_at?: number;
    is_plugged?: boolean;
  } | null;
}

export interface CobliFleetVehicle {
  deviceId: string;
  cobliId: string;
  rawLabel: string;
  cleanPlate: string;
  normalizedPlate: string;
  fleetNumber: string | null;
  branchGroup: string;
  brand: string;
  model: string;
  fullModel: string;
  year: number | null;
  speedLimitKmh: number | null;
  latitude: number | null;
  longitude: number | null;
  speed: number;
  heading: number;
  ignitionOn: boolean;
  isPlugged: boolean;
  lastUpdatedMs: number | null;
  driverNameCobli: string | null;
}

const DEFAULT_COBLI_API_KEY = 'Hf0BgNy.6c922154-6578-4387-a030-5b4da54e400c';
const COBLI_STORAGE_KEY = 'eletromidia_cobli_api_key';

export const getCobliApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(COBLI_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  const envKey = (import.meta as any).env?.VITE_COBLI_API_KEY;
  if (envKey && String(envKey).trim()) return String(envKey).trim();
  return DEFAULT_COBLI_API_KEY;
};

export const setCobliApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      window.localStorage.setItem(COBLI_STORAGE_KEY, key.trim());
    } else {
      window.localStorage.removeItem(COBLI_STORAGE_KEY);
    }
  }
};

/**
 * Extrai a placa brasileira padrão (7 caracteres alfanuméricos sem traço, ex: "TJP8H85")
 * a partir de qualquer string como "TJP-8H85 (75) SUL", "TJP-8H85" ou "GIP0469 (46) T.I".
 */
export const normalizePlate = (input?: string | null): string => {
  if (!input) return '';
  const upper = input.toUpperCase().trim();
  const match = upper.match(/\b([A-Z]{3})[-\s]?([0-9][A-Z0-9][0-9]{2})\b/);
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  return upper.replace(/[^A-Z0-9]/g, '').slice(0, 7);
};

/**
 * Formata a placa com hífen (ex: "TJP-8H85") para exibição limpa.
 */
export const formatCleanPlate = (input?: string | null): string => {
  const norm = normalizePlate(input);
  if (norm.length === 7) {
    return `${norm.slice(0, 3)}-${norm.slice(3)}`;
  }
  return (input || 'S/ PLACA').trim();
};

/**
 * Extrai o número de frota entre parênteses ex: "(75)" -> "75" ou "- 07" -> "07"
 */
export const extractFleetNumber = (rawLabel?: string | null): string | null => {
  if (!rawLabel) return null;
  const parenMatch = rawLabel.match(/\(\s*(\d+)\s*\)/);
  if (parenMatch) return parenMatch[1].padStart(2, '0');
  const dashMatch = rawLabel.match(/-\s*(\d{1,3})\b/);
  if (dashMatch) return dashMatch[1].padStart(2, '0');
  return null;
};

/**
 * Normaliza o nome do grupo / filial da Cobli
 */
const normalizeBranchGroup = (rawGroup?: string | null, rawLabel?: string | null): string => {
  const source = `${rawGroup || ''} ${rawLabel || ''}`.toUpperCase();
  if (source.includes('SUL')) return 'FILIAL SUL';
  if (source.includes('LESTE')) return 'FILIAL LESTE';
  if (source.includes('MATRIZ')) return 'MATRIZ';
  if (source.includes('T.I') || source.includes(' TI')) return 'T.I';
  const trimmed = (rawGroup || '').trim().toUpperCase();
  return trimmed || 'GERAL';
};

export const fetchCobliFleetDevices = async (customApiKey?: string): Promise<CobliFleetVehicle[]> => {
  const apiKey = (customApiKey || getCobliApiKey()).trim();
  if (!apiKey) {
    throw new Error('Chave de API da Cobli não configurada.');
  }

  const response = await fetch('https://api.cobli.co/herbie-1.1/dash/device', {
    method: 'GET',
    headers: {
      'cobli-api-key': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao consultar API da Cobli (HTTP ${response.status})`);
  }

  const payload = await response.json();
  const rawDevices: CobliRawDevice[] = Array.isArray(payload?.devices) ? payload.devices : [];

  return rawDevices
    .filter(d => d && (d.vehicle || d.last_location))
    .map((d): CobliFleetVehicle => {
      const rawLabel = (d.vehicle?.license_plate || d.cobli_id || d.esn || '').trim();
      const cleanPlate = formatCleanPlate(rawLabel);
      const normalizedPlate = normalizePlate(rawLabel);
      const fleetNumber = extractFleetNumber(rawLabel);
      const rawGroup = d.vehicle?.groups?.[0]?.name || '';
      const branchGroup = normalizeBranchGroup(rawGroup, rawLabel);

      const brand = (d.vehicle?.brand || '').trim();
      const model = (d.vehicle?.model || '').trim();
      const fullModel = [brand, model].filter(Boolean).join(' ') || 'Veículo da Frota';

      const lat = typeof d.last_location?.latitude === 'number' ? d.last_location.latitude : null;
      const lng = typeof d.last_location?.longitude === 'number' ? d.last_location.longitude : null;
      const rawSpeed = typeof d.last_location?.speed === 'number' ? d.last_location.speed : 0;
      const speed = Math.max(0, Math.round(rawSpeed));
      const heading = typeof d.last_location?.heading === 'number' ? d.last_location.heading : 0;
      const ignitionOn = Boolean(d.last_location?.ignition_on);
      const isPlugged = d.last_location?.is_plugged !== false;

      const lastUpdatedMs =
        d.last_location?.time_in_millis ||
        d.last_location?.processed_at ||
        (d.last_location?.time ? d.last_location.time * 1000 : null) ||
        null;

      return {
        deviceId: d.esn,
        cobliId: d.cobli_id || d.esn,
        rawLabel,
        cleanPlate,
        normalizedPlate,
        fleetNumber,
        branchGroup,
        brand,
        model,
        fullModel,
        year: d.vehicle?.year || null,
        speedLimitKmh: d.vehicle?.speed_limit_in_kmh || null,
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        ignitionOn,
        isPlugged,
        lastUpdatedMs,
        driverNameCobli: d.driver?.name || null
      };
    });
};
