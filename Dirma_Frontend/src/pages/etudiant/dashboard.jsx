import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Search, CheckCircle, Plus } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { etudiantNav } from './nav';
import '../../components/ui.css';

const statusBadge = {
  en_attente_analyse: { label: 'En analyse',    cls: 'badge-info' },
  rejete_auto:        { label: 'Rejeté auto',   cls: 'badge-danger' },
  en_attente_chef:    { label: 'Chez le chef',  cls: 'badge-pending' },
  rejete_chef:        { label: 'Rejeté',        cls: 'badge-danger' },
  en_attente_da:      { label: 'Chez le DA',    cls: 'badge-orange' },
  rejete_da:          { label: 'Rejeté DA',     cls: 'badge-danger' },
  valide:             { label: 'Validé ✓',      cls: 'badge-success' },
  depose:             { label: 'Déposé',        cls: 'badge-gray' },
  en_verification:    { label: 'En vérif.',     cls: 'badge-info' },
  verifie:            { label: 'Vérifié',       cls: 'badge-info' },
};

export default function EtudiantDashboard() {
  const { user }                = useAuth();
  const [themes, setThemes]     = useState([]);
  const [docs, setDocs]         = useState([]);
  const [verifs, setVerifs]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/etudiant/themes'),
      api.get('/etudiant/documents'),
      api.get('/etudiant/verifications'),
    ]).then(([t, d, v]) => {
      setThemes(t.data);
      setDocs(d.data);
      setVerifs(v.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Thèmes soumis',   value: themes.length,                                          color: '#3b82f6', bg: '#dbeafe', icon: BookOpen },
    { label: 'Thèmes validés',  value: themes.filter(t => t.statut === 'valide').length,        color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
    { label: 'Documents',       value: docs.length,                                             color: '#E87722', bg: '#ffedd5', icon: FileText },
    { label: 'Vérifications',   value: verifs.filter(v => v.statut === 'termine').length,       color: '#8b5cf6', bg: '#ede9fe', icon: Search },
  ];

  return (
    <Layout navItems={etudiantNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bonjour, {user?.prenom} 👋</h1>
          <p className="page-subtitle">Voici un aperçu de votre activité sur DIRMA.</p>
        </div>
        <Link to="/etudiant/themes/nouveau" className="btn btn-primary">
          <Plus size={15} /> Nouveau thème
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(s => (
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Derniers thèmes */}
        <div className="card">
          <div className="card-header">
            <h3>Mes thèmes récents</h3>
            <Link to="/etudiant/themes" className="btn btn-secondary btn-sm">Voir tout</Link>
          </div>
          {themes.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={32} />
              <h4>Aucun thème soumis</h4>
              <p>Soumettez votre premier thème pour commencer.</p>
            </div>
          ) : (
            <div>
              {themes.slice(0, 4).map(t => {
                const s = statusBadge[t.statut] || { label: t.statut, cls: 'badge-gray' };
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)' }}>{t.titre}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Similarité : {t.score_similarite}%</p>
                    </div>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Derniers documents */}
        <div className="card">
          <div className="card-header">
            <h3>Mes documents récents</h3>
            <Link to="/etudiant/documents" className="btn btn-secondary btn-sm">Voir tout</Link>
          </div>
          {docs.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <h4>Aucun document déposé</h4>
              <p>Déposez un document une fois votre thème validé.</p>
            </div>
          ) : (
            <div>
              {docs.slice(0, 4).map(d => {
                const s = statusBadge[d.statut] || { label: d.statut, cls: 'badge-gray' };
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-800)' }}>{d.titre}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{d.niveau} · {d.annee_universitaire}</p>
                    </div>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
