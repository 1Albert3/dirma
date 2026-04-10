import { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, Clock, FileText, BookOpen, Download, Eye, Play, AlertCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import { documentsApi } from '../../api';
import './dashboard.css';

const navItems = [
  { path: '/etudiant/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/etudiant/themes',     icon: BookOpen,        label: 'Mes thèmes' },
  { path: '/etudiant/deposit',    icon: Upload,          label: 'Déposer un document' },
  { path: '/etudiant/submission', icon: FileText,        label: 'Mes documents' },
  { path: '/etudiant/historic',   icon: Clock,           label: 'Historique' },
];

const statutConfig = {
  depose:          { label: 'Déposé',           color: '#6366f1', bg: '#eef2ff' },
  en_verification: { label: 'En vérification',  color: '#f59e0b', bg: '#fffbeb' },
  verifie:         { label: 'Vérifié',          color: '#3b82f6', bg: '#eff6ff' },
  en_attente_chef: { label: 'En attente Chef',  color: '#f59e0b', bg: '#fffbeb' },
  rejete_chef:     { label: 'Rejeté (Chef)',    color: '#ef4444', bg: '#fef2f2' },
  en_attente_da:   { label: 'En attente DA',    color: '#f59e0b', bg: '#fffbeb' },
  rejete_da:       { label: 'Rejeté (DA)',      color: '#ef4444', bg: '#fef2f2' },
  valide:          { label: 'Validé ✓',         color: '#10b981', bg: '#ecfdf5' },
};

export default function Submission() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [erreur, setErreur]       = useState('');
  const [succes, setSucces]       = useState('');
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    documentsApi.lister('etudiant')
      .then(data => setDocuments(data.documents))
      .catch(() => setErreur('Impossible de charger les documents.'))
      .finally(() => setLoading(false));
  }, []);

  const lancerVerification = async (doc) => {
    setErreur('');
    setSucces('');
    setVerifying(doc.id);
    try {
      const data = await documentsApi.lancerVerification(doc.id);
      setSucces(`Vérification terminée. Score global : ${data.verification.score_global}%`);
      // Mettre à jour le document dans la liste
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, statut: 'en_attente_chef', derniere_verification: data.verification } : d));
    } catch (err) {
      setErreur(err.message);
    } finally {
      setVerifying(null);
    }
  };

  return (
    <Layout navItems={navItems} role="etudiant">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes documents</h1>
          <p className="page-subtitle">Gérez vos documents déposés et lancez les vérifications.</p>
        </div>
      </div>

      {succes && <div className="alert-success" style={{ marginBottom: 16 }}>{succes}</div>}
      {erreur && <div className="alert-error" style={{ marginBottom: 16 }}>{erreur}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="card">
          <div className="card-header"><h3>Documents déposés</h3></div>
          {documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
              Aucun document déposé. <a href="/etudiant/deposit" style={{ color: 'var(--primary)' }}>Déposer un document</a>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Thème</th>
                    <th>Niveau</th>
                    <th>Score plagiat</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => {
                    const cfg = statutConfig[doc.statut] || statutConfig.depose;
                    const score = doc.derniere_verification?.score_global;
                    return (
                      <tr key={doc.id}>
                        <td style={{ maxWidth: 240 }}>
                          <p style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{doc.titre}</p>
                          <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{doc.fichier_nom}</p>
                        </td>
                        <td style={{ fontSize: 13 }}>{doc.theme?.titre || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{doc.niveau}</td>
                        <td>
                          {score != null ? (
                            <span style={{
                              fontWeight: 600,
                              color: score >= 50 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981'
                            }}>
                              {score}%
                            </span>
                          ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                        </td>
                        <td>
                          <span className="badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="action-btn" title="Voir" onClick={() => setSelected(doc)}><Eye size={15} /></button>
                            <a
                              className="action-btn"
                              href={documentsApi.telecharger('etudiant', doc.id)}
                              title="Télécharger"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download size={15} />
                            </a>
                            {doc.statut === 'depose' && (
                              <button
                                className="action-btn"
                                title="Lancer la vérification"
                                style={{ color: 'var(--primary)' }}
                                onClick={() => lancerVerification(doc)}
                                disabled={verifying === doc.id}
                              >
                                {verifying === doc.id ? <span className="spinner-sm" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--gray-200)' }} /> : <Play size={15} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal détail document */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Détails du document</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {[
                  { label: 'Titre', value: selected.titre },
                  { label: 'Thème', value: selected.theme?.titre || '—' },
                  { label: 'Niveau', value: selected.niveau },
                  { label: 'Année', value: selected.annee_universitaire },
                  { label: 'Fichier', value: selected.fichier_nom },
                  { label: 'Statut', value: statutConfig[selected.statut]?.label || selected.statut },
                ].map(({ label, value }) => (
                  <div key={label} className="detail-item">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>
              {selected.derniere_verification && (
                <div style={{ marginTop: 16, padding: 16, background: 'var(--gray-50)', borderRadius: 8 }}>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>Rapport de vérification</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                    <span>Score local : <strong>{selected.derniere_verification.score_local}%</strong></span>
                    <span>Score IA : <strong>{selected.derniere_verification.score_ia}%</strong></span>
                    <span>Score web : <strong>{selected.derniere_verification.score_web}%</strong></span>
                    <span>Score global : <strong style={{ color: 'var(--primary)' }}>{selected.derniere_verification.score_global}%</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
