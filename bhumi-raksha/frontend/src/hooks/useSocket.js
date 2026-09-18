import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Opens a single shared Socket.IO connection and subscribes to the backend's
 * real-time events (risk:update, alert:new, weather:update, report:new).
 * Pass handlers for the events you care about; missing handlers are ignored.
 */
export default function useSocket(handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const events = ['risk:update', 'alert:new', 'weather:update', 'report:new'];
    const listeners = events.map((eventName) => {
      const fn = (payload) => {
        const key = eventName.replace(':', '_');
        if (typeof handlersRef.current[key] === 'function') {
          handlersRef.current[key](payload);
        }
      };
      socket.on(eventName, fn);
      return { eventName, fn };
    });

    return () => {
      listeners.forEach(({ eventName, fn }) => socket.off(eventName, fn));
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
