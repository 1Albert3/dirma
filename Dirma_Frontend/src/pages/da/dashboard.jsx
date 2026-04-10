import { useEffect, useState } from 'react';
import { LayoutDashboard, BookOpen, FileText, BarChart2, CheckCircle, XCircle, X, TrendingUp, Users, RefreshCw } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const daNav = [
  { path: '/da/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/da/themes',      icon: BookOpen,        label: 'Thèmes' },
  { path: '/da/documents',   icon: FileText,        label: 'Documents' },
  { path: '/da/statistiques',icon: BarChart2,       label: 'Statistiques' },
];

function DecisionModal({ item, type, onClose, onDone }) {
  const [decision, setDecision] = useState('valide');
  const [motif, setMotif]       = useState('');
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const url = type === 'theme' ? `/da/themes/${item.id}/decision` : `/da/documents/${item.id}/decision`;
      await api.post(url, {
        decision,
        motif:           decision === 'rejete' ? motif : undefined,
        note_officielle: decision === 'valide' ? note : undefined,
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
          <h3>Décision finale — {item.titre}</h3>
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
                {d === 'valide' ? <><CheckCircle size={14} /> Approuver</> : <><XCircle size={14} /> Rejeter</>}
              </button>
            ))}
          </div>
          {decision === 'valide' && (
            <div className="form-group">
              <label>Note officielle *</label>
              <textarea placeholder="Rédigez la note officielle transmise à l'étudiant..." value={note} onChange={e => setNote(e.target.value)} rows={3} required />
            </div>
          )}
          {decision === 'rejete' && (
            <div className="form-group">
              <label>Motif du rejet *</label>
              <textarea placeholder="Expliquez la raison du rejet..." value={motif} onChange={e => setMotif(e.target.value)} rows={3} required />
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

export default function DADashboard() {
  const [themes, setThemes]   = useState([]);
  const [docs, setDocs]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [modal, setModal]     = useState(null);
  const [loading, setLoading] = useState(true);

  const charger = () => {
    setLoading(true);
    Promise.all([
      api.get('/da/themes'),
      api.get('/da/documents'),
      api.get('/da/statistiques'),
    ]).then(([t, d, s]) => {
      setThemes(t.data);
      setDocs(d.data);
      setStats(s.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const enAttente = (arr) => arr.filter(i => i.statut === 'en_attente_da');

  return (
    <Layout navItems={daNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue d'ensemble et validations finales.</p>
        </div>
        <button className="btn btn-secondary" onClick={charger}><RefreshCw size={14} /> Actualiser</button>
      </div>

      {/* Stats globales */}
      <div className="stats-grid">
        {[
          { label: 'Étudiants',         value: stats?.total_etudiants,   color: '#3b82f6', bg: '#dbeafe', icon: Users },
          { label: 'Thèmes à valider',  value: enAttente(themes).length, color: '#f59e0b', bg: '#fef3c7', icon: BookOpen },
          { label: 'Docs à valider',    value: enAttente(docs).length,   color: '#E87722', bg: '#ffedd5', icon: FileText },
          { label: 'Score plagiat moy.',value: stats ? `${stats.score_moyen_global}%` : '—', color: '#8b5cf6', bg: '#ede9fe', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>

        {/* Thèmes en attente */}
        <div className="card">
          <div className="card-header">
            <h3>Thèmes en attente de validation finale</h3>
            <span className="badge badge-orange">{enAttente(themes).length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Étudiant</th><th>Titre</th><th>Département</th><th>Similarité</th><th>Action</th></tr>
              </thead>
              <tbody>
                {themes.filter(t => t.statut === 'en_attente_da').length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>Aucun thème en attente</td></tr>
                ) : themes.filter(t => t.statut === 'en_attente_da').map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.etudiant?.prenom} {t.etudiant?.name}</td>
                    <td style={{ maxWidth: 200 }}>{t.titre}</td>
                    <td style={{ fontSize: 12 }}>{t.departement}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: t.score_similarite >= 70 ? 'var(--danger)' : t.score_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                        {t.score_similarite}%
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => setModal({ item: t, type: 'theme' })}>
                        Décider
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats par département */}
        <div className="card">
          <div className="card-header"><h3>Par département</h3></div>
          <div className="card-body">
            {stats?.par_departement && Object.entries(stats.par_departement).map(([dept, count]) => {
              const total = Object.values(stats.par_departement).reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={dept} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{dept}</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{count}</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), #f59e0b)', borderRadius: 4, transition: 'width .6s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Documents en attente */}
      <div className="card">
        <div className="card-header">
          <h3>Documents en attente de validation finale</h3>
          <span className="badge badge-orange">{enAttente(docs).length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Titre</th><th>Niveau</th><th>Score plagiat</th><th>Validé par chef</th><th>Action</th></tr>
            </thead>
            <tbody>
              {docs.filter(d => d.statut === 'en_attente_da').length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>Aucun document en attente</td></tr>
              ) : docs.filter(d => d.statut === 'en_attente_da').map(d => {
                const score = d.derniere_verification?.score_global;
                const chefDecision = d.decisions?.find(dec => dec.type_decideur === 'chef_departement');
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.etudiant?.prenom} {d.etudiant?.name}</td>
                    <td style={{ maxWidth: 200 }}>{d.titre}</td>
                    <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{d.niveau}</span></td>
                    <td>
                      {score != null ? (
                        <span style={{ fontWeight: 700, color: score >= 60 ? 'var(--danger)' : score >= 30 ? 'var(--warning)' : 'var(--success)' }}>
                          {score}%
                        </span>
                      ) : <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {chefDecision?.decideur?.prenom} {chefDecision?.decideur?.name}
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => setModal({ item: d, type: 'document' })}>
                        Décider
                      </button>
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
