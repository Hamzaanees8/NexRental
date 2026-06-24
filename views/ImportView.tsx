import React, { useState, useCallback } from 'react';
import { parseCSV, classifyCSV, CSVType } from '../services/csvParser';
import {
  getVehicles,
  getCustomers,
  getDrivers,
  getPartners,
  bulkCreateRentals,
  bulkCreateMaintenance,
  bulkCreatePartnerTransactions,
  bulkCreateCustomers
} from '../services/api';
import {
  resolveVehicle,
  resolveCustomer,
  resolveDriver,
  mapMonthlyRideRow,
  mapEngineOilRow,
  mapBalanceSheetRow
} from '../services/csvParser';
import { toast } from 'react-hot-toast';

interface ImportFile {
  file: File;
  type: CSVType;
  status: 'Ready' | 'Importing' | 'Imported' | 'Error';
  error?: string;
  rowCount: number;
}

const ImportView: React.FC = () => {
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{success: number, skipped: number, errors: string[]} | null>(null);

  const startImport = async () => {
    setIsImporting(true);
    setImportSummary(null);
    let totalSuccess = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    try {
      const [vehicles, customers, drivers, partners] = await Promise.all([
        getVehicles(),
        getCustomers(),
        getDrivers(),
        getPartners()
      ]);

      for (let i = 0; i < files.length; i++) {
        if (files[i].status === 'Imported') continue;

        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'Importing' } : f));

        try {
          const text = await files[i].file.text();
          const rows = parseCSV(text);
          let fileSuccess = 0;
          let fileSkipped = 0;

          if (files[i].type === CSVType.MonthlyRides) {
            const rentalsToCreate: any[] = [];
            const maintenanceToCreate: any[] = [];

            for (const row of rows) {
              const vehicle = resolveVehicle(row['Car'], vehicles);
              if (!vehicle) {
                fileSkipped++;
                continue;
              }

              let customer = resolveCustomer(row['Name'], row['Contact'], customers);
              if (!customer && row['Name']) {
                // Auto-create customer if missing
                customer = await bulkCreateCustomers([{
                  name: row['Name'],
                  phone: row['Contact'] || '0000000000',
                }]).then(res => res[0]);
                customers.push(customer);
              }

              const driver = resolveDriver(row['Driver'], drivers);
              const result = mapMonthlyRideRow(row, vehicle.id, customer?.id || '', driver?.id);

              if (result && 'rental_type' in result) {
                rentalsToCreate.push(result);
              } else if (result) {
                maintenanceToCreate.push(result);
              } else {
                fileSkipped++;
              }
            }

            const [createdRentals, createdMaint] = await Promise.all([
              bulkCreateRentals(rentalsToCreate),
              bulkCreateMaintenance(maintenanceToCreate)
            ]);

            fileSuccess = (createdRentals?.length || 0) + (createdMaint?.length || 0);
            fileSkipped += (rentalsToCreate.length - (createdRentals?.length || 0)) + (maintenanceToCreate.length - (createdMaint?.length || 0));

          } else if (files[i].type === CSVType.EngineOil) {
            const maintenanceToCreate: any[] = [];
            for (const row of rows) {
              const vehicle = resolveVehicle(row['Car'] || row['Vehicle'], vehicles);
              if (vehicle) {
                const records = mapEngineOilRow(row, vehicle.id);
                maintenanceToCreate.push(...records);
              } else {
                fileSkipped++;
              }
            }
            const created = await bulkCreateMaintenance(maintenanceToCreate);
            fileSuccess = created?.length || 0;
            fileSkipped += (maintenanceToCreate.length - (created?.length || 0));

          } else if (files[i].type === CSVType.BalanceSheet) {
            const partnerTxToCreate: any[] = [];
            const maintenanceToCreate: any[] = [];

            for (const row of rows) {
              const mapped = mapBalanceSheetRow(row, partners);
              mapped.forEach(m => {
                if ('partner_id' in m) {
                  partnerTxToCreate.push(m);
                } else {
                  maintenanceToCreate.push(m);
                }
              });
            }

            const [createdPTx, createdMaint] = await Promise.all([
              bulkCreatePartnerTransactions(partnerTxToCreate),
              bulkCreateMaintenance(maintenanceToCreate)
            ]);

            fileSuccess = (createdPTx?.length || 0) + (createdMaint?.length || 0);
            fileSkipped += (partnerTxToCreate.length - (createdPTx?.length || 0)) + (maintenanceToCreate.length - (createdMaint?.length || 0));
          }

          totalSuccess += fileSuccess;
          totalSkipped += fileSkipped;
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'Imported' } : f));
          toast.success(`Successfully imported ${files[i].file.name}`);

        } catch (err: any) {
          console.error(err);
          allErrors.push(`${files[i].file.name}: ${err.message}`);
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'Error', error: err.message } : f));
        }
      }

      setImportSummary({
        success: totalSuccess,
        skipped: totalSkipped,
        errors: allErrors
      });

    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: ImportFile[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.name.endsWith('.csv')) {
          const text = await file.text();
          const data = parseCSV(text);
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          const type = classifyCSV(headers);
          newFiles.push({
            file,
            type,
            status: 'Ready',
            rowCount: data.length
          });
        }
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Import Historical Data</h2>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="max-w-xl mx-auto text-center">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 hover:border-indigo-400 transition-colors cursor-pointer relative">
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-2">
              <div className="flex justify-center text-slate-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-lg font-medium text-slate-700">Drop CSV files here or click to upload</div>
              <p className="text-sm text-slate-500">Supports Monthly Rides, Engine Oil Log, and Balance Sheet exports</p>
            </div>
          </div>
        </div>
      </div>

      {importSummary && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800">Import Summary</h3>
            <span className="text-sm text-slate-500">{new Date().toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="text-green-600 text-sm font-medium uppercase tracking-wider">Created</div>
              <div className="text-2xl font-bold text-green-700">{importSummary.success}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="text-slate-600 text-sm font-medium uppercase tracking-wider">Skipped/Duplicates</div>
              <div className="text-2xl font-bold text-slate-700">{importSummary.skipped}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <div className="text-red-600 text-sm font-medium uppercase tracking-wider">Errors</div>
              <div className="text-2xl font-bold text-red-700">{importSummary.errors.length}</div>
            </div>
          </div>
          {importSummary.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <h4 className="font-semibold text-red-800 mb-2">Error Log</h4>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {importSummary.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Files to Import ({files.length})</h3>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          </div>
          <ul className="divide-y divide-slate-200">
            {files.map((item, index) => (
              <li key={index} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    item.type === CSVType.MonthlyRides ? 'bg-blue-50 text-blue-600' :
                    item.type === CSVType.EngineOil ? 'bg-amber-50 text-amber-600' :
                    item.type === CSVType.BalanceSheet ? 'bg-green-50 text-green-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{item.file.name}</div>
                    <div className="text-sm text-slate-500">
                      {item.type} • {item.rowCount} rows
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'Ready' ? 'bg-slate-100 text-slate-600' :
                    item.status === 'Importing' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                    item.status === 'Imported' ? 'bg-green-100 text-green-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {item.status}
                  </span>
                  {item.status === 'Ready' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={startImport}
              disabled={isImporting || files.every(f => f.status === 'Imported')}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Processing Import...' : 'Start Import'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportView;
