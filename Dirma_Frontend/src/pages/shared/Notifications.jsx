import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, RefreshCw, LayoutDashboard, BookOpen, FileText, BarChart2 } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { etudiantNav } from '../etudiant/nav';
import '../../components/ui.css';

const NAV = {
  chef_departement: [
    { path: '/chef/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/chef/themes',    icon: BookOpen,         label: 'Thèmes' },
    { path: '/chef/documents', icon: FileText,         label: 'Documents' },
  ],
  directeur_adjoint: [
    { path: '/da/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/da/themes',       icon: BookOpen,        label: 'Thèmes' },
    { path: '/da/documents',    icon: FileText,        label: 'Documents' },
    { path: '/da/statistiques', icon: BarChart2,       label: 'Statistiques' },
  ],
};

const ICONES = {
  info:          { icon: Info,          color: '#3b82f6', bg: '#dbeafe' },
  succes:        { icon: CheckCircle,   color: '#10b981', bg: '#d1fae5' },
  avertissement: { icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
  erreur:        { icon: XCircle,       color: '#ef4444', bg: '#fee2e2' },
};

export default function Notifications() {
  const { user }              = useAuth();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);

  const navItems = NAV[user?.role] || etudiantNav;

  const charger = () => {
    setLoading(true);
    api.get('/notifications')
      .then(r => setNotifs(r.data.notifications))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const marquerToutesLues = async () => {
    setBusy(true);
    try { await api.post('/notifications/lues'); charger(); }
    finally { setBusy(false); }
  };

  const nonLues = notifs.filter(n => !n.lu).length;

  return (
    <Layout navItems={navItems}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {nonLues > 0 ? `${nonLues} non lue(s)` : 'Toutes lues'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={charger}>
            <RefreshCw size={14} /> Actualiser
          </button>
          {nonLues > 0 && (
            <button className="btn btn-primary" onClick={marquerToutesLues} disabled={busy}>
              <CheckCheck size={14} />
              {busy ? 'En cours...' : 'Tout marquer comme lu'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
            <RefreshCw size={32} className="spin" style={{ marginBottom: 12 }} />
            <p>Chargement...</p>
          </div>
        ) : notifs.length === 0 ? (
          <div className="empty-state">
            <Bell size={40} />
            <h4>Aucune notification</h4>
            <p>Vous n'avez pas encore de notifications.</p>
          </div>
        ) : notifs.map(n => {
          const cfg  = ICONES[n.type] || ICONES.info;
          const Icon = cfg.icon;
          return (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '16px 20px', borderBottom: '1px solid var(--gray-100)',
              background: n.lu ? '#fff' : `${cfg.color}06`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: cfg.bg, color: cfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: n.lu ? 500 : 700, color: 'var(--gray-800)' }}>
                    {n.titre}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {!n.lu && <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />}
                    <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4, lineHeight: 1.5 }}>
                  {n.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
