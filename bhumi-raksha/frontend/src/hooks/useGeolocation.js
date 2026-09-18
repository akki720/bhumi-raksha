import { useEffect, useState } from 'react';

/**
 * Wraps the browser Geolocation API. Returns real GPS coordinates -- never
 * fakes a location. If permission is denied or unsupported, `error` is set
 * and callers should fall back to a manual location picker rather than a
 * hardcoded coordinate.
 */
export default function useGeolocation({ watch = true } = {}) {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | requesting | granted | denied | unsupported

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setStatus('requesting');
    const onSuccess = (pos) => {
      setStatus('granted');
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      setError(null);
    };
    const onError = (err) => {
      setStatus('denied');
      setError(err.message);
    };

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
      return () => navigator.geolocation.clearWatch(watchId);
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  }, [watch]);

  return { coords, error, status };
}
