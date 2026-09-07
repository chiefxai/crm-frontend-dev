import Keycloak from 'keycloak-js';

// All values come from environment variables so the same build can point at
// any Keycloak realm without recompiling. In local dev, copy .env.example to
// .env.local and fill them in. Caddy forwards the /auth/* path to Keycloak
// so the frontend and IdP share the same origin (no third-party cookie issues).
const keycloak = new Keycloak({
  url:      import.meta.env.VITE_KEYCLOAK_URL      ?? 'http://localhost:8080',
  realm:    import.meta.env.VITE_KEYCLOAK_REALM    ?? 'chiefvoice',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'chiefvoice-crm',
});

export default keycloak;
