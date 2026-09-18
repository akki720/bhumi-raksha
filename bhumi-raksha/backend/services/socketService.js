let ioInstance = null;

function initSocket(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] client disconnected: ${socket.id}`);
    });
  });
}

function emitEvent(eventName, payload) {
  if (!ioInstance) {
    console.warn(`[Socket.IO] tried to emit "${eventName}" before initialization`);
    return;
  }
  ioInstance.emit(eventName, payload);
}

module.exports = {
  initSocket,
  emitRiskUpdate: (payload) => emitEvent('risk:update', payload),
  emitNewAlert: (payload) => emitEvent('alert:new', payload),
  emitWeatherUpdate: (payload) => emitEvent('weather:update', payload),
  emitNewReport: (payload) => emitEvent('report:new', payload),
};
