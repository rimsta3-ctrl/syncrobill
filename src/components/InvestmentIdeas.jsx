import React, { useState, useEffect } from 'react';

const InvestmentIdeas = () => {
  const [gainers, setGainers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGainers = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h'
      );
      const data = await response.json();

      // Sort by 24h price change descending and take top 3
      const sortedGainers = data
        .filter(coin => coin.price_change_percentage_24h !== null)
        .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
        .slice(0, 3);

      setGainers(sortedGainers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching gainers:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGainers();
    const interval = setInterval(fetchGainers, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="investment-ideas">
        {[1, 2, 3].map(i => (
          <div key={i} className="investment-card">
            <div style={{ height: '200px', background: 'rgba(181, 143, 65, 0.1)', borderRadius: '8px' }}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="investment-ideas">
      {gainers.map(coin => (
        <div key={coin.id} className="investment-card fade-in">
          <h3>{coin.name} ({coin.symbol.toUpperCase()})</h3>
          <div className="price">${coin.current_price.toLocaleString()}</div>
          <div className="change">+{coin.price_change_percentage_24h.toFixed(2)}%</div>
          <div className="sparkline">
            {/* Simple sparkline visualization */}
            <svg width="100%" height="100%" viewBox="0 0 100 60">
              <path
                d={`M 0,${60 - (coin.sparkline_in_7d.price[0] / Math.max(...coin.sparkline_in_7d.price)) * 60} ${coin.sparkline_in_7d.price.map((price, index) => {
                  const x = (index / (coin.sparkline_in_7d.price.length - 1)) * 100;
                  const y = 60 - (price / Math.max(...coin.sparkline_in_7d.price)) * 60;
                  return `L ${x},${y}`;
                }).join(' ')}`}
                stroke="#28a745"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvestmentIdeas;