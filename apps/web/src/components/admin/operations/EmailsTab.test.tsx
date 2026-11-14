// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { EmailsTab } from './EmailsTab';

const getToken = () => Promise.resolve('test-token');
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, isLoaded: true }),
}));

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const COPY = ADMIN_COPY.operations.emails;

const OPTIONS = [
  { key: 'crawl_failure', label: 'Crawl failure alert', group: 'Operational' },
  { key: 'invite_code', label: 'Invite code', group: 'Operational' },
  { key: 'brand_new', label: 'Brand new email', group: 'Customer' },
];

const previewOf = (key: string) => ({
  emailKey: key,
  subject: `[TEST] Subject of ${key}`,
  html: key === 'invite_code' ? '' : `<p>Body of ${key}</p>`,
  text: `Text of ${key}`,
});

const serve = () =>
  mockGet.mockImplementation(async (path: string) => {
    if (path.endsWith('/options')) return OPTIONS;
    const key = /test-email\/([^/]+)\/preview/.exec(path)?.[1] ?? '';
    return previewOf(key);
  });

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  serve();
});
afterEach(cleanup);

describe('EmailsTab', () => {
  it('lists every email the API sends, named from copy or its own label', async () => {
    render(<EmailsTab isPhone={false} />);
    const group = await screen.findByRole('radiogroup', {
      name: COPY.chipsLabel,
    });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: COPY.names.crawl_failure }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('radio', { name: COPY.names.invite_code }),
    ).toBeInTheDocument();
    // An email this build has no name for shows the API's label.
    expect(
      screen.getByRole('radio', { name: 'Brand new email' }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.note)).toBeInTheDocument();
  });

  it('previews the picked email, HTML in a frame and text when it has none', async () => {
    render(<EmailsTab isPhone={false} />);
    const frame = await screen.findByTestId('email-preview-frame');
    expect(frame).toHaveAttribute('srcdoc', '<p>Body of crawl_failure</p>');
    expect(frame).toHaveAttribute('sandbox', 'allow-same-origin');

    fireEvent.click(
      screen.getByRole('radio', { name: COPY.names.invite_code }),
    );
    expect(await screen.findByTestId('email-preview-text')).toHaveTextContent(
      'Text of invite_code',
    );
  });

  it('sends a test of the picked email and says where it went', async () => {
    mockPost.mockResolvedValueOnce({
      sent: true,
      resendId: 'r1',
      sentTo: 'h***@gmail.com',
    });
    render(<EmailsTab isPhone={false} />);
    await screen.findByTestId('email-preview-frame');

    fireEvent.click(screen.getByRole('button', { name: COPY.sendTest }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      COPY.sentTitle('h***@gmail.com'),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      COPY.sentBody('[TEST] Subject of crawl_failure'),
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/v1/admin/notifications/test-email',
      'test-token',
      { emailKey: 'crawl_failure' },
    );
  });

  it('says why a test did not go out, with Try again', async () => {
    mockPost.mockResolvedValueOnce({
      sent: false,
      reason: 'missing_admin_email',
    });
    render(<EmailsTab isPhone={false} />);
    await screen.findByTestId('email-preview-frame');

    fireEvent.click(screen.getByRole('button', { name: COPY.sendTest }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(COPY.sendFailedTitle);
    expect(alert).toHaveTextContent(COPY.sendFailedBody.missing_admin_email);
  });

  it("shows Couldn't load when the list fails, and Try again reloads it", async () => {
    mockGet.mockRejectedValueOnce(new Error('down'));
    render(<EmailsTab isPhone={false} />);
    expect(await screen.findByTestId('couldnt-load')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.states.couldntLoad.tryAgain,
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('radiogroup')).toBeInTheDocument(),
    );
  });

  it('puts Send me a test under the preview on the phone, with no note', async () => {
    render(<EmailsTab isPhone />);
    await screen.findByTestId('email-preview-frame');
    expect(screen.queryByText(COPY.note)).not.toBeInTheDocument();
    const preview = screen.getByTestId('emails-preview');
    const button = screen.getByTestId('emails-send-test');
    expect(
      preview.compareDocumentPosition(button) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
