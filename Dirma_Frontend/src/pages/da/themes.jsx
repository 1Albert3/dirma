import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, XCircle, X, RefreshCw, Eye } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const daNav = [
  { path: '/da/dashboard',    icon: BookOpen, label: 'Tableau de bord' },
  { path: '/da/themes',       icon: BookOpen, label: 'Thèmes' },
  { path: '/da/documents',    icon: BookOpen, label: 'Documents' },
  { path: '/da/statistiques', icon: BookOpen, label: 'Statistiques' },
];

const STATUTS = {
  en_attente_da: { label: 'En attente', cls: 'badge-orange' },
  rejete_da:     { label: 'Rejeté',     cls: 'badge-danger' },
  valide:        { label: 'Validé',     cls: 'badge-success' },
};

function ModalDecision({ theme, onClose, onDone }) {
  const [decision, setDecision] = useState('valide');
  const [motif, setMotif]       = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/da/themes/${theme.id}/decision`, {
        decision,
        motif:           decision === 'rejete' ? motif : undefined,
        note_officielle: decision === 'valide' ? note  : undefined,
      });
      onDone();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Décision finale — {theme.titre}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            <p><strong>Étudiant :</strong> {theme.etudiant?.prenom} {theme.etudiant?.name}</p>
            <p style={{ marginTop: 4 }}><strong>Département :</strong> {theme.departement}</p>
            <p style={{ marginTop: 4 }}><strong>Similarité :</strong>
              <span style={{ fontWeight: 700, marginLeft: 6, color: theme.score_similarite >= 70 ? 'var(--danger)' : theme.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                {theme.score_similarite}%
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['valide', 'rejete'].map(d => (
              <button key={d} type="button"
                className={`btn ${decision === d ? (d === 'valide' ? 'btn-success' : 'btn-danger') : 'btn-secondary'}`}
                style={{ flex: 1 }} onClick={() => setDecision(d)}
              >
                {d === 'valide' ? <><CheckCircle size={14} /> Approuver</> : <><XCircle size={14} /> Rejeter</>}
              </button>
            ))}
          </div>
          {decision === 'valide' && (
            <div className="form-group">
              <label>Note officielle *</label>
              <textarea rows={3} placeholder="Rédigez la note officielle..." value={note} onChange={e => setNote(e.target.value)} required />
            </div>
          )}
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
            disabled={loading || (decision === 'rejete' && !motif.trim()) || (decision === 'valide' && !note.trim())}
          >
            {loading ? 'Enregistrement...' : 'Confirmer la décision finale'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DAThemes() {
  const [themes, setThemes]   = useState([]);
  const [modal, setModal]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre]   = useState('tous');

  const charger = () => {
    setLoading(true);
    api.get('/da/themes').then(r => setThemes(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const filtres = [
    { val: 'tous',        label: 'Tous' },
    { val: 'en_attente_da', label: 'En attente' },
    { val: 'valide',      label: 'Validés' },
    { val: 'rejete_da',   label: 'Rejetés' },
  ];

  const themesFiltres = filtre === 'tous' ? themes : themes.filter(t => t.statut === filtre);

  return (
    <Layout navItems={daNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Validation finale des thèmes</h1>
          <p className="page-subtitle">Approuvez ou rejetez les thèmes transmis par les chefs de département.</p>
        </div>
        <button className="btn btn-secondary" onClick={charger}><RefreshCw size={14} /> Actualiser</button>
      </div>

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
              <tr><th>Étudiant</th><th>Titre</th><th>Département</th><th>Similarité</th><th>Validé par chef</th><th>Statut</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : themesFiltres.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><h4>Aucun thème</h4></div></td></tr>
              ) : themesFiltres.map(t => {
                const s = STATUTS[t.statut] || { label: t.statut, cls: 'badge-gray' };
                const chefDec = t.decisions?.find(d => d.type_decideur === 'chef_departement');
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.etudiant?.prenom} {t.etudiant?.name}</td>
                    <td style={{ maxWidth: 240 }}>{t.titre}</td>
                    <td style={{ fontSize: 12 }}>{t.departement}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: t.score_similarite >= 70 ? 'var(--danger)' : t.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                        {t.score_similarite}%
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {chefDec ? `${chefDec.decideur?.prenom} ${chefDec.decideur?.name}` : '—'}
                    </td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>
                      {t.statut === 'en_attente_da' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setModal(t)}>Décider</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ModalDecision theme={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); charger(); }} />}
    </Layout>
  );
}
