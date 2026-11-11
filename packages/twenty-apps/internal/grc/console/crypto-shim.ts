// The schema module derives entity ids with node:crypto. The console only
// reads labels and options from it, so the browser bundle gets this stand-in.
export const createHash = () => {
  throw new Error('Entity ids are not available in the browser');
};
