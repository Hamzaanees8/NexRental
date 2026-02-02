import React, { useEffect, useState, useMemo } from 'react';
import { getTrips, getVehicles, getDrivers, createTrip, updateTripStatus, generateVoucher } from '../services/api';
import toast from 'react-hot-toast';
import { Trip, TripStatus, Vehicle, Driver, PassengerLog } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons';
import { STATUS_COLORS, TRIP_TERMINALS, FARE_MATRIX, formatCurrency } from '../constants';

const TripsView: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const [tripsData, vehiclesData, driversData] = await Promise.all([getTrips(), getVehicles(), getDrivers()]);
      setTrips(tripsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleOpenTripModal = () => {
    setIsTripModalOpen(true);
  };

  const handleOpenVoucherModal = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsVoucherModalOpen(true);
  };

  const handleCloseModals = () => {
    setSelectedTrip(null);
    setIsTripModalOpen(false);
    setIsVoucherModalOpen(false);
  };

  const handleSaveTrip = async (formData: Omit<Trip, 'id' | 'tenantId' | 'status'>) => {
    try {
      await createTrip(formData);
      toast.success("Trip scheduled successfully");
      fetchTrips();
      handleCloseModals();
    } catch (error) {
      toast.error("Failed to schedule trip");
    }
  };

  const handleSaveVoucher = async (tripId: string, passengerLogs: PassengerLog[]) => {
    try {
      await generateVoucher(tripId, passengerLogs);
      toast.success("Voucher generated successfully");
      fetchTrips();
      handleCloseModals();
    } catch (error) {
      toast.error("Failed to save voucher");
    }
  };

  const handleUpdateStatus = async (tripId: string, status: TripStatus) => {
    try {
      await updateTripStatus(tripId, status);
      toast.success(`Trip status updated to ${status}`);
      fetchTrips();
    } catch (error) {
      toast.error("Failed to update trip status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Trip Management</h1>
        <Button onClick={handleOpenTripModal} className="w-full sm:w-auto">
          <PlusIcon />
          <span className="ml-2">Schedule Trip</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 animate-pulse">Loading trips...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Route</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Vehicle</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Departure</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-right">Revenue</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-700">{new Date(trip.date).toLocaleDateString()}</td>
                        <td className="p-4 font-medium text-slate-800">{trip.route.join(' → ')}</td>
                        <td className="p-4 text-slate-700">{vehicles.find(v => v.id === trip.vehicle_id)?.license_plate || 'N/A'}</td>
                        <td className="p-4 text-slate-700">{trip.departureTime}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[trip.status]}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-green-700">{formatCurrency(trip.voucher?.totalRevenue || 0)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {trip.status === TripStatus.Scheduled && <Button size="sm" onClick={() => handleUpdateStatus(trip.id, TripStatus.EnRoute)}>Start</Button>}
                            <Button variant="secondary" size="sm" onClick={() => handleOpenVoucherModal(trip)}>Voucher</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-slate-500">{new Date(trip.date).toLocaleDateString()}</p>
                    <h3 className="font-bold text-slate-800">{trip.route.join(' → ')}</h3>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${STATUS_COLORS[trip.status]}`}>
                    {trip.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Vehicle</p>
                    <p className="font-medium text-slate-700">{vehicles.find(v => v.id === trip.vehicle_id)?.license_plate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Departure</p>
                    <p className="font-medium text-slate-700">{trip.departureTime}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <div>
                    <p className="text-xs text-slate-400">Revenue</p>
                    <p className="font-mono font-bold text-green-700">{formatCurrency(trip.voucher?.totalRevenue || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    {trip.status === TripStatus.Scheduled && <Button size="sm" onClick={() => handleUpdateStatus(trip.id, TripStatus.EnRoute)}>Start</Button>}
                    <Button variant="secondary" size="sm" onClick={() => handleOpenVoucherModal(trip)}>Voucher</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {trips.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>No trips found. Schedule a trip to get started.</p>
            </div>
          )}
        </>
      )}
      <TripFormModal
        isOpen={isTripModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveTrip}
        vehicles={vehicles}
        drivers={drivers}
      />
      {selectedTrip && <VoucherFormModal
        isOpen={isVoucherModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveVoucher}
        trip={selectedTrip}
      />}
    </div>
  );
};


interface TripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Trip, 'id' | 'tenantId' | 'status'>) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
}

const TripFormModal: React.FC<TripFormModalProps> = ({ isOpen, onClose, onSave, vehicles, drivers }) => {
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driverId: '',
    route: [TRIP_TERMINALS[0], TRIP_TERMINALS[1]],
    departureTime: '09:00',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (vehicles.length > 0 && !formData.vehicle_id) {
      setFormData(prev => ({ ...prev, vehicle_id: vehicles[0].id }));
    }
    const availableDrivers = drivers.filter(d => d.status === 'Available');
    if (availableDrivers.length > 0 && !formData.driverId) {
      setFormData(prev => ({ ...prev, driverId: availableDrivers[0].id }));
    }
  }, [vehicles, drivers, isOpen, formData.vehicle_id, formData.driverId]);

  const handleRouteChange = (value: string, index: number) => {
    const newRoute = [...formData.route];
    newRoute[index] = value;
    setFormData(prev => ({ ...prev, route: newRoute }));
  };

  const addStop = () => {
    const newRoute = [...formData.route];
    const lastStop = newRoute[newRoute.length - 1];
    newRoute.splice(newRoute.length - 1, 0, lastStop);
    setFormData(prev => ({ ...prev, route: newRoute }));
  };

  const removeStop = (index: number) => {
    const newRoute = formData.route.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, route: newRoute }));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty or duplicate stops before saving
    const cleanedRoute = formData.route.filter((stop, index, self) => stop && self.indexOf(stop) === index);
    if (cleanedRoute.length < 2) {
      toast.error("A route must have at least an origin and a destination.");
      return;
    }
    onSave({ ...formData, route: cleanedRoute });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={'Schedule New Trip'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
        </div>

        {formData.route.map((stop, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-slate-700">
                {index === 0 ? 'Origin' : index === formData.route.length - 1 ? 'Destination' : `Stop ${index}`}
              </label>
              <select value={stop} onChange={(e) => handleRouteChange(e.target.value, index)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
                {TRIP_TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {formData.route.length > 2 && index > 0 && index < formData.route.length - 1 && (
              <button type="button" onClick={() => removeStop(index)} className="mt-6 p-2 text-red-500 hover:text-red-700 rounded-lg cursor-pointer transition hover:bg-red-50">&times;</button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={addStop}>+ Add Stop</Button>

        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle</label>
          <select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            {vehicles.filter(v => v.status === 'Active').map(v => <option key={v.id} value={v.id}>{v.license_plate} ({v.type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Driver</label>
          <select name="driverId" value={formData.driverId} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            {drivers.filter(d => d.status === 'Available' || d.id === formData.driverId).map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Departure Time</label>
          <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Schedule Trip</Button>
        </div>
      </form>
    </Modal>
  );
};


interface VoucherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripId: string, passengerLogs: PassengerLog[]) => void;
  trip: Trip;
}

const VoucherFormModal: React.FC<VoucherFormModalProps> = ({ isOpen, onClose, onSave, trip }) => {

  const possibleSegments = useMemo(() => {
    const segments: { from: string; to: string; fare: number }[] = [];
    if (!trip) return segments;
    for (let i = 0;i < trip.route.length;i++) {
      for (let j = i + 1;j < trip.route.length;j++) {
        const from = trip.route[i];
        const to = trip.route[j];
        const fare = FARE_MATRIX[from]?.[to] || 0;
        if (fare > 0) {
          segments.push({ from, to, fare });
        }
      }
    }
    return segments;
  }, [trip]);

  const [passengerCounts, setPassengerCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (trip?.voucher) {
      const counts = trip.voucher.passengerLogs.reduce((acc, log) => {
        acc[`${log.from}-${log.to}`] = log.count;
        return acc;
      }, {} as Record<string, number>);
      setPassengerCounts(counts);
    } else {
      setPassengerCounts({});
    }
  }, [trip]);

  const handleCountChange = (from: string, to: string, count: number) => {
    setPassengerCounts(prev => ({ ...prev, [`${from}-${to}`]: Math.max(0, count) }));
  };

  const totalRevenue = useMemo(() => {
    return possibleSegments.reduce((total, segment) => {
      const count = passengerCounts[`${segment.from}-${segment.to}`] || 0;
      return total + (count * segment.fare);
    }, 0);
  }, [passengerCounts, possibleSegments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passengerLogs: PassengerLog[] = possibleSegments
      .map(segment => ({
        from: segment.from,
        to: segment.to,
        count: passengerCounts[`${segment.from}-${segment.to}`] || 0,
        fare: segment.fare,
      }))
      .filter(log => log.count > 0);

    onSave(trip.id, passengerLogs);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Voucher for Trip: ${trip.route.join(' → ')}`}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {possibleSegments.map(({ from, to, fare }) => (
            <div key={`${from}-${to}`} className="grid grid-cols-3 items-center gap-4 p-2 rounded-md bg-slate-50">
              <div className="text-sm font-medium text-slate-800">
                {from} → {to}
                <span className="block text-xs text-slate-500">
                  {formatCurrency(fare)} / seat
                </span>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700">Passengers</label>
                <input
                  type="number"
                  min="0"
                  value={passengerCounts[`${from}-${to}`] || ''}
                  onChange={(e) => handleCountChange(from, to, parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
          {possibleSegments.length === 0 && <p className="text-slate-500 text-center">No valid fare segments for this route.</p>}
        </div>
        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <h4 className="text-lg font-semibold">Total Revenue:</h4>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <Button type="submit">Save Voucher</Button>
        </div>
      </form>
    </Modal>
  )
}

export default TripsView;