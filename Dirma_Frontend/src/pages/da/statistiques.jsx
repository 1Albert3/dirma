import { useEffect, useState } from 'react';
import { BarChart2, Users, BookOpen, FileText, TrendingUp, RefreshCw, Award } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const daNav = [
  { path: '/da/dashboard',    icon: BarChart2, label: 'Tableau de bord' },
  { path: '/da/themes',       icon: BookOpen,  label: 'Thèmes' },
  { path: '/da/documents',    icon: FileText,  label: 'Documents' },
  { path: '/da/statistiques', icon: BarChart2, label: 'Statistiques' },
];

function StatCard({ icon: Icon, label, value, color, bg, suffix = '' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value ?? '—'}{suffix}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function BarHorizontal({ label, value, total, color = 'var(--primary)' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 500, color: 'var(--gray-700)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 10, background: 'var(--gray-200)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

export default function DAStatistiques() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const charger = () => {
    setLoading(true);
    api.get('/da/statistiques').then(r => setStats(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const totalDepts = stats ? Object.values(stats.par_departement).reduce((a, b) => a + b, 0) : 0;

  const scoreColor = (s) => s >= 60 ? 'var(--danger)' : s >= 30 ? 'var(--warning)' : 'var(--success)';

  return (
    <Layout navItems={daNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistiques globales</h1>
          <p className="page-subtitle">Vue d'ensemble de l'activité académique DIRMA.</p>
        </div>
        <button className="btn btn-secondary" onClick={charger}><RefreshCw size={14} /> Actualiser</button>
        <a
          href="http://localhost:8000/api/da/statistiques/export"
          className="btn btn-secondary"
          onClick={e => {
            e.preventDefault();
            const token = localStorage.getItem('dirma_token');
            fetch('http://localhost:8000/api/da/statistiques/export', {
              headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.blob()).then(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `dirma-stats-${new Date().toISOString().slice(0,10)}.csv`; a.click();
              URL.revokeObjectURL(url);
            });
          }}
        >
          ↓ Exporter CSV
        </a>
      </div>

      {/* Stats principales */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard icon={Users}     label="Étudiants inscrits"   value={stats?.total_etudiants}      color="#3b82f6" bg="#dbeafe" />
        <StatCard icon={BookOpen}  label="Thèmes soumis"        value={stats?.total_themes}          color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon={BookOpen}  label="Thèmes validés"       value={stats?.themes_valides}        color="#10b981" bg="#d1fae5" />
        <StatCard icon={FileText}  label="Documents soumis"     value={stats?.total_documents}       color="#E87722" bg="#ffedd5" />
        <StatCard icon={FileText}  label="Documents validés"    value={stats?.documents_valides}     color="#10b981" bg="#d1fae5" />
        <StatCard icon={TrendingUp}label="Score plagiat moyen"  value={stats?.score_moyen_global}    color={scoreColor(stats?.score_moyen_global ?? 0)} bg="#f8fafc" suffix="%" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Thèmes */}
        <div className="card">
          <div className="card-header"><h3>Thèmes — Répartition</h3></div>
          <div className="card-body">
            {loading ? <p style={{ color: 'var(--gray-400)', textAlign: 'center' }}>Chargement...</p> : (
              <>
                <BarHorizontal label="Validés"     value={stats?.themes_valides ?? 0}    total={stats?.total_themes ?? 1} color="var(--success)" />
                <BarHorizontal label="En attente"  value={stats?.themes_en_attente ?? 0} total={stats?.total_themes ?? 1} color="var(--warning)" />
                <BarHorizontal label="Rejetés"     value={(stats?.total_themes ?? 0) - (stats?.themes_valides ?? 0) - (stats?.themes_en_attente ?? 0)} total={stats?.total_themes ?? 1} color="var(--danger)" />
              </>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="card">
          <div className="card-header"><h3>Documents — Répartition</h3></div>
          <div className="card-body">
            {loading ? <p style={{ color: 'var(--gray-400)', textAlign: 'center' }}>Chargement...</p> : (
              <>
                <BarHorizontal label="Validés"    value={stats?.documents_valides ?? 0}    total={stats?.total_documents ?? 1} color="var(--success)" />
                <BarHorizontal label="En attente" value={stats?.documents_en_attente ?? 0} total={stats?.total_documents ?? 1} color="var(--warning)" />
                <BarHorizontal label="Rejetés"    value={(stats?.total_documents ?? 0) - (stats?.documents_valides ?? 0) - (stats?.documents_en_attente ?? 0)} total={stats?.total_documents ?? 1} color="var(--danger)" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Par département */}
      <div className="card">
        <div className="card-header">
          <h3>Étudiants par département</h3>
          <span className="badge badge-gray">{totalDepts} au total</span>
        </div>
        <div className="card-body">
          {loading ? (
            <p style={{ color: 'var(--gray-400)', textAlign: 'center' }}>Chargement...</p>
          ) : stats?.par_departement && Object.keys(stats.par_departement).length === 0 ? (
            <p style={{ color: 'var(--gray-400)', textAlign: 'center' }}>Aucune donnée</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              {stats?.par_departement && Object.entries(stats.par_departement)
                .sort(([, a], [, b]) => b - a)
                .map(([dept, count], i) => {
                  const colors = ['var(--primary)', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
                  return (
                    <BarHorizontal
                      key={dept}
                      label={dept}
                      value={count}
                      total={totalDepts}
                      color={colors[i % colors.length]}
                    />
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Score plagiat moyen */}
      {stats && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Indicateur plagiat global</h3></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--gray-600)' }}>Score moyen de plagiat ({stats.total_verifications} vérifications)</span>
                <span style={{ fontWeight: 700, color: scoreColor(stats.score_moyen_global) }}>{stats.score_moyen_global}%</span>
              </div>
              <div style={{ height: 14, background: 'var(--gray-200)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.score_moyen_global}%`, background: scoreColor(stats.score_moyen_global), borderRadius: 7, transition: 'width .8s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
                <span>0% — Aucun plagiat</span>
                <span>50% — Modéré</span>
                <span>100% — Plagiat total</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--gray-50)', borderRadius: 12, border: '2px solid var(--gray-200)' }}>
              <Award size={28} style={{ color: scoreColor(stats.score_moyen_global), marginBottom: 6 }} />
              <p style={{ fontSize: 28, fontWeight: 800, color: scoreColor(stats.score_moyen_global) }}>{stats.score_moyen_global}%</p>
              <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>Score moyen</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
