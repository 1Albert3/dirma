import { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, Clock, FileText, BookOpen, Download, Eye, Search, Filter } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { etudiantNav } from './nav';
import './dashboard.css';

const navItems = etudiantNav;

const statutConfig = {
  // Thèmes
  en_attente_analyse: { label: 'Analyse en cours',   color: '#6366f1', bg: '#eef2ff' },
  rejete_auto:        { label: 'Rejeté (auto)',       color: '#ef4444', bg: '#fef2f2' },
  en_attente_chef:    { label: 'En attente Chef',     color: '#f59e0b', bg: '#fffbeb' },
  rejete_chef:        { label: 'Rejeté (Chef)',       color: '#ef4444', bg: '#fef2f2' },
  en_attente_da:      { label: 'En attente DA',       color: '#f59e0b', bg: '#fffbeb' },
  rejete_da:          { label: 'Rejeté (DA)',         color: '#ef4444', bg: '#fef2f2' },
  valide:             { label: 'Validé',              color: '#10b981', bg: '#ecfdf5' },
  // Documents
  depose:             { label: 'Déposé',              color: '#6366f1', bg: '#eef2ff' },
  en_verification:    { label: 'En vérification',     color: '#f59e0b', bg: '#fffbeb' },
  verifie:            { label: 'Vérifié',             color: '#3b82f6', bg: '#eff6ff' },
};

export default function Historic() {
  const [themes, setThemes]       = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [onglet, setOnglet]       = useState('documents');
  const [search, setSearch]       = useState('');
  const [filtre, setFiltre]       = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/etudiant/themes'),
      api.get('/etudiant/documents'),
    ]).then(([t, d]) => {
      setThemes(t.data);
      setDocuments(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const items = onglet === 'themes' ? themes : documents;

  const filtres = onglet === 'themes'
    ? ['all', 'valide', 'en_attente_chef', 'en_attente_da', 'rejete_chef', 'rejete_da', 'rejete_auto']
    : ['all', 'valide', 'en_attente_chef', 'en_attente_da', 'verifie', 'depose'];

  const filtreLabels = {
    all: 'Tous',
    valide: 'Validés',
    en_attente_chef: 'En attente Chef',
    en_attente_da: 'En attente DA',
    rejete_chef: 'Rejetés Chef',
    rejete_da: 'Rejetés DA',
    rejete_auto: 'Rejetés auto',
    verifie: 'Vérifiés',
    depose: 'Déposés',
  };

  const filtered = items.filter(item => {
    const titre = onglet === 'themes' ? item.titre : item.titre;
    const matchSearch = titre.toLowerCase().includes(search.toLowerCase());
    const matchFiltre = filtre === 'all' || item.statut === filtre;
    return matchSearch && matchFiltre;
  });

  return (
    <Layout navItems={navItems} role="etudiant">
      <div className="page-header">
        <div>
          <h1 className="page-title">Historique</h1>
          <p className="page-subtitle">Tous vos thèmes et documents soumis.</p>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={onglet === 'documents' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setOnglet('documents'); setFiltre('all'); }} style={{ fontSize: 13 }}>
          <FileText size={14} /> Documents ({documents.length})
        </button>
        <button className={onglet === 'themes' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setOnglet('themes'); setFiltre('all'); }} style={{ fontSize: 13 }}>
          <BookOpen size={14} /> Thèmes ({themes.length})
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            <Filter size={14} style={{ color: 'var(--gray-400)' }} />
            {filtres.map(f => (
              <button
                key={f}
                className={`filter-tab ${filtre === f ? 'active' : ''}`}
                onClick={() => setFiltre(f)}
              >
                {filtreLabels[f]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  {onglet === 'themes' && <th>Similarité</th>}
                  {onglet === 'documents' && <th>Score plagiat</th>}
                  <th>Année</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>
                      Aucun résultat trouvé
                    </td>
                  </tr>
                ) : filtered.map(item => {
                  const cfg = statutConfig[item.statut] || { label: item.statut, color: '#6366f1', bg: '#eef2ff' };
                  const score = onglet === 'themes'
                    ? item.score_similarite
                    : item.derniere_verification?.score_global;
                  return (
                    <tr key={item.id}>
                      <td style={{ maxWidth: 300 }}>
                        <span style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{item.titre}</span>
                        {onglet === 'documents' && item.theme && (
                          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{item.theme.titre}</p>
                        )}
                      </td>
                      <td>
                        {score != null ? (
                          <span style={{
                            fontWeight: 600,
                            color: score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981'
                          }}>
                            {score}%
                          </span>
                        ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                      </td>
                      <td>{item.annee_universitaire}</td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <span className="badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {onglet === 'documents' && (
                            <a
                              className="action-btn"
                              href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/etudiant/documents/${item.id}/telecharger`}
                              target="_blank"
                              rel="noreferrer"
                              title="Télécharger"
                            >
                              <Download size={15} />
                            </a>
                          )}
                        </div>
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
