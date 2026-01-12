
import React, { useState } from 'react';
import { PersonnelViewToggle } from './PersonnelViewToggle';
import { PersonnelGridView } from './PersonnelGridView';
import { PersonnelListView } from './PersonnelListView';
import { Skeleton } from "@/components/ui/skeleton";
import type { Personnel, Func } from '@/contexts/EnhancedDataContext';

interface PersonnelListProps {
  personnel: Personnel[];
  functions: Func[];
  viewMode: 'grid' | 'list';
  isLoading?: boolean;
  onEdit: (person: Personnel) => void;
  onDelete: (id: string) => Promise<void>;
  canEdit: (person: Personnel) => boolean;
  onRate?: (person: Personnel) => void;
}

export const PersonnelList: React.FC<PersonnelListProps> = ({
  personnel,
  functions,
  viewMode,
  isLoading,
  onEdit,
  onDelete,
  canEdit,
  onRate
}) => {
  if (isLoading) {
    return (
      <div className={viewMode === 'grid' 
        ? "w-full mx-auto px-2 sm:px-3 md:px-4 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
        : "space-y-3"
      }>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`p-4 border rounded-lg ${viewMode === 'grid' ? 'h-[200px]' : 'h-[100px]'}`}>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === 'grid' ? (
        <PersonnelGridView
          personnel={personnel}
          functions={functions}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          onRate={onRate}
        />
      ) : (
        <PersonnelListView
          personnel={personnel}
          functions={functions}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          onRate={onRate}
        />
      )}
    </div>
  );
};
