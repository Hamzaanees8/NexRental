import {
  Vehicle,
  Trip,
  Transaction,
  MaintenanceRecord,
  FinancialSummary,
  VehicleStatus,
  TripStatus,
  TransactionType,
  MaintenanceType,
  Voucher,
  PassengerLog,
  ContractType,
  AppSettings,
} from "../types";
import { TENANT_ID } from "../constants";
import { supabase } from "./supabaseClient";

// --- API FUNCTIONS ---

// Fleet Management
export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as Vehicle[];
};

export const getVehicle = async (id: string): Promise<Vehicle | undefined> => {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Vehicle;
};

export const createVehicle = async (
  vehicleData: Omit<Vehicle, "id" | "tenant_id">
): Promise<Vehicle> => {
  const { data, error } = await supabase
    .from("vehicles")
    .insert([{ ...vehicleData, tenant_id: TENANT_ID }])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Vehicle;
};

export const updateVehicle = async (
  id: string,
  updates: Partial<Vehicle>
): Promise<Vehicle> => {
  const { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Vehicle;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

// Trip Management
export const getTrips = async (): Promise<Trip[]> => {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as Trip[];
};

export const getTrip = async (id: string): Promise<Trip | undefined> => {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Trip;
};

export const createTrip = async (
  tripData: Omit<Trip, "id" | "tenant_id" | "status">
): Promise<Trip> => {
  const { data, error } = await supabase
    .from("trips")
    .insert([
      { ...tripData, tenant_id: TENANT_ID, status: TripStatus.Scheduled },
    ])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Trip;
};

export const updateTripStatus = async (
  id: string,
  status: TripStatus
): Promise<Trip> => {
  const { data, error } = await supabase
    .from("trips")
    .update({ status })
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Trip;
};

export const generateVoucher = async (
  id: string,
  passengerLogs: PassengerLog[]
): Promise<Trip> => {
  const totalRevenue = passengerLogs.reduce(
    (sum, log) => sum + log.count * log.fare,
    0
  );
  const newVoucher: Voucher = { passengerLogs, totalRevenue };

  const { data: updatedTrip, error: updateTripError } = await supabase
    .from("trips")
    .update({ voucher: newVoucher, status: TripStatus.Completed })
    .eq("id", id)
    .select()
    .single();

  if (updateTripError) throw new Error(updateTripError.message);

  if (updatedTrip && updatedTrip.voucher) {
    await supabase.from("financial_transactions").delete().eq("trip_id", id);

    const newTransaction: Omit<Transaction, "id"> = {
      tenant_id: TENANT_ID,
      type: TransactionType.Voucher,
      amount: totalRevenue,
      description: `Voucher for trip ${updatedTrip.route.join(" → ")}`,
      date: updatedTrip.date,
      trip_id: id,
      vehicle_id: updatedTrip.vehicle_id,
    };
    const { error: transactionError } = await supabase
      .from("financial_transactions")
      .insert([newTransaction]);
    if (transactionError) throw new Error(transactionError.message);
  }
  return updatedTrip as Trip;
};

// Financials
export const getFinanceSummary = async (): Promise<FinancialSummary> => {
  const [
    { data: transactions, error: txError },
    { data: settledRentals, error: rentalError }
  ] = await Promise.all([
    supabase.from("financial_transactions").select("*").eq("tenant_id", TENANT_ID),
    supabase.from("rentals").select("*").eq("tenant_id", TENANT_ID).eq("status", "Settled")
  ]);

  if (txError) throw new Error(txError.message);
  if (rentalError) throw new Error(rentalError.message);

  const summary: FinancialSummary = {
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    dailyData: [],
  };
  const dailyMap: { [key: string]: { revenue: number; costs: number } } = {};

  // Track which rentals already have an income transaction
  const txRentalIds = new Set(transactions?.filter(t => t.type === TransactionType.RentalIncome).map(t => t.rental_id));

  transactions?.forEach((t) => {
    // Skip M-Tag transactions - they're internal transfers, not revenue or expenses
    if (t.type === TransactionType.MTagTopUp || t.type === TransactionType.MTagUsage) {
      return;
    }

    const dateStr = new Date(t.date).toISOString().split("T")[0];
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { revenue: 0, costs: 0 };
    }
    const isExpenseType = 
      t.type === TransactionType.Expense || 
      t.type === TransactionType.TripExpense;
    
    const isRevenueType = 
      t.type === TransactionType.Voucher || 
      t.type === TransactionType.PrivateHire || 
      t.type === TransactionType.RentalIncome;

    if (isExpenseType) {
      summary.totalCosts += t.amount;
      dailyMap[dateStr].costs += t.amount;
    } else if (isRevenueType) {
      summary.totalRevenue += t.amount;
      dailyMap[dateStr].revenue += t.amount;
    }
  });

  // Add revenue and expenses from Settled rentals that don't have a transaction yet
  settledRentals?.forEach((r) => {
    if (!txRentalIds.has(r.id)) {
      const dateStr = new Date(r.start_time).toISOString().split("T")[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { revenue: 0, costs: 0 };
      }
      
      // Virtual Revenue
      summary.totalRevenue += r.rent_amount;
      dailyMap[dateStr].revenue += r.rent_amount;

      // Virtual Expenses
      const totalExpenses = (r.fuel_cost || 0) + 
                          (r.toll_cost || 0) + 
                          (r.driver_allowance || 0) + 
                          (r.other_expenses || 0) +
                          (r.commission_amount || 0) +
                          (r.ride_expenses || []).reduce((sum, e) => sum + e.amount, 0);
      
      summary.totalCosts += totalExpenses;
      dailyMap[dateStr].costs += totalExpenses;
    }
  });

  summary.netProfit = summary.totalRevenue - summary.totalCosts;
  summary.dailyData = Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      date,
      revenue: dailyMap[date].revenue,
      costs: dailyMap[date].costs,
      profit: dailyMap[date].revenue - dailyMap[date].costs,
    }));

  return summary;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as Transaction[];
};

