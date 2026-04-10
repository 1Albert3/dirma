import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import './auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [form, setForm]     = useState({ identifiant: '', password: '', role: 'etudiant' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.identifiant, form.password, form.role);

      // Contrôle de rôle : le rôle sélectionné doit correspondre au rôle réel
      if (user.role !== form.role) {
        await logout();
        const labels = {
          etudiant:          'Étudiant',
          chef_departement:  'Chef de Département',
          directeur_adjoint: 'Directeur Adjoint',
        };
        setError(`Accès refusé. Ce compte est un compte "${labels[user.role]}", pas "${labels[form.role]}".`);
        return;
      }

      const routes = {
        etudiant:           '/etudiant/dashboard',
        chef_departement:   '/chef/dashboard',
        directeur_adjoint:  '/da/dashboard',
      };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Panneau gauche */}
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="auth-left-content">
            <img src={logo} alt="DIRMA" className="auth-logo" />
            <h1>DIRMA</h1>
            <p className="auth-slogan">« Ton travail, ta signature »</p>
            <div className="auth-divider" />
            <div className="auth-features">
              {['Détection de plagiat avancée', 'Validation multi-niveaux', 'Rapports détaillés'].map(f => (
                <div key={f} className="auth-feature">
                  <span className="auth-feature-dot" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau droit */}
        <div className="auth-right">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <h2>Connexion</h2>
              <p>Accédez à votre espace DIRMA</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Rôle</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="etudiant">Étudiant</option>
                  <option value="chef_departement">Chef de Département</option>
                  <option value="directeur_adjoint">Directeur Adjoint</option>
                </select>
              </div>

              <div className="form-group">
                <label>{form.role === 'etudiant' ? 'Matricule' : 'Email institutionnel'}</label>
                <input
                  type={form.role === 'etudiant' ? 'text' : 'email'}
                  placeholder={form.role === 'etudiant' ? 'Ex: 20240001' : 'prenom.nom@univ.bf'}
                  value={form.identifiant}
                  onChange={e => set('identifiant', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mot de passe</label>
                <div className="input-wrap">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <p className="auth-switch">
              Pas encore de compte ? <Link to="/register">S'inscrire</Link>
            </p>
            <p className="auth-switch" style={{ marginTop: 8 }}>
              Mot de passe oublié ? <Link to="/reinitialiser-mot-de-passe">Réinitialiser</Link>
            </p>

            {/* Identifiants de test */}
            <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Comptes de test</p>
              {[
                { role: 'etudiant',          label: 'Étudiant',          id: '20240001',            pwd: 'password', value: 'etudiant' },
                { role: 'chef_departement',  label: 'Chef Département', id: 'chef.info@univ.bf',   pwd: 'password', value: 'chef_departement' },
                { role: 'directeur_adjoint', label: 'Directeur Adjoint',id: 'da@univ.bf',          pwd: 'password', value: 'directeur_adjoint' },
              ].map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => setForm({ identifiant: c.id, password: c.pwd, role: c.value })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 10px', marginBottom: 6,
                    background: form.role === c.value ? 'var(--primary-light)' : '#fff',
                    border: `1.5px solid ${form.role === c.value ? 'var(--primary)' : 'var(--gray-200)'}`,
                    borderRadius: 6, cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: form.role === c.value ? 'var(--primary)' : 'var(--gray-700)' }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{c.id}</span>
                </button>
              ))}
              <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', marginTop: 4 }}>Mot de passe : <strong>password</strong></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
