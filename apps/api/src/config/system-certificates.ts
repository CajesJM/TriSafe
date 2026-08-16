import {
  getCACertificates,
  setDefaultCACertificates,
} from 'node:tls';

/**
 * Trust both Node's bundled certificate authorities and the operating
 * system's certificate store. This keeps outbound HTTPS requests secure on
 * Windows machines whose network certificates are managed by the system.
 */
export function configureSystemCertificates() {
  const bundledCertificates = getCACertificates('default');
  const systemCertificates = getCACertificates('system');
  setDefaultCACertificates([
    ...bundledCertificates,
    ...systemCertificates,
  ]);
}
