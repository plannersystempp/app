
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CostChartProps {
  data: Array<{
    name: string;
    baseCost: number;
    overtimeCost: number;
    totalCost: number;
    date: string;
  }>;
}

export const CostChart: React.FC<CostChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTooltip = (value: number, name: string) => {
    const labels: { [key: string]: string } = {
      baseCost: 'Cachês',
      overtimeCost: 'Horas Extras',
      supplierCost: 'Fornecedores'
    };
    return [formatCurrency(value), labels[name] || name];
  };

  const formatLabel = (label: string) => {
    // Truncate long event names for better display
    return label.length > 12 ? label.substring(0, 12) + '...' : label;
  };

  return (
    <div className="w-full h-[240px] sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 12,
            right: 8,
            left: 8,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            fontSize={9}
            tickFormatter={formatLabel}
            tick={{ fontSize: 9 }}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value)}
            fontSize={9}
            tick={{ fontSize: 9 }}
            width={68}
          />
          <Tooltip 
            formatter={formatTooltip}
            labelStyle={{ color: '#000', fontSize: '12px' }}
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '11px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
          />
          <Bar 
            dataKey="baseCost" 
            fill="#3b82f6" 
            name="Cachês"
            radius={[4, 4, 4, 4]}
            stackId="a"
          />
          <Bar 
            dataKey="overtimeCost" 
            fill="#f97316" 
            name="Horas Extras"
            radius={[4, 4, 4, 4]}
            stackId="a"
          />
          <Bar 
            dataKey="supplierCost" 
            fill="#ec4899" 
            name="Fornecedores"
            radius={[4, 4, 4, 4]}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
