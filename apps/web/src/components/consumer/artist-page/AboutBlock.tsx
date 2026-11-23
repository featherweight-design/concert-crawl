import type { ArtistInfoSummary } from '@concert-crawl/types';
import React from 'react';

import { ARTIST_COPY } from './definitions/copy';
import { safeHref } from './lib/safe-href';
import { SectionHead } from './SectionHead';

export type AboutFact = { label: string; value: string };

const linkStyle: React.CSSProperties = {
  color: 'var(--fg-muted)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  textDecorationColor: 'var(--border-strong)',
};

const Row = ({ label, value }: AboutFact) => (
  <div
    data-testid="about-fact"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 0',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <span
      style={{
        width: 62,
        flex: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
      }}
    >
      {label}
    </span>
    <span
      style={{
        minWidth: 0,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--fg)',
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * "About" (addendum 12, `02/page-commons-360`, `02/page-plate-360`): a card of
 * facts (TYPE, FROM) and, when Wikipedia answered, its summary shown whole and
 * unedited with the attribution CC BY-SA asks for. A fact we do not have drops
 * its row; with no facts and no summary the section is not drawn.
 */
export const AboutBlock = ({
  facts,
  summary,
}: {
  facts: AboutFact[];
  summary: ArtistInfoSummary | null;
}) => {
  if (facts.length === 0 && !summary) return null;
  const { title, wikipediaFrom, wikipedia, licenseSeparator } =
    ARTIST_COPY.about;
  const articleHref = summary ? safeHref(summary.articleUrl) : null;
  const licenseHref = summary ? safeHref(summary.licenseUrl) : null;
  return (
    <section data-testid="about-block" aria-labelledby="about">
      <SectionHead id="about" title={title} />
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          padding: '6px 16px 16px',
        }}
      >
        {facts.map((fact) => (
          <Row key={fact.label} {...fact} />
        ))}
        {summary ? (
          <div style={{ marginTop: facts.length > 0 ? 14 : 10 }}>
            <p
              data-testid="about-summary"
              style={{
                margin: 0,
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--fg-muted)',
                overflowWrap: 'anywhere',
              }}
            >
              {summary.extract}
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-subtle)',
              }}
            >
              {wikipediaFrom}{' '}
              {articleHref ? (
                <a
                  href={articleHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  {wikipedia} ↗
                </a>
              ) : (
                wikipedia
              )}{' '}
              {licenseSeparator}{' '}
              {licenseHref ? (
                <a
                  href={licenseHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  {summary.license}
                </a>
              ) : (
                summary.license
              )}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
};