export const updateTransaction = async (
  id: string,
  transaction: Partial<Transaction>
): Promise<Transaction> => {
  // 1. Get the current transaction to check for maintenance link
  const { data: current, error: fetchError } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError) throw new Error(fetchError.message);

  // 2. Update the transaction
  const { data, error } = await supabase
    .from("financial_transactions")
    .update(transaction)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);

  const updated = data[0] as Transaction;

  // 3. If this transaction is linked to a maintenance record, update it too
  if (current.maintenance_id && (transaction.amount !== undefined || transaction.date !== undefined)) {
    const maintenanceUpdates: any = {};
    if (transaction.amount !== undefined) {
      maintenanceUpdates.cost = transaction.amount;
    }
    if (transaction.date !== undefined) {
      maintenanceUpdates.date = transaction.date;
    }
    
    if (Object.keys(maintenanceUpdates).length > 0) {
      await supabase
        .from("maintenance_records")
        .update(maintenanceUpdates)
        .eq("id", current.maintenance_id);
    }
  }

  return updated;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  // 1. Get the transaction to check for maintenance link
  const { data: transaction, error: fetchError } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError) throw new Error(fetchError.message);

  // 2. If linked to a maintenance record, delete it too
  if (transaction.maintenance_id) {
    await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", transaction.maintenance_id);
  }

  // 3. Delete the transaction
  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const createExpense = async (
  expenseData: Omit<Transaction, "id" | "tenant_id" | "type">
): Promise<Transaction> => {
  const newExpense = {
    ...expenseData,
    tenant_id: TENANT_ID,
    type: TransactionType.Expense,
  };
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert([newExpense])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Transaction;
};

export const createPrivateHire = async (
  hireData: Omit<Transaction, "id" | "tenant_id" | "type">
): Promise<Transaction> => {
  const newHire = {
    ...hireData,
    tenant_id: TENANT_ID,
    type: TransactionType.PrivateHire,
  };
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert([newHire])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Transaction;
};

// Maintenance
export const getMaintenanceHistory = async (): Promise<MaintenanceRecord[]> => {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as MaintenanceRecord[];
};

