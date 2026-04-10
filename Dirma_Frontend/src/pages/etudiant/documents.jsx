import { useEffect, useState } from 'react';
import { Plus, X, Upload, CloudUpload, FileText, Search, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { etudiantNav } from './nav';
import '../../components/ui.css';

const statusBadge = {
  depose:          { label: 'Déposé',       cls: 'badge-gray' },
  en_verification: { label: 'En vérif.',    cls: 'badge-info' },
  verifie:         { label: 'Vérifié',      cls: 'badge-info' },
  en_attente_chef: { label: 'Chez le chef', cls: 'badge-pending' },
  rejete_chef:     { label: 'Rejeté',       cls: 'badge-danger' },
  en_attente_da:   { label: 'Chez le DA',   cls: 'badge-orange' },
  rejete_da:       { label: 'Rejeté DA',    cls: 'badge-danger' },
  valide:          { label: 'Validé ✓',     cls: 'badge-success' },
};

export default function EtudiantDocuments() {
  const navigate    = useNavigate();
  const [docs, setDocs]       = useState([]);
  const [themes, setThemes]   = useState([]);
  const [modal, setModal]     = useState(false);
  const [file, setFile]       = useState(null);
  const [drag, setDrag]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]       = useState({ theme_id: '', titre: '', annee_universitaire: '2024-2025', niveau: 'licence' });

  const charger = () => {
    setLoading(true);
    Promise.all([api.get('/etudiant/documents'), api.get('/etudiant/themes')])
      .then(([d, t]) => {
        setDocs(d.data);
        setThemes(t.data.filter(th => th.statut === 'valide'));
      }).finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)) setFile(f);
  };

  const deposer = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('fichier', file);
    try {
      await api.post('/etudiant/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModal(false); setFile(null);
      setForm({ theme_id: '', titre: '', annee_universitaire: '2024-2025', niveau: 'licence' });
      charger();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors du dépôt.');
    } finally { setSubmitting(false); }
  };

  const lancerVerif = async (docId) => {
    try {
      const res = await api.post(`/etudiant/documents/${docId}/verifier`);
      // Rediriger vers la page d'analyse
      const doc = docs.find(d => d.id === docId);
      navigate(`/etudiant/analyse/document/${docId}`, {
        state: { titre: doc?.titre }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur.');
    }
  };

  return (
    <Layout navItems={etudiantNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes documents</h1>
          <p className="page-subtitle">Déposez et vérifiez vos mémoires.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Déposer un document
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Thème</th>
                <th>Niveau</th>
                <th>Statut</th>
                <th>Déposé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <FileText size={32} />
                    <h4>Aucun document déposé</h4>
                    <p>Votre thème doit être validé avant de déposer un document.</p>
                  </div>
                </td></tr>
              ) : docs.map(d => {
                const s = statusBadge[d.statut] || { label: d.statut, cls: 'badge-gray' };
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.titre}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 180 }}>{d.theme?.titre}</td>
                    <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{d.niveau}</span></td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {d.statut === 'depose' && (
                          <button className="action-btn success" title="Lancer la vérification" onClick={() => lancerVerif(d.id)}>
                            <Search size={14} />
                          </button>
                        )}
                        <button className="action-btn" title="Télécharger" onClick={() => window.open(`http://localhost:8000/api/etudiant/documents/${d.id}/telecharger`)}>
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal dépôt */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Déposer un document</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={deposer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label>Thème associé *</label>
                  <select value={form.theme_id} onChange={e => setForm(p => ({ ...p, theme_id: e.target.value }))} required>
                    <option value="">Sélectionner un thème validé...</option>
                    {themes.map(t => <option key={t.id} value={t.id}>{t.titre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Titre du document *</label>
                  <input type="text" placeholder="Titre de votre mémoire" value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Niveau *</label>
                    <select value={form.niveau} onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))}>
                      <option value="licence">Licence</option>
                      <option value="master">Master</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Année *</label>
                    <select value={form.annee_universitaire} onChange={e => setForm(p => ({ ...p, annee_universitaire: e.target.value }))}>
                      <option>2024-2025</option>
                      <option>2023-2024</option>
                    </select>
                  </div>
                </div>

                {/* Zone upload */}
                {!file ? (
                  <div
                    className={`upload-zone ${drag ? 'drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-inp').click()}
                  >
                    <div className="upload-icon"><CloudUpload size={36} /></div>
                    <p className="upload-text">Glissez votre fichier ou cliquez</p>
                    <p className="upload-hint">PDF ou DOCX · Max 20 Mo</p>
                    <input id="file-inp" type="file" accept=".pdf,.docx" hidden onChange={e => setFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="file-preview">
                    <div className="file-icon"><FileText size={22} /></div>
                    <div className="file-info">
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                    </div>
                    <button type="button" className="file-remove" onClick={() => setFile(null)}><X size={14} /></button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !file}>
                  <Upload size={14} /> {submitting ? 'Dépôt...' : 'Déposer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
