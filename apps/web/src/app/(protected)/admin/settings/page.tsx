import { permanentRedirect } from 'next/navigation';

/**
 * Settings held only the test-email tool, which now lives in
 * Operations › Emails; old links land there.
 */
export default function SettingsPage() {
  permanentRedirect('/admin/operations?tab=emails');
}
