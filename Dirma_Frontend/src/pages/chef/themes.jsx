import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, XCircle, X, RefreshCw, Eye } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const chefNav = [
  { path: '/chef/dashboard', icon: BookOpen,     label: 'Tableau de bord' },
  { path: '/chef/themes',    icon: BookOpen,      label: 'Thèmes' },
  { path: '/chef/documents', icon: BookOpen,      label: 'Documents' },
];

const STATUTS = {
  en_attente_chef: { label: 'En attente', cls: 'badge-pending' },
  rejete_chef:     { label: 'Rejeté',     cls: 'badge-danger' },
  en_attente_da:   { label: 'Transmis DA',cls: 'badge-orange' },
  rejete_da:       { label: 'Rejeté DA',  cls: 'badge-danger' },
  valide:          { label: 'Validé',     cls: 'badge-success' },
};

function ModalDecision({ theme, onClose, onDone }) {
  const [decision, setDecision] = useState('valide');
  const [motif, setMotif]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/chef/themes/${theme.id}/decision`, {
        decision,
        motif: decision === 'rejete' ? motif : undefined,
      });
      onDone();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Décision — {theme.titre}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            <p><strong>Étudiant :</strong> {theme.etudiant?.prenom} {theme.etudiant?.name}</p>
            <p style={{ marginTop: 4 }}><strong>Similarité :</strong>
              <span style={{ fontWeight: 700, marginLeft: 6, color: theme.score_similarite >= 70 ? 'var(--danger)' : theme.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                {theme.score_similarite}%
              </span>
            </p>
            <p style={{ marginTop: 4, color: 'var(--gray-600)', fontSize: 12 }}>{theme.description}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['valide', 'rejete'].map(d => (
              <button key={d} type="button"
                className={`btn ${decision === d ? (d === 'valide' ? 'btn-success' : 'btn-danger') : 'btn-secondary'}`}
                style={{ flex: 1 }} onClick={() => setDecision(d)}
              >
                {d === 'valide' ? <><CheckCircle size={14} /> Valider</> : <><XCircle size={14} /> Rejeter</>}
              </button>
            ))}
          </div>
          {decision === 'rejete' && (
            <div className="form-group">
              <label>Motif du rejet *</label>
              <textarea rows={3} placeholder="Expliquez la raison..." value={motif} onChange={e => setMotif(e.target.value)} required />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className={`btn ${decision === 'valide' ? 'btn-success' : 'btn-danger'}`}
            onClick={submit}
            disabled={loading || (decision === 'rejete' && !motif.trim())}
          >
            {loading ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalDetail({ theme, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Détail du thème</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label>Titre</label><p style={{ fontSize: 14, fontWeight: 600 }}>{theme.titre}</p></div>
          <div className="form-group"><label>Description</label><p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6 }}>{theme.description}</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Étudiant</label><p style={{ fontSize: 13 }}>{theme.etudiant?.prenom} {theme.etudiant?.name}</p></div>
            <div className="form-group"><label>Matricule</label><p style={{ fontSize: 13 }}>{theme.etudiant?.matricule}</p></div>
            <div className="form-group"><label>Département</label><p style={{ fontSize: 13 }}>{theme.departement}</p></div>
            <div className="form-group"><label>Année</label><p style={{ fontSize: 13 }}>{theme.annee_universitaire}</p></div>
          </div>
          <div className="form-group">
            <label>Score de similarité</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${theme.score_similarite}%`, background: theme.score_similarite >= 70 ? 'var(--danger)' : theme.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)', borderRadius: 4 }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{theme.score_similarite}%</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default function ChefThemes() {
  const [themes, setThemes]   = useState([]);
  const [modal, setModal]     = useState(null);
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre]   = useState('tous');

  const charger = () => {
    setLoading(true);
    api.get('/chef/themes').then(r => setThemes(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const filtres = [
    { val: 'tous',           label: 'Tous' },
    { val: 'en_attente_chef',label: 'En attente' },
    { val: 'en_attente_da',  label: 'Transmis DA' },
    { val: 'valide',         label: 'Validés' },
    { val: 'rejete_chef',    label: 'Rejetés' },
  ];

  const themesFiltres = filtre === 'tous' ? themes : themes.filter(t => t.statut === filtre);

  return (
    <Layout navItems={chefNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Thèmes à examiner</h1>
          <p className="page-subtitle">Examinez et prenez des décisions sur les thèmes soumis.</p>
        </div>
        <button className="btn btn-secondary" onClick={charger}><RefreshCw size={14} /> Actualiser</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filtres.map(f => (
          <button key={f.val}
            className={`btn btn-sm ${filtre === f.val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltre(f.val)}
          >
            {f.label}
            <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.25)', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>
              {f.val === 'tous' ? themes.length : themes.filter(t => t.statut === f.val).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Titre</th><th>Département</th><th>Similarité</th><th>Soumis le</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : themesFiltres.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><h4>Aucun thème</h4></div></td></tr>
              ) : themesFiltres.map(t => {
                const s = STATUTS[t.statut] || { label: t.statut, cls: 'badge-gray' };
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.etudiant?.prenom} {t.etudiant?.name}</td>
                    <td style={{ maxWidth: 260 }}>{t.titre}</td>
                    <td style={{ fontSize: 12 }}>{t.departement}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: t.score_similarite >= 70 ? 'var(--danger)' : t.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                        {t.score_similarite}%
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="action-btn" title="Voir détail" onClick={() => setDetail(t)}><Eye size={14} /></button>
                        {t.statut === 'en_attente_chef' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setModal(t)}>Décider</button>
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

      {modal  && <ModalDecision theme={modal}  onClose={() => setModal(null)}  onDone={() => { setModal(null);  charger(); }} />}
      {detail && <ModalDetail   theme={detail} onClose={() => setDetail(null)} />}
    </Layout>
  );
}
