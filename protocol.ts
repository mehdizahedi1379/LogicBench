import { protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const SCHEME = 'app';
export const HOSTNAME = 'logicbench';
export const APP_ORIGIN = `${SCHEME}://${HOSTNAME}`;

/**
 * Must be called before app is ready.
 * Registers the custom scheme as standard and secure with full fetch/cors capabilities.
 */
export function registerPrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

/**
 * Registers protocol.handle for app://logicbench serving from dist directory
 * Includes strict path traversal protection and SPA fallback to index.html
 */
export function registerAppProtocol(distPath: string): void {
  const normalizedDist = path.resolve(distPath);

  protocol.handle(SCHEME, (request) => {
    try {
      const url = new URL(request.url);

      // Validate host
      if (url.hostname !== HOSTNAME && url.hostname !== '') {
        return new Response('Not Found', { status: 404 });
      }

      // Decode and sanitize relative pathname
      let decodedPathname = decodeURIComponent(url.pathname);

      // Strip leading slashes
      while (decodedPathname.startsWith('/') || decodedPathname.startsWith('\\')) {
        decodedPathname = decodedPathname.slice(1);
      }

      // Default root to index.html
      if (!decodedPathname || decodedPathname === '') {
        decodedPathname = 'index.html';
      }

      // Normalize and eliminate any relative traversal sequences
      const safePath = path.normalize(decodedPathname).replace(/^(\.\.[\/\\])+/, '');
      const targetFilePath = path.resolve(normalizedDist, safePath);

      // Strict Path Traversal Prevention
      if (!targetFilePath.startsWith(normalizedDist)) {
        console.warn(`[Security] Blocked path traversal attempt: ${url.pathname}`);
        return new Response('Forbidden: Path Traversal Denied', { status: 403 });
      }

      // If file exists and is a regular file, stream it
      if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
        return net.fetch(pathToFileURL(targetFilePath).toString());
      }

      // SPA Fallback: for client-side routing, route back to index.html
      const indexPath = path.resolve(normalizedDist, 'index.html');
      if (fs.existsSync(indexPath)) {
        return net.fetch(pathToFileURL(indexPath).toString());
      }

      return new Response('404: LogicBench build assets not found', { status: 404 });
    } catch (err: any) {
      console.error('[Protocol] Request handler failed:', err);
      return new Response(`Protocol error: ${err?.message || 'unknown'}`, { status: 500 });
    }
  });
}
