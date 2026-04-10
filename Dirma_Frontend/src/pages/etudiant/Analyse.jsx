import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Download, ArrowLeft, RefreshCw, Send, RotateCcw, Trash2 } from 'lucide-react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { etudiantNav } from './nav';
import '../../components/ui.css';
import './analyse.css';

const ETAPES = {
  plagiat: [
    { id: 'tokenisation', label: 'Tokenisation du texte',        duree: 700  },
    { id: 'tfidf',        label: 'Calcul TF-IDF',                duree: 900  },
    { id: 'ngrammes',     label: 'Analyse N-grammes (bi/tri)',    duree: 800  },
    { id: 'jaccard',      label: 'Coefficient de Jaccard',       duree: 700  },
    { id: 'levenshtein',  label: 'Distance de Levenshtein',      duree: 600  },
    { id: 'cosinus',      label: 'Similarité cosinus',           duree: 700  },
    { id: 'resultat',     label: 'Calcul du score final',        duree: 500  },
  ],
  ia: [
    { id: 'phrases',      label: 'Découpage en phrases',         duree: 600  },
    { id: 'perplexite',   label: 'Calcul de la perplexité',      duree: 1000 },
    { id: 'burstiness',   label: 'Analyse du burstiness',        duree: 900  },
    { id: 'patterns',     label: 'Détection patterns IA',        duree: 800  },
    { id: 'score_ia',     label: 'Score IA pondéré',             duree: 500  },
  ],
  les_deux: [
    { id: 'tokenisation', label: 'Tokenisation du texte',        duree: 600  },
    { id: 'tfidf',        label: 'Calcul TF-IDF + N-grammes',    duree: 800  },
    { id: 'jaccard',      label: 'Jaccard + Levenshtein',        duree: 700  },
    { id: 'cosinus',      label: 'Similarité cosinus',           duree: 600  },
    { id: 'perplexite',   label: 'Perplexité + Burstiness',      duree: 900  },
    { id: 'patterns',     label: 'Détection patterns IA',        duree: 700  },
    { id: 'fusion',       label: 'Fusion des scores (60/40)',    duree: 500  },
  ],
  document: [
    { id: 'extraction',   label: 'Extraction texte (PDF/DOCX)',  duree: 1000 },
    { id: 'shingling',    label: 'Génération des shingles',      duree: 1200 },
    { id: 'minhash',      label: 'Calcul MinHash',               duree: 1000 },
    { id: 'local',        label: 'Comparaison locale (Jaccard)', duree: 1500 },
    { id: 'ia',           label: 'Détection contenu IA',         duree: 2000 },
    { id: 'web',          label: 'Recherche web (Rabin-Karp)',   duree: 3000 },
    { id: 'rapport',      label: 'Génération du rapport',        duree: 800  },
  ],
};

function Jauge({ score, size = 160 }) {
  const r     = 58;
  const circ  = 2 * Math.PI * r;
  const color = score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : 'var(--success)';
  const label = score >= 70 ? 'Élevé' : score >= 40 ? 'Modéré' : 'Faible';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round" transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Risque {label}</span>
      </div>
    </div>
  );
}