export const updateMaintenanceRecord = async (
  id: string,
  updates: Partial<MaintenanceRecord>
): Promise<MaintenanceRecord> => {
  // 1. Get the current record
  const { data: current, error: fetchError } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError) throw new Error(fetchError.message);

  // 2. Update the maintenance record
  const { data, error } = await supabase
    .from("maintenance_records")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);

  const updated = data[0] as MaintenanceRecord;

  // 3. Find and update the associated financial transaction
  // We look for an Expense transaction with matching vehicle_id and close date/amount
  const { data: existingTx } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("type", TransactionType.Expense)
    .eq("vehicle_id", current.vehicle_id)
    .eq("date", current.date)
    .eq("amount", current.cost);

  if (existingTx && existingTx.length > 0) {
    // Update the transaction with new values
    const vehicle = await getVehicle(updated.vehicle_id);
    await supabase
      .from("financial_transactions")
      .update({
        amount: updates.cost !== undefined ? updates.cost : current.cost,
        date: updates.date !== undefined ? updates.date : current.date,
        description: `${updates.type || current.type} for ${vehicle?.license_plate || updated.vehicle_id}`,
        vehicle_id: updated.vehicle_id
      })
      .eq("id", existingTx[0].id);
  }

  return updated;
};

export const deleteMaintenanceRecord = async (id: string): Promise<void> => {
  // 1. Get the maintenance record before deleting
  const { data: record, error: fetchError } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError) throw new Error(fetchError.message);

  // 2. Find and delete the associated financial transaction
  // Look for an Expense transaction with matching vehicle_id, date, and amount
  await supabase
    .from("financial_transactions")
    .delete()
    .eq("type", TransactionType.Expense)
    .eq("vehicle_id", record.vehicle_id)
    .eq("date", record.date)
    .eq("amount", record.cost);

  // 3. Delete the maintenance record
  const { error } = await supabase
    .from("maintenance_records")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const createMaintenanceRecord = async (
  recordData: Omit<MaintenanceRecord, "id" | "tenant_id">
): Promise<MaintenanceRecord> => {
  const newRecord = {
    ...recordData,
    tenant_id: TENANT_ID,
  };
  const { data, error } = await supabase
    .from("maintenance_records")
    .insert([newRecord])
    .select();
  if (error) throw new Error(error.message);

  // Create corresponding expense transaction
  const vehicle = await getVehicle(newRecord.vehicle_id);
  const createdRecord = data[0] as MaintenanceRecord;
  const newTransaction = {
    tenant_id: TENANT_ID,
    type: TransactionType.Expense,
    amount: newRecord.cost,
    description: `${newRecord.type} for ${
      vehicle?.license_plate || newRecord.vehicle_id
    }`,
    date: newRecord.date,
    vehicle_id: newRecord.vehicle_id,
    maintenance_id: createdRecord.id, // Link to maintenance record
  };
  await createExpense(newTransaction);

  // // Update vehicle's current_odometer if provided in the maintenance record
  // if (newRecord.odometer) {
  //   await updateVehicle(newRecord.vehicle_id, {
  //     current_odometer: newRecord.odometer,
  //   });
  // }

  return data[0] as MaintenanceRecord;
};

// --- NEW MODULES: Customers, Drivers, Rentals ---

// Customers
import {
  Customer,
  Driver,
  Rental,
  RentalStatus,
  TransactionType as TxType,
} from "../types";

export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as Customer[];
};

export const createCustomer = async (
  customer: Omit<Customer, "id" | "tenant_id">
): Promise<Customer> => {
  const { data, error } = await supabase
    .from("customers")
    .insert([{ ...customer, tenant_id: TENANT_ID }])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Customer;
};

