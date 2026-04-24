import type { InviteCode } from '@concert-crawl/types'
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
import { revokeInviteCode } from '@/lib/actions/invite-codes'

function codeStatus(code: InviteCode): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  if (code.revokedAt) return { label: 'Revoked', variant: 'destructive' }
  if (code.usedAt) return { label: 'Used', variant: 'secondary' }
  if (code.expiresAt && new Date(code.expiresAt) < new Date())
    return { label: 'Expired', variant: 'outline' }
  return { label: 'Active', variant: 'default' }
}

export function InviteCodeTable({ codes }: { codes: InviteCode[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Used By</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => {
          const status = codeStatus(code)
          return (
            <TableRow key={code.id}>
              <TableCell className="font-mono text-sm">{code.code}</TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="text-slate-400 text-sm">
                {code.usedBy ?? '—'}
              </TableCell>
              <TableCell className="text-slate-400 text-sm">
                {code.expiresAt
                  ? new Date(code.expiresAt).toLocaleDateString()
                  : 'Never'}
              </TableCell>
              <TableCell className="text-slate-400 text-sm">
                {new Date(code.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {!code.revokedAt && !code.usedAt && (
                  <form action={revokeInviteCode.bind(null, code.id)}>
                    <Button variant="ghost" size="sm" type="submit">
                      Revoke
                    </Button>
                  </form>
                )}
              </TableCell>
            </TableRow>
          )
        })}
        {codes.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-slate-400">
              No invite codes yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
