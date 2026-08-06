// The `unknown` token's surface. `DeadInviteLink` deliberately has no branded
// dead end for it — a page that only tokens which once existed can reach would
// confirm which tokens exist — so an unknown token becomes the app's ordinary
// 404 instead. It only actually was that inside `(protected)/(main)`; this
// route sits outside the app shell, where `notFound()` fell through to Next's
// unstyled default with no chrome and no way back.
import { NotFoundSurface } from '@/components/consumer/not-found-surface'

const NotFound = () => <NotFoundSurface />

export default NotFound
