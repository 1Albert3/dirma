import { Link } from 'react-router-dom';
import { Upload, CheckCircle, Clock, Shield, ArrowRight } from 'lucide-react';
import logo from '../../assets/logo.png';
import './welcome.css';

// const features = [
//   { icon: Upload, title: 'Dépôt simplifié', desc: "Soumettez vos mémoires en quelques clics depuis n'importe où." },
//   { icon: CheckCircle, title: 'Validation multi-niveaux', desc: 'Circuit structuré : chef de département puis directeur adjoint.' },
//   { icon: Clock, title: 'Suivi en temps réel', desc: "Consultez l'état de votre dossier à chaque étape." },
//   { icon: Shield, title: 'Sécurisé & fiable', desc: 'Vos documents sont protégés et accessibles aux personnes autorisées.' },
// ];

export default function Welcome() {
  return (
    <div className="welcome-page">
      <div className="welcome-main-card">

        {/* Cadre gauche : Logo uniquement */}
        <div className="welcome-panel welcome-panel-left">
          <div className="welcome-logo-wrap">
            <img src={logo} alt="DIRMA" className="welcome-logo" />
          </div>
          <h1 className="welcome-logo-title">DIRMA</h1>
          <p className="welcome-logo-sub">Gestion des mémoires académiques</p>
        </div>

        {/* Cadre droit : Présentation */}
        <div className="welcome-panel welcome-panel-right">
          <span className="welcome-tag">Bienvenue sur</span>
          <h2 className="welcome-title">DIRMA</h2>
          <p className="welcome-desc">
            La plateforme officielle de dépôt et de gestion des mémoires de fin d'études.
            Un espace centralisé, sécurisé et transparent.
          </p>

          {/* <div className="welcome-features">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="welcome-feature-item">
                <div className="welcome-feature-icon"><Icon size={16} /></div>
                <div>
                  <p className="welcome-feature-title">{title}</p>
                  <p className="welcome-feature-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div> */}

          <div className="welcome-actions">
            <Link to="/login" className="welcome-btn-primary">
              Se connecter <ArrowRight size={14} />
            </Link>
            <Link to="/register" className="welcome-btn-secondary">
              Créer un compte
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
