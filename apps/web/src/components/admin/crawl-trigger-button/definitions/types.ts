export type BadgeVariant = 'default' | 'destructive' | 'secondary'

export interface CrawlStatusBadgeConfig {
  label: string
  variant: BadgeVariant
}

export type TriggerState = 'idle' | 'triggering' | 'polling' | 'done' | 'error'
