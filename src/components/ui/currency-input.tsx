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
  ({ className, value, onChange, placeholder = "R$ 0,00", maxDecimals = 2, ...props }, forwardedRef) => {
    const localRef = React.useRef<HTMLInputElement>(null);
    
    // Combinar refs para permitir que o pai acesse a ref se necessário
    React.useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement);

    const formatToCurrency = React.useCallback((num: number): string => {
      if (isNaN(num)) return maxDecimals === 2 ? "R$ 0,00" : `R$ ${(0).toFixed(maxDecimals)}`;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals
      }).format(num);
    }, [maxDecimals]);

    const digitsToNumber = React.useCallback((str: string): number => {
      const onlyDigits = str.replace(/\D/g, "");
      if (!onlyDigits) return 0;
      const divisor = Math.pow(10, maxDecimals);
      const asNumber = parseFloat((parseInt(onlyDigits, 10) / divisor).toFixed(maxDecimals));
      return isNaN(asNumber) ? 0 : asNumber;
    }, [maxDecimals]);

    // Estado local para garantir feedback imediato e estável
    const [displayValue, setDisplayValue] = React.useState(formatToCurrency(value));

    // Sincronizar com props externas, evitando loops desnecessários
    React.useEffect(() => {
      const formatted = formatToCurrency(value);
      if (formatted !== displayValue) {
        setDisplayValue(formatted);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, formatToCurrency]); 

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numericValue = digitsToNumber(inputValue);
      const newDisplayValue = formatToCurrency(numericValue);

      // Atualiza estado local imediatamente para feedback visual
      setDisplayValue(newDisplayValue);
      // Propaga o valor numérico para o pai
      onChange(numericValue);
    };

    // Força o cursor para o final do input sempre que o valor muda, garantindo comportamento estilo ATM
    React.useLayoutEffect(() => {
      if (localRef.current && document.activeElement === localRef.current) {
        const len = localRef.current.value.length;
        localRef.current.setSelectionRange(len, len);
      }
    }, [displayValue]);

    return (
      <Input
        {...props}
        ref={localRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(className)}
        // Ao focar, seleciona tudo para facilitar substituição completa se desejado
        onFocus={(e) => {
          e.target.select();
          props.onFocus?.(e);
        }}
        // Garante que o clique não desposicione o cursor do final (opcional, mas ajuda na UX de ATM)
        onClick={(e) => {
           if (localRef.current) {
             const len = localRef.current.value.length;
             localRef.current.setSelectionRange(len, len);
           }
           props.onClick?.(e);
        }}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
