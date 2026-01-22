import React, { useEffect, useState, useMemo } from 'react';
import { getTrips, getVehicles, createTrip, updateTripStatus, generateVoucher } from '../services/api';
import { Trip, TripStatus, Vehicle, PassengerLog } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons';
import { STATUS_COLORS, TRIP_TERMINALS, FARE_MATRIX, formatCurrency } from '../constants';

const TripsView: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const [tripsData, vehiclesData] = await Promise.all([getTrips(), getVehicles()]);
      setTrips(tripsData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setVehicles(vehiclesData);
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
  
  const handleSaveTrip = async (formData: Omit<Trip, 'tripId' | 'tenantId' | 'status'>) => {
    await createTrip(formData);
    fetchTrips();
    handleCloseModals();
  };
  
  const handleSaveVoucher = async (tripId: string, passengerLogs: PassengerLog[]) => {
    await generateVoucher(tripId, passengerLogs);
    fetchTrips();
    handleCloseModals();
  };

  const handleUpdateStatus = async (tripId: string, status: TripStatus) => {
    await updateTripStatus(tripId, status);
    fetchTrips();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Trip Management</h1>
        <Button onClick={handleOpenTripModal}>
          <PlusIcon />
          <span className="ml-2">Schedule Trip</span>
        </Button>
      </div>
      {loading ? (
        <p>Loading trips...</p>
      ) : (
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
                  <tr key={trip.tripId}>
                    <td className="p-4 text-slate-700">{new Date(trip.date).toLocaleDateString()}</td>
                    <td className="p-4 font-medium text-slate-800">{trip.route.join(' → ')}</td>
                    <td className="p-4 text-slate-700">{vehicles.find(v => v.vehicleId === trip.vehicleId)?.licensePlate || 'N/A'}</td>
                    <td className="p-4 text-slate-700">{trip.departureTime}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[trip.status]}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-green-700">{formatCurrency(trip.voucher?.totalRevenue || 0)}</td>
                    <td className="p-4 space-x-2">
                      {trip.status === TripStatus.Scheduled && <Button size="sm" onClick={() => handleUpdateStatus(trip.tripId, TripStatus.EnRoute)}>Start</Button>}
                      <Button variant="secondary" size="sm" onClick={() => handleOpenVoucherModal(trip)}>Voucher</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <TripFormModal
        isOpen={isTripModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveTrip}
        vehicles={vehicles}
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
  onSave: (data: any) => void;
  vehicles: Vehicle[];
}

const TripFormModal: React.FC<TripFormModalProps> = ({ isOpen, onClose, onSave, vehicles }) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: 'd-temp-01',
    route: [TRIP_TERMINALS[0], TRIP_TERMINALS[1]],
    departureTime: '09:00',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (vehicles.length > 0 && !formData.vehicleId) {
      setFormData(prev => ({ ...prev, vehicleId: vehicles[0].vehicleId }));
    }
  }, [vehicles, isOpen, formData.vehicleId]);
  
  const handleRouteChange = (value: string, index: number) => {
    const newRoute = [...formData.route];
    newRoute[index] = value;
    setFormData(prev => ({...prev, route: newRoute}));
  };

  const addStop = () => {
    const newRoute = [...formData.route];
    const lastStop = newRoute[newRoute.length - 1];
    newRoute.splice(newRoute.length - 1, 0, lastStop);
    setFormData(prev => ({...prev, route: newRoute}));
  };
  
  const removeStop = (index: number) => {
    const newRoute = formData.route.filter((_, i) => i !== index);
    setFormData(prev => ({...prev, route: newRoute}));
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
      alert("A route must have at least an origin and a destination.");
      return;
    }
    onSave({...formData, route: cleanedRoute});
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
                <button type="button" onClick={() => removeStop(index)} className="mt-6 p-2 text-red-500 hover:text-red-700">&times;</button>
            )}
          </div>
        ))}
         <Button type="button" variant="secondary" size="sm" onClick={addStop}>+ Add Stop</Button>
       
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle</label>
          <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            {vehicles.filter(v => v.status === 'Active').map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.licensePlate} ({v.type})</option>)}
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
        const segments: {from: string; to: string; fare: number}[] = [];
        if (!trip) return segments;
        for (let i = 0; i < trip.route.length; i++) {
            for (let j = i + 1; j < trip.route.length; j++) {
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
        setPassengerCounts(prev => ({...prev, [`${from}-${to}`]: Math.max(0, count)}));
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
        
        onSave(trip.tripId, passengerLogs);
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