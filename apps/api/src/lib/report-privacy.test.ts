import { describe, it, expect } from 'vitest';
import type { PromotedReportSummary } from '@concert-crawl/types';
import { redactReporter, redactReportRow } from './report-privacy.js';

const report: PromotedReportSummary = {
  reporterHandle: 'sami',
  confirmsCount: 3,
  reportedAt: '2026-11-01T12:00:00.000Z',
};

describe('redactReporter', () => {
  it('nulls the handle for an anonymous viewer and keeps the rest', () => {
    expect(redactReporter(report, false)).toEqual({
      reporterHandle: null,
      confirmsCount: 3,
      reportedAt: '2026-11-01T12:00:00.000Z',
    });
  });

  it('keeps the handle for a signed-in viewer', () => {
    expect(redactReporter(report, true)).toEqual(report);
  });

  it('passes a missing report through for both viewers', () => {
    expect(redactReporter(null, false)).toBeNull();
    expect(redactReporter(null, true)).toBeNull();
  });

  it('does not mutate the input', () => {
    redactReporter(report, false);
    expect(report.reporterHandle).toBe('sami');
  });
});

describe('redactReportRow', () => {
  const row = {
    id: 'r1',
    reporterId: 'user_reporter',
    reporterHandle: 'sami',
    isReporter: false,
  };

  it('strips the handle and the id for an anonymous viewer', () => {
    expect(redactReportRow(row, false)).toEqual({
      ...row,
      reporterId: null,
      reporterHandle: null,
    });
  });

  it("keeps the handle but not another user's id for a signed-in viewer", () => {
    expect(redactReportRow(row, true)).toEqual({ ...row, reporterId: null });
  });

  it("keeps the viewer's own id and handle on their own report", () => {
    const own = { ...row, isReporter: true };
    expect(redactReportRow(own, true)).toEqual(own);
  });
});
