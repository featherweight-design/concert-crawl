import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

// No Passport loading board was drawn, so this holds the booklet's own shape
// in the B+ skeleton style: the header, the booklet with its pager, the Up next
// stub and the Venues collected grid, in the places they will paint.
export default function PassportLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8"
    >
      <div className="grid gap-x-[30px] gap-y-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <SkeletonBlock width={220} height={40} />
          <SkeletonBlock width="min(100%, 340px)" height={14} />
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonBlock height={340} radius={22} />
          <div className="flex items-center gap-3">
            <SkeletonBlock width={40} height={40} radius="50%" />
            <SkeletonBlock width={160} height={10} />
          </div>
        </div>
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <SkeletonBlock width={64} height={10} />
            <SkeletonBlock height={92} radius={16} />
          </div>
          <div className="grid grid-cols-5 gap-2 lg:gap-3">
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index} className="flex justify-center">
                <SkeletonBlock width={48} height={48} radius={13} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
