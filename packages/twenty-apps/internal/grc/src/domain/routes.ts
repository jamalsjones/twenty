// HTTP routes exposed by the app's logic functions, shared with the front
// components that call them.
export const ROUTES = {
  launchAssessment: '/grc/assessments/launch',
  completeAssessment: '/grc/assessments/complete',
  vendorPortal: '/grc/portal',
  recomputeCompliance: '/grc/compliance/recompute',
  runMonitor: '/grc/monitor/run',
  console: '/grc/console',
  consoleScript: '/grc/console/app.js',
} as const;