function ScoreBarre({ label, score, poids }) {
  const color = (score ?? 0) >= 70 ? 'var(--danger)' : (score ?? 0) >= 40 ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--gray-600)' }}>{label} <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>({poids}%)</span></span>
        <span style={{ fontWeight: 700, color }}>{score ?? '—'}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score ?? 0}%`, background: color, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

export default function Analyse() {
  const { type, id } = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const meta         = location.state || {};

  const typeAnalyse  = type === 'document' ? 'document' : (meta.typeAnalyse || 'plagiat');
  const etapes       = ETAPES[typeAnalyse] || ETAPES.plagiat;

  const [etapeActive, setEtapeActive]       = useState(0);
  const [etapesDone, setEtapesDone]         = useState([]);
  const [animDone, setAnimDone]             = useState(false);
  const [resultat, setResultat]             = useState(null);
  const [erreur, setErreur]                 = useState('');
  const [telechargement, setTelechargement] = useState(false);
  const [actionLoading, setActionLoading]   = useState('');
  const pollRef = useRef(null);

  /* ── Animation étapes ── */
  useEffect(() => {
    let i = 0;
    let tid;
    const avancer = () => {
      if (i >= etapes.length) { setAnimDone(true); return; }
      const c = i;
      setEtapeActive(c);
      tid = setTimeout(() => {
        setEtapesDone(prev => [...prev, etapes[c].id]);
        i++;
        avancer();
      }, etapes[c].duree);
    };
    avancer();
    return () => clearTimeout(tid);
  }, [typeAnalyse]);

  /* ── Récupération résultat ── */
  useEffect(() => {
    if (type === 'theme') {
      if (meta.resultats) {
        setResultat({ type: 'theme', data: { ...meta.resultats, id: parseInt(id), titre: meta.titre } });
      } else {
        api.get(`/etudiant/themes/${id}`)
          .then(r => setResultat({ type: 'theme', data: r.data.theme }))
          .catch(() => setErreur('Impossible de récupérer le résultat.'));
      }
      return;
    }
    // Document : polling
    const poll = async () => {
      try {
        const r     = await api.get('/etudiant/verifications');
        const verif = r.data.find(v => v.document_id === parseInt(id));
        if (verif?.statut === 'termine') {
          clearInterval(pollRef.current);
          const detail = await api.get(`/etudiant/verifications/${verif.id}`);
          setResultat({ type: 'document', data: detail.data });
        } else if (verif?.statut === 'erreur') {
          clearInterval(pollRef.current);
          setErreur('Une erreur est survenue pendant la vérification.');
        }
      } catch { /* continuer */ }
    };
    pollRef.current = setInterval(poll, 2000);
    poll();
    return () => clearInterval(pollRef.current);
  }, [type, id]);

  /* ── Actions thème ── */
  const confirmerTheme = async (themeId) => {
    setActionLoading('confirmer');
    try {
      await api.post(`/etudiant/themes/${themeId}/confirmer`);
      navigate('/etudiant/themes');
    } catch (err) { alert(err.response?.data?.message || 'Erreur.'); }
    finally { setActionLoading(''); }
  };

  const abandonnerTheme = async (themeId) => {
    if (!confirm('Abandonner ce thème ? Il sera supprimé.')) return;
    setActionLoading('abandonner');
    try {
      await api.delete(`/etudiant/themes/${themeId}/abandonner`);
      navigate('/etudiant/themes');
    } catch (err) { alert(err.response?.data?.message || 'Erreur.'); }
    finally { setActionLoading(''); }
  };

  /* ── Téléchargement rapport ── */
  const telechargerRapport = async (verifId) => {
    setTelechargement(true);
    try {
      const token = localStorage.getItem('dirma_token');
      const res   = await fetch(`http://localhost:8000/api/etudiant/verifications/${verifId}/rapport`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `rapport-dirma-${verifId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erreur lors du téléchargement.'); }
    finally { setTelechargement(false); }
  };

  const afficherResultat = animDone && resultat;

  /* ── Labels type analyse ── */
  const labelsType = {
    plagiat:  { titre: 'Analyse Plagiat',          couleur: '#3b82f6' },
    ia:       { titre: 'Détection IA',             couleur: '#8b5cf6' },
    les_deux: { titre: 'Analyse Complète',         couleur: 'var(--primary)' },
    document: { titre: 'Vérification de plagiat',  couleur: 'var(--primary)' },
  };
  const labelType = labelsType[typeAnalyse] || labelsType.plagiat;

  return (
    <Layout navItems={etudiantNav}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{labelType.titre}</h1>
          <p className="page-subtitle">{meta.titre || 'Analyse en cours...'}</p>
        </div>
        <button className="btn btn-secondary"
          onClick={() => navigate(type === 'theme' ? '/etudiant/themes' : '/etudiant/documents')}>
          <ArrowLeft size={14} /> Retour
        </button>
      </div>

      <div className="analyse-layout">

        {/* ── Étapes ── */}
        <div className="card analyse-etapes">
          <div className="card-header">
            <h3>Progression</h3>
            {!afficherResultat
              ? <span className="badge badge-info"><RefreshCw size={11} className="spin" /> En cours</span>
              : <span className="badge badge-success"><CheckCircle size={11} /> Terminé</span>}
          </div>
          <div style={{ padding: '16px 20px' }}>
            {etapes.map((etape, i) => {
              const done   = etapesDone.includes(etape.id);
              const active = etapeActive === i && !done;
              return (
                <div key={etape.id} className={`etape-item ${done ? 'done' : active ? 'active' : 'pending'}`}>
                  <div className="etape-icone">
                    {done   ? <CheckCircle size={16} /> :
                     active ? <RefreshCw size={16} className="spin" /> :
                              <div className="etape-dot" />}
                  </div>
                  <div className="etape-contenu">
                    <span className="etape-label">{etape.label}</span>
                    {active && <span className="etape-status">En cours...</span>}
                    {done   && <span className="etape-status done">Terminé</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Résultats ── */}
        <div className="analyse-resultats">

          {/* Attente */}
          {!afficherResultat && !erreur && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 20 }}>
              <div className="analyse-spinner" />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-700)' }}>Analyse en cours...</p>
              <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', maxWidth: 320 }}>
                {typeAnalyse === 'plagiat'  && 'TF-IDF, N-grammes, Jaccard, Levenshtein et similarité cosinus en cours.'}
                {typeAnalyse === 'ia'       && 'Perplexité, Burstiness et détection de patterns IA en cours.'}
                {typeAnalyse === 'les_deux' && 'Analyse plagiat + détection IA combinées en cours.'}
                {typeAnalyse === 'document' && 'Shingling, MinHash, Jaccard, détection IA et recherche web en cours.'}
              </p>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <XCircle size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--danger)' }}>{erreur}</p>
              <button className="btn btn-secondary" style={{ marginTop: 16 }}
                onClick={() => navigate(type === 'theme' ? '/etudiant/themes' : '/etudiant/documents')}>
                Retour
              </button>
            </div>
          )}

          {/* ── Résultat THÈME ── */}
          {afficherResultat && type === 'theme' && (() => {
            const res   = resultat.data;
            const score = res.score_global ?? res.score_similarite ?? 0;
            const color = score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--warning)' : 'var(--success)';
            const themeId = res.id || parseInt(id);

            return (
              <div className="card" style={{ padding: 28 }}>

                {/* Jauge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <Jauge score={score} />
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
                  {res.titre || meta.titre}
                </h3>

                {/* Badge type analyse */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: `${labelType.couleur}18`, color: labelType.couleur }}>
                    {labelType.titre}
                  </span>
                </div>

                {/* Scores détaillés si les_deux */}
                {typeAnalyse === 'les_deux' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <div style={{ padding: '12px 14px', background: '#dbeafe', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, marginBottom: 4 }}>PLAGIAT (60%)</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>{res.score_plagiat ?? 0}%</p>
                    </div>
                    <div style={{ padding: '12px 14px', background: '#ede9fe', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 4 }}>DÉTECTION IA (40%)</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>{res.score_ia ?? 0}%</p>
                    </div>
                  </div>
                )}

                {/* Top correspondances plagiat */}
                {res.details_plagiat?.top_correspondances?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Top correspondances ({res.details_plagiat.nb_themes_compares} thèmes comparés)
                    </p>
                    {res.details_plagiat.top_correspondances.slice(0, 3).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, marginBottom: 6, border: '1px solid var(--gray-200)' }}>
                        <span style={{ fontSize: 12, color: 'var(--gray-700)', flex: 1, marginRight: 12 }}>{c.reference}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: c.score >= 70 ? 'var(--danger)' : c.score >= 40 ? 'var(--warning)' : 'var(--success)' }}>{c.score}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Indicateurs IA */}
                {res.details_ia?.nb_phrases && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Indicateurs IA</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Perplexité',    value: res.details_ia.perplexite },
                        { label: 'Burstiness',    value: res.details_ia.burstiness },
                        { label: 'Répétitions IA',value: res.details_ia.repetitions_ia },
                        { label: 'Nb phrases',    value: res.details_ia.nb_phrases },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ padding: '8px 12px', background: '#ede9fe', borderRadius: 6 }}>
                          <p style={{ fontSize: 11, color: '#8b5cf6', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 16, fontWeight: 700, color: '#6d28d9' }}>
                            {typeof value === 'number' ? value.toFixed(2) : (value ?? '—')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message risque */}
                <div style={{ padding: '12px 16px', borderRadius: 10, background: `${color}10`, border: `1.5px solid ${color}40`, marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 4 }}>
                    {score >= 70 && '⚠️ Risque élevé détecté'}
                    {score >= 40 && score < 70 && '⚠️ Risque modéré détecté'}
                    {score < 40 && '✅ Risque faible — Thème original'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                    {score >= 70 && 'Score élevé. Vous pouvez quand même soumettre — le Chef sera informé du score.'}
                    {score >= 40 && score < 70 && 'Similarité modérée. Le Chef de Département examinera votre thème.'}
                    {score < 40 && 'Thème original. Vous pouvez le soumettre au Chef de Département.'}
                  </p>
                </div>

                {/* Actions */}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, marginBottom: 10 }}
                  onClick={() => confirmerTheme(themeId)} disabled={actionLoading === 'confirmer'}>
                  <Send size={15} />
                  {actionLoading === 'confirmer' ? 'Envoi...' : 'Confirmer et envoyer au Chef de Département'}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ justifyContent: 'center' }}
                    onClick={() => navigate('/etudiant/themes')}>
                    <RotateCcw size={14} /> Reprendre le test
                  </button>
                  <button className="btn btn-secondary"
                    style={{ justifyContent: 'center', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => abandonnerTheme(themeId)} disabled={actionLoading === 'abandonner'}>
                    <Trash2 size={14} />
                    {actionLoading === 'abandonner' ? 'Suppression...' : 'Abandonner'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Résultat DOCUMENT ── */}
          {afficherResultat && type === 'document' && (() => {
            const verif = resultat.data;
            return (
              <>
                <div className="card" style={{ padding: 28, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                    <Jauge score={verif.score_global ?? 0} size={150} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 14 }}>Détail des scores</p>
                      <ScoreBarre label="Analyse locale (Shingling/Jaccard)" score={verif.score_local} poids={40} />
                      <ScoreBarre label="Détection IA (Perplexité/Burstiness)" score={verif.score_ia} poids={35} />
                      <ScoreBarre label="Recherche web (Rabin-Karp)" score={verif.score_web} poids={25} />
                    </div>
                  </div>
                </div>

                {verif.details_ia && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3>Indicateurs IA</h3></div>
                    <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Perplexité',     value: verif.details_ia.perplexite,     hint: 'Bas = suspect IA' },
                        { label: 'Burstiness',     value: verif.details_ia.burstiness,     hint: 'Bas = régulier (IA)' },
                        { label: 'Répétitions IA', value: verif.details_ia.repetitions_ia, hint: 'Patterns détectés' },
                        { label: 'Nb phrases',     value: verif.details_ia.nb_phrases,     hint: 'Phrases analysées' },
                      ].map(({ label, value, hint }) => (
                        <div key={label} style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-100)' }}>
                          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)' }}>
                            {typeof value === 'number' ? value.toFixed(2) : (value ?? '—')}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{hint}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <h3>Sources détectées</h3>
                    <span className="badge badge-gray">{verif.sources?.length ?? 0}</span>
                  </div>
                  {!verif.sources?.length ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--gray-400)' }}>
                      <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: 8 }} />
                      <p>Aucune source de plagiat détectée.</p>
                    </div>
                  ) : verif.sources.map((src, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                      <div>
                        <span className={`badge ${src.type === 'web' ? 'badge-info' : 'badge-pending'}`} style={{ marginBottom: 4 }}>
                          {src.type === 'web' ? 'Web' : 'Local'}
                        </span>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4, maxWidth: 300, wordBreak: 'break-all' }}>
                          {src.url || src.document_ref || '—'}
                        </p>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 16, color: src.taux_similarite >= 70 ? 'var(--danger)' : src.taux_similarite >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                        {src.taux_similarite}%
                      </span>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14 }}
                  onClick={() => telechargerRapport(verif.id)} disabled={telechargement}>
                  <Download size={16} />
                  {telechargement ? 'Téléchargement...' : 'Télécharger le rapport PDF'}
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </Layout>
  );
}
