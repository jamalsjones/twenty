import { AppPath, navigate } from 'twenty-sdk/front-component';

export const openRecord = (
  objectNameSingular: string,
  objectRecordId: string,
) => navigate(AppPath.RecordShowPage, { objectNameSingular, objectRecordId });

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No date';

const MILLISECONDS_PER_DAY = 86_400_000;

export const daysUntil = (value: string) =>
  Math.round((new Date(value).getTime() - Date.now()) / MILLISECONDS_PER_DAY);
