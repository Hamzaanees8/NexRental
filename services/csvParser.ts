
/**
 * Simple RFC-4180 compliant CSV parser.
 * Converts a CSV string into an array of objects, automatically discovering the header row.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const allRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        allRows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // Skip \n
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    allRows.push(currentRow);
  }

  if (allRows.length < 1) return [];

  // Discovery: Find the first row that looks like a header
  const knownKeywords = [
    'date', 'car', 'tour price', 'profit', // Monthly Rides
    'now', 'next', 'tuning', 'tyre',      // Engine Oil
    'opening balance', 'description'       // Balance Sheet
  ];

  let headerIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const row = allRows[i].map(c => c.toLowerCase());
    const matchCount = knownKeywords.filter(k => row.includes(k)).length;

    // If a row has at least 2 matching keywords, it's likely the header row
    if (matchCount >= 2) {
      headerIndex = i;
      break;
    }
  }

  // If no header found, assume first row (original behavior) or return empty if very messy
  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headers = allRows[headerIndex].map(h => h.trim());
  const data = allRows.slice(headerIndex + 1);

  return data.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] || '';
      }
    });
    return obj;
  });
}

import {
  Vehicle,
  Customer,
  Driver,
  Rental,
  MaintenanceRecord,
  PartnerTransaction,
  RentalType,
  RentalStatus,
  MaintenanceType,
  PartnerTransactionType,
} from "../types";
import { TENANT_ID } from "../constants";

export enum CSVType {
  MonthlyRides = 'Monthly Rides Log',
  EngineOil = 'Engine Oil Log',
  BalanceSheet = 'Balance Sheet',
  Unknown = 'Unknown'
}

/**
 * Classifies the type of CSV based on its headers.
 */
export function classifyCSV(headers: string[]): CSVType {
  const h = headers.map(s => s.toLowerCase());

  // Contains Tour Price, Self, Odometer (Start/Stop)
  if (h.includes('tour price') && h.includes('self') && (h.includes('start') || h.includes('stop'))) {
    return CSVType.MonthlyRides;
  }

  // Contains Now, Next, Tuning, Tyre
  if (h.includes('now') && h.includes('next') && (h.includes('tuning') || h.includes('tyre'))) {
    return CSVType.EngineOil;
  }

  // Contains Opening Balance or partner columns
  if (h.includes('opening balance') || h.some(header => header.includes('partner'))) {
    return CSVType.BalanceSheet;
  }

  return CSVType.Unknown;
}

/**
 * Maps a row from the Monthly Rides CSV to a Rental or MaintenanceRecord.
 */
export function mapMonthlyRideRow(row: Record<string, string>, vehicleId: string, customerId: string, driverId?: string): Rental | MaintenanceRecord | null {
  // Strict Validation: A valid ride row MUST have a Date and either a Tour Price or a Note/Address
  if (!row['Date'] || row['Date'].toLowerCase() === 'date') return null;

  const tourPrice = parseFloat(row['Tour Price'] || '0');
  const profit = parseFloat(row['Profit'] || '0');
  const date = formatDate(row['Date']);

  // If Tour Price is empty or 0, and there's notes (Address col often contains notes in the sample)
  if (tourPrice === 0 && (row['Address'] || row['Notes'] || row['Others'] || row['Destination'])) {
    const notes = row['Address'] || row['Notes'] || row['Others'] || row['Destination'];
    let type = MaintenanceType.Other;

    // Detect Challan
    if (notes.toLowerCase().includes('challan')) {
      type = MaintenanceType.Other; // Could add a specific 'Fine' or 'Challan' type if it existed
    }

    return {
      id: crypto.randomUUID(),
      tenant_id: TENANT_ID,
      vehicle_id: vehicleId,
      type: type,
      cost: Math.abs(profit), // In the sample, expenses have negative profit
      date: date,
      notes: notes,
      odometer: parseFloat(row['Start'] || '0')
    };
  }

  if (tourPrice === 0) return null;

  return {
    id: crypto.randomUUID(),
    tenant_id: TENANT_ID,
    vehicle_id: vehicleId,
    customer_id: customerId,
    driver_id: driverId,
    rental_type: row['Self'] ? RentalType.SelfDrive : RentalType.WithDriver,
    status: RentalStatus.Settled,
    start_time: date,
    end_time: formatDate(row['End Date'] || row['Date']),
    odometer_start: parseFloat(row['Start'] || '0'),
    odometer_end: parseFloat(row['Stop'] || '0'),
    rent_amount: tourPrice,
    fuel_cost: parseFloat(row['Petrol'] || '0'),
    toll_cost: parseFloat(row['Mtag'] || '0'),
    driver_allowance: parseFloat(row['Driver'] || '0'),
    other_expenses: parseFloat(row['Wash'] || '0') + parseFloat(row['Others'] || '0'),
    net_profit: parseFloat(row['Profit'] || '0'),
  };
}

