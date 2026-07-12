'use client';

import { useEffect } from 'react';

import { Brand } from '@/components/Brand';
import { Messenger } from '@/components/Messenger';
import { PhraseBackup } from '@/components/PhraseBackup';
import { Welcome } from '@/components/Welcome';
import { useKith } from '@/lib/store';

export default function Page() {
  const ready = useKith((s) => s.ready);
  const token = useKith((s) => s.token);
  const needsBackup = useKith((s) => s.needsBackup);
  const restore = useKith((s) => s.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  if (!ready) {
    return (
      <div className="splash">
        <Brand size={64} />
      </div>
    );
  }
  if (!token) return <Welcome />;
  if (needsBackup) return <PhraseBackup />;
  return <Messenger />;
}
