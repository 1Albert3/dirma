import { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, Clock, FileText, BookOpen, AlertTriangle, CheckCircle, XCircle, Globe, Database, Bot, Download } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { verificationsApi } from '../../api';
import api from '../../services/api';
import './dashboard.css';
import './rapport.css';

import { etudiantNav } from './nav';

const navItems = etudiantNav;

/** Retourne couleur + label selon le score */
function scoreConfig(score) {
  if (score >= 70) return { color: '#ef4444', bg: '#fef2f2', label: 'Plagiat élevé', icon: XCircle };
  if (score >= 40) return { color: '#f59e0b', bg: '#fffbeb', label: 'Plagiat modéré', icon: AlertTriangle };
  return { color: '#10b981', bg: '#ecfdf5', label: 'Original', icon: CheckCircle };
}

/** Jauge circulaire SVG */
function Jauge({ score, size = 140 }) {
  const cfg    = scoreConfig(score);
  const r      = 54;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="jauge-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={cfg.color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="jauge-center">
        <span className="jauge-score" style={{ color: cfg.color }}>{score}%</span>
        <span className="jauge-label">{cfg.label}</span>
      </div>
    </div>
  );
}

/** Barre de progression horizontale */
function BarreScore({ label, score, icon: Icon, poids }) {
  const cfg = scoreConfig(score);
  return (
    <div className="barre-score">
      <div className="barre-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} style={{ color: cfg.color }} />
          <span className="barre-label">{label}</span>
          <span className="barre-poids">({poids}%)</span>
        </div>
        <span className="barre-value" style={{ color: cfg.color }}>{score ?? 0}%</span>
      </div>
      <div className="barre-track">
        <div
          className="barre-fill"
          style={{ width: `${score ?? 0}%`, background: cfg.color }}
        />
      </div>
    </div>
  );
}

export default function Rapport() {
  const { id }                    = useParams();
  const [verif, setVerif]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [erreur, setErreur]       = useState('');

  useEffect(() => {
    api.get(`/etudiant/verifications/${id}`)
      .then(r => setVerif(r.data))
      .catch(err => setErreur(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const imprimer = () => window.print();

  if (loading) return (
    <Layout navItems={navItems} role="etudiant">
      <div style={{ textAlign: 'center', padding: 80 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
    </Layout>
  );

  if (erreur || !verif) return (
    <Layout navItems={navItems} role="etudiant">
      <div className="alert-error">{erreur || 'Rapport introuvable.'}</div>
    </Layout>
  );

  const cfg = scoreConfig(verif.score_global ?? 0);
  const Icon = cfg.icon;

  return (
    <Layout navItems={navItems} role="etudiant">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapport de vérification</h1>
          <p className="page-subtitle">{verif.document?.titre}</p>
        </div>
        <button className="btn-secondary" onClick={imprimer}>
          <Download size={15} /> Exporter PDF
        </button>
      </div>

      {/* Score global */}
      <div className="rapport-hero card" style={{ marginBottom: 20 }}>
        <div className="rapport-hero-left">
          <Jauge score={verif.score_global ?? 0} size={160} />
        </div>
        <div className="rapport-hero-right">
          <div className="rapport-verdict" style={{ color: cfg.color, background: cfg.bg }}>
            <Icon size={18} /> {cfg.label}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: '12px 0 4px' }}>
            Score global de plagiat : {verif.score_global ?? 0}%
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
            Analysé le {new Date(verif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}>
            <BarreScore label="Analyse locale"   score={verif.score_local ?? 0} icon={Database} poids={50} />
            <BarreScore label="Détection IA"     score={verif.score_ia ?? 0}    icon={Bot}      poids={30} />
            <BarreScore label="Recherche web"    score={verif.score_web ?? 0}   icon={Globe}    poids={20} />
          </div>
        </div>
      </div>

      <div className="rapport-grid">
        {/* Détails analyse IA */}
        {verif.details_ia && (
          <div className="card">
            <div className="card-header">
              <h3><Bot size={16} style={{ display: 'inline', marginRight: 6 }} />Détection IA</h3>
              <span className="badge" style={{ color: scoreConfig(verif.score_ia).color, background: scoreConfig(verif.score_ia).bg }}>
                {verif.score_ia ?? 0}%
              </span>
            </div>
            <div style={{ padding: 20 }}>
              <div className="detail-grid">
                {[
                  { label: 'Perplexité',         value: verif.details_ia.perplexite },
                  { label: 'Burstiness',          value: verif.details_ia.burstiness },
                  { label: 'Répétitions IA',      value: verif.details_ia.repetitions_ia },
                  { label: 'Nombre de phrases',   value: verif.details_ia.nb_phrases },
                ].filter(d => d.value != null).map(({ label, value }) => (
                  <div key={label} className="detail-item">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sources détectées */}
        <div className="card">
          <div className="card-header">
            <h3>Sources détectées</h3>
            <span className="badge" style={{ color: 'var(--gray-600)', background: 'var(--gray-100)' }}>
              {verif.sources?.length ?? 0} source(s)
            </span>
          </div>
          {!verif.sources || verif.sources.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
              <CheckCircle size={32} style={{ color: '#10b981', marginBottom: 8 }} />
              <p>Aucune source de plagiat détectée.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Similarité</th>
                  </tr>
                </thead>
                <tbody>
                  {verif.sources.map(src => (
                    <tr key={src.id}>
                      <td>
                        <span className="badge" style={{
                          color: src.type === 'web' ? '#3b82f6' : '#E87722',
                          background: src.type === 'web' ? '#eff6ff' : '#fff4ec'
                        }}>
                          {src.type === 'web' ? <Globe size={11} /> : <Database size={11} />}
                          {' '}{src.type === 'web' ? 'Web' : 'Local'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280, fontSize: 13 }}>
                        {src.url
                          ? <a href={src.url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', wordBreak: 'break-all' }}>{src.url}</a>
                          : <span style={{ color: 'var(--gray-700)' }}>{src.document_ref}</span>
                        }
                        {src.passage_original && (
                          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, fontStyle: 'italic' }}>
                            «{src.passage_original.substring(0, 100)}...»
                          </p>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: src.taux_similarite >= 70 ? '#ef4444' : src.taux_similarite >= 40 ? '#f59e0b' : '#10b981'
                        }}>
                          {src.taux_similarite}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
