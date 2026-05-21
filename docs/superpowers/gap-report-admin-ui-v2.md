# Gap Report — Admin UI v2

## IMPLEMENTED (89)

### Shell / Navigation

- AdminSidebar — NavLink gap: 12→10 [AdminSidebar.tsx]
- AdminSidebar — NavLink active fontWeight: 600→700 [AdminSidebar.tsx]
- AdminSidebar — NavBadge minWidth: 18→16 [AdminSidebar.tsx]
- AdminSidebar — NavBadge height: 18→16 [AdminSidebar.tsx]
- AdminSidebar — NavBadge padding: '0 5px'→'2px 5px' [AdminSidebar.tsx]
- AdminSidebar — NavBadge borderRadius: 9→8 [AdminSidebar.tsx]
- AdminSidebar — NavBadge fontSize: 10→9 [AdminSidebar.tsx]
- AdminTopbar — breadcrumb container flex: 1 [AdminTopbar.tsx]
- MobileBottomBar — tab inactive color: var(--fg-subtle)→var(--fg-muted) [MobileBottomBar.tsx]
- MobileBottomBar — tab active color: var(--fg)→var(--signal) [MobileBottomBar.tsx]

### Generate Field

- GenerateField — loading padding: 8px 12px→14px 16px [GenerateField.tsx]
- GenerateField — loading borderRadius: 6→8 [GenerateField.tsx]
- GenerateField — loading background: transparent→var(--bg-elevated) [GenerateField.tsx]
- GenerateField — idle background: transparent→var(--bg-elevated) [GenerateField.tsx]
- GenerateField — review background: transparent→var(--bg-elevated) [GenerateField.tsx]
- GenerateField — sources marginTop: not set→8px [GenerateField.tsx]
- GenerateField — accepted background: transparent→var(--bg-elevated) [GenerateField.tsx]
- GenerateField — error padding: 6px 10px→14px 16px [GenerateField.tsx]
- GenerateField — error borderRadius: 6→8 [GenerateField.tsx]
- GenerateField — error background: transparent→var(--bg-elevated) [GenerateField.tsx]

### Primitives

- ConfidenceBar — track borderRadius: 999→4 [ConfidenceBar.tsx]
- ConfidenceBar — fill borderRadius: 999→4 [ConfidenceBar.tsx]
- ConfidenceBar — label fontWeight: not set→700 [ConfidenceBar.tsx]

### Venue Details

