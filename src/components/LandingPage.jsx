import React from 'react';
import { useNavigate } from 'react-router-dom';
import InvestmentIdeas from './InvestmentIdeas';

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToTerminal = () => {
    navigate('/terminal');
  };

  return (
    <div className="app-container">
      <header>
        <h1>Syncrobill</h1>
        <button className="launch-btn" onClick={() => navigate('/terminal')}>
          Lancer l'App
        </button>
      </header>

      <section className="hero fade-in">
        <h1>L'Excellence de la Trade Finance</h1>
        <p>
          Découvrez une plateforme révolutionnaire où la sécurité des Smart Contracts rencontre
          l'élégance de la finance traditionnelle. Vos transactions internationales sont désormais
          protégées par la puissance immuable de la blockchain.
        </p>
        <button className="hero-btn" onClick={scrollToTerminal}>
          ENTRER DANS LE TERMINAL DE TRANSACTION
        </button>
      </section>

      <section className="opportunities fade-in">
        <h2>Intelligence de Marché & Opportunités</h2>
        <p>
          Analyses basées sur les flux mondiaux en temps réel. Investissez avec la puissance de la donnée.
        </p>
        <InvestmentIdeas />
        <button className="hero-btn" onClick={scrollToTerminal} style={{ marginTop: '48px' }}>
          ENTRER DANS LE TERMINAL DE TRANSACTION
        </button>
      </section>
    </div>
  );
};

export default LandingPage;