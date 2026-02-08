import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trip, Vehicle, Professional, ProfessionalType, SystemSettings } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Printer, Calendar, RefreshCw, CalendarDays, Download, Fuel, Gauge } from 'lucide-react';
import { TripTicket } from '../components/TripTicket';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Relatorios = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Professional[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [reportTitle, setReportTitle] = useState('Relatório Geral');
  const [selectedTripForTicket, setSelectedTripForTicket] = useState<Trip | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, vData, pData, sData] = await Promise.all([
        api.trips.list(),
        api.vehicles.list(),
        api.professionals.list(),
        api.settings.get()
      ]);
      setTrips(tData);
      setVehicles(vData);
      setDrivers(pData.filter(p => p.type === ProfessionalType.MOTORISTA));
      setSettings(sData);
      setMonthFilter();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const setWeekFilter = () => {
      const today = new Date();
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay()); 
      const lastDay = new Date(today);
      lastDay.setDate(today.getDate() + 6 - today.getDay()); 
      setDateStart(firstDay.toISOString().split('T')[0]);
      setDateEnd(lastDay.toISOString().split('T')[0]);
      setReportTitle('RELATÓRIO SEMANAL DE FROTAS');
  };

  const setMonthFilter = () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateStart(firstDay.toISOString().split('T')[0]);
      setDateEnd(lastDay.toISOString().split('T')[0]);
      setReportTitle('RELATÓRIO MENSAL DE FROTAS');
  };

  const filteredTrips = trips.filter(t => {
      const tripDate = new Date(t.dateOut);
      const start = dateStart ? new Date(dateStart) : null;
      const end = dateEnd ? new Date(dateEnd) : null;
      if (start) start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);
      const dateMatch = (!start || tripDate >= start) && (!end || tripDate <= end);
      const vehicleMatch = !selectedVehicleId || t.vehicleId === selectedVehicleId;
      const driverMatch = !selectedDriverName || t.driverName === selectedDriverName;
      return dateMatch && vehicleMatch && driverMatch;
  });

  const totalTrips = filteredTrips.length;
  const totalKm = filteredTrips.reduce((acc, t) => (t.kmIn && t.kmOut) ? acc + (t.kmIn - t.kmOut) : acc, 0);
  const totalLiters = filteredTrips.reduce((acc, t) => acc + (t.fuelLiters || 0), 0);
  const avgConsumption = totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : '0.00';

  const handleDownloadPDF = () => {
      const doc = new jsPDF('l', 'mm', 'a4'); 
      let startY = 20;
      if (settings?.logoBase64) {
          try { doc.addImage(settings.logoBase64, 'PNG', 14, 10, 20, 20); startY = 40; } catch (e) {}
      }
      doc.setFontSize(16);
      doc.text(reportTitle.toUpperCase(), 14, startY);
      autoTable(doc, {
          startY: startY + 10,
          head: [["Data", "Veículo", "Condutor", "KM", "Liters", "Consumo"]],
          body: filteredTrips.map(t => [
            new Date(t.dateOut).toLocaleDateString(),
            t.vehicleSnapshot,
            t.driverName,
            t.kmIn ? t.kmIn - t.kmOut : '-',
            t.fuelLiters || '-',
            (t.fuelLiters && t.kmIn) ? ((t.kmIn - t.kmOut) / t.fuelLiters).toFixed(2) : '-'
          ])
      });
      doc.save(`relatorio_frotapro_${Date.now()}.pdf`);
  };

  if (loading) return <div className="text-center py-10"><RefreshCw className="animate-spin h-8 w-8 mx-auto text-gray-400"/></div>;

  return (
    <div className="space-y-6">
      {selectedTripForTicket && <TripTicket trip={selectedTripForTicket} onClose={() => setSelectedTripForTicket(null)} />}
      <div className="flex justify-between items-center print:hidden">
        <div><h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1></div>
        <div className="flex space-x-2">
            <button onClick={handleDownloadPDF} className="bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 flex items-center shadow-sm"><Download className="mr-2 h-4 w-4" /> PDF</button>
            <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center shadow-sm"><Printer className="mr-2 h-4 w-4" /> Imprimir</button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 print:hidden space-y-4">
          <div className="flex space-x-2">
                <button onClick={setWeekFilter} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium">Semanal</button>
                <button onClick={setMonthFilter} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium">Mensal</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="border p-2 rounded text-sm bg-white text-black" />
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="border p-2 rounded text-sm bg-white text-black" />
              <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} className="border p-2 rounded text-sm bg-white text-black">
                  <option value="">Todos os Veículos</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
              </select>
          </div>
      </div>
      <div className="bg-white shadow overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">Veículo</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">Condutor</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase">KM</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase">Ações</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
                      <tr key={trip.id}>
                          <td className="px-4 py-3">{new Date(trip.dateOut).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">{trip.vehicleSnapshot}</td>
                          <td className="px-4 py-3">{trip.driverName}</td>
                          <td className="px-4 py-3 text-center">{trip.kmIn ? trip.kmIn - trip.kmOut : '-'}</td>
                          <td className="px-4 py-3 text-center print:hidden">
                              <button onClick={() => setSelectedTripForTicket(trip)} className="text-brand-600 hover:text-brand-900"><FileText size={16} /></button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};