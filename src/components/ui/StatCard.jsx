import React from 'react';

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300" style={{padding: '15px'}}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
        <Icon className="text-white" size={24} />
      </div>
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
    {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
  </div>
);

export default StatCard;
