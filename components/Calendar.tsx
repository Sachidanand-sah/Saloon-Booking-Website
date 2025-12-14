'use client';
import React, { useState } from 'react';

type Props = {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
};

export default function Calendar({ value, onChange, minDate = new Date().toISOString().slice(0, 10) }: Props) {
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  
  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  };

  const isDisabled = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().slice(0, 10);
    return dateStr < minDate;
  };

  const handleSelect = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${year}-${m}-${d}`;
    onChange(dateStr);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm mx-auto md:mx-0">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} type="button" className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-display font-bold text-gray-900 text-lg">
          {monthNames[month]} {year}
        </h3>
        <button onClick={nextMonth} type="button" className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const disabled = isDisabled(day as number);
          const selected = isSelected(day as number);
          
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && handleSelect(day as number)}
              className={`
                h-10 w-10 flex items-center justify-center rounded-full text-sm transition-all duration-200
                ${selected 
                  ? 'bg-pink-600 text-white shadow-md scale-105 font-bold' 
                  : disabled 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-pink-50 hover:text-pink-600 font-medium'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
