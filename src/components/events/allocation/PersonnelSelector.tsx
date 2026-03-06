
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronDown } from 'lucide-react';
import { type Personnel, type Func } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { PersonnelForm } from '@/components/personnel/PersonnelForm';

import { useMomentumScroll } from '@/hooks/useMomentumScroll';

interface PersonnelSelectorProps {
  personnel: Personnel[];
  functions: Func[];
  selectedPersonnel: string;
  selectedFunction: string;
  onPersonnelChange: (personnelId: string) => void;
  onFunctionChange: (functionName: string) => void;
}

export const PersonnelSelector: React.FC<PersonnelSelectorProps> = ({
  personnel,
  functions,
  selectedPersonnel,
  selectedFunction,
  onPersonnelChange,
  onFunctionChange
}) => {
  // Get available functions for selected personnel
  const selectedPerson = personnel.find(p => p.id === selectedPersonnel);
  const availableFunctions = selectedPerson?.functions || functions;
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [functionFilter, setFunctionFilter] = useState<string>('');
  const { userRole } = useTeam();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  
  const listRef = React.useRef<HTMLDivElement>(null);
  useMomentumScroll(listRef);

  const handlePersonnelChange = (personnelId: string) => {
    onPersonnelChange(personnelId);
    if (functionFilter) {
      onFunctionChange(functionFilter);
    } else {
      onFunctionChange('');
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="function-filter">Filtrar por função (opcional)</Label>
        <Select value={functionFilter} onValueChange={(value) => { setFunctionFilter(value); onFunctionChange(value); }}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma função para filtrar" />
          </SelectTrigger>
          <SelectContent>
            {functions.map((func) => (
              <SelectItem key={func.id} value={func.name}>
                {func.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="personnel">Pessoa <span className="text-red-500">*</span></Label>
        {/* Combobox com busca para Pessoa */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <span className="truncate">
                {selectedPerson?.name || 'Selecione uma pessoa'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[700px] max-w-[calc(100vw-2rem)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Pesquisar por nome ou email..." className="h-10" />
              <CommandList ref={listRef} className="max-h-[500px] md:max-h-[600px] overflow-y-auto">
                {isAdmin && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setShowCreateForm(true)
                        setOpen(false)
                      }}
                    >
                      + Cadastrar nova pessoa
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandEmpty>
                  <div className="p-3 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Nenhuma pessoa encontrada.</p>
                    {isAdmin && (
                      <Button size="sm" onClick={() => { setShowCreateForm(true); setOpen(false); }} className="h-8">
                        Cadastrar Pessoa
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {personnel
                    .filter((p) => {
                      if (!functionFilter) return true;
                      const funcs = (p.functions && p.functions.length > 0) ? p.functions : functions;
                      return funcs.some((f) => f.name === functionFilter);
                    })
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((person) => (
                      <CommandItem
                        key={person.id}
                        value={`${person.name} ${person.email || ''}`}
                        onSelect={() => {
                          handlePersonnelChange(person.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="text-sm font-medium truncate max-w-[45%]">{person.name}</span>
                          {person.email && (
                            <span className="text-xs text-muted-foreground truncate max-w-[50%]">{person.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {showCreateForm && (
        <PersonnelForm
          personnel={undefined}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            setOpen(false);
          }}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="function">Função <span className="text-red-500">*</span></Label>
        <Select value={selectedFunction} onValueChange={onFunctionChange} disabled={!selectedPersonnel}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma função" />
          </SelectTrigger>
          <SelectContent>
            {availableFunctions.map((func) => (
              <SelectItem key={func.id} value={func.name}>
                {func.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
