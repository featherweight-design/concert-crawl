import { SkeletonBlock } from '../skeleton/SkeletonBlock';
import { RESULT_ART_SIZE } from './ResultParts';

const SKELETON_ROWS = 4;

/**
 * A skeleton in the result row's shape (README rule 9): the art box, the name,
 * the meta line and the chip, with the app's one skeleton sweep. Not the pink
 * wave, which is reserved for waits on shows (rule 10).
 */
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px 10px 16px',
        minHeight: 64,
      }}
    >
      <SkeletonBlock
        width={RESULT_ART_SIZE}
        height={RESULT_ART_SIZE}
        radius={10}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
        }}
      >
        <SkeletonBlock width="55%" height={13} radius={6} />
        <SkeletonBlock width="75%" height={10} radius={5} />
        <SkeletonBlock width={64} height={14} radius={5} />
      </div>
    </div>
  );
}

export function SearchLoadingState() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 8px',
      }}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, idx) => (
        <SkeletonRow key={idx} />
      ))}
    </div>
  );
}
