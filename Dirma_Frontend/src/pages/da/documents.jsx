import { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, X, RefreshCw, Search, Download } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const daNav = [
  { path: '/da/dashboard',    icon: FileText, label: 'Tableau de bord' },
  { path: '/da/themes',       icon: FileText, label: 'Thèmes' },
  { path: '/da/documents',    icon: FileText, label: 'Documents' },
  { path: '/da/statistiques', icon: FileText, label: 'Statistiques' },
];

const STATUTS = {
  en_attente_da: { label: 'En attente', cls: 'badge-orange' },
  rejete_da:     { label: 'Rejeté',     cls: 'badge-danger' },
  valide:        { label: 'Validé',     cls: 'badge-success' },
};

function ScoreBar({ score }) {
  if (score == null) return <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>—</span>;
  const color = score >= 60 ? 'var(--danger)' : score >= 30 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{score}%</span>
    </div>
  );
}

function ModalDecision({ doc, onClose, onDone }) {
  const [decision, setDecision] = useState('valide');
  const [motif, setMotif]       = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/da/documents/${doc.id}/decision`, {
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
          <h3>Décision finale — {doc.titre}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            <p><strong>Étudiant :</strong> {doc.etudiant?.prenom} {doc.etudiant?.name}</p>
            <p style={{ marginTop: 4 }}><strong>Niveau :</strong> {doc.niveau} · {doc.annee_universitaire}</p>
            <p style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>Score plagiat :</strong> <ScoreBar score={doc.derniere_verification?.score_global} />
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

export default function DADocuments() {
  const [docs, setDocs]       = useState([]);
  const [modal, setModal]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre]   = useState('tous');

  const charger = () => {
    setLoading(true);
    api.get('/da/documents').then(r => setDocs(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const filtres = [
    { val: 'tous',         label: 'Tous' },
    { val: 'en_attente_da',label: 'En attente' },
    { val: 'valide',       label: 'Validés' },
    { val: 'rejete_da',    label: 'Rejetés' },
  ];

  const docsFiltres = filtre === 'tous' ? docs : docs.filter(d => d.statut === filtre);

  return (
    <Layout navItems={daNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Validation finale des documents</h1>
          <p className="page-subtitle">Approuvez ou rejetez les documents transmis par les chefs de département.</p>
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
              {f.val === 'tous' ? docs.length : docs.filter(d => d.statut === f.val).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Titre</th><th>Niveau</th><th>Score plagiat</th><th>Validé par chef</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : docsFiltres.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><h4>Aucun document</h4></div></td></tr>
              ) : docsFiltres.map(d => {
                const s = STATUTS[d.statut] || { label: d.statut, cls: 'badge-gray' };
                const chefDec = d.decisions?.find(dec => dec.type_decideur === 'chef_departement');
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.etudiant?.prenom} {d.etudiant?.name}</td>
                    <td style={{ maxWidth: 220 }}>{d.titre}</td>
                    <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{d.niveau}</span></td>
                    <td><ScoreBar score={d.derniere_verification?.score_global} /></td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {chefDec ? `${chefDec.decideur?.prenom} ${chefDec.decideur?.name}` : '—'}
                    </td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="action-btn" title="Télécharger"
                          onClick={() => window.open(`http://localhost:8000/api/da/documents/${d.id}/telecharger`)}>
                          <Download size={14} />
                        </button>
                        {d.statut === 'en_attente_da' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setModal(d)}>Décider</button>
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

      {modal && <ModalDecision doc={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); charger(); }} />}
    </Layout>
  );
}
