/**
 * Cache-Control for PUBLIC, non-personalized GET responses.
 *
 * Lets CDNs, browsers, and the website's server-side fetch cache serve these
 * without round-tripping the API every time — cutting backend load and latency.
 * `stale-while-revalidate` keeps responses fast while refreshing in the
 * background. `Vary: Origin` keeps the cache CORS-correct per origin.
 *
 * ONLY use on routes that return the same data for everyone (no auth, no
 * per-user content). Never put this on authenticated/admin endpoints.
 */
const publicCache = ({ maxAge = 60, swr = 300 } = {}) => (req, res, next) => {
  res.set("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
  res.vary("Origin");
  next();
};

module.exports = { publicCache };
