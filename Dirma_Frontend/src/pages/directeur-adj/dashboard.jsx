import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, BookOpen, CheckCircle, XCircle, Download, X, TrendingUp, BarChart2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { themesApi, documentsApi, statistiquesApi } from '../../api';
import '../etudiant/dashboard.css';
import '../chef-dep/chef.css';
import './directeur.css';

const navItems = [
  { path: '/directeur-adj/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
];

export default function DirecteurAdjDashboard() {
  const [themes, setThemes]       = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [onglet, setOnglet]       = useState('themes');
  const [modal, setModal]         = useState(null);
  const [modalType, setModalType] = useState('');
  const [motif, setMotif]         = useState('');
  const [noteOfficielle, setNoteOfficielle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur]       = useState('');

  useEffect(() => {
    Promise.all([
      themesApi.lister('da'),
      documentsApi.lister('da'),
      statistiquesApi.index(),
    ]).then(([t, d, s]) => {
      setThemes(t.themes);
      setDocuments(d.documents);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  const ouvrirModal = (item, type, action) => {
    setModal({ item, action });
    setModalType(type);
    setMotif('');
    setNoteOfficielle('');
    setErreur('');
  };

  const confirmerDecision = async () => {
    if (modal.action === 'rejete' && !motif.trim()) return;
    if (modal.action === 'valide' && !noteOfficielle.trim()) return;
    setSubmitting(true);
    setErreur('');
    try {
      const payload = {
        decision:         modal.action,
        motif:            motif || undefined,
        note_officielle:  noteOfficielle || undefined,
      };
      if (modalType === 'theme') {
        await themesApi.decisionDA(modal.item.id, payload);
        setThemes(prev => prev.map(t => t.id === modal.item.id ? { ...t, statut: modal.action === 'valide' ? 'valide' : 'rejete_da' } : t));
      } else {
        await documentsApi.decisionDA(modal.item.id, payload);
        setDocuments(prev => prev.map(d => d.id === modal.item.id ? { ...d, statut: modal.action === 'valide' ? 'valide' : 'rejete_da' } : d));
      }
      setModal(null);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statutCfg = {
    en_attente_da: { label: 'En attente', color: '#f59e0b', bg: '#fffbeb' },
    rejete_da:     { label: 'Rejeté',     color: '#ef4444', bg: '#fef2f2' },
    valide:        { label: 'Validé ✓',   color: '#10b981', bg: '#ecfdf5' },
  };

  return (
    <Layout navItems={navItems} role="directeur_adjoint">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Décisions finales et statistiques globales.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          {/* Stats globales */}
          {stats && (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
              {[
                { label: 'Étudiants',          value: stats.stats.total_etudiants,       color: '#6366f1', bg: '#eef2ff' },
                { label: 'Thèmes validés',      value: stats.stats.themes_valides,        color: '#10b981', bg: '#ecfdf5' },
                { label: 'Documents validés',   value: stats.stats.documents_valides,     color: '#10b981', bg: '#ecfdf5' },
                { label: 'Score moyen plagiat', value: `${stats.stats.score_moyen_plagiat}%`, color: '#E87722', bg: '#fff4ec' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}><BarChart2 size={20} /></div>
                  <div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['themes', 'documents'].map(o => (
              <button key={o} className={onglet === o ? 'btn-primary' : 'btn-secondary'} onClick={() => setOnglet(o)} style={{ fontSize: 13 }}>
                {o === 'themes' ? <><BookOpen size={14} /> Thèmes</> : <><FileText size={14} /> Documents</>}
              </button>
            ))}
          </div>

          {/* Table thèmes */}
          {onglet === 'themes' && (
            <div className="card">
              <div className="card-header">
                <h3>Thèmes à valider</h3>
                <span className="badge" style={{ color: '#f59e0b', background: '#fffbeb' }}>
                  {themes.filter(t => t.statut === 'en_attente_da').length} en attente
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Étudiant</th><th>Titre</th><th>Département</th><th>Similarité</th><th>Statut</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {themes.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Aucun thème</td></tr>
                    ) : themes.map(t => {
                      const cfg = statutCfg[t.statut] || statutCfg.en_attente_da;
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500 }}>{t.etudiant?.prenom} {t.etudiant?.name}</td>
                          <td style={{ maxWidth: 240 }}>{t.titre}</td>
                          <td>{t.departement}</td>
                          <td><span style={{ fontWeight: 600, color: t.score_similarite >= 70 ? '#ef4444' : '#10b981' }}>{t.score_similarite}%</span></td>
                          <td><span className="badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {t.statut === 'en_attente_da' && (
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
                <h3>Documents à valider</h3>
                <span className="badge" style={{ color: '#f59e0b', background: '#fffbeb' }}>
                  {documents.filter(d => d.statut === 'en_attente_da').length} en attente
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
                      const cfg = statutCfg[d.statut] || statutCfg.en_attente_da;
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
                              <a className="action-btn" href={documentsApi.telecharger('da', d.id)} target="_blank" rel="noreferrer" title="Télécharger"><Download size={15} /></a>
                              {d.statut === 'en_attente_da' && (
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

          {/* Répartition par département */}
          {stats && stats.par_departement.length > 0 && (
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-header">
                <h3>Étudiants par département</h3>
                <TrendingUp size={16} style={{ color: 'var(--gray-400)' }} />
              </div>
              <div style={{ padding: '20px' }}>
                {stats.par_departement.map(d => {
                  const pct = Math.round((d.total / stats.stats.total_etudiants) * 100);
                  return (
                    <div key={d.departement} className="dept-bar-item">
                      <div className="dept-bar-header">
                        <span className="dept-name">{d.departement}</span>
                        <span className="dept-count">{d.total}</span>
                      </div>
                      <div className="dept-bar-track">
                        <div className="dept-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal décision finale */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.action === 'valide' ? 'Valider définitivement' : 'Rejeter'} {modalType === 'theme' ? 'le thème' : 'le document'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
                <strong>{modal.item.titre}</strong>
              </p>
              {erreur && <div className="alert-error" style={{ marginBottom: 12 }}>{erreur}</div>}
              {modal.action === 'valide' && (
                <div className="form-group">
                  <label>Note officielle *</label>
                  <textarea
                    placeholder="Rédigez la note officielle destinée à l'étudiant..."
                    value={noteOfficielle}
                    onChange={e => setNoteOfficielle(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
              {modal.action === 'rejete' && (
                <div className="form-group">
                  <label>Motif du rejet *</label>
                  <textarea placeholder="Expliquez la raison du rejet..." value={motif} onChange={e => setMotif(e.target.value)} rows={4} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button
                className={modal.action === 'valide' ? 'btn-primary' : 'btn-danger'}
                onClick={confirmerDecision}
                disabled={submitting || (modal.action === 'rejete' && !motif.trim()) || (modal.action === 'valide' && !noteOfficielle.trim())}
              >
                {submitting ? <span className="spinner-sm" /> : modal.action === 'valide' ? <><CheckCircle size={15} /> Valider définitivement</> : <><XCircle size={15} /> Rejeter</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
