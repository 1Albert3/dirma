import { useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Brain, Search, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { etudiantNav } from './nav';
import '../../components/ui.css';

const statusBadge = {
  analyse_complete:   { label: 'Analysé — en attente', cls: 'badge-pending' },
  en_attente_chef:    { label: 'Chez le chef',          cls: 'badge-info' },
  rejete_chef:        { label: 'Rejeté chef',           cls: 'badge-danger' },
  en_attente_da:      { label: 'Chez le DA',            cls: 'badge-orange' },
  rejete_da:          { label: 'Rejeté DA',            cls: 'badge-danger' },
  valide:             { label: 'Validé ✓',             cls: 'badge-success' },
};

export default function EtudiantThemes() {
  const navigate    = useNavigate();
  const [themes, setThemes]   = useState([]);
  const [modal, setModal]     = useState(false);       // modal formulaire
  const [modalType, setModalType] = useState(false);   // modal choix type analyse
  const [themeEnAttente, setThemeEnAttente] = useState(null); // thème soumis en attente du choix
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]       = useState({ titre: '', description: '', annee_universitaire: '2024-2025' });
  const [error, setError]     = useState('');

  const charger = () => {
    setLoading(true);
    api.get('/etudiant/themes').then(r => setThemes(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const soumettre = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // 1. Sauvegarder le formulaire et fermer le modal
      setThemeEnAttente({ ...form });
      setModal(false);
      // 2. Ouvrir le modal de choix du type d'analyse
      setModalType(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  const lancerAnalyse = async (typeAnalyse) => {
    setModalType(false);
    setSubmitting(true);
    try {
      const res = await api.post('/etudiant/themes', {
        ...themeEnAttente,
        type_analyse: typeAnalyse,
      });
      setForm({ titre: '', description: '', annee_universitaire: '2024-2025' });
      setThemeEnAttente(null);
      navigate(`/etudiant/analyse/theme/${res.data.theme.id}`, {
        state: { titre: res.data.theme.titre, typeAnalyse, resultats: res.data.resultats }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout navItems={etudiantNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes thèmes</h1>
          <p className="page-subtitle">Soumettez et suivez vos thèmes de mémoire.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Nouveau thème
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Année</th>
                <th>Similarité</th>
                <th>Statut</th>
                <th>Soumis le</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : themes.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <h4>Aucun thème soumis</h4>
                    <p>Cliquez sur "Nouveau thème" pour commencer.</p>
                  </div>
                </td></tr>
              ) : themes.map(t => {
                const s = statusBadge[t.statut] || { label: t.statut, cls: 'badge-gray' };
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500, maxWidth: 280 }}>{t.titre}</td>
                    <td>{t.annee_universitaire}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${t.score_similarite}%`,
                            background: t.score_similarite >= 70 ? 'var(--danger)' : t.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)'
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{t.score_similarite}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                      {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal soumission */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Soumettre un nouveau thème</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={soumettre}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && <div className="auth-error">{error}</div>}
                <div className="form-group">
                  <label>Titre du thème *</label>
                  <input type="text" placeholder="Ex: Analyse des systèmes distribués..." value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    placeholder="Décrivez votre thème en détail (minimum 100 caractères pour une analyse IA fiable)..."
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    required minLength={100} rows={5}
                  />
                  <p style={{ fontSize: 11, color: form.description.length < 100 ? 'var(--danger)' : 'var(--success)', marginTop: 4 }}>
                    {form.description.length} / 100 caractères minimum
                    {form.description.length >= 100 && ' ✓'}
                  </p>
                </div>
                <div className="form-group">
                  <label>Année universitaire *</label>
                  <select value={form.annee_universitaire} onChange={e => setForm(p => ({ ...p, annee_universitaire: e.target.value }))}>
                    <option>2024-2025</option>
                    <option>2023-2024</option>
                  </select>
                </div>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 6 }}>
                  ⚡ Le système analysera automatiquement la similarité de votre thème avec les thèmes existants.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><RefreshCw size={14} className="spin" /> Analyse en cours...</> : 'Soumettre le thème'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal choix type d'analyse */}
      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choisir le type d'analyse</h3>
              <button className="modal-close" onClick={() => setModalType(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>
                Sélectionnez le type d'analyse à effectuer sur votre thème :
              </p>

              {[
                {
                  type: 'plagiat',
                  icon: Search,
                  titre: 'Analyse Plagiat',
                  desc: 'Compare votre thème avec la base de données locale via TF-IDF, N-grammes, Jaccard et Levenshtein. Précision maximale.',
                  color: '#3b82f6',
                  bg: '#dbeafe',
                },
                {
                  type: 'ia',
                  icon: Brain,
                  titre: 'Détection IA',
                  desc: 'Analyse si votre thème a été rédigé par une IA via Perplexité, Burstiness et patterns linguistiques.',
                  color: '#8b5cf6',
                  bg: '#ede9fe',
                },
                {
                  type: 'les_deux',
                  icon: Layers,
                  titre: 'Analyse Complète (Plagiat + IA)',
                  desc: 'Combine les deux analyses pour une vérification exhaustive. Score global pondéré : 60% plagiat + 40% IA.',
                  color: 'var(--primary)',
                  bg: 'var(--primary-light)',
                  recommande: true,
                },
              ].map(({ type, icon: Icon, titre, desc, color, bg, recommande }) => (
                <button
                  key={type}
                  onClick={() => lancerAnalyse(type)}
                  disabled={submitting}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 16px', borderRadius: 10,
                    border: `2px solid ${color}40`,
                    background: bg, cursor: 'pointer',
                    textAlign: 'left', transition: 'all .2s',
                    position: 'relative',
                  }}
                >
                  {recommande && (
                    <span style={{
                      position: 'absolute', top: -10, right: 12,
                      background: 'var(--primary)', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 10,
                    }}>Recommandé</span>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 4 }}>{titre}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalType(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
