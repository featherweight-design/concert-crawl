/**
 * Saves a blob as a file through a temporary link. The object URL is revoked
 * a moment later, once the browser has started the download.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};
