import React from 'react';
import { Search, Users, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Personnel, type Func } from '@/contexts/EnhancedDataContext';
import { useMultipleSelection, type SelectedPerson } from '@/hooks/useMultipleSelection';
import { useTeam } from '@/contexts/TeamContext';
import { PersonnelForm } from '@/components/personnel/PersonnelForm';
interface MultiPersonnelSelectorProps {
  personnel: Personnel[];
  functions: Func[];
  value: SelectedPerson[];
  onChange: (selected: SelectedPerson[]) => void;
}
export const MultiPersonnelSelector: React.FC<MultiPersonnelSelectorProps> = ({
  personnel,
  functions,
  value,
  onChange
}) => {
  const {
    selectedPersonnel,
    searchQuery,
    setSearchQuery,
    selectAll,
    filteredPersonnel,
    isPersonSelected,
    togglePersonSelection,
    updatePersonFunction,
    toggleSelectAll,
    clearSelections,
    selectedCount
  } = useMultipleSelection(personnel, functions);
  const { userRole } = useTeam();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [functionFilter, setFunctionFilter] = React.useState<string>('');
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    if (showCreateForm) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showCreateForm]);

  // Sync with external value
  React.useEffect(() => {
    onChange(selectedPersonnel);
  }, [selectedPersonnel, onChange]);

  // Get available functions for a person
  const getAvailableFunctions = (person: Personnel) => {
    return person.functions?.length > 0 ? person.functions : functions;
  };
  const blocked = showCreateForm;
  return <div className="space-y-4 relative">
      {/* Search and Controls */}
      <div className="space-y-2 md:space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm md:text-base font-medium">Selecionar Pessoal</Label>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="h-8 md:h-9 px-2 md:px-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                Cadastrar Pessoa
              </Button>
            )}
            <Badge variant="secondary" className="text-xs md:text-sm">
              {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        
        <div className={`flex flex-col gap-2 ${blocked ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" />
          </div>
          <div className="w-full">
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Filtrar por função" />
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="whitespace-nowrap text-xs px-3 h-9">
              {selectAll ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
            {selectedCount > 0 && <Button variant="ghost" size="sm" onClick={clearSelections} className="text-destructive hover:text-destructive h-9 w-9 p-0">
                <X className="h-4 w-4" />
              </Button>}
          </div>
        </div>
      </div>

      {/* Personnel List */}
      <ScrollArea className={`h-[60vh] md:h-[400px] w-full border rounded-md overflow-x-hidden ${blocked ? 'pointer-events-none opacity-50' : ''}`}>
        <div className="px-2 md:px-4 py-2 md:py-4 space-y-2 md:space-y-3">
          {(filteredPersonnel
            .filter(p => {
              if (!functionFilter) return true;
              const funcs = p.functions?.length ? p.functions : functions;
              return funcs.some(f => f.name === functionFilter);
            })
          ).length === 0 ? <div className="text-center py-6 md:py-8 space-y-2">
              <Users className="h-6 md:h-8 w-6 md:w-8 text-muted-foreground mx-auto" />
              <p className="text-xs md:text-sm text-muted-foreground">
                {searchQuery ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa disponível'}
              </p>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowCreateForm(true)} className="h-8">
                  Cadastrar Pessoa
                </Button>
              )}
            </div> : filteredPersonnel
            .filter(p => {
              if (!functionFilter) return true;
              const funcs = p.functions?.length ? p.functions : functions;
              return funcs.some(f => f.name === functionFilter);
            })
            .map(person => {
          const isSelected = isPersonSelected(person.id);
          const selectedPerson = selectedPersonnel.find(sp => sp.personnel.id === person.id);
          const availableFunctions = getAvailableFunctions(person);
          const hasOnlyOneFunction = availableFunctions.length === 1;
          return <Card key={person.id} className={`transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <CardContent className="p-2 md:p-4">
                    {/* Person Header */}
                    <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => { 
                        const wasSelected = isSelected;
                        togglePersonSelection(person);
                        if (!wasSelected && functionFilter) {
                          updatePersonFunction(person.id, functionFilter);
                        }
                      }} className="mt-0.5 md:mt-1 my-0 aspect-square self-center h-5 w-5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {person.name}
                          </h4>
                          <Badge variant={person.type === 'fixo' ? 'default' : 'secondary'} className="text-sm">
                            {person.type === 'fixo' ? 'Fixo' : 'Freelancer'}
                          </Badge>
      </div>
                        {/* Person Details */}
                        <div className="space-y-0.5 md:space-y-1 text-sm text-muted-foreground">
                          {person.email && <div className="truncate">{person.email}</div>}
                        </div>

                        {/* Functions */}
                        <div className="mt-1 md:mt-2">
                          <div className="text-sm text-muted-foreground mb-1">
                            {availableFunctions.length > 1 ? 'Funções disponíveis:' : 'Função disponível:'}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {availableFunctions.slice(0, 3).map(func => <Badge key={func.id} variant="outline" className="text-sm">
                                {func.name}
                                {person.primaryFunctionId === func.id && <span className="ml-1 text-primary">★</span>}
                              </Badge>)}
                            {availableFunctions.length > 3 && <Badge variant="outline" className="text-sm">
                                +{availableFunctions.length - 3}
                              </Badge>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Function Selection */}
                    {isSelected && !hasOnlyOneFunction && <div className="border-t pt-2 md:pt-3 mt-2 md:mt-3">
                        <Label className="text-sm text-muted-foreground">
                          Função para este evento <span className="text-destructive">*</span>
                        </Label>
                        <Select value={selectedPerson?.selectedFunction || ''} onValueChange={functionName => updatePersonFunction(person.id, functionName)}>
                          <SelectTrigger className="min-h-[44px] h-11 text-sm mt-1">
                            <SelectValue placeholder="Selecione uma função" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFunctions.map(func => <SelectItem key={func.id} value={func.name} className="text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{func.name}</span>
                                  {person.primaryFunctionId === func.id && <Badge variant="outline" className="text-xs px-1">Principal</Badge>}
                                </div>
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>}

                    {/* Show selected function when only one function available */}
                    {isSelected && hasOnlyOneFunction && <div className="border-t pt-2 md:pt-3 mt-2 md:mt-3">
                        <Label className="text-xs text-muted-foreground">
                          Função para este evento
                        </Label>
                        <div className="mt-1">
                          <Badge className="text-xs">
                            {availableFunctions[0].name}
                            {person.functions?.some(pf => pf.id === availableFunctions[0].id) && <span className="ml-1">★</span>}
                          </Badge>
                        </div>
                      </div>}
                  </CardContent>
                </Card>;
        })}
        </div>
      </ScrollArea>

      {/* Summary */}
      {selectedCount > 0 && <div className={`bg-muted/30 rounded-lg p-2 md:p-3 ${blocked ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span className="font-medium">
              {selectedCount} pessoa{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelections} className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
              Limpar seleção
            </Button>
          </div>
        </div>}
      {showCreateForm && (
        <PersonnelForm
          personnel={undefined}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
      {blocked && <div className="absolute inset-0 z-10"></div>}
    </div>;
};
