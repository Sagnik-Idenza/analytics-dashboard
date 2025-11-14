import React from 'react';

const ChartCard = ({ title, children, loading }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300" style={{padding: '15px'}}>
    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
      {title}
    </h3>
    {loading ? (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    ) : (
      children
    )}
  </div>
);

export default ChartCard;
