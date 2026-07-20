#!/usr/bin/env tsx
// Generate a VAPID keypair for web push (#971). Run once per environment;
// public key goes to VAPID_PUBLIC_KEY (API) + NEXT_PUBLIC_VAPID_PUBLIC_KEY
// (web); private key stays server-side in VAPID_PRIVATE_KEY.
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
console.log(
  '# Also set VAPID_SUBJECT — either a bare email (hugh@concertcrawl.app),',
)
console.log(
  '# a full mailto: URI, or an https:// URL. send-push.ts prefixes mailto:',
)
console.log('# only for bare emails; already-scoped values pass through.')
