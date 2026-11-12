'use client';

// The crew home boundary is the same standalone error page as every other
// route (README B20a). A bad crew id never lands here: the page maps it to
// not-found, so this only ever means a real failure.
export { default } from '@/app/(protected)/error';
