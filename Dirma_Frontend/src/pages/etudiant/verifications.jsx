import { useEffect, useState } from 'react';
import { Search, X, ExternalLink, AlertTriangle, Bot, Globe } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { etudiantNav } from './nav';
import '../../components/ui.css';

function ScoreGauge({ score, label }) {
  const color = score >= 60 ? 'var(--danger)' : score >= 30 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--gray-500)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{score ?? '—'}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score ?? 0}%`, background: color, borderRadius: 4, transition: 'width .6s' }} />
      </div>
    </div>
  );
}

export default function EtudiantVerifications() {
  const [verifs, setVerifs]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/etudiant/verifications').then(r => setVerifs(r.data)).finally(() => setLoading(false));
  }, []);

  const ouvrirRapport = (v) => {
    api.get(`/etudiant/verifications/${v.id}`).then(r => setSelected(r.data));
  };

  return (
    <Layout navItems={etudiantNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes vérifications</h1>
          <p className="page-subtitle">Consultez les rapports d'analyse de plagiat.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Score global</th>
                <th>Score local</th>
                <th>Score IA</th>
                <th>Score web</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Rapport</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Chargement...</td></tr>
              ) : verifs.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <Search size={32} />
                    <h4>Aucune vérification</h4>
                    <p>Lancez une vérification depuis la page Documents.</p>
                  </div>
                </td></tr>
              ) : verifs.map(v => {
                const color = (v.score_global ?? 0) >= 60 ? 'var(--danger)' : (v.score_global ?? 0) >= 30 ? 'var(--warning)' : 'var(--success)';
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500, maxWidth: 200 }}>{v.document?.titre}</td>
                    <td>
                      <span style={{ fontWeight: 700, color, fontSize: 14 }}>{v.score_global ?? '—'}%</span>
                    </td>
                    <td style={{ color: 'var(--gray-600)' }}>{v.score_local ?? '—'}%</td>
                    <td style={{ color: 'var(--gray-600)' }}>{v.score_ia ?? '—'}%</td>
                    <td style={{ color: 'var(--gray-600)' }}>{v.score_web ?? '—'}%</td>
                    <td>
                      <span className={`badge ${v.statut === 'termine' ? 'badge-success' : v.statut === 'erreur' ? 'badge-danger' : 'badge-info'}`}>
                        {v.statut === 'termine' ? 'Terminé' : v.statut === 'erreur' ? 'Erreur' : 'En cours'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{new Date(v.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {v.statut === 'termine' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => ouvrirRapport(v)}>
                          Voir rapport
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

      {/* Modal rapport */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rapport de vérification — {selected.document?.titre}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '70vh', overflowY: 'auto' }}>

              {/* Scores */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>Scores d'analyse</p>
                <ScoreGauge score={selected.score_global} label="Score global (pondéré)" />
                <ScoreGauge score={selected.score_local}  label="Analyse locale (50%)" />
                <ScoreGauge score={selected.score_ia}     label="Détection IA (30%)" />
                <ScoreGauge score={selected.score_web}    label="Recherche web (20%)" />
              </div>

              {/* Détails IA */}
              {selected.details_ia && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Bot size={16} style={{ color: 'var(--primary)' }} />
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Analyse IA</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Perplexité', value: selected.details_ia.perplexite },
                      { label: 'Burstiness', value: selected.details_ia.burstiness },
                      { label: 'Répétitions IA', value: selected.details_ia.repetitions_ia },
                      { label: 'Nb phrases', value: selected.details_ia.nb_phrases },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--gray-50)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-100)' }}>
                        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{value ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {selected.sources?.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Sources détectées ({selected.sources.length})</p>
                  </div>
                  {selected.sources.map((src, i) => (
                    <div key={i} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {src.type === 'web' ? <Globe size={13} style={{ color: 'var(--info)' }} /> : <AlertTriangle size={13} style={{ color: 'var(--warning)' }} />}
                          <span style={{ fontSize: 12, fontWeight: 600, color: src.type === 'web' ? 'var(--info)' : 'var(--warning)' }}>
                            {src.type === 'web' ? 'Source web' : 'Source locale'}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>{src.taux_similarite}%</span>
                      </div>
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={11} /> {src.url}
                        </a>
                      )}
                      {src.document_ref && <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>{src.document_ref}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
