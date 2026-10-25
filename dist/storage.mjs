const KEY = 'lumen-wing-v1';
export function loadRecord(storage) {
  try { storage ||= globalThis.localStorage; const v = JSON.parse(storage.getItem(KEY) || '{}'); return { runs: Math.max(0, Number(v.runs) || 0), bestTime: Math.max(0, Number(v.bestTime) || 0), bestKills: Math.max(0, Number(v.bestKills) || 0), wins: Math.max(0, Number(v.wins) || 0), sound: v.sound === true }; } catch { return { runs: 0, bestTime: 0, bestKills: 0, wins: 0, sound: false }; }
}
export function saveRecord(record, storage) { try { storage ||= globalThis.localStorage; storage.setItem(KEY, JSON.stringify(record)); return true; } catch { return false; } }
export function finishRecord(record, flight) { return { ...record, runs: record.runs + 1, wins: record.wins + Number(flight.status === 'won'), bestTime: Math.max(record.bestTime, flight.time), bestKills: Math.max(record.bestKills, flight.kills) }; }
