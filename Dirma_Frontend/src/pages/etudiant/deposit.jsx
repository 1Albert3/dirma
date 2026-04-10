import { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, Clock, FileText, BookOpen, CloudUpload, X, CheckCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import { themesApi, documentsApi } from '../../api';
import './dashboard.css';

const navItems = [
  { path: '/etudiant/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/etudiant/themes',     icon: BookOpen,        label: 'Mes thèmes' },
  { path: '/etudiant/deposit',    icon: Upload,          label: 'Déposer un document' },
  { path: '/etudiant/submission', icon: FileText,        label: 'Mes documents' },
  { path: '/etudiant/historic',   icon: Clock,           label: 'Historique' },
];

export default function Deposit() {
  const [file, setFile]           = useState(null);
  const [drag, setDrag]           = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [erreur, setErreur]       = useState('');
  const [themes, setThemes]       = useState([]);
  const [form, setForm] = useState({ titre: '', theme_id: '', annee_universitaire: '', niveau: '' });

  // Charger les thèmes validés de l'étudiant
  useEffect(() => {
    themesApi.lister('etudiant')
      .then(data => setThemes(data.themes.filter(t => t.statut === 'valide')))
      .catch(() => {});
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.docx'))) setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setErreur('Veuillez sélectionner un fichier.'); return; }
    setErreur('');
    setLoading(true);

    const formData = new FormData();
    formData.append('fichier', file);
    formData.append('titre', form.titre);
    formData.append('theme_id', form.theme_id);
    formData.append('annee_universitaire', form.annee_universitaire);
    formData.append('niveau', form.niveau);

    try {
      await documentsApi.deposer(formData);
      setSubmitted(true);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout navItems={navItems} role="etudiant">
        <div className="success-screen">
          <div className="success-icon"><CheckCircle size={56} /></div>
          <h2>Document déposé avec succès !</h2>
          <p>Votre document a été transmis. Lancez la vérification depuis "Mes documents".</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => { setSubmitted(false); setFile(null); }}>Nouveau dépôt</button>
            <a href="/etudiant/submission" className="btn-secondary">Voir mes documents</a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout navItems={navItems} role="etudiant">
      <div className="page-header">
        <div>
          <h1 className="page-title">Déposer un document</h1>
          <p className="page-subtitle">Remplissez le formulaire et joignez votre fichier PDF ou DOCX.</p>
        </div>
      </div>

      {erreur && <div className="alert-error" style={{ marginBottom: 16 }}>{erreur}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--gray-800)' }}>Informations du document</h3>
          <div className="form-grid">
            <div className="form-group full">
              <label>Titre du document *</label>
              <input
                type="text"
                placeholder="Ex: Analyse des systèmes distribués..."
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Thème associé *</label>
              <select value={form.theme_id} onChange={e => setForm({ ...form, theme_id: e.target.value })} required>
                <option value="">Sélectionner un thème validé...</option>
                {themes.map(t => <option key={t.id} value={t.id}>{t.titre}</option>)}
              </select>
              {themes.length === 0 && (
                <span style={{ fontSize: 12, color: '#f59e0b' }}>Aucun thème validé. Soumettez d'abord un thème.</span>
              )}
            </div>
            <div className="form-group">
              <label>Niveau *</label>
              <select value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })} required>
                <option value="">Sélectionner...</option>
                <option value="licence">Licence</option>
                <option value="master">Master</option>
              </select>
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
          </div>
        </div>

        <div className="form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--gray-800)' }}>Fichier (PDF ou DOCX) *</h3>
          {!file ? (
            <div
              className={`upload-zone ${drag ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <div className="upload-icon"><CloudUpload size={40} /></div>
              <p className="upload-text">Glissez votre fichier ici ou cliquez pour parcourir</p>
              <p className="upload-hint">PDF ou DOCX · Max 20 Mo</p>
              <input id="file-input" type="file" accept=".pdf,.docx" hidden onChange={e => setFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-icon"><FileText size={24} /></div>
              <div className="file-info">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
              </div>
              <button type="button" className="file-remove" onClick={() => setFile(null)}><X size={16} /></button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={() => { setFile(null); setForm({ titre: '', theme_id: '', annee_universitaire: '', niveau: '' }); }}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : <><Upload size={16} /> Déposer le document</>}
          </button>
        </div>
      </form>
    </Layout>
  );
}
