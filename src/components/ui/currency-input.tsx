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
    const isFocusedRef = React.useRef(false);

    const formatPlain = React.useCallback(
      (num: number): string => {
        if (!isFinite(num)) return "0";
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: maxDecimals,
          maximumFractionDigits: maxDecimals,
        }).format(num);
      },
      [maxDecimals]
    );

    const formatToCurrency = React.useCallback(
      (num: number): string => {
        if (!isFinite(num)) return placeholder;
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: maxDecimals,
          maximumFractionDigits: maxDecimals,
        }).format(num);
      },
      [maxDecimals, placeholder]
    );

    const parseTextToNumber = React.useCallback((text: string): number => {
      if (!text) return 0;
      const normalized = text
        .replace(/\s/g, '')
        .replace(/R\$\s?/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
      const n = parseFloat(normalized);
      return isFinite(n) ? parseFloat(n.toFixed(maxDecimals)) : 0;
    }, [maxDecimals]);

    const [inputText, setInputText] = React.useState<string>(formatToCurrency(value ?? 0));

    React.useEffect(() => {
      if (isFocusedRef.current) return;
      setInputText(formatToCurrency(value ?? 0));
    }, [value, formatToCurrency]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      const sanitized = text.replace(/[^0-9.,\sR$]/g, '');
      setInputText(sanitized);
      onChange(parseTextToNumber(sanitized));
    };

    const handleFocus = () => {
      isFocusedRef.current = true;
      setInputText(formatPlain(value ?? 0));
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      const num = parseTextToNumber(inputText);
      setInputText(formatToCurrency(num));
      onChange(num);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={inputText}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
