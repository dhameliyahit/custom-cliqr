/**
 * In-Memory High-Speed Cache for Near-Zero Latency NFC & QR Redirections
 * Enables sub-millisecond redirect responses (< 1ms) by avoiding repetitive database roundtrips.
 */

const MAX_CACHE_SIZE = 50000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

const cache = new Map();
let hits = 0;
let misses = 0;

/**
 * Retrieve cached redirect metadata for a code
 * @param {string} code - e.g. "CC-9X7K2P"
 * @returns {object|null}
 */
const getCachedRedirect = (code) => {
  if (!code) return null;
  const key = code.toUpperCase().trim();
  const entry = cache.get(key);

  if (!entry) {
    misses++;
    return null;
  }

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    misses++;
    return null;
  }

  hits++;
  return entry.data;
};

/**
 * Cache redirect metadata for a code
 * @param {string} code
 * @param {object} data - { id, code, status, redirectUrl }
 */
const setCachedRedirect = (code, data) => {
  if (!code || !data) return;
  const key = code.toUpperCase().trim();

  // LRU eviction if cache exceeds capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    data: {
      id: data._id || data.id,
      code: key,
      status: data.status,
      redirectUrl: data.redirectUrl || '',
    },
    timestamp: Date.now(),
  });
};

/**
 * Invalidate cached redirect when an admin reconfigures or deletes a link
 * @param {string} code
 */
const invalidateRedirect = (code) => {
  if (!code) return;
  const key = code.toUpperCase().trim();
  cache.delete(key);
};

/**
 * Clear entire redirect cache (e.g. on mass batch reconfiguration)
 */
const clearAllRedirectCache = () => {
  cache.clear();
};

/**
 * Cache performance metrics
 */
const getCacheStats = () => {
  const total = hits + misses;
  return {
    cachedKeys: cache.size,
    hits,
    misses,
    hitRate: total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : '0%',
  };
};

module.exports = {
  getCachedRedirect,
  setCachedRedirect,
  invalidateRedirect,
  clearAllRedirectCache,
  getCacheStats,
};
