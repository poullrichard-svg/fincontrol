import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Trash2, 
  TrendingUp, 
  X,
  ChevronLeft, 
  ChevronRight,
  Repeat,
  Calculator,
  Coins,
  Target,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Zap,
  Flag,
  CheckCircle2,
  Trophy,
  Activity,
  Car,
  Fuel,
  Info,
  Wrench,
  Ban,
  Clock,
  MapPin,
  CircleUser,
  Utensils,
  CalendarDays,
  ShoppingCart,
  CheckSquare,
  Square,
  Scale,
  Edit3,
  Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  updateDoc,
  increment,
  orderBy
} from 'firebase/firestore';

import { Transaction, CalcInputs, CalcResult, Goal, GoalType, DriverInputs, DriverSession, DriverApp, ShoppingItem } from './types';
import { round, formatCurrency, formatDisplayAmount } from './utils/format';
import { DonutChart, BarChart } from './components/Charts';

const getFirebaseConfig = () => {
  try {
    if (typeof (window as any).__firebase_config !== 'undefined') {
      return JSON.parse((window as any).__firebase_config);
    }
  } catch (e) {
    console.warn("Configuração Firebase não encontrada.");
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();
const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app-id';

const DASHBOARD_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function App() {
  // --- States ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedTransactions, setFixedTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [driverSessions, setDriverSessions] = useState<DriverSession[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'fixed' | 'investment' | 'goals' | 'driver-panel' | 'shopping'>('dashboard');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  
  // Selection
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Form helpers
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [goalType, setGoalType] = useState<GoalType>('financial');
  const [amountRaw, setAmountRaw] = useState('');
  const [fuelRaw, setFuelRaw] = useState('');
  const [foodRaw, setFoodRaw] = useState('');
  const [kmRaw, setKmRaw] = useState('');
  const [tripsRaw, setTripsRaw] = useState('');
  const [consumptionRaw, setConsumptionRaw] = useState('10');
  const [hoursInput, setHoursInput] = useState('08');
  const [minutesInput, setMinutesInput] = useState('00');
  
  // Deletion
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  
  // Shopping List Inline Edition
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [inlinePriceRaw, setInlinePriceRaw] = useState('');

  // Driver Panel timeframe
  const [driverTimeframe, setDriverTimeframe] = useState<'diario' | 'mensal'>('diario');

  // Calculators
  const [calcType, setCalcType] = useState<'million' | 'compound' | 'income' | 'emergency' | 'driver'>('million'); 
  const [calcInputs, setCalcInputs] = useState<CalcInputs>({
      startDate: new Date().toISOString().split('T')[0],
      initialRaw: '0',
      monthlyRaw: '0',
      rate: 8,
      rateType: 'annual',
      period: 10,
      periodType: 'years',
      millionMode: 'term',
      withdrawalRaw: '0',
      monthlyCostRaw: '0', 
      coverageMonths: 6,
      employmentType: 'clt' 
  });
  
  const [driverInputs, setDriverInputs] = useState<DriverInputs>({
    vehicleType: 'rented',
    vehicleValueRaw: '4800000',
    installmentRaw: '148000',
    depreciationPercent: '10',
    monthlyKmRaw: '7000',
    insuranceRaw: '20000',
    tireCostRaw: '120000',
    tireLifeRaw: '50000',
    oilCostRaw: '23600',
    oilIntervalRaw: '10000',
    fuelPriceRaw: '589',
    fuelConsumptionRaw: '10',
    desiredProfitRaw: '500000',
    maintenanceIncluded: true
  });
  
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (!auth) { setUser({ uid: 'mock-user' } as FirebaseUser); setLoading(false); return; }
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); if (!u) setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const qTrans = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        dateObj: doc.data().date ? new Date(doc.data().date + 'T00:00:00') : new Date() 
      } as Transaction));
      items.sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
      setTransactions(items);
    });

    const qFixed = query(collection(db, 'artifacts', appId, 'users', user.uid, 'fixedTransactions'));
    const unsubFixed = onSnapshot(qFixed, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isFixed: true } as Transaction));
      setFixedTransactions(items);
    });

    const qGoals = query(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      setGoals(items);
    });

    const qDriver = query(collection(db, 'artifacts', appId, 'users', user.uid, 'driverSessions'));
    const unsubDriver = onSnapshot(qDriver, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverSession));
      setDriverSessions(items);
    });

    const qShopping = query(collection(db, 'artifacts', appId, 'users', user.uid, 'shoppingItems'), orderBy('createdAt', 'desc'));
    const unsubShopping = onSnapshot(qShopping, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
      setShoppingList(items);
      setLoading(false);
    });

    return () => { 
      unsubTrans(); unsubFixed(); unsubGoals(); unsubDriver(); unsubShopping();
    };
  }, [user]);

  // --- Memos & Computations ---
  const hoursWorkedFormatted = useMemo(() => {
    return `${hoursInput.padStart(2, '0')}:${minutesInput.padStart(2, '0')}`;
  }, [hoursInput, minutesInput]);

  const monthLabel = useMemo<string>(() => {
    try {
        const [year, month] = selectedMonth.split('-').map(Number);
        return new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    } catch(e) { return ""; }
  }, [selectedMonth]);

  const stats = useMemo(() => {
    const varIncome = transactions.filter(t => t.type === 'income' && t.date?.startsWith(selectedMonth)).reduce((acc, t) => acc + (t.amount || 0), 0);
    const varExpense = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(selectedMonth)).reduce((acc, t) => acc + (t.amount || 0), 0);
    const fixIncome = fixedTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
    const fixExpense = fixedTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
    return { 
      totalIncome: round(varIncome + fixIncome), 
      totalExpense: round(varExpense + fixExpense), 
      balance: round((varIncome + fixIncome) - (varExpense + fixExpense)) 
    };
  }, [transactions, fixedTransactions, selectedMonth]);

  const driverStats = useMemo(() => {
    const sessions = driverSessions.filter(s => 
      driverTimeframe === 'diario' ? s.date === selectedDay : s.date.startsWith(selectedMonth)
    );
    const totalAmount = sessions.reduce((acc, s) => acc + (s.amount || 0), 0);
    const totalTrips = sessions.reduce((acc, s) => acc + (s.trips || 0), 0);
    const totalKm = sessions.reduce((acc, s) => acc + (s.kmDriven || 0), 0);
    const totalFuelReal = sessions.reduce((acc, s) => acc + (s.fuelSpent || 0), 0);
    const totalFoodReal = sessions.reduce((acc, s) => acc + (s.foodSpent || 0), 0);
    
    let totalMinutes = 0;
    sessions.forEach(s => {
      if (s.hoursWorked) {
        const [h, m] = s.hoursWorked.split(':').map(Number);
        totalMinutes += (h * 60) + (m || 0);
      }
    });
    const totalHoursDecimal = totalMinutes / 60;
    const formattedHours = `${Math.floor(totalMinutes/60).toString().padStart(2, '0')}:${(totalMinutes%60).toString().padStart(2, '0')}`;

    const totalCost = totalFuelReal + totalFoodReal;
    const netProfit = totalAmount - totalCost;

    const appBreakdown: Record<string, number> = { Uber: 0, '99': 0, InDrive: 0, Particular: 0 };
    sessions.forEach(s => {
      if (s.app && appBreakdown[s.app] !== undefined) appBreakdown[s.app] += (s.amount || 0);
    });

    return { 
      totalAmount, totalTrips, totalKm, formattedHours, netProfit, totalCost,
      fatPorViagem: totalTrips > 0 ? totalAmount / totalTrips : 0, 
      fatPorHora: totalHoursDecimal > 0 ? totalAmount / totalHoursDecimal : 0, 
      fatPorKm: totalKm > 0 ? totalAmount / totalKm : 0, 
      lucroPorViagem: totalTrips > 0 ? netProfit / totalTrips : 0, 
      lucroPorHora: totalHoursDecimal > 0 ? netProfit / totalHoursDecimal : 0, 
      lucroPorKm: totalKm > 0 ? netProfit / totalKm : 0, 
      appBreakdown 
    };
  }, [driverSessions, selectedMonth, selectedDay, driverTimeframe]);

  const monthlyTransactions = useMemo(() => transactions.filter(t => t.date?.startsWith(selectedMonth)), [transactions, selectedMonth]);

  const chartData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    monthlyTransactions.filter(t => t.type === 'expense').forEach(t => categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount));
    fixedTransactions.filter(t => t.type === 'expense').forEach(t => categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount));
    const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    const barData = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toISOString().slice(0, 7);
      const income = transactions.filter(t => t.type === 'income' && t.date?.startsWith(mStr)).reduce((acc, t) => acc + (t.amount || 0), 0);
      const fixedInc = fixedTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
      barData.push({ 
        label: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''), 
        value: round(income + fixedInc) 
      });
    }
    return { pieData, barData };
  }, [transactions, fixedTransactions, monthlyTransactions]);

  const shoppingTotal = useMemo(() => shoppingList.reduce((acc, item) => acc + (item.estimatedPrice * item.quantity), 0), [shoppingList]);

  const driverMetrics = useMemo(() => [
    { label: 'Total de Viagens', value: driverStats.totalTrips }, 
    { label: 'Horas Trabalhadas', value: driverStats.formattedHours }, 
    { label: 'KMs Rodados', value: Number(driverStats.totalKm).toFixed(2) }, 
    { label: 'Fat. por viagens', value: formatCurrency(driverStats.fatPorViagem) }, 
    { label: 'Fat. médio por hora', value: formatCurrency(driverStats.fatPorHora) }, 
    { label: 'Fat. médio por KM', value: formatCurrency(driverStats.fatPorKm) }, 
    { label: 'Lucro por viagens', value: formatCurrency(driverStats.lucroPorViagem) }, 
    { label: 'Lucro por hora', value: formatCurrency(driverStats.lucroPorHora) }, 
    { label: 'Lucro por KM', value: formatCurrency(driverStats.lucroPorKm) }, 
  ], [driverStats]);

  // --- Handlers ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setAmountRaw(e.target.value.replace(/\D/g, ""));
  
  const handleDriverInputChange = (field: keyof DriverInputs, value: string) => {
    setDriverInputs(prev => ({ ...prev, [field]: value.replace(/[^\d]/g, "") }));
  };

  const handleCalcInputChange = (field: keyof CalcInputs, value: string) => {
    setCalcInputs(prev => ({ ...prev, [field]: field.endsWith('Raw') ? value.replace(/[^\d]/g, "") : value }));
  };

  const calculateInvestments = useCallback(() => {
      const initial = parseInt(calcInputs.initialRaw || '0') / 100;
      const monthly = parseInt(calcInputs.monthlyRaw || '0') / 100;
      const withdrawal = parseInt(calcInputs.withdrawalRaw || '0') / 100;
      const monthlyCostInput = parseInt(calcInputs.monthlyCostRaw || '0') / 100;
      const { rate, rateType, period, periodType, millionMode, coverageMonths, startDate } = calcInputs;
      const monthlyRate = rateType === 'annual' ? Math.pow(1 + (rate / 100), 1/12) - 1 : (rate / 100);
      const totalMonths = periodType === 'years' ? period * 12 : period;
      const baseDate = new Date(startDate + 'T00:00:00');

      if (calcType === 'compound') {
          let cur = initial; let totalInv = initial; let timeline = [];
          for (let m = 1; m <= totalMonths; m++) { 
            cur = (cur * (1 + monthlyRate)) + monthly; 
            totalInv += monthly; 
            if (m % 12 === 0 || m === totalMonths) { 
              const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + m); 
              timeline.push({ label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), value: round(cur) }); 
            } 
          }
          setCalcResult({ total: round(cur), invested: round(totalInv), interest: round(cur - totalInv), timeline: timeline.slice(-6) });
      } else if (calcType === 'income') {
          let cur = initial; let totalWith = 0; let timeline = [];
          for (let m = 1; m <= totalMonths; m++) { 
            cur = (cur * (1 + monthlyRate)) - withdrawal; 
            totalWith += withdrawal; 
            if (m % 12 === 0 || m === totalMonths) { 
              const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + m); 
              timeline.push({ label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), value: round(Math.max(0, cur)) }); 
            } 
            if (cur <= 0) { cur = 0; break; } 
          }
          setCalcResult({ finalBalance: round(cur), totalWithdrawn: round(totalWith), invested: round(initial), interest: round(Math.max(0, (cur + totalWith) - initial)), timeline: timeline.slice(-6) });
      } else if (calcType === 'emergency') {
          const targetVal = round(monthlyCostInput * coverageMonths);
          const missingVal = round(Math.max(0, targetVal - initial));
          let monthsToTargetVal = 0; let cur = initial; 
          if (missingVal > 0 && (monthly > 0 || monthlyRate > 0)) { 
            while (cur < targetVal && monthsToTargetVal < 1200) { cur = (cur * (1 + monthlyRate)) + monthly; monthsToTargetVal++; } 
          }
          const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToTargetVal);
          setCalcResult({ target: targetVal, missing: missingVal, monthsToTarget: monthsToTargetVal, years: Math.floor(monthsToTargetVal / 12), months: monthsToTargetVal % 12, targetDate: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), invested: round(initial + (monthly * monthsToTargetVal)) });
      } else if (calcType === 'million') {
          const targetMil = 1000000; 
          if (initial >= targetMil) { setCalcResult({ reached: true, total: round(initial) }); return; }
          if (millionMode === 'term') { 
            let balance = initial; let monthsCount = 0; 
            while (balance < targetMil && monthsCount < 1200) { balance = (balance * (1 + monthlyRate)) + monthly; monthsCount++; } 
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsCount); 
            setCalcResult({ term: monthsCount, years: Math.floor(monthsCount / 12), months: monthsCount % 12, targetDate: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), total: round(balance), invested: round(initial + (monthly * monthsCount)), interest: round(balance - (initial + (monthly * monthsCount))) }); 
          } else { 
            const factor = Math.pow(1 + monthlyRate, totalMonths); 
            const fvInitial = initial * factor; 
            const annuityFactor = monthlyRate === 0 ? totalMonths : (factor - 1) / monthlyRate; 
            const needed = (targetMil - fvInitial) / annuityFactor; 
            setCalcResult({ neededAmount: round(Math.max(0, needed)), total: targetMil, invested: initial }); 
          }
      } else if (calcType === 'driver') {
          const val = parseInt(driverInputs.vehicleValueRaw || '0') / 100; 
          const inst = parseInt(driverInputs.installmentRaw || '0') / 100; 
          const insur = parseInt(driverInputs.insuranceRaw || '0') / 100; 
          const deprP = parseFloat(driverInputs.depreciationPercent || '0') / 100; 
          const mKm = parseInt(driverInputs.monthlyKmRaw || '1'); 
          const tCost = parseInt(driverInputs.tireCostRaw || '0') / 100; 
          const tLife = parseInt(driverInputs.tireLifeRaw || '1'); 
          const oCost = parseInt(driverInputs.oilCostRaw || '0') / 100; 
          const oInterval = parseInt(driverInputs.oilIntervalRaw || '10000'); 
          const fPrice = parseInt(driverInputs.fuelPriceRaw || '0') / 100; 
          const fCons = parseFloat(driverInputs.fuelConsumptionRaw || '10'); 
          const dProfit = parseInt(driverInputs.desiredProfitRaw || '0') / 100;
          
          const isRented = driverInputs.vehicleType === 'rented'; 
          const isOwned = driverInputs.vehicleType === 'owned';
          const ipvaM = isRented ? 0 : (val * 0.04) / 12; 
          const deprM = isRented ? 0 : (val * deprP) / 12; 
          const insurM = isRented ? 0 : insur; 
          const vBaseCost = isOwned ? 0 : inst; 
          const totalFixM = vBaseCost + ipvaM + insurM + deprM;
          
          const skipM = isRented && driverInputs.maintenanceIncluded; 
          const tireKm = skipM ? 0 : tCost / Math.max(1, tLife); 
          const oilKm = skipM ? 0 : oCost / Math.max(1, oInterval); 
          const fuelKm = fPrice / Math.max(0.1, fCons); 
          const costKm = (totalFixM / Math.max(1, mKm)) + tireKm + oilKm + fuelKm;
          
          const needRev = dProfit + totalFixM + (mKm * (tireKm + oilKm + fuelKm)); 
          const minRateKm = needRev / Math.max(1, mKm);
          
          setCalcResult({ 
            target: dProfit, 
            term: mKm, 
            monthlyCost: totalFixM + (mKm * (tireKm + oilKm + fuelKm)), 
            costPerKm: round(costKm), 
            minRatePerKm: round(minRateKm), 
            profitPerKm: round(minRateKm - costKm), 
            depreciationMonthly: round(deprM), 
            maintenanceMonthly: round((tireKm + oilKm) * mKm) 
          });
      }
  }, [calcInputs, calcType, driverInputs]);

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    const amount = amountRaw ? parseFloat(amountRaw) / 100 : 0;
    if (amount <= 0) return;
    const baseData = { 
      description: formData.get('description') as string, 
      amount: round(amount), 
      type: formType, 
      category: formData.get('category') as string 
    };
    if (activeTab === 'fixed') {
      if (!db) setFixedTransactions(p => [...p, { ...baseData, id: Date.now().toString(), isFixed: true } as Transaction]);
      else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'fixedTransactions'), { ...baseData, isFixed: true, createdAt: serverTimestamp() });
    } else {
      const date = formData.get('date') as string;
      const txData = { ...baseData, date, dateObj: new Date(date + 'T00:00:00') };
      if (!db) setTransactions(p => [...p, { ...txData, id: Date.now().toString() } as Transaction]);
      else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), { ...txData, createdAt: serverTimestamp() });
    }
    setIsModalOpen(false); setAmountRaw('');
  };

  const handleAddDriverSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    const amount = amountRaw ? parseFloat(amountRaw) / 100 : 0;
    const fuelVal = fuelRaw ? parseFloat(fuelRaw) / 100 : 0;
    const foodVal = foodRaw ? parseFloat(foodRaw) / 100 : 0;
    const kmVal = parseFloat(kmRaw || '0'); 
    const tripsVal = parseInt(tripsRaw || '0'); 
    const hoursVal = hoursWorkedFormatted; 
    const consVal = parseFloat(consumptionRaw || '10'); 
    const appName = formData.get('app') as DriverApp; 
    const dateVal = formData.get('date') as string;
    
    const data: Partial<DriverSession> = { 
      app: appName, amount: round(amount), fuelSpent: round(fuelVal), 
      foodSpent: round(foodVal), fuelConsumption: consVal, kmDriven: kmVal, 
      trips: tripsVal, hoursWorked: hoursVal, date: dateVal, observation: formData.get('observation') as string 
    };
    
    if (!db) setDriverSessions(p => [...p, { ...data, id: Date.now().toString() } as DriverSession]);
    else {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'driverSessions'), { ...data, createdAt: serverTimestamp() });
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), { description: `Ganhos ${appName}`, amount: round(amount), type: 'income', category: 'Transporte', date: dateVal, createdAt: serverTimestamp() });
      if (fuelVal > 0) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), { description: `Combustível - Trabalho ${appName}`, amount: round(fuelVal), type: 'expense', category: 'Transporte', date: dateVal, createdAt: serverTimestamp() });
      if (foodVal > 0) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), { description: `Alimentação - Trabalho ${appName}`, amount: round(foodVal), type: 'expense', category: 'Alimentação', date: dateVal, createdAt: serverTimestamp() });
    }
    setIsDriverModalOpen(false); setAmountRaw(''); setFuelRaw(''); setFoodRaw(''); setKmRaw(''); setTripsRaw(''); setConsumptionRaw('10');
  };

  const handleAddShoppingItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    const priceVal = amountRaw ? parseFloat(amountRaw) / 100 : 0;
    const data: Partial<ShoppingItem> = {
      name: formData.get('name') as string,
      quantity: parseFloat(formData.get('quantity') as string) || 1,
      unit: formData.get('unit') as string || 'UN',
      estimatedPrice: round(priceVal),
      completed: false
    };
    if (!db) setShoppingList(p => [{ ...data, id: Date.now().toString() } as ShoppingItem, ...p]);
    else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'shoppingItems'), { ...data, createdAt: serverTimestamp() });
    setIsShoppingModalOpen(false); setAmountRaw('');
  };

  const updateShoppingItemPrice = async (itemId: string, newPrice: number) => {
    if (!user) return;
    if (!db) setShoppingList(p => p.map(i => i.id === itemId ? { ...i, estimatedPrice: newPrice } : i));
    else await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shoppingItems', itemId), { estimatedPrice: newPrice });
    setEditingPriceId(null);
    setInlinePriceRaw('');
  };

  const toggleShoppingItem = async (item: ShoppingItem) => {
    if (!user) return;
    if (!db) setShoppingList(p => p.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
    else await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shoppingItems', item.id), { completed: !item.completed });
  };

  const deleteShoppingItem = async (id: string) => {
    if (!user) return;
    if (!db) setShoppingList(p => p.filter(i => i.id !== id));
    else await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shoppingItems', id));
  };

  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    let targetAmountVal = goalType === 'financial' ? (amountRaw ? parseFloat(amountRaw)/100 : 0) : 100;
    if (targetAmountVal <= 0) return;
    const data: Partial<Goal> = { description: formData.get('description') as string, targetAmount: targetAmountVal, currentAmount: 0, deadline: formData.get('deadline') as string, type: goalType };
    if (!db) setGoals(p => [...p, { ...data, id: Date.now().toString() } as Goal]);
    else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'goals'), { ...data, createdAt: serverTimestamp() });
    setIsGoalModalOpen(false); setAmountRaw('');
  };

  const handleContribution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user || !selectedGoal) return;
    let contribAmount = selectedGoal.type === 'financial' ? (amountRaw ? parseFloat(amountRaw)/100 : 0) : parseInt(amountRaw || '0');
    if (contribAmount <= 0) return;
    if (!db) setGoals(p => p.map(g => g.id === selectedGoal.id ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + contribAmount) } : g));
    else await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', selectedGoal.id), { currentAmount: increment(contribAmount) });
    setIsContributionModalOpen(false); setAmountRaw('');
  };

  const changeMonth = (offset: number) => { 
    const [year, month] = selectedMonth.split('-').map(Number); 
    const d = new Date(year, month - 1 + offset, 1); 
    setSelectedMonth(d.toISOString().slice(0, 7)); 
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    const tx = [...transactions, ...fixedTransactions].find(t => t.id === transactionToDelete);
    const isFix = tx?.isFixed;
    if (!db || !user) { 
      if (isFix) setFixedTransactions(p => p.filter(t => t.id !== transactionToDelete)); 
      else setTransactions(p => p.filter(t => t.id !== transactionToDelete)); 
    } else { 
      const collectionName = isFix ? 'fixedTransactions' : 'transactions'; 
      try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, transactionToDelete)); } catch (e) {} 
    }
    setTransactionToDelete(null);
  };

  const confirmDeleteGoal = async () => { 
    if (!goalToDelete) return; 
    if (!db || !user) setGoals(p => p.filter(g => g.id !== goalToDelete)); 
    else { try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', goalToDelete)); } catch (e) {} } 
    setGoalToDelete(null); 
  };

  // --- Render Helpers ---
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full mb-4" />
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Carregando...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-slate-950">
        <div className="p-10 flex items-center gap-4">
          <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20"><TrendingUp size={24} className="text-white" strokeWidth={3} /></div>
          <h1 className="text-xl font-black tracking-tighter uppercase">FIN<span className="text-emerald-500">CONTROL</span></h1>
        </div>
        <nav className="flex-1 px-6 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'transactions', icon: Wallet, label: 'Lançamentos' },
            { id: 'fixed', icon: Repeat, label: 'Contas Fixas' },
            { id: 'driver-panel', icon: Car, label: 'Painel Motorista' },
            { id: 'shopping', icon: ShoppingCart, label: 'Lista Compras' },
            { id: 'goals', icon: Flag, label: 'Minhas Metas' },
            { id: 'investment', icon: Calculator, label: 'Calculadoras' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/5 text-emerald-400' : 'text-slate-500 hover:text-slate-200'}`}>
              <item.icon size={18} /><span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:p-6 md:px-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-1 md:gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                <button onClick={() => changeMonth(-1)} className="p-1.5 md:p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] px-2 md:px-3 min-w-[100px] md:min-w-[180px] text-center text-slate-300 truncate">{monthLabel}</span>
                <button onClick={() => changeMonth(1)} className="p-1.5 md:p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronRight size={16} /></button>
            </div>
            
            <button onClick={() => { setAmountRaw(''); setFuelRaw(''); setFoodRaw(''); if (activeTab === 'goals') setIsGoalModalOpen(true); else if (activeTab === 'driver-panel') setIsDriverModalOpen(true); else if (activeTab === 'shopping') setIsShoppingModalOpen(true); else setIsModalOpen(true); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black transition-all active:scale-95 text-[9px] md:text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20">
              <Plus size={16} strokeWidth={3} /> 
              {activeTab === 'goals' ? 'Nova Meta' : activeTab === 'driver-panel' ? 'Nova Entrada' : activeTab === 'shopping' ? 'Novo Item' : 'Novo Lançamento'}
            </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24 md:pb-10">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-12">
                
                {activeTab === 'shopping' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-8 rounded-[2.5rem] shadow-xl text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Gasto Planejado</span>
                            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{formatCurrency(shoppingTotal)}</h3>
                        </div>
                        <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Itens na Lista</p>
                            <h3 className="text-2xl font-black text-emerald-400">{shoppingList.length} itens</h3>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Checklist de Compras</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">Dica: Clique no preço para alterar</p>
                      </div>
                      <div className="divide-y divide-white/5">
                        {shoppingList.length === 0 ? (
                          <div className="p-20 text-center text-slate-600">
                            <ShoppingCart size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sua lista está vazia</p>
                          </div>
                        ) : (
                          shoppingList.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1).map((item) => (
                            <div key={item.id} className={`p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-all ${item.completed ? 'opacity-40' : ''}`}>
                              <div className="flex items-center gap-4 md:gap-6">
                                <button onClick={() => toggleShoppingItem(item)} className={`p-2 rounded-xl transition-all ${item.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                                  {item.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                                </button>
                                <div className="min-w-0">
                                  <p className={`font-black text-lg md:text-xl transition-all truncate ${item.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>{item.name}</p>
                                  <div className="flex gap-4 text-[10px] font-black uppercase mt-1 text-slate-500">
                                    <span className="flex items-center gap-1"><Scale size={10} /> {item.quantity} {item.unit}</span>
                                    {item.estimatedPrice > 0 && <span>Un: {formatCurrency(item.estimatedPrice)}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 md:gap-8 shrink-0">
                                {editingPriceId === item.id ? (
                                  <div className="flex items-center gap-2 animate-in zoom-in duration-200">
                                    <input 
                                      autoFocus
                                      type="text" 
                                      value={formatDisplayAmount(inlinePriceRaw)} 
                                      onChange={(e) => setInlinePriceRaw(e.target.value.replace(/\D/g, ""))} 
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') updateShoppingItemPrice(item.id, inlinePriceRaw ? parseFloat(inlinePriceRaw)/100 : 0);
                                        if (e.key === 'Escape') setEditingPriceId(null);
                                      }}
                                      className="w-24 bg-slate-800 border-2 border-emerald-500/50 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                                      placeholder="R$ 0,00"
                                    />
                                    <button 
                                      onClick={() => updateShoppingItemPrice(item.id, inlinePriceRaw ? parseFloat(inlinePriceRaw)/100 : 0)}
                                      className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg"
                                    >
                                      <Check size={16} strokeWidth={3} />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => { setEditingPriceId(item.id); setInlinePriceRaw(item.estimatedPrice > 0 ? (item.estimatedPrice * 100).toString() : ''); }}
                                    className={`flex flex-col items-end gap-1 px-4 py-2 rounded-xl transition-all border border-transparent ${item.estimatedPrice === 0 ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 text-orange-400 animate-pulse' : 'hover:bg-white/5'}`}
                                  >
                                    <span className={`text-lg font-mono font-black ${item.completed ? 'text-slate-600' : item.estimatedPrice === 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                      {item.estimatedPrice === 0 ? 'Definir valor' : formatCurrency(item.estimatedPrice * item.quantity)}
                                    </span>
                                    {item.estimatedPrice === 0 && <span className="text-[7px] font-black uppercase">Toque para adicionar</span>}
                                  </button>
                                )}
                                <button onClick={() => deleteShoppingItem(item.id)} className="p-3 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90"><Trash2 size={18} /></button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'driver-panel' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                      <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-white/5 w-fit">
                          {['diario', 'mensal'].map(tf => (
                              <button key={tf} onClick={() => setDriverTimeframe(tf as any)} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${driverTimeframe === tf ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{tf}</button>
                          ))}
                      </div>
                      {driverTimeframe === 'diario' && (
                        <div className="lg:hidden w-full max-w-xs flex items-center gap-2 bg-slate-900/80 border border-white/10 px-4 py-3 rounded-2xl">
                          <CalendarDays size={18} className="text-emerald-400" />
                          <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase text-white focus:ring-0 outline-none w-full [color-scheme:dark]" />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-center group hover:scale-[1.02] transition-transform">
                          <span className="text-[10px] font-black text-emerald-950/60 uppercase tracking-widest block mb-2">Faturamento {driverTimeframe}</span>
                          <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">{formatCurrency(driverStats.totalAmount)}</h3>
                        </div>
                        <div className="bg-rose-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-center group hover:scale-[1.02] transition-transform">
                          <span className="text-[10px] font-black text-rose-950/60 uppercase tracking-widest block mb-2">Gastos</span>
                          <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">{formatCurrency(driverStats.totalCost)}</h3>
                        </div>
                        <div className="bg-indigo-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-center group hover:scale-[1.02] transition-transform">
                          <span className="text-[10px] font-black text-indigo-950/60 uppercase tracking-widest block mb-2">Saldo Líquido</span>
                          <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">{formatCurrency(driverStats.netProfit)}</h3>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {driverMetrics.map((metric, i) => (
                          <div key={i} className="bg-slate-900/40 border border-white/5 p-5 md:p-6 rounded-[1.5rem] flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-800/40 transition-colors">
                            <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">{metric.label}</span>
                            <span className="text-sm md:text-lg font-black text-white">{metric.value}</span>
                          </div>
                        ))}
                    </div>
                    
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                      <div className="bg-green-500/10 border border-green-500/20 py-4 px-6 rounded-2xl text-center mb-8">
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Faturamento por Aplicativo</span>
                      </div>
                      <div className="space-y-4">
                        {Object.entries(driverStats.appBreakdown).map(([app, value]) => ( 
                          <div key={app} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-white/5 group hover:bg-slate-800/50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${app === 'Uber' ? 'bg-black text-white' : app === '99' ? 'bg-yellow-500 text-black' : 'bg-indigo-600 text-white'}`}>
                                <CircleUser size={20} />
                              </div>
                              <span className="font-black text-slate-200">{app}</span>
                            </div>
                            <span className="font-mono font-black text-lg group-hover:text-emerald-400 transition-colors">{formatCurrency(value as number)}</span>
                          </div> 
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden group hover:border-white/10 transition-colors">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Saldo Mensal</span>
                              <h3 className={`text-xl md:text-2xl lg:text-4xl font-black tracking-tighter ${(stats.balance as number) >= 0 ? 'text-white' : 'text-rose-500'}`}>{formatCurrency(stats.balance as number)}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden group hover:border-emerald-500/10 transition-colors">
                              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 block">Entradas</span>
                              <h3 className="text-xl md:text-2xl lg:text-4xl font-black text-white">{formatCurrency(stats.totalIncome as number)}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden group hover:border-rose-500/10 transition-colors">
                              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3 block">Saídas</span>
                              <h3 className="text-xl md:text-2xl lg:text-4xl font-black text-white">{formatCurrency(stats.totalExpense as number)}</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                            <div className="lg:col-span-5 bg-slate-900/40 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl text-center">
                              <h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 md:mb-8">Gastos por Categoria</h4>
                              <DonutChart data={chartData.pieData} colors={DASHBOARD_COLORS} />
                            </div>
                            <div className="lg:col-span-7 bg-slate-900/40 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl overflow-hidden">
                              <h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 md:mb-8">Evolução de Ganhos</h4>
                              <BarChart data={chartData.barData} height={200} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                          {goals.map(goal => {
                              const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                              return ( 
                                <div key={goal.id} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex flex-col gap-6 relative overflow-hidden group hover:border-white/10 transition-all">
                                  {progress >= 100 && (
                                    <div className="absolute top-6 right-6 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                      <CheckCircle2 size={24} />
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                      {goal.type === 'financial' ? <Trophy size={18} className="text-emerald-500" /> : <Activity size={18} className="text-blue-500" />}
                                      <h4 className="text-xl font-black text-white leading-tight truncate pr-8 tracking-tight">{goal.description}</h4>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                      {goal.type === 'financial' ? `META: ${formatCurrency(goal.targetAmount)}` : 'HÁBITO / ATIVIDADE'}
                                    </p>
                                  </div>
                                  <div className="space-y-5">
                                    <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-widest">
                                      <span className="text-slate-500">PROGRESSO</span>
                                      <span className={progress >= 100 ? 'text-emerald-400' : 'text-slate-300'}>{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
                                      <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${progress >= 100 ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : (goal.type === 'activity' ? 'bg-gradient-to-r from-blue-600 to-cyan-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400')}`} 
                                        style={{ width: `${progress}%` }} 
                                      />
                                    </div>
                                    <div className="flex justify-between text-[11px] font-mono font-black tracking-tight">
                                      {goal.type === 'financial' ? (
                                        <>
                                          <span className="text-emerald-500">{formatCurrency(goal.currentAmount)}</span>
                                          <span className="text-slate-500">{formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))} faltando</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-400">{progress.toFixed(0)}% concluído</span>
                                          <span className="text-slate-500">{100 - Math.round(progress)}% restante</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 mt-2">
                                    <button onClick={() => { setSelectedGoal(goal); setAmountRaw(''); setIsContributionModalOpen(true); }} className="flex items-center justify-center gap-2 bg-slate-800/40 hover:bg-emerald-500 hover:text-slate-950 p-3.5 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5 active:scale-95">
                                      {goal.type === 'financial' ? <Coins size={14} /> : <ArrowUpCircle size={14} />} {goal.type === 'financial' ? 'APORTAR' : 'EVOLUIR'}
                                    </button>
                                    <button onClick={() => setGoalToDelete(goal.id)} className="flex items-center justify-center gap-2 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 p-3.5 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-rose-500/10 active:scale-95">
                                      <Trash2 size={14} /> EXCLUIR
                                    </button>
                                  </div>
                                </div> 
                              );
                          })}
                          <button onClick={() => setIsGoalModalOpen(true)} className="bg-slate-900/10 border-2 border-dashed border-white/5 p-12 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 text-slate-700 hover:border-emerald-500/30 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all group min-h-[300px]">
                            <div className="p-5 rounded-full bg-white/5 group-hover:bg-emerald-500/10 transition-all shadow-xl group-active:scale-90">
                              <Target size={36} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em]">CRIAR NOVA META</span>
                          </button>
                      </div>
                  </div>
                )}

                {activeTab === 'investment' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-slate-900/50 rounded-2xl md:rounded-3xl border border-white/5 w-full md:w-fit whitespace-nowrap">
                            {[
                              {id:'million',label:'1 Milhão',icon:Target},
                              {id:'compound',label:'Juros Compostos',icon:Calculator},
                              {id:'income',label:'Viver de Renda',icon:Coins},
                              {id:'emergency',label:'Reserva Emergência',icon:ShieldCheck},
                              {id:'driver',label:'Motorista App',icon:Car}
                            ].map(btn => (
                                <button key={btn.id} onClick={() => { setCalcType(btn.id as any); setCalcResult(null); }} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${calcType === btn.id ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                                  <btn.icon size={14} /> {btn.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                            <div className="bg-slate-900/40 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl space-y-6 md:space-y-8">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Configuração da Operação</h3>
                                
                                {calcType === 'driver' ? (
                                  <div className="space-y-5">
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black text-slate-300 uppercase">TIPO DE VEÍCULO:</label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {['financed', 'rented', 'owned'].map(type => (
                                          <button 
                                            key={type} 
                                            onClick={() => setDriverInputs(p => ({...p, vehicleType: type as any}))} 
                                            className={`py-6 rounded-2xl border-2 font-black uppercase text-[8px] transition-all relative overflow-hidden ${driverInputs.vehicleType === type ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-500'}`}
                                          >
                                            {driverInputs.vehicleType === type && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-500" />}
                                            {type === 'financed' ? 'Financiado' : type === 'rented' ? 'Alugado' : 'Quitado'}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {driverInputs.vehicleType === 'rented' && (
                                      <div className="space-y-2 p-4 bg-slate-800/30 rounded-2xl border border-white/5 text-center">
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-3">Sobre a manutenção:</label>
                                        <div className="grid grid-cols-2 gap-2">
                                          <button onClick={() => setDriverInputs(p => ({...p, maintenanceIncluded: true}))} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-black uppercase text-[8px] transition-all ${driverInputs.maintenanceIncluded ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-500'}`}><Ban size={12} /> Locadora Paga</button>
                                          <button onClick={() => setDriverInputs(p => ({...p, maintenanceIncluded: false}))} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-black uppercase text-[8px] transition-all ${!driverInputs.maintenanceIncluded ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-500'}`}><Wrench size={12} /> Eu Pago</button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {driverInputs.vehicleType !== 'rented' && (
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Valor do automóvel <Info size={10} /></label>
                                          <input type="text" value={formatDisplayAmount(driverInputs.vehicleValueRaw)} onChange={(e) => handleDriverInputChange('vehicleValueRaw', e.target.value)} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" />
                                        </div>
                                      )}
                                      {driverInputs.vehicleType !== 'owned' && (
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-black text-slate-500 uppercase">{driverInputs.vehicleType === 'rented' ? 'Aluguel' : 'Parcela'}</label>
                                          <input type="text" value={formatDisplayAmount(driverInputs.installmentRaw)} onChange={(e) => handleDriverInputChange('installmentRaw', e.target.value)} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" />
                                        </div>
                                      )}
                                      <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">Km Rodados (Mês)</label><input type="number" value={driverInputs.monthlyKmRaw} onChange={(e) => setDriverInputs(p => ({...p, monthlyKmRaw: e.target.value}))} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" /></div>
                                      <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">Preço Combustível</label><input type="text" value={formatDisplayAmount(driverInputs.fuelPriceRaw)} onChange={(e) => handleDriverInputChange('fuelPriceRaw', e.target.value)} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" /></div>
                                      <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">Consumo (Km/L)</label><input type="number" step="0.1" value={driverInputs.fuelConsumptionRaw} onChange={(e) => setDriverInputs(p => ({...p, fuelConsumptionRaw: e.target.value}))} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" /></div>
                                      
                                      {(!driverInputs.maintenanceIncluded || driverInputs.vehicleType !== 'rented') && (
                                        <>
                                          <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">Kit Pneus</label><input type="text" value={formatDisplayAmount(driverInputs.tireCostRaw)} onChange={(e) => handleDriverInputChange('tireCostRaw', e.target.value)} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" /></div>
                                          <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">Troca Óleo</label><input type="text" value={formatDisplayAmount(driverInputs.oilCostRaw)} onChange={(e) => handleDriverInputChange('oilCostRaw', e.target.value)} className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none" /></div>
                                        </>
                                      )}
                                      <div className="col-span-full space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase font-bold">Lucro Desejado</label>
                                        <input type="text" value={formatDisplayAmount(driverInputs.desiredProfitRaw)} onChange={(e) => handleDriverInputChange('desiredProfitRaw', e.target.value)} className="w-full bg-slate-800/60 border-2 border-emerald-500/20 rounded-xl px-4 py-4 text-lg text-emerald-400 focus:border-emerald-500 outline-none font-bold" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-5 md:space-y-6">
                                    <div className="space-y-1.5 md:space-y-2">
                                      <label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Início</label>
                                      <input type="date" value={calcInputs.startDate} onChange={(e) => handleCalcInputChange('startDate', e.target.value)} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-1.5 md:space-y-2">
                                      <label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">{calcType === 'emergency' ? 'Valor Guardado' : 'Valor Inicial'}</label>
                                      <input type="text" value={formatDisplayAmount(calcInputs.initialRaw)} onChange={(e) => handleCalcInputChange('initialRaw', e.target.value)} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none" />
                                    </div>
                                    
                                    {calcType === 'million' && (
                                      <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setCalcInputs(p => ({...p, millionMode: 'term'}))} className={`py-3 rounded-xl font-black text-[9px] uppercase border-2 transition-all ${calcInputs.millionMode === 'term' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-800 text-slate-500'}`}>Calcular Prazo</button>
                                        <button onClick={() => setCalcInputs(p => ({...p, millionMode: 'amount'}))} className={`py-3 rounded-xl font-black text-[9px] uppercase border-2 transition-all ${calcInputs.millionMode === 'amount' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-800 text-slate-500'}`}>Calcular Aporte</button>
                                      </div>
                                    )}
                                    
                                    {calcType !== 'emergency' && (calcType !== 'million' || calcInputs.millionMode === 'term') && (
                                      <div className="space-y-1.5 md:space-y-2">
                                        <label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">{calcType === 'income' ? 'Retirada' : 'Aporte'}</label>
                                        <input type="text" value={calcType === 'income' ? formatDisplayAmount(calcInputs.withdrawalRaw) : formatDisplayAmount(calcInputs.monthlyRaw)} onChange={(e) => handleCalcInputChange(calcType === 'income' ? 'withdrawalRaw' : 'monthlyRaw', e.target.value)} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none" />
                                      </div>
                                    )}
                                    
                                    {calcType === 'emergency' && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                          {[{id:'clt',label:'CLT',m:6},{id:'autonomo',label:'Autônomo',m:12},{id:'publico',label:'Público',m:3}].map(opt => (
                                            <button key={opt.id} onClick={() => setCalcInputs(p => ({...p, employmentType: opt.id, coverageMonths: opt.m}))} className={`py-3 rounded-xl border-2 transition-all text-[8px] font-black uppercase ${calcInputs.employmentType === opt.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>{opt.label}</button>
                                          ))}
                                        </div>
                                        <div className="space-y-1.5 md:space-y-2">
                                          <label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">Custo Vida Mensal</label>
                                          <input type="text" value={formatDisplayAmount(calcInputs.monthlyCostRaw)} onChange={(e) => handleCalcInputChange('monthlyCostRaw', e.target.value)} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none" />
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1.5 md:space-y-2"><label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">Juros (%)</label><input type="number" step="0.01" value={calcInputs.rate} onChange={(e) => setCalcInputs(p => ({...p, rate: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none" /></div>
                                      <div className="space-y-1.5 md:space-y-2"><label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">Período</label><select value={calcInputs.rateType} onChange={(e) => setCalcInputs(p => ({...p, rateType: e.target.value}))} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black appearance-none"><option value="annual">Anual</option><option value="monthly">Mensal</option></select></div>
                                    </div>
                                    
                                    {(calcType === 'compound' || calcType === 'income' || (calcType === 'million' && calcInputs.millionMode === 'amount')) && (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5 md:space-y-2"><label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">Tempo</label><input type="number" value={calcInputs.period} onChange={(e) => setCalcInputs(p => ({...p, period: parseInt(e.target.value) || 0}))} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none" /></div>
                                        <div className="space-y-1.5 md:space-y-2"><label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase">Unidade</label><select value={calcInputs.periodType} onChange={(e) => setCalcInputs(p => ({...p, periodType: e.target.value}))} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-black appearance-none"><option value="years">Anos</option><option value="months">Meses</option></select></div>
                                      </div>
                                    )}
                                  </div> 
                                )}
                                <button onClick={calculateInvestments} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-95">Calcular Resultado</button>
                            </div>
                            
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col justify-center overflow-hidden min-h-[400px] md:min-h-[500px]">
                                {!calcResult ? (
                                  <div className="text-center text-slate-600 space-y-4"><TrendingUp size={32} className="mx-auto" /><p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Aguardando Parâmetros...</p></div>
                                ) : (
                                  <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                    {calcType === 'driver' ? (
                                      <div className="space-y-6">
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl space-y-3 text-center">
                                          <p className="text-[10px] text-emerald-400/80 font-bold leading-relaxed">
                                            Para um lucro de <span className="text-emerald-400">{formatCurrency(calcResult.target || 0)}</span>, 
                                            rodando <span className="text-emerald-400">{calcResult.term} km</span>, aceite viagens de no mínimo
                                            <span className="text-emerald-400 block text-lg mt-1">R$ {calcResult.minRatePerKm?.toFixed(2)} / KM</span>
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Custo por KM</p>
                                            <p className="text-xs font-black text-white">R$ {calcResult.costPerKm?.toFixed(2)}</p>
                                          </div>
                                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Custo Mensal</p>
                                            <p className="text-xs font-black text-white">{formatCurrency(calcResult.monthlyCost || 0)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-8">
                                        <div className="text-center space-y-4">
                                          <h4 className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest">Previsão de Resultados</h4>
                                          {calcType === 'million' ? (
                                            calcInputs.millionMode === 'term' ? (
                                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
                                                <p className="text-xl md:text-3xl font-black text-white capitalize">{calcResult.targetDate}</p>
                                                <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">Tempo: {calcResult.years}a e {calcResult.months}m</span>
                                              </div>
                                            ) : (
                                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
                                                <p className="text-xl md:text-3xl font-black text-white">{formatCurrency(calcResult.neededAmount || 0)}</p>
                                                <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">Aporte Mensal</span>
                                              </div>
                                            )
                                          ) : calcType === 'emergency' ? (
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
                                              <p className="text-xl md:text-3xl font-black text-white capitalize">{calcResult.targetDate}</p>
                                              <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">Alvo: {formatCurrency(calcResult.target || 0)}</span>
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              <p className="text-2xl md:text-5xl font-black text-white">{formatCurrency(calcResult.total || calcResult.finalBalance || 0)}</p>
                                              <p className="text-slate-500 font-bold uppercase text-[8px] tracking-widest">Montante Final</p>
                                            </div>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[6px] font-black text-slate-500 uppercase mb-1">Investido</p>
                                            <p className="text-[8px] md:text-sm font-black text-white">{formatCurrency(calcResult.invested || 0)}</p>
                                          </div>
                                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[6px] font-black text-emerald-500 uppercase mb-1">Rendimento</p>
                                            <p className="text-[8px] md:text-sm font-black text-emerald-400">{formatCurrency(calcResult.interest || calcResult.totalWithdrawn || 0)}</p>
                                          </div>
                                        </div>
                                        {calcResult.timeline && <BarChart data={calcResult.timeline} height={100} />}
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {(activeTab === 'transactions' || activeTab === 'fixed') && (
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl md:rounded-[3rem] overflow-hidden shadow-2xl">
                        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
                          <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tight">{activeTab === 'fixed' ? 'Mensais Fixas' : `${monthLabel}`}</h3>
                        </div>
                        <div className="divide-y divide-white/5">
                            {(activeTab === 'fixed' ? fixedTransactions : monthlyTransactions).map((t) => (
                                <div key={t.id} className="p-4 md:p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-all gap-4">
                                    <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
                                      <div className={`p-2.5 md:p-4 rounded-xl md:rounded-[1.25rem] flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {t.isFixed ? <Repeat size={18} /> : t.type === 'income' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                                      </div>
                                      <div className="overflow-hidden">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <p className="font-black text-slate-100 text-sm md:text-xl leading-tight truncate">{t.description}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-[7px] md:text-[10px] font-black uppercase mt-1 text-slate-500">
                                          <span>{t.category}</span>
                                          {!t.isFixed && t.date && <span className="opacity-60">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:gap-8 flex-shrink-0">
                                      <span className={`text-xs md:text-xl font-mono font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}</span>
                                      <button onClick={() => setTransactionToDelete(t.id)} className="p-2.5 md:p-4 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl md:rounded-2xl transition-all active:scale-90 flex-shrink-0">
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 px-4 flex items-center justify-between z-40">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
              { id: 'driver-panel', icon: Car, label: 'Painel' },
              { id: 'transactions', icon: Wallet, label: 'Extrato' },
              { id: 'shopping', icon: ShoppingCart, label: 'Lista' },
              { id: 'goals', icon: Flag, label: 'Metas' },
              { id: 'investment', icon: Calculator, label: 'Calc' }
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                <item.icon size={18} />
                <span className="text-[6px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
        </nav>
      </main>

      {/* Modals Container */}
      {(isModalOpen || isGoalModalOpen || isContributionModalOpen || isDriverModalOpen || isShoppingModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300">
            <div className="bg-slate-900 border-t md:border border-white/10 w-full max-lg rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 md:p-10 border-b border-white/5 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                      {isGoalModalOpen ? 'Nova Meta' : isContributionModalOpen ? `Aporte: ${selectedGoal?.description}` : isDriverModalOpen ? 'Nova Entrada App' : isShoppingModalOpen ? 'Adicionar Item' : 'Novo Lançamento'}
                    </h3>
                    <button onClick={() => { setIsModalOpen(false); setIsGoalModalOpen(false); setIsContributionModalOpen(false); setIsDriverModalOpen(false); setIsShoppingModalOpen(false); setSelectedGoal(null); }} className="bg-slate-800 p-2.5 rounded-full text-slate-400 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto">
                    {/* Shopping Item Form */}
                    {isShoppingModalOpen && (
                      <form onSubmit={handleAddShoppingItem} className="space-y-6 pb-8">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Nome do Item</label><input name="name" required placeholder="Ex: Arroz" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Qtd/Peso</label>
                            <div className="flex gap-2">
                              <input name="quantity" type="number" step="0.01" defaultValue="1" required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" />
                              <select name="unit" className="bg-slate-800 border-2 border-slate-800 rounded-xl px-4 py-4 text-white font-black text-[10px] uppercase focus:outline-none">
                                <option value="UN">UN</option>
                                <option value="KG">KG</option>
                                <option value="L">L</option>
                                <option value="GR">GR</option>
                                <option value="ML">ML</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Preço Estimado</label>
                            <input type="text" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} placeholder="Pode pular" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-mono font-black focus:outline-none" />
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-xl active:scale-95 transition-all text-sm uppercase">Adicionar à Lista</button>
                      </form>
                    )}

                    {/* Driver Session Form */}
                    {isDriverModalOpen && (
                      <form onSubmit={handleAddDriverSession} className="space-y-5 pb-8">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Data</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white [color-scheme:dark]" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">App</label><select name="app" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white appearance-none"><option value="Uber">Uber</option><option value="99">99</option><option value="InDrive">InDrive</option><option value="Particular">Particular</option></select></div>
                          </div>
                          <div className="space-y-2"><label className="text-[10px] font-black text-emerald-500 uppercase">Faturamento Bruto</label><input type="text" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} placeholder="R$ 0,00" required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-xl text-emerald-400 font-mono font-black" /></div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1"><Fuel size={12}/> Combustível</label><input type="text" value={formatDisplayAmount(fuelRaw)} onChange={(e) => setFuelRaw(e.target.value.replace(/\D/g, ""))} placeholder="R$ 0,00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-rose-400 font-mono" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1"><Utensils size={12}/> Comida</label><input type="text" value={formatDisplayAmount(foodRaw)} onChange={(e) => setFoodRaw(e.target.value.replace(/\D/g, ""))} placeholder="R$ 0,00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-amber-400 font-mono" /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Km</label><input type="number" step="0.01" value={kmRaw} onChange={(e) => setKmRaw(e.target.value)} required placeholder="0.00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Viagens</label><input type="number" value={tripsRaw} onChange={(e) => setTripsRaw(e.target.value)} required placeholder="10" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white" /></div>
                          </div>
                          <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-xl active:scale-95 transition-all text-sm uppercase">Salvar Entrada</button>
                      </form>
                    )}

                    {/* Standard Transaction Form */}
                    {isModalOpen && (
                        <form onSubmit={handleAddTransaction} className="space-y-6">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <label className="cursor-pointer group">
                                <input type="radio" name="type" value="expense" checked={formType === 'expense'} onChange={() => setFormType('expense')} className="peer sr-only" />
                                <div className="text-center py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black peer-checked:border-rose-500 peer-checked:text-rose-500 transition-all uppercase text-[9px]">Saída</div>
                              </label>
                              <label className="cursor-pointer group">
                                <input type="radio" name="type" value="income" checked={formType === 'income'} onChange={() => setFormType('income')} className="peer sr-only" />
                                <div className="text-center py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black peer-checked:border-emerald-500 peer-checked:text-emerald-500 transition-all uppercase text-[9px]">Entrada</div>
                              </label>
                            </div>
                            <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Descrição</label><input name="description" required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Valor</label><input type="text" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-mono font-black focus:outline-none" /></div>
                              {activeTab !== 'fixed' && <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Data</label><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none [color-scheme:dark]" /></div>}
                            </div>
                            <button type="submit" className={`w-full font-black py-5 rounded-2xl active:scale-95 text-white transition-all text-sm uppercase ${formType === 'income' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}>Guardar</button>
                        </form>
                    )}

                    {/* Goal Form */}
                    {isGoalModalOpen && (
                        <form onSubmit={handleAddGoal} className="space-y-6 pb-8">
                            <div className="grid grid-cols-2 gap-3 mb-6">
                              <button type="button" onClick={() => setGoalType('financial')} className={`p-4 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${goalType === 'financial' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-800 text-slate-500'}`}>Financeira</button>
                              <button type="button" onClick={() => setGoalType('activity')} className={`p-4 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${goalType === 'activity' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-slate-800 text-slate-500'}`}>Atividade</button>
                            </div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Descrição da Meta</label><input name="description" required placeholder="Ex: Viagem de Férias" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" /></div>
                            {goalType === 'financial' && (
                              <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Valor Alvo (R$)</label><input type="text" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-mono font-black focus:outline-none" /></div>
                            )}
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Prazo (Opcional)</label><input name="deadline" type="date" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white [color-scheme:dark]" /></div>
                            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-xl active:scale-95 transition-all text-sm uppercase">Criar Meta</button>
                        </form>
                    )}

                    {/* Contribution Form */}
                    {isContributionModalOpen && (
                        <form onSubmit={handleContribution} className="space-y-6 pb-8">
                            <div className="text-center mb-4">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {selectedGoal?.type === 'financial' ? 'Aportar para:' : 'Evoluir:'}
                              </p>
                              <h4 className="text-xl font-black text-white">{selectedGoal?.description}</h4>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase text-center block">
                                {selectedGoal?.type === 'financial' ? 'Valor do Aporte (R$)' : 'Progresso Adicional (%)'}
                              </label>
                              <input 
                                type="text" 
                                value={selectedGoal?.type === 'financial' ? formatDisplayAmount(amountRaw) : amountRaw} 
                                onChange={(e) => {
                                  if(selectedGoal?.type === 'activity') {
                                    if(/^[0-9]*$/.test(e.target.value)) setAmountRaw(e.target.value);
                                  } else {
                                    handleAmountChange(e);
                                  }
                                }} 
                                required 
                                placeholder={selectedGoal?.type === 'financial' ? 'R$ 0,00' : '0'}
                                className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-6 text-white font-mono font-black focus:outline-none text-center text-2xl" 
                              />
                            </div>
                            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-xl active:scale-95 transition-all text-sm uppercase">Confirmar</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Deletion Confirmations */}
      {(transactionToDelete || goalToDelete) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/5 w-full max-sm rounded-[2.5rem] p-8 space-y-6 text-center shadow-2xl">
            <Trash2 size={32} className="mx-auto text-rose-500" />
            <h4 className="text-xl font-black text-white uppercase">Eliminar Registro?</h4>
            <div className="flex flex-col gap-3">
              <button onClick={() => { if(transactionToDelete) confirmDeleteTransaction(); else confirmDeleteGoal(); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest transition-all active:scale-95">Excluir</button>
              <button onClick={() => { setTransactionToDelete(null); setGoalToDelete(null); }} className="w-full bg-slate-800 text-slate-300 font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}