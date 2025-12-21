'use client';
import React, { useEffect, useState } from 'react';
import { loadAppointments, deleteAppointment, updateAppointment, saveAppointments } from '../../lib/storage';
import { Appointment } from '../../types';
import AdminAppointmentCard from '../../components/AdminAppointmentCard';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const ADMIN_PASSWORD = 'admin123'; 

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [appts, setAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    if (loggedIn) {
      setAppts(loadAppointments().sort((a,b)=> a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
    }
  }, [loggedIn]);

  function attemptLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setPassword('');
    } else {
      alert('Invalid password.');
    }
  }

  function refresh() {
    setAppts(loadAppointments());
  }

  function changeStatus(id: string, status: Appointment['status']) {
    const list = loadAppointments();
    const found = list.find(a => a.id === id);
    if (!found) return;
    found.status = status;
    saveAppointments(list);
    refresh();
  }

  function remove(id: string) {
    if (!confirm('Delete appointment?')) return;
    deleteAppointment(id);
    refresh();
  }

  if (!loggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center mb-6">
             <h2 className="text-2xl font-display font-bold text-gray-900">Admin Portal</h2>
             <p className="text-sm text-gray-500 mt-2">Please verify your identity to continue.</p>
          </div>
          
          <form onSubmit={attemptLogin} className="space-y-6">
            <Input 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              placeholder="Enter password" 
              label="Password"
              className="bg-gray-50"
            />
            <Button type="submit" className="w-full" size="lg">Login to Dashboard</Button>
            <p className="text-xs text-center text-gray-500 mt-4">
              Demo Access: <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">admin123</span>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage valid appointments • {appts.length} total</p>
        </div>
        <Button variant="outline" onClick={()=>{ setLoggedIn(false); setAppts([]); }}>
          Sign Out
        </Button>
      </div>

      <div className="space-y-4">
        {appts.length === 0 && (
          <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-dashed border-gray-200">
             <div className="text-4xl mb-4">📅</div>
             <p className="text-gray-500 font-medium">No appointments found.</p>
             <p className="text-sm text-gray-400 mt-1">New bookings will appear here instantly.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          {appts.map(a => (
            <div key={a.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
               <AdminAppointmentCard
                 appointment={a}
                 onDelete={() => remove(a.id)}
                 onStatusChange={(st) => changeStatus(a.id, st)}
               />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
