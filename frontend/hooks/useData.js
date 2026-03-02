import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BASE = '/api';

// ─── Generic fetch hook ───
export function useFetch(endpoint, interval = null, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}${endpoint}`);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, ...deps]);

  useEffect(() => {
    fetch();
    if (interval) {
      const id = setInterval(fetch, interval);
      return () => clearInterval(id);
    }
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Flights ───
export function useFlights() {
  return useFetch('/flights?limit=300', 15000);
}

// ─── Satellites ───
export function useSatellites() {
  return useFetch('/satellites?group=stations', 60000);
}

// ─── Earthquakes ───
export function useEarthquakes(period = 'day') {
  return useFetch(`/earthquakes?period=${period}&minmagnitude=2.5`, 120000, [period]);
}

// ─── Threats ───
export function useThreats() {
  return useFetch('/threats', 30000);
}

// ─── NASA Events ───
export function useNasaEvents() {
  return useFetch('/nasa/events?limit=50', 300000);
}

// ─── Cameras ───
export function useCameras() {
  return useFetch('/cameras', null);
}

// ─── Entity Graph ───
export function useGraph() {
  return useFetch('/graph', 60000);
}

// ─── Alerts ───
export function useAlerts() {
  return useFetch('/alerts', 30000);
}

// ─── WebSocket hook ───
export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveThreats, setLiveThreats] = useState([]);
  const [liveFlightUpdates, setLiveFlightUpdates] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('alert', (alert) => {
      setLiveAlerts(prev => [alert, ...prev].slice(0, 50));
    });

    socket.on('threat', (threat) => {
      setLiveThreats(prev => [threat, ...prev].slice(0, 100));
    });

    socket.on('flight_update', (update) => {
      setLiveFlightUpdates(prev => [update, ...prev].slice(0, 20));
    });

    socket.emit('subscribe', ['alerts', 'threats', 'flights']);

    return () => socket.disconnect();
  }, []);

  return { connected, liveAlerts, liveThreats, liveFlightUpdates };
}
