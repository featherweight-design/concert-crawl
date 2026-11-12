import Link from 'next/link';
import { MySubmissionsList } from './MySubmissionsList';
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
  const confirmedCount = submissions.filter(
    (sub) => sub.status === 'confirmed',
  ).length;

  return (
    <>
      <div className="flex items-center gap-4 border-b border-border bg-bg-elevated px-4 py-3.5">
        <Link
          href="/me"
          className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {SETTINGS_COPY.submissionsBack}
        </Link>
        <h1 className="text-[17px] font-extrabold text-fg">
          {SETTINGS_COPY.submissionsSection}
        </h1>
      </div>
      <div className="flex flex-col gap-5 px-4 pb-24 pt-5">
        <SubmissionStats
          submitted={profile.submissionCount}
          confirmed={confirmedCount}
          cred={profile.cred}
        />
        <MySubmissionsList submissions={submissions} />
      </div>
    </>
  );
};
