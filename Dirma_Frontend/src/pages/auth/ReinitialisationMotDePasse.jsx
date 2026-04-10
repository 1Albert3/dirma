import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import logo from '../../assets/logo.png';
import api from '../../services/api';
import './auth.css';

export default function ReinitialisationMotDePasse() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ identifiant: '', nouveau_mot_de_passe: '', nouveau_mot_de_passe_confirmation: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [succes, setSucces]   = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nouveau_mot_de_passe !== form.nouveau_mot_de_passe_confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/mot-de-passe/reinitialiser', form);
      setSucces(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    } finally { setLoading(false); }
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
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <h2>Réinitialiser le mot de passe</h2>
              <p>Entrez votre identifiant et votre nouveau mot de passe</p>
            </div>

            {succes ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: 16 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>Mot de passe réinitialisé !</p>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 8 }}>Redirection vers la connexion...</p>
              </div>
            ) : (
              <>
                {error && <div className="auth-error">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-group">
                    <label>Matricule ou Email</label>
                    <input type="text" placeholder="Ex: 20240001 ou email@univ.bf"
                      value={form.identifiant} onChange={e => set('identifiant', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <div className="input-wrap">
                      <input type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                        value={form.nouveau_mot_de_passe} onChange={e => set('nouveau_mot_de_passe', e.target.value)}
                        required minLength={8} />
                      <button type="button" className="eye-btn" onClick={() => setShowPwd(!showPwd)}>
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirmer le mot de passe</label>
                    <input type="password" placeholder="••••••••"
                      value={form.nouveau_mot_de_passe_confirmation}
                      onChange={e => set('nouveau_mot_de_passe_confirmation', e.target.value)} required />
                    {form.nouveau_mot_de_passe_confirmation && form.nouveau_mot_de_passe !== form.nouveau_mot_de_passe_confirmation && (
                      <span className="field-error">Les mots de passe ne correspondent pas</span>
                    )}
                  </div>
                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? 'Réinitialisation...' : 'Réinitialiser'}
                  </button>
                </form>
              </>
            )}

            <p className="auth-switch" style={{ marginTop: 16 }}>
              <Link to="/login">← Retour à la connexion</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