/**
 * Maps a row from the Engine Oil CSV to one or more MaintenanceRecords.
 */
export function mapEngineOilRow(row: Record<string, string>, vehicleId: string): MaintenanceRecord[] {
  const records: MaintenanceRecord[] = [];
  const date = formatDate(row['Date']);
  const odometer = parseFloat(row['Now'] || '0');

  const types = [
    { key: 'Engine Oil', type: MaintenanceType.EngineOil, nextKey: 'Next Oil' },
    { key: 'Tuning', type: MaintenanceType.Tuning, nextKey: 'Next Tuning' },
    { key: 'Tyre', type: MaintenanceType.TyreChange, nextKey: 'Next Tyre' },
    { key: 'Gear Oil', type: MaintenanceType.GearOil, nextKey: 'Next Gear Oil' },
  ];

  types.forEach(t => {
    if (row[t.key] && parseFloat(row[t.key]) > 0) {
      records.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        vehicle_id: vehicleId,
        type: t.type,
        cost: parseFloat(row[t.key] || '0'),
        odometer: odometer,
        next_due_odometer: parseFloat(row[t.nextKey] || '0'),
        date: date,
        notes: `Imported from Engine Oil Log: ${t.key}`
      });
    }
  });

  return records;
}

/**
 * Maps a row from the Balance Sheet CSV to PartnerTransactions or MaintenanceRecords.
 */
export function mapBalanceSheetRow(row: Record<string, string>, partners: {id: string, name: string}[]): (PartnerTransaction | MaintenanceRecord)[] {
  const entities: (PartnerTransaction | MaintenanceRecord)[] = [];
  const date = formatDate(row['Date']);

  // Partner Drawings/Contributions
  partners.forEach(partner => {
    if (!row[partner.name]) return;
    const amount = parseFloat(row[partner.name] || '0');
    if (amount !== 0 && !isNaN(amount)) {
      entities.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        partner_id: partner.id,
        type: amount < 0 ? PartnerTransactionType.Drawing : PartnerTransactionType.Contribution,
        amount: Math.abs(amount),
        date: date,
        description: row['Description'] || `Balance Sheet entry for ${partner.name}`,
        created_at: new Date().toISOString()
      } as PartnerTransaction);
    }
  });

  // Capital Expenditures (e.g. "Acquisition", "Major Repair" columns)
  if (row['Capex'] || row['Maintenance']) {
    const cost = parseFloat(row['Capex'] || row['Maintenance'] || '0');
    if (cost > 0) {
      entities.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        vehicle_id: row['Vehicle ID'] || '', // Hopefully provided or resolved later
        type: MaintenanceType.Other,
        cost: cost,
        date: date,
        notes: row['Description'] || 'Capital expenditure from balance sheet'
      } as MaintenanceRecord);
    }
  }

  return entities;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // Expecting DD.MM.YYYY
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return d.toISOString();
  }
  return new Date(dateStr).toISOString();
}

/**
 * Resolves a vehicle by license plate (partial match).
 */
export function resolveVehicle(plate: string, vehicles: Vehicle[]): Vehicle | null {
  if (!plate) return null;
  const normalized = plate.toLowerCase().replace(/\s/g, '');
  return vehicles.find(v => v.license_plate.toLowerCase().replace(/\s/g, '').includes(normalized)) || null;
}

/**
 * Resolves a customer by name or phone.
 */
export function resolveCustomer(name: string, phone: string, customers: Customer[]): Customer | null {
  if (!name && !phone) return null;
  const normalizedPhone = phone?.replace(/\D/g, '');
  return customers.find(c =>
    (name && c.name.toLowerCase() === name.toLowerCase()) ||
    (normalizedPhone && c.phone.replace(/\D/g, '').includes(normalizedPhone))
  ) || null;
}

/**
 * Resolves a driver by name.
 */
export function resolveDriver(name: string, drivers: Driver[]): Driver | null {
  if (!name || name.toLowerCase() === 'na') return null;
  return drivers.find(d => d.name.toLowerCase() === name.toLowerCase()) || null;
}