- VenueDetailsClient — page gap: 20→18 [VenueDetailsClient.tsx]
- VenueDetailsClient — page maxWidth: not set→1080 [VenueDetailsClient.tsx]
- VenueDetailsClient — VDField marginTop: 2→6 [VenueDetailsClient.tsx]
- VenueDetailsClient — VDField hint letterSpacing: 0.08em→0.06em [VenueDetailsClient.tsx]
- VenueDetailsClient — VDSelect chevron color: #888→#6B6B6B [VenueDetailsClient.tsx]
- VenueDetailsClient — VDSegToggle border: not set→1px solid var(--border) [VenueDetailsClient.tsx]
- VenueDetailsClient — Section 04 gap: 16→26 [VenueDetailsClient.tsx]
- DeleteVenueConfirm — scrim zIndex: 200→100 [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — h3 margin: 0→8px 0 0 [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — h3 lineHeight: not set→1.15 [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — input color: conditional→always var(--fg) [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — input container bg: var(--bg-elevated)→var(--surface-1) [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — confirm button height: not set→34 [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — confirm button padding: not set→0 16px [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — confirm button letterSpacing: not set→-0.005em [DeleteVenueConfirm.tsx]
- DeleteVenueConfirm — confirm button border: none→conditional [DeleteVenueConfirm.tsx]

### Venue Quick View

- VenueQuickView — "of N" color: var(--fg-subtle)→var(--fg-muted) [VenueQuickView.tsx]
- VenueQuickView — last error strip bg: danger→warning token [VenueQuickView.tsx]
- VenueQuickView — last error strip border: danger→warning token [VenueQuickView.tsx]
- VenueQuickView — action shelf alignItems: not set→center [VenueQuickView.tsx]

### Crawl Inspector

- DiagnosticsPanel — error headline fontSize: 14→20 [DiagnosticsPanel.tsx]
- DiagnosticsPanel — stats grid: repeat(3, 1fr)→repeat(4, auto) + strategy stat [DiagnosticsPanel.tsx]
- DiagnosticsPanel — staged card shelf gap: 6→8 [DiagnosticsPanel.tsx]
- DiagnosticsPanel — staged card shelf marginTop: 4→10 [DiagnosticsPanel.tsx]
- InspectorTabs — diagnostics dot color: var(--danger)→var(--warning) [InspectorTabs.tsx]
- StagedApplyConfirm — modal maxWidth: 100%→calc(100vw - 48px) [StagedApplyConfirm.tsx]
- StagedApplyConfirm — diff value bg: signal-only→color-mix + var(--bg-elevated) base [StagedApplyConfirm.tsx]
- StagedApplyConfirm — diff value fontSize: 11→12 [StagedApplyConfirm.tsx]
- StagedApplyConfirm — action shelf gap: 8→12 [StagedApplyConfirm.tsx]

### Event Flags Review

- EventFlagRow — title fontFamily: not set→Inter [EventFlagRow.tsx]
- EventFlagRow — title marginBottom: not set→4 [EventFlagRow.tsx]
- EventFlagRow — venue text fontFamily: not set→Inter [EventFlagRow.tsx]
- EventFlagInspector — h3 lineHeight: not set→1.3 [EventFlagInspector.tsx]
- EventFlagInspector — h3 margin: 6px 0 0→0 [EventFlagInspector.tsx]
- EventFlagInspector — extraction block bg: var(--signal)→var(--accent) token [EventFlagInspector.tsx]
- EventFlagInspector — extraction block border: var(--signal)→var(--accent) token [EventFlagInspector.tsx]
- EventFlagInspector — extraction block fontFamily: not set→Inter [EventFlagInspector.tsx]
- EventFlagInspector — extraction block marginTop: not set→8 [EventFlagInspector.tsx]
- EventFlagInspector — source link color: var(--signal)→var(--fg-muted) [EventFlagInspector.tsx]
- EventFlagInspector — source link whiteSpace: not set→pre-wrap [EventFlagInspector.tsx]
- EventFlagInspector — source block marginTop: not set→8 [EventFlagInspector.tsx]
- EventFlagsSection — count badge kind: signal→warning [EventFlagsSection.tsx]
- EventFlagsSection — empty state heading: custom div→StatusBadge success [EventFlagsSection.tsx]
- BulkActionDock — gap: 10→12 [BulkActionDock.tsx]
- BulkActionDock — label color: rgba(255,255,255,0.7)→var(--paper) [BulkActionDock.tsx]
- BulkApproveConfirm — warning strip marginTop: 0→12 [BulkApproveConfirm.tsx]
- BulkApproveConfirm — action shelf justifyContent: not set→flex-end [BulkApproveConfirm.tsx]

### Feedback

- FeedbackFilterRail — inactive fontWeight: 400→500 [FeedbackFilterRail.tsx]
- FeedbackFilterRail — active fontWeight: 600→700 [FeedbackFilterRail.tsx]
- FeedbackFilterRail — count badge bg when active: var(--bg-elevated)→var(--bg) [FeedbackFilterRail.tsx]
- FeedbackFilterRail — count badge color: signal/subtle→var(--fg-muted) [FeedbackFilterRail.tsx]
- FeedbackFilterRail — count badge fontVariantNumeric: not set→tabular-nums [FeedbackFilterRail.tsx]
- FeedbackRow — message body fontFamily: not set→Inter [FeedbackRow.tsx]
- FeedbackExpanded — full body fontFamily: not set→Inter [FeedbackExpanded.tsx]
- FeedbackExpanded — full body marginTop: 6→8 [FeedbackExpanded.tsx]
- FeedbackExpanded — linked issue block bg: color-mix accent→var(--bg-elevated) base [FeedbackExpanded.tsx]
- FeedbackExpanded — linked issue block gap: not set→10 [FeedbackExpanded.tsx]
- FeedbackExpanded — no-issue block bg: var(--surface-1)→var(--bg-elevated) [FeedbackExpanded.tsx]
- FeedbackExpanded — no-issue block gap: not set→10 [FeedbackExpanded.tsx]
- FeedbackExpanded — action shelf flexWrap: not set→wrap [FeedbackExpanded.tsx]

## DEFERRED (17)

- AdminTopbar — search slot: deferred: requires Phase 8 search feature spec
- AttentionFeed — SSE LIVE badge + mono time: deferred: requires SSE infrastructure (Phase 8)
- AttentionFeed — EngagementPlaceholder: deferred: requires engagement data pipeline
- AttentionFeed — mobile stat cards: deferred: mobile layout pass in Phase 8
- MobileDrawer — zIndex higher stacking: deferred: intentional stacking decision, no product issue
- StagedApplyConfirm — "Trigger re-crawl now" checkbox: deferred: requires backend trigger API
- PriceCoverageTable — AddPriceInlineForm: deferred: requires price submission UI Phase 8
- PriceCoverageTable — PriceRowMenu: deferred: requires price management actions Phase 8
- BulkActionDock — Re-tag button: deferred: requires tagging system (Phase 9)
- FeedbackFilterRail — source checkboxes: deferred: requires source tracking data schema
- FeedbackExpanded — screenshot slot: deferred: requires screenshot capture pipeline
- VenueDetailsClient — Section 05 Identity Art: deferred: generative art Phase 7.5 work
- EventFlagsSection — mobile tabs: deferred: mobile review UI in Phase 8
- FeedbackPage — mobile tabs: deferred: mobile review UI in Phase 8
- ReviewPage — pending submissions panel loading state: deferred: needs skeleton designs
- PriceCoverageTable — row-level stale badge tooltip: deferred: tooltip component Phase 8
- DiagnosticsPanel — strategy history "last entry" highlight logic: deferred: requires crawl run state correlation
