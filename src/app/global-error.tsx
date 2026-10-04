'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#ffffff' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: '420px', textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: 600, margin: 0 }}>
              Something went wrong
            </p>
            <h1 style={{ fontSize: '18px', margin: '8px 0' }}>We hit an unexpected error</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>
              {error.message || 'The application failed to start.'}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
