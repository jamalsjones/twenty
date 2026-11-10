// Literal ids only: this file is imported by front components, which are
// bundled for the browser and cannot use the node:crypto based schema helpers.
export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'ee3e1f07-bcb2-4109-963d-85493c0fb352';

export const FRONT_COMPONENT_IDS = {
  compliancePosture: '160012f0-84b2-420f-94b1-d8b68072797b',
  attentionQueue: 'f47f472f-55cc-40c8-abe2-f3286f5df185',
  riskHeatmap: '87dbbb13-38f3-4e87-b533-01d6c0f2ac88',
  frameworkCoverage: '52ac4206-9241-4269-a0d7-2c297a2c60c2',
  vendorProfile: 'aef55dc9-1213-421c-830c-13db8af34f2a',
  assessmentReview: 'a3c83fa1-35e6-41b2-9da0-2db4427dc8dd',
} as const;

export const PAGE_LAYOUT_IDS = {
  commandCenter: 'e15414b2-4e4f-4c68-8685-de829b6d7811',
  riskRegister: '7e0d7374-99c2-4c85-9035-8287c082f9c0',
} as const;
