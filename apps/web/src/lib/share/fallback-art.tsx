import React from 'react';
import { ImageResponse } from 'next/og';
import { IdentityArtPrint } from '@/components/consumer/identity-art/IdentityArtPrint';

/**
 * IdentityArt, pre-rendered to a PNG data URI, for the tilted card on Square
 * and Wide when there is no photo.
 *
 * satori mis-rotates an inline SVG inside a `transform: rotate()` box: the art
 * turned about twice the card's tilt, leaving wedges of bare ground inside the
 * ring. An `<img>` rotates correctly (the photo path proves it), so the art is
 * drawn flat first and placed exactly like a photo. The art carries no text,
 * so no fonts are needed.
 */
export const identityArtDataUri = async (
  name: string,
  size: number,
): Promise<string> => {
  const response = new ImageResponse(
    <IdentityArtPrint name={name} kind="artist" width={size} height={size} />,
    { width: size, height: size },
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:image/png;base64,${btoa(binary)}`;
};
