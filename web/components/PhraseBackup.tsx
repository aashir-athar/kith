'use client';

import { useEffect, useState } from 'react';

import { getRecoveryPhrase } from '@/lib/crypto/e2e';
import { useKith } from '@/lib/store';
import { Brand } from './Brand';

export function PhraseBackup() {
  const ack = useKith((s) => s.ackBackup);
  const [phrase, setPhrase] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getRecoveryPhrase().then((p) => {
      if (active) setPhrase(p);
    });
    return () => {
      active = false;
    };
  }, []);

  const words = phrase ? phrase.split(' ') : [];

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-head">
          <Brand size={44} />
          <h1>Save your phrase</h1>
        </div>
        <p className="welcome-sub">These twelve words are the only way back into your account. Kith never sees them, and cannot reset them. Write them down and keep them offline.</p>

        <div className="phrasebox" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
          {words.length > 0
            ? words.map((w, i) => (
                <div key={i}>
                  <span style={{ color: 'var(--ink-3)' }}>{String(i + 1).padStart(2, '0')}</span> {w}
                </div>
              ))
            : 'Loading your phrase...'}
        </div>

        <button className="btn" onClick={ack}>I saved it, open Kith</button>
      </div>
    </div>
  );
}
