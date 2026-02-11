
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Clock, DollarSign } from 'lucide-react';

interface PersonnelStatsProps {
  stats: {
    total_count: number;
    fixed_count: number;
    freelancer_count: number;
    avg_cache: number;
  };
}

export const PersonnelStats: React.FC<PersonnelStatsProps> = ({ stats }) => {
  const { total_count, fixed_count, freelancer_count, avg_cache } = stats;

  const cards = [
    {
      title: 'Total de Pessoas',
      value: total_count,
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-600'
    },
    {
      title: 'Funcionários Fixos',
      value: fixed_count,
      icon: <UserCheck className="w-5 h-5" />,
      color: 'text-green-600'
    },
    {
      title: 'Freelancers',
      value: freelancer_count,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-orange-600'
    },
    {
      title: 'Cachê Médio',
      value: `R$ ${avg_cache.toFixed(0)}`,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((stat, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className={`${stat.color} flex-shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{stat.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
