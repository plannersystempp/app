/**
 * Event validation schemas using Zod
 * Validações para formulário de criação/edição de eventos
 */

import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Nome é obrigatório"),
  
  description: z.string()
    .optional()
    .or(z.literal('')),
  
  location: z.string()
    .optional()
    .or(z.literal('')),
  
  client_contact_phone: z.string()
    .optional()
    .or(z.literal('')),
  
  start_date: z.string()
    .min(1, "Data de início é obrigatória"),
  
  end_date: z.string()
    .min(1, "Data de fim é obrigatória"),
  
  setup_start_date: z.string()
    .optional()
    .or(z.literal('')),
  
  setup_end_date: z.string()
    .optional()
    .or(z.literal('')),
  
  payment_due_date: z.string()
    .optional()
    .or(z.literal('')),
  
  default_entry_time: z.string()
    .optional()
    .or(z.literal('')),
  
  default_exit_time: z.string()
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['planejado', 'em_andamento', 'concluido', 'cancelado', 'concluido_pagamento_pendente'], {
    errorMap: () => ({ message: "Status inválido" })
  })
}).refine(
  (data) => {
    // Validação: Data de fim deve ser posterior à data de início
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      return endDate >= startDate;
    }
    return true;
  },
  {
    message: "Data de fim deve ser após a data de início",
    path: ["end_date"]
  }
).refine(
  (data) => {
    // Validação: Se houver data de fim de montagem, ela deve ser posterior à data de início de montagem
    if (data.setup_start_date && data.setup_end_date) {
      const setupStartDate = new Date(data.setup_start_date);
      const setupEndDate = new Date(data.setup_end_date);
      return setupEndDate >= setupStartDate;
    }
    return true;
  },
  {
    message: "Fim da montagem deve ser após o início da montagem",
    path: ["setup_end_date"]
  }
);

export type EventSchemaType = z.infer<typeof eventSchema>;