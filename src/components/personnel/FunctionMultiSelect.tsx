
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, X, Star, Plus, Trash2 } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useQueryClient } from '@tanstack/react-query';
import { FunctionForm } from '@/components/functions/FunctionForm';
import { functionKeys } from '@/hooks/queries/useFunctionsQuery';
import type { Func } from '@/contexts/EnhancedDataContext';

interface FunctionMultiSelectProps {
  functions: Func[];
  selectedFunctionIds: string[];
  onSelectionChange: (functionIds: string[]) => void;
  placeholder?: string;
  primaryFunctionId?: string;
  onPrimaryChange?: (functionId: string | null) => void;
  functionCaches: Record<string, number>;
  onCacheChange: (functionId: string, value: number | null) => void;
  functionOvertimes: Record<string, number>;
  onOvertimeChange: (functionId: string, value: number | null) => void;
}

export const FunctionMultiSelect: React.FC<FunctionMultiSelectProps> = ({
  functions,
  selectedFunctionIds,
  onSelectionChange,
  placeholder = "Selecione as funções",
  primaryFunctionId,
  onPrimaryChange,
  functionCaches,
  onCacheChange,
  functionOvertimes,
  onOvertimeChange
}) => {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleCacheChange = (functionId: string, value: string | number) => {
    // Convert string to number if needed, or handle empty string as null/0
    const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    onCacheChange(functionId, isNaN(numValue) ? null : numValue);
  };

  const handleOvertimeChange = (functionId: string, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    onOvertimeChange(functionId, isNaN(numValue) ? null : numValue);
  };

  const handleClearCache = (functionId: string) => {
    onCacheChange(functionId, null);
  };

  const handleClearOvertime = (functionId: string) => {
    onOvertimeChange(functionId, null);
  };

  const selectedFunctions = functions.filter(func => 
    selectedFunctionIds.includes(func.id)
  );

  const toggleFunction = (functionId: string) => {
    let next: string[];
    if (selectedFunctionIds.includes(functionId)) {
      next = selectedFunctionIds.filter(id => id !== functionId);
    } else {
      next = [...selectedFunctionIds, functionId];
    }
    
    // Auto-selecionar como primária se for a única função
    if (next.length === 1) {
      onSelectionChange(next);
      onPrimaryChange?.(next[0]);
    }
    // Se removeu a função primária e ainda há outras funções, definir a primeira como primária
    else if (!next.includes(primaryFunctionId || '') && next.length > 0) {
      onSelectionChange(next);
      onPrimaryChange?.(next[0]);
    } else {
      onSelectionChange(next);
      if (next.length === 0) {
        onPrimaryChange?.(null);
      }
    }
  };

  const removeFunction = (functionId: string) => {
    const next = selectedFunctionIds.filter(id => id !== functionId);
    onSelectionChange(next);
    if (!next.includes(primaryFunctionId || '')) {
      onPrimaryChange?.(next.length === 1 ? next[0] : null);
    }
  };

  const setPrimary = (functionId: string) => {
    if (!selectedFunctionIds.includes(functionId)) {
      // ensure selected before setting primary
      toggleFunction(functionId);
    }
    onPrimaryChange?.(functionId);
  };

  const handleCreateSuccess = async (createdFunctionId?: string) => {
    setShowCreateDialog(false);
    
    if (createdFunctionId) {
      // Invalidar query para atualizar lista de funções
      await queryClient.invalidateQueries({ queryKey: functionKeys.all });
      
      // Auto-selecionar função criada após pequeno delay para garantir atualização da lista
      setTimeout(() => {
        toggleFunction(createdFunctionId);
      }, 150);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Funções <span className="text-red-500">*</span></Label>
      
      {/* Selected functions display */}
      {selectedFunctions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/10">
            {selectedFunctions.map(func => (
              <Badge 
                key={func.id} 
                variant={primaryFunctionId === func.id ? "default" : "secondary"}
                className="px-2 py-1 text-sm flex items-center gap-1"
              >
                {primaryFunctionId === func.id && (
                  <Star className="w-3 h-3 fill-current" />
                )}
                {func.name}
                {primaryFunctionId !== func.id && selectedFunctions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrimary(func.id)}
                    title="Definir como principal"
                    className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                  >
                    <Star className="w-3 h-3 text-muted-foreground hover:text-yellow-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeFunction(func.id)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedFunctions.length > 1 && !primaryFunctionId && (
              <span className="text-xs text-amber-600 dark:text-amber-500 self-center">
                ⚠️ Selecione uma função principal
              </span>
            )}
          </div>

          {/* Cachês e Horas Extras Específicos */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Valores por Função (Opcional)
              <span className="text-[10px] font-normal normal-case text-muted-foreground/70">
                Se não definido, usa os valores padrão
              </span>
            </Label>
            <div className="grid gap-2 border rounded-md p-3 bg-muted/5">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 mb-1">
                <div className="col-span-4">Função</div>
                <div className="col-span-4">Cachê</div>
                <div className="col-span-4">Hora Extra</div>
              </div>
              {selectedFunctions.map(func => {
                const hasCustomCache = functionCaches[func.id] !== undefined && functionCaches[func.id] !== null;
                const hasCustomOvertime = functionOvertimes[func.id] !== undefined && functionOvertimes[func.id] !== null;
                
                return (
                  <div key={func.id} className="grid grid-cols-12 gap-2 items-center group">
                    <div className="col-span-4 flex items-center gap-2 overflow-hidden">
                      {primaryFunctionId === func.id && (
                        <Star className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
                      )}
                      <span className="text-sm truncate font-medium" title={func.name}>{func.name}</span>
                    </div>
                    
                    {/* Cache Input */}
                    <div className="col-span-4 flex items-center gap-1">
                      <CurrencyInput
                        value={functionCaches[func.id]}
                        onChange={(val) => handleCacheChange(func.id, val)}
                        placeholder="Padrão"
                        className={`h-8 text-sm ${hasCustomCache ? 'border-primary/50 bg-primary/5' : ''}`}
                      />
                      {hasCustomCache && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => handleClearCache(func.id)}
                          title="Usar cachê padrão"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Overtime Input */}
                    <div className="col-span-4 flex items-center gap-1">
                      <CurrencyInput
                        value={functionOvertimes[func.id]}
                        onChange={(val) => handleOvertimeChange(func.id, val)}
                        placeholder="Padrão"
                        className={`h-8 text-sm ${hasCustomOvertime ? 'border-primary/50 bg-primary/5' : ''}`}
                      />
                      {hasCustomOvertime && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => handleClearOvertime(func.id)}
                          title="Usar hora extra padrão"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Multi-select dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedFunctions.length > 0 
                ? `${selectedFunctions.length} função(ões) selecionada(s)`
                : placeholder
              }
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          {/* Botão Nova Função - sempre visível no topo */}
          <div className="border-b bg-background">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreateDialog(true);
                setOpen(false);
              }}
              className="w-full justify-start gap-2 rounded-none hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Nova Função</span>
            </Button>
          </div>
          
          {/* Command com pesquisa e lista */}
          <Command>
            <CommandInput placeholder="Pesquisar funções..." />
            
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>Nenhuma função encontrada.</CommandEmpty>
              
              <CommandGroup>
                {functions.map((func) => (
                  <CommandItem
                    key={func.id}
                    onSelect={() => toggleFunction(func.id)}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedFunctionIds.includes(func.id)}
                      onChange={() => toggleFunction(func.id)}
                      className="self-center"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{func.name}</div>
                      {func.description && (
                        <div className="text-sm text-muted-foreground">
                          {func.description}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPrimary(func.id); }}
                      title="Definir como principal"
                      className="ml-2 hover:bg-muted rounded-full p-1 transition-colors"
                    >
                      <Star className={`h-4 w-4 ${primaryFunctionId === func.id ? 'text-primary fill-current' : 'text-muted-foreground hover:text-yellow-500'}`} />
                    </button>
                    {selectedFunctionIds.includes(func.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog para criar nova função */}
      {showCreateDialog && (
        <FunctionForm
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};
