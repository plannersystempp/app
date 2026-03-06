import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { formatDateShort } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { GroupedEventCosts } from '@/utils/supplierCostAggregations';
import { isBefore, isSameDay, startOfDay, parseISO, isValid, getYear } from 'date-fns';

type Status = 'todos' | 'pendente' | 'pago';

type Props = {
  groups: GroupedEventCosts[];
  status: Status;
  onStatusChange: (s: Status) => void;
  onNavigate: (eventId: string) => void;
};

export const SupplierCostsByEvent = ({ groups, status, onStatusChange, onNavigate }: Props) => {
  return (
    <div className="mt-3">
      <div className="mb-2">
        <FilterChips
          label="Status"
          options={['todos','pendente','pago'] as const}
          value={status}
          onChange={onStatusChange}
          showActiveIcon
          activeVariant="outline"
        />
      </div>
      <Accordion type="single" collapsible>
        {groups.slice(0, 10).map(g => (
          <AccordionItem key={g.eventId} value={g.eventId}>
            <AccordionTrigger className={g.totals.pendingAmount > 0 ? 'text-red-700 dark:text-red-400 font-semibold' : ''}>
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{g.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.start_date ? formatDateShort(typeof g.start_date === 'string' ? g.start_date : g.start_date.toISOString()) : '-'}
                    {' '}–{' '}
                    {g.end_date ? formatDateShort(typeof g.end_date === 'string' ? g.end_date : g.end_date.toISOString()) : '-'}
                  </div>
                </div>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300">
                  {formatCurrency(g.totals.pendingAmount)}
                </Badge>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300">
                  {formatCurrency(g.totals.paidAmount)}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {g.items.map(item => {
                  const qty = Number(item.quantity) || 0;
                  const unit = Number(item.unit_price) || 0;
                  const total = Number(item.total_amount) || (qty * unit) || 0;
                  const paid = Number(item.paid_amount) || 0;
                  const isPaid = (item.payment_status || '').toLowerCase() === 'paid';
                  
                  // Lógica de status de data
                  const today = startOfDay(new Date());
                  const paymentDate = item.payment_date 
                    ? (item.payment_date instanceof Date ? item.payment_date : parseISO(item.payment_date)) 
                    : null;
                  
                  // Validação robusta
                  const isValidDate = paymentDate && isValid(paymentDate) && getYear(paymentDate) >= 2000;
                  
                  const isOverdue = !isPaid && isValidDate ? isBefore(paymentDate!, today) : false;
                  const isDueToday = !isPaid && isValidDate ? isSameDay(paymentDate!, today) : false;
                  
                  // Se for overdue ou dueToday, destacamos o card
                  const isCritical = isOverdue || isDueToday;

                  return (
                    <div key={item.id} className={`flex items-center justify-between p-3 border rounded-lg bg-card ${isCritical ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.supplier_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {qty} × {formatCurrency(unit)} = {formatCurrency(total)}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground mt-0.5">
                          {isValidDate ? `Vencimento: ${formatDateShort(paymentDate!)}` : 'Sem data de vencimento'}
                        </div>
                        <div className="text-xs">
                          {isPaid ? `Pago: ${formatCurrency(paid)}` : `Pendente: ${formatCurrency(Math.max(total - paid, 0))}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Pago</Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive">Atrasado</Badge>
                        ) : isDueToday ? (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 border">Vence Hoje</Badge>
                        ) : isValidDate ? (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 border">Agendado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onNavigate(g.eventId)}>Ir para o evento</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {groups.length > 10 && (
        <div className="mt-2 text-xs text-muted-foreground">Mostrando 10 eventos com maior pendência. Ajuste o período ou status para ver outros.</div>
      )}
    </div>
  );
};

export default SupplierCostsByEvent;
