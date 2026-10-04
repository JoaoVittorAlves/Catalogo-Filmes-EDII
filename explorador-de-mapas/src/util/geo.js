/**
 * Utilitários geográficos e de texto usados pelo Explorador de Mapas.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Geo = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAIO_TERRA_KM = 6371.0088;
  const rad = (g) => (g * Math.PI) / 180;

  /** Distância de grande círculo (fórmula de Haversine), em km. */
  function distanciaKm(lat1, lon1, lat2, lon2) {
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /** Minúsculas, sem acentos e sem espaços repetidos — base das chaves de nome. */
  function normalizar(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatarDistancia(km) {
    if (!Number.isFinite(km)) return '—';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1).replace('.', ',')} km`;
    return `${Math.round(km).toLocaleString('pt-BR')} km`;
  }

  function formatarCoordenada(lat, lon) {
    const f = (v, pos, neg) => `${Math.abs(v).toFixed(4).replace('.', ',')}° ${v >= 0 ? pos : neg}`;
    return `${f(lat, 'N', 'S')}, ${f(lon, 'L', 'O')}`;
  }

  return { distanciaKm, normalizar, formatarDistancia, formatarCoordenada };
});
