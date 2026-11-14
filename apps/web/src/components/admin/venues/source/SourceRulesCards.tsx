/** The Source tab's read-only right column: the robots.txt card and the crawl rules card. */

import { Check, Flag } from 'lucide-react';
import {
  CRAWLER_USER_AGENT,
  type VenueWithCrawlHealth,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { runWhen } from '../overview/overview-rules';
import { Card, Row } from './source-parts';
import { paceLine, robotsStateOf, scheduleLine } from './source-rules';

const COPY = ADMIN_COPY.venueSource;
/** "ConcertCrawl/1.0", the product part of the one user agent. */
const AGENT_NAME = CRAWLER_USER_AGENT.split(' ')[0] ?? CRAWLER_USER_AGENT;

export const SourceRulesCards = ({
  venue,
  phone,
}: {
  venue: Pick<
    VenueWithCrawlHealth,
    'crawlDelayMs' | 'robotsTxtAllowed' | 'robotsTxtCheckedAt' | 'nextCrawlAt'
  >;
  phone: boolean;
}) => {
  const robots = robotsStateOf(venue.robotsTxtAllowed);
  const schedule = scheduleLine(venue.nextCrawlAt);
  return (
    <>
      <Card
        title={COPY.robots.title}
        phone={phone}
        testId="source-robots"
        warning={robots === 'disallowed'}
      >
        <div>
          <Row label={COPY.robots.calendarPage}>
            {robots === 'allowed' ? (
              <span style={{ display: 'inline-flex', gap: 5 }}>
                <Check size={13} color="var(--success)" aria-hidden />
                {COPY.robots.allowed}
              </span>
            ) : robots === 'disallowed' ? (
              <span
                style={{
                  display: 'inline-flex',
                  gap: 5,
                  color: 'var(--warning)',
                }}
              >
                <Flag size={13} aria-hidden />
                {COPY.robots.disallowed}
              </span>
            ) : (
              <span style={{ color: 'var(--fg-muted)' }}>
                {COPY.robots.unchecked}
              </span>
            )}
          </Row>
          {/* No ", before the run" (the board's): the check time is stamped
              as the run ends, not before it. */}
          <Row label={COPY.robots.lastChecked}>
            {venue.robotsTxtCheckedAt === null
              ? COPY.robots.never
              : runWhen(venue.robotsTxtCheckedAt)}
          </Row>
          <Row label={COPY.robots.userAgent}>{AGENT_NAME}</Row>
        </div>
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--fg-muted)',
          }}
        >
          {robots === 'disallowed'
            ? COPY.robots.disallowedFootnote
            : COPY.robots.footnote}
        </div>
      </Card>

      {/* Read-only: no input, nothing here is ever sent (ruling d). */}
      <Card title={COPY.rules.title} phone={phone} testId="source-rules">
        <div>
          <Row label={COPY.rules.pace}>{paceLine(venue.crawlDelayMs)}</Row>
          {schedule !== null && (
            <Row label={COPY.rules.schedule}>{schedule}</Row>
          )}
          <Row label={COPY.rules.autoPause}>{COPY.rules.autoPauseValue}</Row>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {COPY.rules.footnote}
        </div>
      </Card>
    </>
  );
};
