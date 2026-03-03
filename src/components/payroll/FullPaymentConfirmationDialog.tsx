import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/utils/formatters";
import { DollarSign, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FullPaymentConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    personName: string;
    amount: number;
    onConfirm: (notes?: string) => void;
    loading: boolean;
}

export const FullPaymentConfirmationDialog: React.FC<FullPaymentConfirmationDialogProps> = ({
    open,
    onOpenChange,
    personName,
    amount,
    onConfirm,
    loading
}) => {
    const [notes, setNotes] = React.useState('');

    const handleConfirm = () => {
        onConfirm(notes);
        setNotes('');
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Registrar Pagamento Integral
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Você está confirmando o pagamento total para <strong>{personName}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700 font-medium">Valor a ser registrado</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(amount)}</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded-full">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="full-payment-notes" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Observações (Opcional)
                        </Label>
                        <Textarea
                            id="full-payment-notes"
                            placeholder="Ex: Pagamento realizado via PIX..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>
                            Esta ação registrará o pagamento como concluído e atualizará o saldo pendente deste profissional para zero nesta folha.
                        </p>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {loading ? "Registrando..." : "Confirmar Pagamento"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
