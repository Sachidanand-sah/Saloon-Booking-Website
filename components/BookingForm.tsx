'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Service } from '../types';
import TimeSlotSelector from './TimeSlotSelector';
import Button from './ui/Button';
import Input from './ui/Input';
import Calendar from './Calendar';

type Props = {
  service: Service;
  onSubmit: (data: { name: string; email?: string; phone?: string; date: string; time: string }) => void;
  submitting?: boolean;
};

export default function BookingForm({ service, onSubmit, submitting }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const todayISO = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState('');

  const nextStep = () => {
    if (step === 1) {
      if (!date || !time) return alert('Please select a date and time.');
      setStep(2);
    }
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter your name.');
    onSubmit({ name, email, phone, date, time });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 min-h-[600px]">
      <div className="bg-white p-6 md:p-8 border-b border-gray-100 flex items-center gap-6">
         <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-3xl shrink-0">
           💇‍♀️
         </div>
         <div>
           <h2 className="text-xl font-display font-bold text-gray-900">{service.title}</h2>
           <p className="text-gray-500 mt-1 text-sm">{service.durationMins} min • ${service.price}</p>
         </div>
      </div>

      <div className="flex-grow flex flex-col">
        {step === 1 && (
          <div className="flex flex-col md:flex-row h-full">
            <div className="p-6 md:p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Select Date</h3>
              <Calendar value={date} onChange={setDate} minDate={todayISO} />
            </div>

            <div className="p-6 md:p-8 md:w-1/2 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Select Time</h3>
               <div className="flex-grow">
                 {date ? (
                   <TimeSlotSelector selectedDate={date} duration={service.durationMins} value={time} onChange={setTime} />
                 ) : (
                   <p className="text-gray-400 text-sm">Please choose a date first.</p>
                 )}
               </div>
               
               <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                 <Button onClick={nextStep} disabled={!date || !time}>
                   Continue
                 </Button>
               </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 md:max-w-xl mx-auto w-full space-y-6 animate-fade-in">
             <div className="text-center mb-8">
               <h3 className="text-2xl font-display font-bold text-gray-900">Finalize Booking</h3>
               <p className="text-gray-500 mt-2">You are booking for <span className="font-semibold text-gray-900">{date}</span> at <span className="font-semibold text-gray-900">{time}</span>.</p>
             </div>

             {typeof window !== 'undefined' && localStorage.getItem('user') ? (
               <form onSubmit={submitForm} className="space-y-6">
                 <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 mb-6">
                    <p className="text-sm text-pink-700">
                      Logged in as <span className="font-bold">{JSON.parse(localStorage.getItem('user') || '{}').name}</span>
                    </p>
                 </div>
                 
                 <div className="space-y-4 text-left">
                  <Input
                    label="Confirm Your Name"
                    value={name || (JSON.parse(localStorage.getItem('user') || '{}').name)}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={email || (JSON.parse(localStorage.getItem('user') || '{}').email)}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled
                  />
                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                 </div>

                 <div className="flex gap-4 pt-6">
                   <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">
                     Back
                   </Button>
                   <Button type="submit" isLoading={submitting} className="w-2/3">
                     Confirm Appointment
                   </Button>
                 </div>
               </form>
             ) : (
               <div className="text-center py-10 space-y-8">
                 <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <p className="text-gray-600 mb-6">Please sign up or log in to complete your booking. This helps us manage your appointments better.</p>
                   
                   <div className="flex flex-col gap-3">
                     <Link href={`/login?redirect=/book/${service.id}`} className="w-full">
                       <Button className="w-full" variant="primary">Log In</Button>
                     </Link>
                     <Link href={`/signup?redirect=/book/${service.id}`} className="w-full">
                       <Button className="w-full" variant="outline">Sign Up</Button>
                     </Link>
                   </div>
                 </div>
                 
                 <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    ← Back to Date Selection
                 </Button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
