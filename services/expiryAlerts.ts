import { Vehicle, Driver } from '../types';

export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired';

export interface DocumentAlert {
  entityId: string;
  entityName: string;
  type: string;
  status: 'expiring_soon' | 'expired';
  expiryDate: string;
  daysDiff: number;
}

export const checkDocumentStatus = (expiryDateStr: string | undefined | null): DocumentStatus => {
  if (!expiryDateStr) return 'valid';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'valid';
};

export const getExpiredDocuments = (vehicles: Vehicle[], drivers: Driver[]): DocumentAlert[] => {
  const alerts: DocumentAlert[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const processExpiry = (entityId: string, entityName: string, dateStr: string | undefined | null, type: string) => {
    if (!dateStr) return;

    const status = checkDocumentStatus(dateStr);
    if (status !== 'valid') {
      const expiryDate = new Date(dateStr);
      expiryDate.setHours(0, 0, 0, 0);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      alerts.push({
        entityId,
        entityName,
        type,
        status: status as 'expiring_soon' | 'expired',
        expiryDate: dateStr,
        daysDiff: diffDays
      });
    }
  };

  vehicles.forEach(v => {
    processExpiry(v.id, v.license_plate, v.insurance_expiry, 'Insurance');
    processExpiry(v.id, v.license_plate, v.token_tax_expiry, 'Token Tax');
  });

  drivers.forEach(d => {
    processExpiry(d.id, d.name, d.license_expiry, 'License');
    processExpiry(d.id, d.name, d.cnic_expiry, 'CNIC');
  });

  return alerts.sort((a, b) => {
    if (a.status === 'expired' && b.status !== 'expired') return -1;
    if (a.status !== 'expired' && b.status === 'expired') return 1;
    return a.daysDiff - b.daysDiff;
  });
};
