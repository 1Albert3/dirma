import { useEffect, useState } from 'react';
import { LayoutDashboard, BookOpen, FileText, CheckCircle, XCircle, Eye, X, RefreshCw } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const chefNav = [
  { path: '/chef/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/chef/themes',    icon: BookOpen,         label: 'Thèmes' },
  { path: '/chef/documents', icon: FileText,         label: 'Documents' },
];

const statusBadge = {
  en_attente_chef: { label: 'En attente', cls: 'badge-pending' },
  rejete_chef:     { label: 'Rejeté',     cls: 'badge-danger' },
  en_attente_da:   { label: 'Transmis DA',cls: 'badge-orange' },
  valide:          { label: 'Validé',     cls: 'badge-success' },
};

function DecisionModal({ item, type, onClose, onDone }) {
  const [decision, setDecision] = useState('valide');
  const [motif, setMotif]       = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const url = type === 'theme'
        ? `/chef/themes/${item.id}/decision`
        : `/chef/documents/${item.id}/decision`;
      await api.post(url, { decision, motif: decision === 'rejete' ? motif : undefined });
      onDone();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Décision sur : {item.titre}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {['valide', 'rejete'].map(d => (
              <button key={d} type="button"
                className={`btn ${decision === d ? (d === 'valide' ? 'btn-success' : 'btn-danger') : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setDecision(d)}
              >
                {d === 'valide' ? <><CheckCircle size={14} /> Valider</> : <><XCircle size={14} /> Rejeter</>}
              </button>
            ))}
          </div>
          {decision === 'rejete' && (
            <div className="form-group">
              <label>Motif du rejet *</label>
              <textarea placeholder="Expliquez la raison du rejet..." value={motif} onChange={e => setMotif(e.target.value)} rows={3} required />
            </div>
          )}
          <div style={{ background: 'var(--gray-50)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--gray-500)' }}>
            Score de similarité : <strong>{item.score_similarite ?? '—'}%</strong>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className={`btn ${decision === 'valide' ? 'btn-success' : 'btn-danger'}`}
            onClick={submit}
            disabled={loading || (decision === 'rejete' && !motif.trim())}
          >
            {loading ? 'Enregistrement...' : 'Confirmer la décision'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChefDashboard() {
  const [themes, setThemes]   = useState([]);
  const [docs, setDocs]       = useState([]);
  const [modal, setModal]     = useState(null);
  const [loading, setLoading] = useState(true);

  const charger = () => {
    setLoading(true);
    Promise.all([api.get('/chef/themes'), api.get('/chef/documents')])
      .then(([t, d]) => { setThemes(t.data); setDocs(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const enAttente = (arr) => arr.filter(i => i.statut === 'en_attente_chef');

  const stats = [
    { label: 'Thèmes en attente',   value: enAttente(themes).length,  color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Thèmes traités',      value: themes.filter(t => t.statut !== 'en_attente_chef').length, color: '#10b981', bg: '#d1fae5' },
    { label: 'Documents en attente',value: enAttente(docs).length,    color: '#E87722', bg: '#ffedd5' },
    { label: 'Documents traités',   value: docs.filter(d => d.statut !== 'en_attente_chef').length,   color: '#3b82f6', bg: '#dbeafe' },
  ];

  return (
    <Layout navItems={chefNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Examinez les soumissions de votre département.</p>
        </div>
        <button className="btn btn-secondary" onClick={charger}><RefreshCw size={14} /> Actualiser</button>
      </div>

      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Thèmes en attente */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Thèmes en attente de décision</h3>
          <span className="badge badge-pending">{enAttente(themes).length} en attente</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Titre</th><th>Similarité</th><th>Soumis le</th><th>Statut</th><th>Action</th></tr>
            </thead>
            <tbody>
              {themes.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>Aucun thème</td></tr>
              ) : themes.map(t => {
                const s = statusBadge[t.statut] || { label: t.statut, cls: 'badge-gray' };
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.etudiant?.prenom} {t.etudiant?.name}</td>
                    <td style={{ maxWidth: 240 }}>{t.titre}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: t.score_similarite >= 70 ? 'var(--danger)' : t.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                        {t.score_similarite}%
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>
                      {t.statut === 'en_attente_chef' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setModal({ item: t, type: 'theme' })}>
                          Décider
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents en attente */}
      <div className="card">
        <div className="card-header">
          <h3>Documents en attente de décision</h3>
          <span className="badge badge-pending">{enAttente(docs).length} en attente</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Titre</th><th>Niveau</th><th>Score plagiat</th><th>Statut</th><th>Action</th></tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>Aucun document</td></tr>
              ) : docs.map(d => {
                const s = statusBadge[d.statut] || { label: d.statut, cls: 'badge-gray' };
                const score = d.derniere_verification?.score_global;
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.etudiant?.prenom} {d.etudiant?.name}</td>
                    <td style={{ maxWidth: 220 }}>{d.titre}</td>
                    <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{d.niveau}</span></td>
                    <td>
                      {score != null ? (
                        <span style={{ fontWeight: 700, color: score >= 60 ? 'var(--danger)' : score >= 30 ? 'var(--warning)' : 'var(--success)' }}>
                          {score}%
                        </span>
                      ) : <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>Non vérifié</span>}
                    </td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>
                      {d.statut === 'en_attente_chef' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setModal({ item: d, type: 'document' })}>
                          Décider
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <DecisionModal
          item={modal.item}
          type={modal.type}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); charger(); }}
        />
      )}
    </Layout>
  );
}
