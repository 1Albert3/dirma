import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import './auth.css';

const STEPS = ['Informations', 'Sécurité', 'Confirmation'];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [step, setStep]         = useState(0);
  const [showPwd, setShowPwd]   = useState(false);
  const [showCfm, setShowCfm]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({
    name: '', prenom: '', matricule: '', departement: '',
    role: 'etudiant', email: '', password: '', password_confirmation: '', terms: false,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pwdScore = () => {
    const p = form.password;
    if (!p) return 0;
    return [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  };
  const scoreColors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const scoreLabels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
  const score = pwdScore();

  const canStep0 = form.name && form.prenom && form.departement && (form.role !== 'etudiant' || form.matricule);
  const canStep1 = form.email && form.password && form.password === form.password_confirmation && form.terms && score >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 2) { setStep(s => s + 1); return; }
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      const routes = { etudiant: '/etudiant/dashboard', chef_departement: '/chef/dashboard', directeur_adjoint: '/da/dashboard' };
      navigate(routes[user.role]);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Une erreur est survenue.');
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

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
                  <span className="auth-feature-dot" /><span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-right auth-right-wide">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <h2>Créer un compte</h2>
              <p>Rejoignez la plateforme DIRMA</p>
            </div>

            {/* Stepper */}
            <div className="stepper">
              {STEPS.map((label, i) => (
                <div key={i} className={`stepper-item ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                  <div className="stepper-circle">
                    {i < step ? <CheckCircle size={13} /> : <span>{i + 1}</span>}
                  </div>
                  <span className="stepper-label">{label}</span>
                  {i < STEPS.length - 1 && <div className="stepper-line" />}
                </div>
              ))}
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">

              {/* ── Étape 0 ── */}
              {step === 0 && <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input type="text" placeholder="Ahmed" value={form.prenom} onChange={e => set('prenom', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input type="text" placeholder="Benali" value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="etudiant">Étudiant</option>
                    <option value="chef_departement">Chef de Département</option>
                    <option value="directeur_adjoint">Directeur Adjoint</option>
                  </select>
                </div>
                {form.role === 'etudiant' && (
                  <div className="form-group">
                    <label>Matricule *</label>
                    <input type="text" placeholder="Ex: 20240001" value={form.matricule} onChange={e => set('matricule', e.target.value)} required />
                  </div>
                )}
                <div className="form-group">
                  <label>Département *</label>
                  <select value={form.departement} onChange={e => set('departement', e.target.value)} required>
                    <option value="">Sélectionner...</option>
                    <option>Informatique</option>
                    <option>Réseaux & Télécommunications</option>
                    <option>Intelligence Artificielle</option>
                    <option>Génie Logiciel</option>
                    <option>Direction</option>
                  </select>
                </div>
                <button type="button" className="auth-submit" disabled={!canStep0} onClick={() => setStep(1)}>
                  Continuer →
                </button>
              </>}

              {/* ── Étape 1 ── */}
              {step === 1 && <>
                <div className="form-group">
                  <label>Email institutionnel *</label>
                  <input type="email" placeholder="prenom.nom@univ.bf" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Mot de passe *</label>
                  <div className="input-wrap">
                    <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
                    <button type="button" className="eye-btn" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="pwd-strength">
                      <div className="pwd-bars">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="pwd-bar" style={{ background: i <= score ? scoreColors[score] : 'var(--gray-200)' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: scoreColors[score] }}>{scoreLabels[score]}</span>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Confirmer le mot de passe *</label>
                  <div className="input-wrap">
                    <input type={showCfm ? 'text' : 'password'} placeholder="••••••••" value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} required />
                    <button type="button" className="eye-btn" onClick={() => setShowCfm(!showCfm)}>
                      {showCfm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password_confirmation && form.password !== form.password_confirmation && (
                    <span className="field-error">Les mots de passe ne correspondent pas</span>
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-600)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.terms} onChange={e => set('terms', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                  J'accepte les conditions d'utilisation
                </label>
                <div className="btn-row">
                  <button type="button" className="auth-submit btn-outline" onClick={() => setStep(0)}>← Retour</button>
                  <button type="button" className="auth-submit" disabled={!canStep1} onClick={() => setStep(2)}>Continuer →</button>
                </div>
              </>}

              {/* ── Étape 2 ── */}
              {step === 2 && <>
                <div className="confirm-summary">
                  <div className="confirm-avatar">{form.prenom.charAt(0)}{form.name.charAt(0)}</div>
                  <h3>{form.prenom} {form.name}</h3>
                  <span className="confirm-role">{{ etudiant: 'Étudiant', chef_departement: 'Chef de Département', directeur_adjoint: 'Directeur Adjoint' }[form.role]}</span>
                </div>
                <div className="confirm-details">
                  {[
                    { label: 'Email', value: form.email },
                    form.role === 'etudiant' && { label: 'Matricule', value: form.matricule },
                    { label: 'Département', value: form.departement },
                  ].filter(Boolean).map(({ label, value }) => (
                    <div key={label} className="confirm-row">
                      <span className="confirm-label">{label}</span>
                      <span className="confirm-value">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="btn-row">
                  <button type="button" className="auth-submit btn-outline" onClick={() => setStep(1)}>← Retour</button>
                  <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Création...' : 'Créer mon compte'}</button>
                </div>
              </>}
            </form>

            <p className="auth-switch">
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
