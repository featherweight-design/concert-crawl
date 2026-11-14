import Link from 'next/link';
import { MySubmissionsList } from './MySubmissionsList';
import { countsByFilter } from './submission-format';
import { SubmissionStats } from './SubmissionStats';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import type {
  UserProfileResponse,
  UserSubmissionItem,
} from '@concert-crawl/types';

const SETTINGS_COPY = CONSUMER_COPY.settings;

interface SubmissionsPageProps {
  profile: UserProfileResponse;
  submissions: UserSubmissionItem[];
}

/**
 * Mobile's full list of submitted prices (B+ `more-s-submissions_m`). On
 * desktop the same content is the Submitted prices panel of the Settings shell.
 */
export const SubmissionsPage = ({
  profile,
  submissions,
}: SubmissionsPageProps) => {
  // From the list itself, so the tiles agree with the filter counts below it.
  // The list holds every row (stale and archived as `closed`, under All only),
  // so its total is `profile.submissionCounts.total`.
  const counts = countsByFilter(submissions);

  return (
    <>
      {/* `submitted-prices-m`: the back link left, the title centred at 16px,
          and a 60px spacer opposite the link so the title is centred on the
          bar, in a 54px bar. */}
      <div className="flex h-[54px] items-center justify-between border-b border-border bg-bg-elevated px-4">
        <Link
          href="/me"
          className="w-[60px] shrink-0 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.submissionsBack}
        </Link>
        <h1 className="m-0 text-center text-[16px] font-extrabold text-fg">
          {SETTINGS_COPY.submissionsSection}
        </h1>
        <span aria-hidden className="w-[60px] shrink-0" />
      </div>
      <div className="flex flex-col gap-5 px-4 pb-24 pt-5">
        <SubmissionStats
          submitted={counts.all}
          confirmed={counts.live}
          cred={profile.cred}
        />
        <MySubmissionsList submissions={submissions} />
      </div>
    </>
  );
};
