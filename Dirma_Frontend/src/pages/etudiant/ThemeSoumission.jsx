import { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, Clock, FileText, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import { themesApi } from '../../api';
import './dashboard.css';

const navItems = [
  { path: '/etudiant/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/etudiant/themes',     icon: BookOpen,        label: 'Mes thèmes' },
  { path: '/etudiant/deposit',    icon: Upload,          label: 'Déposer un document' },
  { path: '/etudiant/submission', icon: FileText,        label: 'Mes documents' },
  { path: '/etudiant/historic',   icon: Clock,           label: 'Historique' },
];

const statutConfig = {
  en_attente_analyse: { label: 'Analyse en cours',    color: '#6366f1', bg: '#eef2ff', icon: AlertCircle },
  rejete_auto:        { label: 'Rejeté (similarité)', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  en_attente_chef:    { label: 'En attente du Chef',  color: '#f59e0b', bg: '#fffbeb', icon: AlertCircle },
  rejete_chef:        { label: 'Rejeté par le Chef',  color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  en_attente_da:      { label: 'En attente du DA',    color: '#f59e0b', bg: '#fffbeb', icon: AlertCircle },
  rejete_da:          { label: 'Rejeté par le DA',    color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  valide:             { label: 'Validé',              color: '#10b981', bg: '#ecfdf5', icon: CheckCircle },
};

export default function ThemeSoumission() {
  const [themes, setThemes]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [erreur, setErreur]     = useState('');
  const [succes, setSucces]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ titre: '', description: '', annee_universitaire: '' });

  useEffect(() => {
    themesApi.lister('etudiant')
      .then(data => setThemes(data.themes))
      .catch(() => setErreur('Impossible de charger les thèmes.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');
    setSubmitting(true);
    try {
      const data = await themesApi.creer(form);
      setThemes(prev => [data.theme, ...prev]);
      setSucces(data.message);
      setShowForm(false);
      setForm({ titre: '', description: '', annee_universitaire: '' });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout navItems={navItems} role="etudiant">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes thèmes</h1>
          <p className="page-subtitle">Soumettez et suivez vos thèmes de mémoire.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          + Nouveau thème
        </button>
      </div>

      {succes && <div className="alert-success">{succes}</div>}
      {erreur && <div className="alert-error">{erreur}</div>}

      {/* Formulaire de soumission */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>Soumettre un nouveau thème</h3></div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div className="form-group">
              <label>Titre du thème *</label>
              <input
                type="text"
                placeholder="Ex: Détection de fraude par apprentissage automatique"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                rows={4}
                placeholder="Décrivez votre thème en détail (minimum 20 caractères)..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                minLength={20}
              />
            </div>
            <div className="form-group">
              <label>Année universitaire *</label>
              <select value={form.annee_universitaire} onChange={e => setForm({ ...form, annee_universitaire: e.target.value })} required>
                <option value="">Sélectionner...</option>
                <option>2024-2025</option>
                <option>2023-2024</option>
                <option>2022-2023</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner-sm" /> : 'Soumettre le thème'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des thèmes */}
      <div className="card">
        <div className="card-header"><h3>Mes thèmes soumis</h3></div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : themes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
            Aucun thème soumis. Cliquez sur "Nouveau thème" pour commencer.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Année</th>
                  <th>Similarité</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {themes.map(theme => {
                  const cfg = statutConfig[theme.statut] || statutConfig.en_attente_analyse;
                  const Icon = cfg.icon;
                  return (
                    <tr key={theme.id}>
                      <td style={{ maxWidth: 300 }}>
                        <p style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{theme.titre}</p>
                        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{theme.description.substring(0, 80)}...</p>
                      </td>
                      <td>{theme.annee_universitaire}</td>
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: theme.score_similarite >= 70 ? '#ef4444' : theme.score_similarite >= 40 ? '#f59e0b' : '#10b981'
                        }}>
                          {theme.score_similarite}%
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ color: cfg.color, background: cfg.bg, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon size={12} /> {cfg.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>
                        {new Date(theme.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
