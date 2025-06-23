import { BrowserWindow } from 'electron';

export function setupSecurity(mainWindow: BrowserWindow): void {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Setup CORS and CSP for development
  if (isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      { urls: ['http://localhost:3000/*'] },
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'access-control-allow-origin': ['app://.'],
            'access-control-allow-methods': ['GET, POST, OPTIONS'],
            'access-control-allow-headers': ['Content-Type'],
          }
        });
      }
    );
  }

  // Setup Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' http://localhost:3000; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
} 