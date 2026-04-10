/**
 * Client API DIRMA — toutes les requêtes vers le backend Laravel.
 * Le token Sanctum est stocké dans localStorage.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── Utilitaire de requête ──────────────────────────────────────────────────

async function request(method, endpoint, data = null, isFormData = false) {
  const token = localStorage.getItem('dirma_token');

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  headers['Accept'] = 'application/json';

  const config = { method, headers };
  if (data) config.body = isFormData ? data : JSON.stringify(data);

  const res = await fetch(`${BASE_URL}/${endpoint}`, config);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json.message || json.errors
      ? Object.values(json.errors || {}).flat().join(' ')
      : 'Une erreur est survenue.';
    throw new Error(message);
  }

  return json;
}

const get  = (ep)       => request('GET',    ep);
const post = (ep, data, isForm = false) => request('POST', ep, data, isForm);

// ── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  login:    (identifiant, password) => post('auth/login', { identifiant, password }),
  register: (data)                  => post('auth/register', data),
  logout:   ()                      => post('auth/logout'),
  profil:   ()                      => get('auth/profil'),
};

// ── Thèmes ────────────────────────────────────────────────────────────────

export const themesApi = {
  lister:       (role)         => get(`${role}/themes`),
  creer:        (data)         => post('etudiant/themes', data),
  voir:         (role, id)     => get(`${role}/themes/${id}`),
  reanalyser:   (id)           => post(`chef/themes/${id}/reanalyser`),
  decisionChef: (id, data)     => post(`chef/themes/${id}/decision`, data),
  decisionDA:   (id, data)     => post(`da/themes/${id}/decision`, data),
};

// ── Documents ─────────────────────────────────────────────────────────────

export const documentsApi = {
  lister:            (role)     => get(`${role}/documents`),
  deposer:           (formData) => post('etudiant/documents', formData, true),
  voir:              (role, id) => get(`${role}/documents/${id}`),
  lancerVerification:(id)       => post(`etudiant/documents/${id}/verifier`),
  telecharger:       (role, id) => `${BASE_URL}/${role}/documents/${id}/telecharger`,
  decisionChef:      (id, data) => post(`chef/documents/${id}/decision`, data),
  decisionDA:        (id, data) => post(`da/documents/${id}/decision`, data),
};

// ── Vérifications ─────────────────────────────────────────────────────────

export const verificationsApi = {
  lister: ()        => get('etudiant/verifications'),
  voir:   (role, id)=> get(`${role}/verifications/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────

export const notificationsApi = {
  lister:       () => get('notifications'),
  nonLues:      () => get('notifications/non-lues'),
  marquerLues:  () => post('notifications/lues'),
};

// ── Statistiques ──────────────────────────────────────────────────────────

export const statistiquesApi = {
  index: () => get('da/statistiques'),
};
