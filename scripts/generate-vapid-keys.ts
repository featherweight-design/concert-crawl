#!/usr/bin/env tsx
// Generate a VAPID keypair for web push (#971). Run once per environment;
// public key goes to VAPID_PUBLIC_KEY (API) + NEXT_PUBLIC_VAPID_PUBLIC_KEY
// (web); private key stays server-side in VAPID_PRIVATE_KEY.
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
console.log(
  '# Also set VAPID_CONTACT_EMAIL — either a bare email (hugh@concertcrawl.app)',
)
console.log('# or the full mailto: URI. send-push.ts normalizes either form.')
