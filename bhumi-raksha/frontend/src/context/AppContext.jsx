import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import useGeolocation from '../hooks/useGeolocation';
import useSocket from '../hooks/useSocket';
import * as api from '../api/endpoints';

const AppContext = createContext(null);

const RISK_POLL_MS = 60 * 1000; // fallback REST polling if socket has nothing new
const OFFLINE_REPORTS_KEY = 'bhumi_offline_reports';

const FALLBACK_COORDS = { latitude: 25.6, longitude: 92.9 };

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function AppProvider({ children }) {
  const { coords, error: geoError, status: geoStatus } = useGeolocation({ watch: true });
  const effectiveCoords = coords || (geoStatus === 'denied' || geoStatus === 'unsupported' ? FALLBACK_COORDS : null);

  const [currentRisk, setCurrentRisk] = useState(null);
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [safeRoute, setSafeRoute] = useState(null);
  const [toast, setToast] = useState(null); // transient in-app warning banner
  const lastWarnedLevelRef = useRef(null);

  const hasAuthToken = useCallback(() => !!localStorage.getItem('bhumi_token'), []);

  const triggerWarningUX = useCallback(async (payload) => {
    let safePlace = payload.safePlace || null;

    if (!safePlace && effectiveCoords) {
      try {
        const nearby = await api.getNearbySafePlaces(effectiveCoords.latitude, effectiveCoords.longitude, 10);
        const candidate = nearby?.safePlaces?.[0];
        if (candidate) {
          safePlace = {
            name: candidate.name,
            distanceKm: candidate.distanceKm,
            latitude: candidate.latitude,
            longitude: candidate.longitude,
          };
        }
      } catch {
        safePlace = null;
      }
    }

    const distanceKm =
      typeof payload.distanceKm === 'number'
        ? payload.distanceKm
        : effectiveCoords && payload.latitude != null && payload.longitude != null
          ? getDistanceKm(effectiveCoords.latitude, effectiveCoords.longitude, payload.latitude, payload.longitude)
          : safePlace?.distanceKm ?? null;

    setToast({ ...payload, distanceKm, safePlace });

    if ('vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 800]);
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('BHUMI RAKSHA: Landslide Warning', { body: payload.message || 'Danger zone nearby' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification('BHUMI RAKSHA: Landslide Warning', { body: payload.message || 'Danger zone nearby' });
          }
        });
      }
    }
  }, [effectiveCoords]);

  const refreshRisk = useCallback(async () => {
    if (!effectiveCoords) return;
    try {
      const data = await api.getNearbyRisk(effectiveCoords.latitude, effectiveCoords.longitude);
      setCurrentRisk(data);
      if (data.warning && lastWarnedLevelRef.current !== data.riskLevel) {
        lastWarnedLevelRef.current = data.riskLevel;
        triggerWarningUX({
          ...data,
          latitude: effectiveCoords.latitude,
          longitude: effectiveCoords.longitude,
        });
      }
      if (!data.warning) lastWarnedLevelRef.current = null;
    } catch (err) {
      console.error('Failed to refresh risk:', err.message);
    }
  }, [effectiveCoords, triggerWarningUX]);

  const refreshWeather = useCallback(async () => {
    if (!effectiveCoords) return;
    try {
      const data = await api.getCurrentWeather(effectiveCoords.latitude, effectiveCoords.longitude);
      setWeather(data);
    } catch (err) {
      console.error('Failed to refresh weather:', err.message);
    }
  }, [effectiveCoords]);

  const refreshAlerts = useCallback(async () => {
    if (!hasAuthToken()) {
      setAlerts([]);
      return;
    }

    try {
      const data = effectiveCoords
        ? await api.getNearbyAlerts(effectiveCoords.latitude, effectiveCoords.longitude, 25)
        : await api.getAlerts();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to refresh alerts:', err.message);
    }
  }, [effectiveCoords, hasAuthToken]);

  const syncOfflineReports = useCallback(async () => {
    const queued = JSON.parse(localStorage.getItem(OFFLINE_REPORTS_KEY) || '[]');
    if (!queued.length || !navigator.onLine) return;

    const remaining = [];
    for (const report of queued) {
      try {
        await api.queueOfflineReport(report);
      } catch {
        remaining.push(report);
      }
    }

    if (remaining.length) localStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(remaining));
    else localStorage.removeItem(OFFLINE_REPORTS_KEY);
  }, []);

  useEffect(() => {
    if (!effectiveCoords) return;
    const token = localStorage.getItem('bhumi_token');
    if (token) {
      api.updateUserLocation(effectiveCoords.latitude, effectiveCoords.longitude).catch((err) => {
        console.error('Failed to update user location:', err.message);
      });
    }
  }, [effectiveCoords]);

  // Initial + periodic fetch once we have a location
  useEffect(() => {
    if (!effectiveCoords) return;
    refreshRisk();
    refreshWeather();
    refreshAlerts();
    const interval = setInterval(() => {
      refreshRisk();
      refreshWeather();
      refreshAlerts();
    }, RISK_POLL_MS);
    return () => clearInterval(interval);
  }, [effectiveCoords, refreshRisk, refreshWeather, refreshAlerts]);

  useEffect(() => {
    syncOfflineReports();
    window.addEventListener('online', syncOfflineReports);
    const interval = setInterval(syncOfflineReports, 30000);
    return () => {
      window.removeEventListener('online', syncOfflineReports);
      clearInterval(interval);
    };
  }, [syncOfflineReports]);

  // Real-time push updates via Socket.IO -- these preempt the poll interval
  useSocket({
    risk_update: (payload) => {
      setCurrentRisk((prev) => ({ ...prev, ...payload }));
      if (
        (payload.riskLevel === 'HIGH' || payload.riskLevel === 'CRITICAL') &&
        lastWarnedLevelRef.current !== payload.riskLevel
      ) {
        lastWarnedLevelRef.current = payload.riskLevel;
        triggerWarningUX({ message: payload.message || `${payload.riskLevel} risk detected`, ...payload });
      }
    },
    alert_new: (alert) => {
      setAlerts((prev) => [alert, ...prev.filter((a) => a._id !== alert._id)]);
      if (alert?.riskLevel === 'HIGH' || alert?.riskLevel === 'CRITICAL') {
        const alertDistanceKm =
          effectiveCoords && alert?.latitude != null && alert?.longitude != null
            ? getDistanceKm(effectiveCoords.latitude, effectiveCoords.longitude, alert.latitude, alert.longitude)
            : typeof alert?.distanceKm === 'number' ? alert.distanceKm : null;

        triggerWarningUX({
          riskLevel: alert.riskLevel,
          message: alert.message || 'Authorities have flagged a nearby high-risk area.',
          distanceKm: alertDistanceKm,
          latitude: alert.latitude,
          longitude: alert.longitude,
        });
      }
    },
    weather_update: (payload) => {
      if (payload?.data) setWeather(payload.data);
    },
    report_new: () => {
      // Field Reports page listens for this via its own hook to refetch the list.
    },
  });

  const dismissToast = useCallback(() => setToast(null), []);

  const value = {
    coords: effectiveCoords,
    geoError,
    geoStatus,
    currentRisk,
    weather,
    alerts,
    safeRoute,
    setSafeRoute,
    toast,
    dismissToast,
    refreshRisk,
    refreshWeather,
    refreshAlerts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
