
import React from 'react';
import { Deal, PriceDataPoint } from '../types';
import { XCircleIcon, ChartBarIcon } from './icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriceHistoryModalProps {
  deal: Deal | null;
  priceHistory: PriceDataPoint[];
  onClose: () => void;
}

const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({ deal, priceHistory, onClose }) => {
  const prediction = React.useMemo(() => {
    if (!deal) return "";
    const randomVal = deal.id.length % 2 === 0 ? 0.6 : 0.4;
    return randomVal > 0.5
      ? " likely to remain stable in the short term."
      : " showing good value. Consider purchasing soon if interested.";
  }, [deal]);

  if (!deal) return null;

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl transform transition-all duration-300 scale-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <ChartBarIcon className="w-7 h-7 mr-2 text-indigo-600" /> Price History: {deal.title}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircleIcon className="w-7 h-7" />
          </button>
        </div>

        {priceHistory.length > 0 ? (
          <div className="h-72 w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#4B5563" />
                <YAxis stroke="#4B5563" tickFormatter={formatCurrency} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Price"]} />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">Price history data is not available for this item.</p>
        )}

        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-indigo-700">
            <strong>AI Prediction:</strong> Based on current trends, the price for "{deal.title}" is 
            {prediction}
          </p>
          <p className="text-xs text-indigo-500 mt-1">(Note: This is a simulated prediction for demonstration purposes.)</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PriceHistoryModal;