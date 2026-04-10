import { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, X, RefreshCw, Eye, Download, Search } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const chefNav = [
  { path: '/chef/dashboard', icon: FileText, label: 'Tableau de bord' },
  { path: '/chef/themes',    icon: FileText, label: 'Thèmes' },
  { path: '/chef/documents', icon: FileText, label: 'Documents' },
];

const STATUTS = {
  depose:          { label: 'Déposé',       cls: 'badge-gray' },
  en_verification: { label: 'En vérif.',    cls: 'badge-info' },
  verifie:         { label: 'Vérifié',      cls: 'badge-info' },
  en_attente_chef: { label: 'En attente',   cls: 'badge-pending' },
  rejete_chef:     { label: 'Rejeté',       cls: 'badge-danger' },
  en_attente_da:   { label: 'Transmis DA',  cls: 'badge-orange' },
  rejete_da:       { label: 'Rejeté DA',    cls: 'badge-danger' },
  valide:          { label: 'Validé',       cls: 'badge-success' },
};

function ScoreBar({ score }) {
  if (score == null) return <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>Non vérifié</span>;
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
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post(`/chef/documents/${doc.id}/decision`, {
        decision,
        motif: decision === 'rejete' ? motif : undefined,
      });
      onDone();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    } finally { setLoading(false); }
  };

  const score = doc.derniere_verification?.score_global;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Décision — {doc.titre}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--gray-50)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            <p><strong>Étudiant :</strong> {doc.etudiant?.prenom} {doc.etudiant?.name}</p>
            <p style={{ marginTop: 4 }}><strong>Niveau :</strong> {doc.niveau} · {doc.annee_universitaire}</p>
            <p style={{ marginTop: 4 }}><strong>Score plagiat :</strong> <ScoreBar score={score} /></p>
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

function ModalRapport({ doc, onClose }) {
  const [verif, setVerif] = useState(null);

  useEffect(() => {
    if (doc.derniere_verification?.id) {
      api.get(`/chef/verifications/${doc.derniere_verification.id}`)
        .then(r => setVerif(r.data));
    }
  }, [doc]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Rapport — {doc.titre}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {!verif ? (
            <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 30 }}>Chargement...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Scores */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Scores d'analyse</p>
                {[
                  { label: 'Score global', val: verif.score_global },
                  { label: 'Analyse locale (40%)', val: verif.score_local },
                  { label: 'Détection IA (35%)', val: verif.score_ia },
                  { label: 'Recherche web (25%)', val: verif.score_web },
                ].map(({ label, val }) => {
                  const color = (val ?? 0) >= 60 ? 'var(--danger)' : (val ?? 0) >= 30 ? 'var(--warning)' : 'var(--success)';
                  return (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--gray-600)' }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{val ?? '—'}%</span>
                      </div>
                      <div style={{ height: 7, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${val ?? 0}%`, background: color, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Sources */}
              {verif.sources?.length > 0 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Sources détectées ({verif.sources.length})</p>
                  {verif.sources.map((src, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className={`badge ${src.type === 'web' ? 'badge-info' : 'badge-pending'}`} style={{ marginBottom: 4 }}>{src.type}</span>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>{src.url || src.document_ref}</p>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>{src.taux_similarite}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default function ChefDocuments() {
  const [docs, setDocs]       = useState([]);
  const [modal, setModal]     = useState(null);
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre]   = useState('tous');

  const charger = () => {
    setLoading(true);
    api.get('/chef/documents').then(r => setDocs(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const filtres = [
    { val: 'tous',           label: 'Tous' },
    { val: 'en_attente_chef',label: 'En attente' },
    { val: 'en_attente_da',  label: 'Transmis DA' },
    { val: 'valide',         label: 'Validés' },
    { val: 'rejete_chef',    label: 'Rejetés' },
  ];

  const docsFiltres = filtre === 'tous' ? docs : docs.filter(d => d.statut === filtre);

  return (
    <Layout navItems={chefNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents à examiner</h1>
          <p className="page-subtitle">Consultez les rapports et prenez vos décisions.</p>
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
              <tr><th>Étudiant</th><th>Titre</th><th>Niveau</th><th>Score plagiat</th><th>Déposé le</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : docsFiltres.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><h4>Aucun document</h4></div></td></tr>
              ) : docsFiltres.map(d => {
                const s = STATUTS[d.statut] || { label: d.statut, cls: 'badge-gray' };
                const score = d.derniere_verification?.score_global;
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.etudiant?.prenom} {d.etudiant?.name}</td>
                    <td style={{ maxWidth: 220 }}>{d.titre}</td>
                    <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{d.niveau}</span></td>
                    <td><ScoreBar score={score} /></td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {score != null && (
                          <button className="action-btn" title="Voir rapport" onClick={() => setRapport(d)}><Search size={14} /></button>
                        )}
                        <button className="action-btn" title="Télécharger"
                          onClick={() => window.open(`http://localhost:8000/api/chef/documents/${d.id}/telecharger`)}>
                          <Download size={14} />
                        </button>
                        {d.statut === 'en_attente_chef' && (
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

      {modal   && <ModalDecision doc={modal}   onClose={() => setModal(null)}   onDone={() => { setModal(null);   charger(); }} />}
      {rapport && <ModalRapport  doc={rapport} onClose={() => setRapport(null)} />}
    </Layout>
  );
}
