'use client';

import { useState } from 'react';
import { AuthHeading, AuthPage } from './AuthPage';
import { AuthField, PasswordField } from './AuthField';
import { CodeBoxes } from './CodeBoxes';
import { ConsentCheck, LegalLink } from './ConsentCheck';
import {
  AppliedChip,
  GoogleButton,
  LinkButton,
  OrDivider,
  PrimaryButton,
  SecondaryButton,
} from './AuthButtons';
import { AuthBanner, StepTrail } from './AuthNotices';
import { LegalSheet } from './LegalSheet';
import { AUTH_FLOW_COPY } from './definitions/copy';

const COPY = AUTH_FLOW_COPY;

/**
 * Every piece in every state (`09-parts`), in the one page shape. A preview
 * for the contact sheet and for review; the real screens join it route by
 * route. Mounted only in development (`app/sign-in/parts`).
 */
export function AuthParts() {
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState('48');
  const [legal, setLegal] = useState(false);
  return (
    <AuthPage venueCount={21}>
      <StepTrail step={2} total={3} />
      <AuthHeading
        eyebrow="Parts"
        eyebrowTone="signal"
        title="Every piece, every state"
        sub="Preview only."
      />
      <AuthBanner>{COPY.offline}</AuthBanner>
      <GoogleButton />
      <GoogleButton busy />
      <OrDivider />
      <AuthField label="Email" type="email" placeholder="you@example.com" />
      <AuthField
        label="Email"
        defaultValue="not an email"
        error="Enter an email like you@example.com."
      />
      <AuthField label="Email" disabled defaultValue="locked@example.com" />
      <PasswordField
        label="Password"
        defaultValue="hunter2hunter2"
        hint={COPY.password.rule}
      />
      <CodeBoxes value={code} onChange={setCode} />
      <CodeBoxes
        value="123456"
        onChange={() => {}}
        error="That code isn’t right."
      />
      <ConsentCheck checked={agreed} onChange={setAgreed}>
        {COPY.consent.lead}
        <LegalLink onClick={() => setLegal(true)}>
          {COPY.consent.terms}
        </LegalLink>
        {COPY.consent.and}
        <LegalLink onClick={() => setLegal(true)}>
          {COPY.consent.privacy}
        </LegalLink>
        {COPY.consent.end}
      </ConsentCheck>
      <ConsentCheck
        checked={false}
        onChange={() => {}}
        error={COPY.consent.error}
      >
        {COPY.consent.lead}
        {COPY.consent.terms}
        {COPY.consent.end}
      </ConsentCheck>
      <PrimaryButton>{COPY.parts.continue}</PrimaryButton>
      <PrimaryButton busy busyLabel={COPY.parts.makingAccount}>
        {COPY.parts.continue}
      </PrimaryButton>
      <PrimaryButton done doneLabel={COPY.parts.youreIn} />
      <PrimaryButton disabled>{COPY.parts.continue}</PrimaryButton>
      <SecondaryButton emphasis>{COPY.parts.useCode}</SecondaryButton>
      <LinkButton>{COPY.parts.forgot}</LinkButton>
      <AppliedChip />
      <StepTrail step={3} total={3} done />
      <LegalSheet
        open={legal}
        onClose={() => setLegal(false)}
        title="Terms of Service"
      >
        <p className="m-0 text-sm text-fg-muted">{COPY.parts.legalBody}</p>
      </LegalSheet>
    </AuthPage>
  );
}
