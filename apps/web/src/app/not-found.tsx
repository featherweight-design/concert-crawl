// Global not-found: any path no route matches. Without it Next renders its
// stock white "404 | This page could not be found." outside the theme. The root
// layout still wraps this, so the theme tokens apply. Signed-out visitors
// reach /events only after launch; its middleware bounce is the existing
// behaviour and not this page's concern.
import { NotFoundSurface } from '@/components/consumer/not-found-surface';

const GlobalNotFound = () => <NotFoundSurface />;

export default GlobalNotFound;
