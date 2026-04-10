import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, X, RefreshCw, LayoutDashboard, BookOpen, FileText, BarChart2 } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import '../../components/ui.css';

const daNav = [
  { path: '/da/dashboard',      icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/da/themes',         icon: BookOpen,        label: 'Thèmes' },
  { path: '/da/documents',      icon: FileText,        label: 'Documents' },
  { path: '/da/statistiques',   icon: BarChart2,       label: 'Statistiques' },
  { path: '/da/utilisateurs',   icon: Users,           label: 'Utilisateurs' },
];

const ROLES = {
  etudiant:          { label: 'Étudiant',          cls: 'badge-info' },
  chef_departement:  { label: 'Chef Département',  cls: 'badge-orange' },
  directeur_adjoint: { label: 'Directeur Adjoint', cls: 'badge-success' },
};

export default function DAUtilisateurs() {
  const [users, setUsers]     = useState([]);
  const [modal, setModal]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name: '', prenom: '', email: '', role: 'etudiant', departement: 'Informatique', matricule: '' });
  const [error, setError]     = useState('');

  const charger = () => {
    setLoading(true);
    api.get('/da/utilisateurs').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const creer = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/da/utilisateurs', form);
      setModal(false);
      setForm({ name: '', prenom: '', email: '', role: 'etudiant', departement: 'Informatique', matricule: '' });
      charger();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Erreur.');
    } finally { setSaving(false); }
  };

  const supprimer = async (user) => {
    if (!confirm(`Supprimer ${user.prenom} ${user.name} ?`)) return;
    try {
      await api.delete(`/da/utilisateurs/${user.id}`);
      charger();
    } catch (err) { alert(err.response?.data?.message || 'Erreur.'); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Layout navItems={daNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="page-subtitle">{users.length} utilisateur(s) enregistré(s)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={charger}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} /> Nouvel utilisateur</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nom</th><th>Email / Matricule</th><th>Rôle</th><th>Département</th><th>Inscrit le</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : users.map(u => {
                const r = ROLES[u.role] || { label: u.role, cls: 'badge-gray' };
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.prenom} {u.name}</td>
                    <td>
                      <p style={{ fontSize: 13 }}>{u.email}</p>
                      {u.matricule && <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>{u.matricule}</p>}
                    </td>
                    <td><span className={`badge ${r.cls}`}>{r.label}</span></td>
                    <td style={{ fontSize: 13 }}>{u.departement}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {u.role !== 'directeur_adjoint' && (
                        <button className="action-btn danger" onClick={() => supprimer(u)} title="Supprimer">
                          <Trash2 size={14} />
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
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouvel utilisateur</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={creer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <div className="auth-error">{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group"><label>Prénom *</label><input value={form.prenom} onChange={e => set('prenom', e.target.value)} required /></div>
                  <div className="form-group"><label>Nom *</label><input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
                </div>
                <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="etudiant">Étudiant</option>
                    <option value="chef_departement">Chef de Département</option>
                    <option value="directeur_adjoint">Directeur Adjoint</option>
                  </select>
                </div>
                {form.role === 'etudiant' && (
                  <div className="form-group"><label>Matricule</label><input value={form.matricule} onChange={e => set('matricule', e.target.value)} placeholder="Ex: 20240010" /></div>
                )}
                <div className="form-group">
                  <label>Département *</label>
                  <select value={form.departement} onChange={e => set('departement', e.target.value)}>
                    <option>Informatique</option>
                    <option>Réseaux & Télécommunications</option>
                    <option>Intelligence Artificielle</option>
                    <option>Génie Logiciel</option>
                    <option>Direction</option>
                  </select>
                </div>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 6 }}>
                  Le mot de passe par défaut sera <strong>password</strong>. L'utilisateur devra le changer.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Création...' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
