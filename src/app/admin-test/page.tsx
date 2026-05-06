'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function AdminTestPage() {
  const { data: session, status } = useSession();
  
  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
  }, [status, session]);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Session Debug</h1>
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>User:</strong> {session?.user ? JSON.stringify(session.user) : 'null'}</p>
        <p><strong>Role:</strong> {session?.user?.role || 'undefined'}</p>
        <p><strong>Email:</strong> {session?.user?.email || 'undefined'}</p>
      </div>
      <div style={{ marginTop: '20px', padding: '20px', background: status === 'loading' ? '#fff3cd' : '#d4edda', borderRadius: '8px' }}>
        {status === 'loading' && <p>Session is loading... Please wait.</p>}
        {status === 'authenticated' && <p>Session authenticated!</p>}
        {status === 'unauthenticated' && <p>Not authenticated</p>}
      </div>
    </div>
  );
}