export const updateCustomer = async (
  id: string,
  customer: Partial<Customer>
): Promise<Customer> => {
  const { data, error } = await supabase
    .from("customers")
    .update(customer)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Customer;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

// Drivers
export const getDrivers = async (): Promise<Driver[]> => {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as Driver[];
};

export const createDriver = async (
  driver: Omit<Driver, "id" | "tenant_id">
): Promise<Driver> => {
  const { data, error } = await supabase
    .from("drivers")
    .insert([{ ...driver, tenant_id: TENANT_ID }])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Driver;
};

export const updateDriver = async (
  id: string,
  driver: Partial<Driver>
): Promise<Driver> => {
  const { data, error } = await supabase
    .from("drivers")
    .update(driver)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Driver;
};

export const deleteDriver = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("drivers")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

// Rentals
export const getRentals = async (): Promise<Rental[]> => {
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(error.message);
  return data as Rental[];
};

export const createRental = async (
  rental: Omit<Rental, "id" | "tenant_id" | "status">
): Promise<Rental> => {
  const { data, error } = await supabase
    .from("rentals")
    .insert([
      {
        ...rental,
        tenant_id: TENANT_ID,
        status: RentalStatus.Reserved,
      },
    ])
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Rental;
};

export const updateRental = async (
  id: string,
  updates: Partial<Rental>
): Promise<Rental> => {
  // 1. Fetch current version to see if status is CHANGING to Settled
  const { data: current, error: fetchError } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError) throw new Error(fetchError.message);

  // 2. Perform the update
  const { data, error } = await supabase
    .from("rentals")
    .update(updates)
    .eq("id", id)
    .select();
  
  if (error) throw new Error(error.message);
  const updated = data[0] as Rental;

  // 3. If turning Settled, create financial transactions
  if (updates.status === RentalStatus.Settled && current.status !== RentalStatus.Settled) {
    // Check if transactions already exist for this rental to avoid duplicates
    const { data: existingTx } = await supabase
      .from("financial_transactions")
      .select("id")
      .eq("rental_id", id);
    
    if (!existingTx || existingTx.length === 0) {
      // Create Income Transaction
      const incomeTx = {
        tenant_id: TENANT_ID,
        rental_id: id,
        type: TransactionType.RentalIncome,
        amount: updated.rent_amount,
        description: `Rental Income: Booking #${id.slice(0, 8)}`,
        date: new Date().toISOString(),
        vehicle_id: updated.vehicle_id
      };
      
      await supabase.from("financial_transactions").insert([incomeTx]);

      // Create Expense Transaction (if exists)
      const totalExpenses = (updated.fuel_cost || 0) + 
                          (updated.toll_cost || 0) + 
                          (updated.driver_allowance || 0) + 
                          (updated.other_expenses || 0) +
                          (updated.commission_amount || 0) +
                          (updated.ride_expenses || []).reduce((sum, e) => sum + e.amount, 0);
      
      if (totalExpenses > 0) {
        const expenseTx = {
          tenant_id: TENANT_ID,
          rental_id: id,
          type: TransactionType.TripExpense,
          amount: totalExpenses,
          description: `Total Expenses for Booking #${id.slice(0, 8)}`,
          date: new Date().toISOString(),
          vehicle_id: updated.vehicle_id
        };
        await supabase.from("financial_transactions").insert([expenseTx]);
      }
    }
  } 
  // 4. If changing status FROM a finalized state (Settled/Completed) to something else, remove transactions
  else if (
    (current.status === RentalStatus.Settled || current.status === RentalStatus.Completed) && 
    updates.status && 
    updates.status !== RentalStatus.Settled && 
    updates.status !== RentalStatus.Completed
  ) {
    await supabase
      .from("financial_transactions")
      .delete()
      .eq("rental_id", id);
  }
  // 5. If getting update while ALREADY Settled, update transactions
  else if (current.status === RentalStatus.Settled && (!updates.status || updates.status === RentalStatus.Settled)) {
    // Update Income Transaction
    if (updates.rent_amount !== undefined) {
      await supabase
        .from("financial_transactions")
        .update({ amount: updates.rent_amount })
        .eq("rental_id", id)
        .eq("type", TransactionType.RentalIncome);
    }

    // Update Expense Transaction
    const totalExpenses = (updated.fuel_cost || 0) + 
                        (updated.toll_cost || 0) + 
                        (updated.driver_allowance || 0) + 
                        (updated.other_expenses || 0) +
                        (updated.commission_amount || 0) +
                        (updated.ride_expenses || []).reduce((sum, e) => sum + e.amount, 0);
    
    // Find existing expense tx
    const { data: existingExpenseTx } = await supabase
      .from("financial_transactions")
      .select("id")
      .eq("rental_id", id)
      .eq("type", TransactionType.TripExpense);

    if (existingExpenseTx && existingExpenseTx.length > 0) {
      if (totalExpenses > 0) {
        // Update existing
        await supabase
          .from("financial_transactions")
          .update({ amount: totalExpenses })
          .eq("id", existingExpenseTx[0].id);
      } else {
        // Remove if expenses are now 0
        await supabase
          .from("financial_transactions")
          .delete()
          .eq("id", existingExpenseTx[0].id);
      }
    } else if (totalExpenses > 0) {
      // Create new if didn't exist but now expenses > 0
      const expenseTx = {
        tenant_id: TENANT_ID,
        rental_id: id,
        type: TransactionType.TripExpense,
        amount: totalExpenses,
        description: `Total Expenses for Booking #${id.slice(0, 8)}`,
        date: new Date().toISOString(),
        vehicle_id: updated.vehicle_id
      };
      await supabase.from("financial_transactions").insert([expenseTx]);
    }
  }

  return updated;
};

