import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Option {
  value: string
  label: string
}

interface CreatableComboboxProps {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  onCreate: (value: string) => void
  placeholder?: string
  emptyText?: string
  createText?: string
  className?: string
  allowCreate?: boolean
}

export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Selecione...",
  emptyText = "Nenhum resultado.",
  createText = "Criar",
  className,
  allowCreate = true
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const selectedLabel = options.find((opt) => opt.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {value
            ? selectedLabel || value
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCreate && inputValue.trim() ? (
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => {
                      onCreate(inputValue)
                      setOpen(false)
                      setInputValue("")
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createText} "{inputValue}"
                  </Button>
                </div>
              ) : (
                <p className="p-2 text-sm text-muted-foreground">{emptyText}</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
