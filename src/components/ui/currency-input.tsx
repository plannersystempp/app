import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  maxDecimals?: number;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, placeholder = "R$ 0,00", maxDecimals = 2, ...props }, ref) => {
    
    // Format number to currency display
    const formatToCurrency = React.useCallback((num: number): string => {
      if (isNaN(num)) return maxDecimals === 2 ? "R$ 0,00" : `R$ ${(0).toFixed(maxDecimals)}`;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals
      }).format(num);
    }, [maxDecimals]);

    // Convert digits-only string to number
    const digitsToNumber = React.useCallback((str: string): number => {
      const onlyDigits = str.replace(/\D/g, "");
      if (!onlyDigits) return 0;
      const divisor = Math.pow(10, maxDecimals);
      const asNumber = parseFloat((parseInt(onlyDigits, 10) / divisor).toFixed(maxDecimals));
      return isNaN(asNumber) ? 0 : asNumber;
    }, [maxDecimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Extract digits and compute numeric value as cents
      const numericValue = digitsToNumber(inputValue);

      onChange(numericValue);
    };

    // Calculate display value directly from props to avoid sync issues
    const displayValue = formatToCurrency(value ?? 0);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
