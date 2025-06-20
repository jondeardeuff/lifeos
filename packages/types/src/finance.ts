import { BaseEntity } from './common';

export interface BankAccount extends BaseEntity {
  userId: string;
  plaidAccountId?: string;
  institutionName?: string;
  accountName: string;
  accountType: AccountType;
  accountSubtype?: string;
  lastFour?: string;
  currentBalance?: number;
  availableBalance?: number;
  currency: string;
  isActive: boolean;
  lastSyncAt?: Date;
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT = 'credit',
  LOAN = 'loan'
}

export interface Transaction extends BaseEntity {
  userId: string;
  accountId?: string;
  externalId?: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  description?: string;
  merchantName?: string;
  categoryId?: string;
  projectId?: string;
  isPending: boolean;
  isTransfer: boolean;
  receiptUrl?: string;
  notes?: string;
}

export interface Category extends BaseEntity {
  userId?: string;
  name: string;
  parentCategoryId?: string;
  icon?: string;
  color?: string;
  isIncome: boolean;
  isTaxDeductible: boolean;
}

export interface TransactionRule extends BaseEntity {
  userId: string;
  ruleName?: string;
  conditions: Record<string, unknown>;
  categoryId?: string;
  projectId?: string;
  priority: number;
  isActive: boolean;
}

export interface Budget extends BaseEntity {
  userId: string;
  name: string;
  categoryId?: string;
  projectId?: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  alertThreshold: number;
  isActive: boolean;
}

export enum BudgetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export interface Invoice extends BaseEntity {
  userId: string;
  projectId?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paidAt?: Date;
  notes?: string;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface InvoiceItem extends BaseEntity {
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taskId?: string;
  sortOrder: number;
}