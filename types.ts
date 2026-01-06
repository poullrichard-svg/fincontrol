export type TransactionType = 'income' | 'expense';
export type GoalType = 'financial' | 'activity';
export type DriverApp = 'Uber' | '99' | 'InDrive' | 'Particular';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment_method?: string;
  date?: string;
  isFixed?: boolean;
  createdAt?: any;
  dateObj?: Date;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // UN, KG, L, etc.
  estimatedPrice: number;
  completed: boolean;
  createdAt?: any;
}

export interface DriverSession {
  id: string;
  date: string;
  app: DriverApp;
  amount: number;
  trips: number;
  kmDriven: number;
  hoursWorked: string; // HH:mm
  fuelSpent: number;
  foodSpent: number;
  fuelConsumption: number;
  observation?: string;
  createdAt?: any;
}

export interface Goal {
  id: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  type: GoalType;
  deadline?: string;
  createdAt?: any;
}

export interface CalcInputs {
  startDate: string;
  initialRaw: string;
  monthlyRaw: string;
  rate: number;
  rateType: string;
  period: number;
  periodType: string;
  millionMode: 'term' | 'amount';
  withdrawalRaw: string;
  monthlyCostRaw: string;
  coverageMonths: number;
  employmentType: string;
}

export interface DriverInputs {
  vehicleType: 'financed' | 'rented' | 'owned';
  vehicleValueRaw: string;
  installmentRaw: string;
  depreciationPercent: string;
  monthlyKmRaw: string;
  insuranceRaw: string;
  ipvaRaw: string;
  tireCostRaw: string;
  tireLifeRaw: string;
  oilCostRaw: string;
  oilIntervalRaw: string;
  fuelPriceRaw: string;
  fuelConsumptionRaw: string;
  desiredProfitRaw: string;
  maintenanceIncluded: boolean;
}

export interface CalcResult {
  total?: number;
  invested?: number;
  interest?: number;
  timeline?: Array<{ label: string; value: number }>;
  finalBalance?: number;
  totalWithdrawn?: number;
  target?: number;
  missing?: number;
  monthsToTarget?: number;
  years?: number;
  months?: number;
  targetDate?: string;
  isComplete?: boolean;
  reached?: boolean;
  term?: number;
  neededAmount?: number;
  // Driver results
  monthlyCost?: number;
  costPerKm?: number;
  minRatePerKm?: number;
  profitPerKm?: number;
  depreciationMonthly?: number;
  maintenanceMonthly?: number;
}