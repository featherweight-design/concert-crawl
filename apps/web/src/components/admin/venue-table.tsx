import type { Venue } from '@concert-crawl/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { activateVenue, deactivateVenue } from '@/lib/actions/venues'

interface VenueTableProps {
  venues: Venue[]
}

export function VenueTable({ venues }: VenueTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Last Crawled</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {venues.map((venue) => (
          <TableRow key={venue.id}>
            <TableCell className="font-medium">
              <Link
                href={`/admin/venues/${venue.id}`}
                className="text-fg hover:underline"
              >
                {venue.name}
              </Link>
            </TableCell>
            <TableCell>{venue.city}</TableCell>
            <TableCell>
              <Badge variant={venue.active ? 'default' : 'secondary'}>
                {venue.active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={venue.verified ? 'default' : 'outline'}>
                {venue.verified ? 'Verified' : 'Unverified'}
              </Badge>
            </TableCell>
            <TableCell className="text-fg-muted text-sm">
              {venue.lastCrawledAt
                ? new Date(venue.lastCrawledAt).toLocaleDateString()
                : 'Never'}
            </TableCell>
            <TableCell>
              {venue.active ? (
                <form action={deactivateVenue.bind(null, venue.id)}>
                  <Button variant="ghost" size="sm" type="submit">
                    Deactivate
                  </Button>
                </form>
              ) : (
                <form action={activateVenue.bind(null, venue.id)}>
                  <Button variant="ghost" size="sm" type="submit">
                    Activate
                  </Button>
                </form>
              )}
            </TableCell>
          </TableRow>
        ))}
        {venues.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-fg-muted">
              No venues yet. Add your first venue.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
