// LoadingPopover.tsx
import React, { useState, useEffect } from 'react';

const messages = [
  'checking the local wind forecasts',
  'analyzing your vessel and available sails',
  'conferring with artificial intelligence',
  'finishing up',
];

const LoadingPopover: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [wavePosition, setWavePosition] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000); // Change message every 3 seconds

    const waveInterval = setInterval(() => {
      setWavePosition((prev) => (prev + 1) % waves.length);
    }, 200); // Animate waves every 200ms for smooth scrolling

    return () => {
      clearInterval(messageInterval);
      clearInterval(waveInterval);
    };
  }, []);

  const boat = `   /|   
  / |   
 /  |   
/___|   `;

  const waves = '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'; // Long string for scrolling effect
  const visibleWaves = waves.slice(wavePosition) + waves.slice(0, wavePosition);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-black border border-green-500 p-8 rounded-lg text-center max-w-lg w-full" style={{ color: 'var(--color-terminal-green)', fontFamily: 'inherit' }}>
        <div className="mb-6 animate-bob">
          <pre className="text-2xl font-mono" style={{ whiteSpace: 'pre', lineHeight: '1.2' }}>
            {boat}
            {'\n'}
            {visibleWaves.slice(0, 8)} {/* Adjust slice to match boat width for a compact wave under the boat */}
          </pre>
        </div>
        <p className="text-lg font-mono">{messages[messageIndex]}...</p>
      </div>
    </div>
  );
};

export default LoadingPopover;