export const deleteRental = async (id: string): Promise<void> => {
  // 1. Delete linked transactions first
  await supabase
    .from("financial_transactions")
    .delete()
    .eq("rental_id", id);

  // 2. Delete the rental
  const { error } = await supabase
    .from("rentals")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const updateRentalStatus = async (
  id: string,
  status: RentalStatus
): Promise<Rental> => {
  const { data, error } = await supabase
    .from("rentals")
    .update({ status })
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  return data[0] as Rental;
};

// Complex Logic: Complete Rental
export const completeRental = async (
  id: string,
  completionData: {
    odometer_end: number;
    fuel_cost: number;
    toll_cost: number;
    driver_allowance: number;
    other_expenses: number;
  }
): Promise<Rental> => {
  // 1. Fetch current rental
  const { data: rental, error: fetchError } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !rental) throw new Error("Rental not found");

  const total_cost =
    completionData.fuel_cost +
    completionData.toll_cost +
    completionData.driver_allowance +
    completionData.other_expenses;
  const net_profit = rental.rent_amount - total_cost;

  // 2. Update Rental Record
  const { data: updatedRental, error: updateError } = await supabase
    .from("rentals")
    .update({
      ...completionData,
      total_cost,
      net_profit,
      status: RentalStatus.Completed,
      end_time: new Date().toISOString(), // Or user provided
    })
    .eq("id", id)
    .select()
    .single();
  if (updateError) throw new Error(updateError.message);

  // 3. Update Vehicle (Odometer + M-Tag Deduction)
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("m_tag_balance")
    .eq("id", rental.vehicle_id)
    .single();
  const currentMTag = vehicle?.m_tag_balance || 0;

  await supabase
    .from("vehicles")
    .update({
      current_odometer: completionData.odometer_end,
      m_tag_balance: currentMTag - completionData.toll_cost,
    })
    .eq("id", rental.vehicle_id);

  // 4. Create Financial Transaction (Income)
  await supabase.from("financial_transactions").insert([
    {
      tenant_id: TENANT_ID,
      rental_id: id,
      type: TxType.RentalIncome,
      amount: rental.rent_amount,
      description: `Rental Income: ${rental.id}`,
      date: new Date().toISOString(),
      vehicle_id: rental.vehicle_id,
    },
  ]);

  // 5. Log Expenses
  if (total_cost > 0) {
    await supabase.from("financial_transactions").insert([
      {
        tenant_id: TENANT_ID,
        rental_id: id,
        type: TxType.TripExpense,
        amount: total_cost,
        description: `Rental Expenses (Fuel: ${completionData.fuel_cost}, Toll: ${completionData.toll_cost}, Driver: ${completionData.driver_allowance})`,
        date: new Date().toISOString(),
        vehicle_id: rental.vehicle_id,
      },
    ]);
  }

  return updatedRental as Rental;
};

