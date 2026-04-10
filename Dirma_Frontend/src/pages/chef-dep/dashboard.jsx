import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, BookOpen, CheckCircle, XCircle, Eye, Download, X } from 'lucide-react';
import Layout from '../../components/Layout';
import { themesApi, documentsApi } from '../../api';
import '../etudiant/dashboard.css';
import './chef.css';

const navItems = [
  { path: '/chef-dep/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
];

const statutTheme = {
  en_attente_chef: { label: 'En attente',  color: '#f59e0b', bg: '#fffbeb' },
  rejete_chef:     { label: 'Rejeté',      color: '#ef4444', bg: '#fef2f2' },
  en_attente_da:   { label: 'Transmis DA', color: '#3b82f6', bg: '#eff6ff' },
  valide:          { label: 'Validé',      color: '#10b981', bg: '#ecfdf5' },
};

const statutDoc = {
  en_attente_chef: { label: 'En attente',  color: '#f59e0b', bg: '#fffbeb' },
  rejete_chef:     { label: 'Rejeté',      color: '#ef4444', bg: '#fef2f2' },
  en_attente_da:   { label: 'Transmis DA', color: '#3b82f6', bg: '#eff6ff' },
  valide:          { label: 'Validé',      color: '#10b981', bg: '#ecfdf5' },
  verifie:         { label: 'Vérifié',     color: '#6366f1', bg: '#eef2ff' },
};

export default function ChefDepDashboard() {
  const [themes, setThemes]       = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [onglet, setOnglet]       = useState('themes');
  const [modal, setModal]         = useState(null);
  const [modalType, setModalType] = useState('');
  const [motif, setMotif]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur]       = useState('');

  useEffect(() => {
    Promise.all([
      themesApi.lister('chef'),
      documentsApi.lister('chef'),
    ]).then(([t, d]) => {
      setThemes(t.themes);
      setDocuments(d.documents);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Thèmes en attente',    value: themes.filter(t => t.statut === 'en_attente_chef').length,    color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Documents en attente', value: documents.filter(d => d.statut === 'en_attente_chef').length,  color: '#E87722', bg: '#fff4ec' },
    { label: 'Thèmes validés',       value: themes.filter(t => ['en_attente_da','valide'].includes(t.statut)).length, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Documents validés',    value: documents.filter(d => ['en_attente_da','valide'].includes(d.statut)).length, color: '#10b981', bg: '#ecfdf5' },
  ];

  const ouvrirModal = (item, type, action) => {
    setModal({ item, action });
    setModalType(type);
    setMotif('');
    setErreur('');
  };

  const confirmerDecision = async () => {
    if (modal.action === 'rejete' && !motif.trim()) return;
    setSubmitting(true);
    setErreur('');
    try {
      const payload = { decision: modal.action, motif: motif || undefined };
      if (modalType === 'theme') {
        await themesApi.decisionChef(modal.item.id, payload);
        setThemes(prev => prev.map(t => t.id === modal.item.id ? { ...t, statut: modal.action === 'valide' ? 'en_attente_da' : 'rejete_chef' } : t));
      } else {
        await documentsApi.decisionChef(modal.item.id, payload);
        setDocuments(prev => prev.map(d => d.id === modal.item.id ? { ...d, statut: modal.action === 'valide' ? 'en_attente_da' : 'rejete_chef' } : d));
      }
      setModal(null);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout navItems={navItems} role="chef_departement">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Gérez les soumissions de votre département.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}><FileText size={20} /></div>
                <div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['themes', 'documents'].map(o => (
              <button
                key={o}
                className={onglet === o ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setOnglet(o)}
                style={{ fontSize: 13 }}
              >
                {o === 'themes' ? <><BookOpen size={14} /> Thèmes</> : <><FileText size={14} /> Documents</>}
              </button>
            ))}
          </div>

          {/* Table thèmes */}
          {onglet === 'themes' && (
            <div className="card">
              <div className="card-header">
                <h3>Thèmes soumis</h3>
                <span className="badge" style={{ color: '#f59e0b', background: '#fffbeb' }}>
                  {themes.filter(t => t.statut === 'en_attente_chef').length} en attente
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Étudiant</th><th>Titre</th><th>Similarité</th><th>Statut</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {themes.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Aucun thème</td></tr>
                    ) : themes.map(t => {
                      const cfg = statutTheme[t.statut] || statutTheme.en_attente_chef;
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500 }}>{t.etudiant?.prenom} {t.etudiant?.name}</td>
                          <td style={{ maxWidth: 260 }}>{t.titre}</td>
                          <td>
                            <span style={{ fontWeight: 600, color: t.score_similarite >= 70 ? '#ef4444' : t.score_similarite >= 40 ? '#f59e0b' : '#10b981' }}>
                              {t.score_similarite}%
                            </span>
                          </td>
                          <td><span className="badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {t.statut === 'en_attente_chef' && (
                                <>
                                  <button className="action-btn approve-btn" title="Valider" onClick={() => ouvrirModal(t, 'theme', 'valide')}><CheckCircle size={15} /></button>
                                  <button className="action-btn reject-btn" title="Rejeter" onClick={() => ouvrirModal(t, 'theme', 'rejete')}><XCircle size={15} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table documents */}
          {onglet === 'documents' && (
            <div className="card">
              <div className="card-header">
                <h3>Documents soumis</h3>
                <span className="badge" style={{ color: '#E87722', background: '#fff4ec' }}>
                  {documents.filter(d => d.statut === 'en_attente_chef').length} en attente
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Étudiant</th><th>Titre</th><th>Score plagiat</th><th>Statut</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {documents.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Aucun document</td></tr>
                    ) : documents.map(d => {
                      const cfg = statutDoc[d.statut] || statutDoc.en_attente_chef;
                      const score = d.derniere_verification?.score_global;
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 500 }}>{d.etudiant?.prenom} {d.etudiant?.name}</td>
                          <td style={{ maxWidth: 240 }}>{d.titre}</td>
                          <td>
                            {score != null
                              ? <span style={{ fontWeight: 600, color: score >= 50 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981' }}>{score}%</span>
                              : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                          </td>
                          <td><span className="badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <a className="action-btn" href={documentsApi.telecharger('chef', d.id)} target="_blank" rel="noreferrer" title="Télécharger"><Download size={15} /></a>
                              {d.statut === 'en_attente_chef' && (
                                <>
                                  <button className="action-btn approve-btn" title="Valider" onClick={() => ouvrirModal(d, 'document', 'valide')}><CheckCircle size={15} /></button>
                                  <button className="action-btn reject-btn" title="Rejeter" onClick={() => ouvrirModal(d, 'document', 'rejete')}><XCircle size={15} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal décision */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.action === 'valide' ? 'Valider' : 'Rejeter'} {modalType === 'theme' ? 'le thème' : 'le document'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
                <strong>{modal.item.titre}</strong>
              </p>
              {erreur && <div className="alert-error" style={{ marginBottom: 12 }}>{erreur}</div>}
              {modal.action === 'rejete' && (
                <div className="form-group">
                  <label>Motif du rejet *</label>
                  <textarea placeholder="Expliquez la raison du rejet..." value={motif} onChange={e => setMotif(e.target.value)} rows={4} />
                </div>
              )}
              {modal.action === 'valide' && (
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                  Cette action transmettra {modalType === 'theme' ? 'le thème' : 'le document'} au Directeur Adjoint.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button
                className={modal.action === 'valide' ? 'btn-primary' : 'btn-danger'}
                onClick={confirmerDecision}
                disabled={submitting || (modal.action === 'rejete' && !motif.trim())}
              >
                {submitting ? <span className="spinner-sm" /> : modal.action === 'valide' ? <><CheckCircle size={15} /> Valider</> : <><XCircle size={15} /> Rejeter</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