// M-Tag Wallet
export const updateMTagBalance = async (
  vehicleId: string,
  amount: number,
  type: TransactionType.MTagTopUp | TransactionType.MTagUsage,
  date?: string
): Promise<Vehicle> => {
  // 1. Get current vehicle
  const { data: vehicle, error: fetchError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .single();
  if (fetchError || !vehicle) throw new Error("Vehicle not found");

  // 2. Update Balance
  const isUsage = type === TransactionType.MTagUsage;
  const newBalance = isUsage 
    ? (vehicle.m_tag_balance || 0) - amount 
    : (vehicle.m_tag_balance || 0) + amount;

  const { data: updatedVehicle, error: updateError } = await supabase
    .from("vehicles")
    .update({ m_tag_balance: newBalance })
    .eq("id", vehicleId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  // 3. Log Transaction
  await supabase.from("financial_transactions").insert([
    {
      tenant_id: TENANT_ID,
      vehicle_id: vehicleId,
      type: type,
      amount: amount,
      description: isUsage 
        ? `M-Tag Usage deduction for ${vehicle.license_plate}` 
        : `M-Tag Top Up for ${vehicle.license_plate}`,
      date: date || new Date().toISOString(),
    },
  ]);

  return updatedVehicle as Vehicle;
};

// Deprecated alias for compatibility
export const topUpMTag = (vehicleId: string, amount: number) => 
  updateMTagBalance(vehicleId, amount, TransactionType.MTagTopUp);

export const deleteMTagTransaction = async (transactionId: string): Promise<void> => {
  // 1. Get transaction details
  const { data: tx, error: txError } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();
  
  if (txError || !tx) throw new Error("Transaction not found");
  if (!tx.vehicle_id) throw new Error("Transaction not associated with a vehicle");

  // 2. Reverse balance update
  const { data: vehicle, error: vError } = await supabase
    .from("vehicles")
    .select("m_tag_balance")
    .eq("id", tx.vehicle_id)
    .single();
  
  if (vError || !vehicle) throw new Error("Vehicle not found");

  const isUsage = tx.type === TransactionType.MTagUsage;
  // If it was usage (subtracted), we add it back. If it was topup (added), we subtract it.
  const correctedBalance = isUsage 
    ? (vehicle.m_tag_balance || 0) + tx.amount 
    : (vehicle.m_tag_balance || 0) - tx.amount;

  await supabase
    .from("vehicles")
    .update({ m_tag_balance: correctedBalance })
    .eq("id", tx.vehicle_id);

  // 3. Delete transaction
  const { error: delError } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", transactionId);
  
  if (delError) throw new Error(delError.message);
};

export const editMTagTransaction = async (
  transactionId: string,
  newAmount: number,
  newDate: string
): Promise<void> => {
  // 1. Get original transaction
  const { data: tx, error: txError } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();
  
  if (txError || !tx) throw new Error("Transaction not found");
  if (!tx.vehicle_id) throw new Error("Transaction not associated with a vehicle");

  // 2. Sync balance
  const { data: vehicle, error: vError } = await supabase
    .from("vehicles")
    .select("m_tag_balance")
    .eq("id", tx.vehicle_id)
    .single();
  
  if (vError || !vehicle) throw new Error("Vehicle not found");

  const isUsage = tx.type === TransactionType.MTagUsage;
  
  // First reverse old amount
  let tempBalance = isUsage 
    ? (vehicle.m_tag_balance || 0) + tx.amount 
    : (vehicle.m_tag_balance || 0) - tx.amount;
  
  // Then apply new amount
  const finalBalance = isUsage 
    ? tempBalance - newAmount 
    : tempBalance + newAmount;

  await supabase
    .from("vehicles")
    .update({ m_tag_balance: finalBalance })
    .eq("id", tx.vehicle_id);

  // 3. Update transaction record
  const { error: updError } = await supabase
    .from("financial_transactions")
    .update({ amount: newAmount, date: newDate })
    .eq("id", transactionId);
  
  if (updError) throw new Error(updError.message);
};

// Settings
export const getSettings = async (): Promise<AppSettings | null> => {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("tenant_id", TENANT_ID)
    .single();
  
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data as AppSettings | null;
};

export const updateSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  // Check if exists
  const existing = await getSettings();
  
  if (existing) {
    const { data, error } = await supabase
      .from("settings")
      .update(settings)
      .eq("tenant_id", TENANT_ID)
      .select();
    if (error) throw new Error(error.message);
    return data[0] as AppSettings;
  } else {
    const { data, error } = await supabase
      .from("settings")
      .insert([{ ...settings, tenant_id: TENANT_ID }])
      .select();
    if (error) throw new Error(error.message);
    return data[0] as AppSettings;
  }
};
