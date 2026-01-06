import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Trash2, TrendingUp, X,
  ChevronLeft, ChevronRight, Repeat, Calculator, Coins, Target, ShieldCheck, Briefcase,
  UserCheck, Zap, Flag, CheckCircle2, Trophy, Activity, Car, Fuel, Info, Wrench, Ban,
  Clock, MapPin, CircleUser, Utensils, CalendarDays, ShoppingCart, CheckSquare, Square,
  Scale, Edit3, Check, LogOut, Mail, Lock, UserPlus, LogIn, Download
} from 'lucide-react';
import { createClient, User } from '@supabase/supabase-js';

import { Transaction, CalcInputs, CalcResult, Goal, GoalType, DriverInputs, DriverSession, DriverApp, ShoppingItem } from './types';
import { round, formatCurrency, formatDisplayAmount } from './utils/format';
import { DonutChart, BarChart } from './components/Charts';

// --- Configurações Supabase ---
const SUPABASE_URL = 'https://xfzovpgksotlyjqqhjtg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2AEKLFtJ5XbzIRNamr90hg_Xokeu1KP';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DASHBOARD_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function App() {
  // --- States ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedTransactions, setFixedTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [driverSessions, setDriverSessions] = useState<DriverSession[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [activeTab, setActiveTab] = useState<'inicio' | 'transactions' | 'fixed' | 'investment' | 'goals' | 'driver-panel' | 'shopping'>('inicio');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  
  // Selection & Editing
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Form helpers
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [isFixedForm, setIsFixedForm] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>('financial');
  const [amountRaw, setAmountRaw] = useState('');
  const [fuelRaw, setFuelRaw] = useState('');
  const [foodRaw, setFoodRaw] = useState('');
  const [kmRaw, setKmRaw] = useState('');
  const [tripsRaw, setTripsRaw] = useState('');
  
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [inlinePriceRaw, setInlinePriceRaw] = useState('');
  const [driverTimeframe, setDriverTimeframe] = useState<'diario' | 'mensal'>('diario');

  const [calcType, setCalcType] = useState<'million' | 'compound' | 'income' | 'emergency' | 'driver'>('million'); 
  const [calcInputs, setCalcInputs] = useState<CalcInputs>({
      startDate: new Date().toISOString().split('T')[0],
      initialRaw: '100000', monthlyRaw: '100000', rate: 8, rateType: 'annual', period: 10,
      periodType: 'years', millionMode: 'term', withdrawalRaw: '0', monthlyCostRaw: '300000', 
      coverageMonths: 6, employmentType: 'clt' 
  });
  
  const [driverInputs, setDriverInputs] = useState<DriverInputs>({
    vehicleType: 'financed', vehicleValueRaw: '4800000', installmentRaw: '148000',
    depreciationPercent: '10', monthlyKmRaw: '5000', insuranceRaw: '35000', ipvaRaw: '192000',
    tireCostRaw: '160000', tireLifeRaw: '50000', oilCostRaw: '25000',
    oilIntervalRaw: '10000', fuelPriceRaw: '589', fuelConsumptionRaw: '10',
    desiredProfitRaw: '500000', maintenanceIncluded: true
  });
  
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // --- Função Utilitária para Erros ---
  const handleAppError = (err: any, action: string) => {
    console.error(`Erro ao ${action}:`, err);
    let message = err.message || "Erro desconhecido. Verifique sua conexão.";
    
    if (err.code === 'PGRST204') {
      message = `O banco de dados precisa ser atualizado. A coluna 'payment_method' não foi encontrada. Por favor, execute o comando SQL no painel do Supabase conforme as instruções recebidas.`;
    }

    alert(`Ops! Não foi possível ${action}:\n\n${message}`);
  };

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthError('Verifique seu e-mail para confirmar o cadastro!');
      }
    } catch (error: any) {
      setAuthError(error.message || 'Erro na autenticação.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Real-time Data Listeners ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    const [{ data: t }, { data: f }, { data: g }, { data: d }, { data: s }] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('fixed_transactions').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('driver_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('shopping_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);

    setTransactions(t?.map(i => ({...i, dateObj: i.date ? new Date(i.date + 'T00:00:00') : new Date()})) || []);
    setFixedTransactions(f?.map(i => ({...i, isFixed: true})) || []);
    setGoals(g?.map(i => ({
      id: i.id,
      description: i.description,
      targetAmount: i.target_amount,
      currentAmount: i.current_amount,
      type: i.type,
      deadline: i.deadline,
      createdAt: i.created_at
    })) || []);
    setDriverSessions(d?.map(i => ({
      id: i.id,
      date: i.date,
      app: i.app,
      amount: i.amount,
      trips: i.trips,
      kmDriven: i.km_driven,
      hoursWorked: i.hours_worked,
      fuelSpent: i.fuel_spent,
      foodSpent: i.food_spent,
      fuelConsumption: i.fuel_consumption,
      observation: i.observation,
      createdAt: i.created_at
    })) || []);
    setShoppingList(s?.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      estimatedPrice: i.estimated_price,
      completed: i.completed,
      createdAt: i.created_at
    })) || []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAllData();

    const channels = [
      supabase.channel('db-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, fetchAllData),
      supabase.channel('db-changes-fixed').on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_transactions', filter: `user_id=eq.${user.id}` }, fetchAllData),
      supabase.channel('db-changes-goals').on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${user.id}` }, fetchAllData),
      supabase.channel('db-changes-driver').on('postgres_changes', { event: '*', schema: 'public', table: 'driver_sessions', filter: `user_id=eq.${user.id}` }, fetchAllData),
      supabase.channel('db-changes-shopping').on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `user_id=eq.${user.id}` }, fetchAllData)
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, fetchAllData]);

  // --- CRUD Handlers ---
  const handleOpenEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setIsFixedForm(!!t.isFixed);
    setFormType(t.type);
    setAmountRaw((t.amount * 100).toFixed(0));
    setIsModalOpen(true);
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const amount = amountRaw ? parseFloat(amountRaw) / 100 : 0;
    if (amount <= 0) return;

    const description = formData.get('description')?.toString() || 'Sem descrição';
    const category = formData.get('category')?.toString() || 'Outros';
    const paymentMethod = formData.get('payment_method')?.toString() || 'Pix';
    const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];

    try {
      const table = isFixedForm ? 'fixed_transactions' : 'transactions';
      const payload: any = {
        user_id: user.id,
        description,
        amount: round(amount),
        type: formType,
        category
      };

      if (!isFixedForm) {
        payload.payment_method = paymentMethod;
        payload.date = date;
      }

      if (editingTransaction) {
        const { error } = await supabase.from(table).update(payload).eq('id', editingTransaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
      }
      
      setIsModalOpen(false); 
      setAmountRaw('');
      setEditingTransaction(null);
      fetchAllData(); 
    } catch (err: any) {
      handleAppError(err, "salvar o lançamento");
    }
  };

  const handleAddDriverSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    const amount = amountRaw ? parseFloat(amountRaw) / 100 : 0;
    const fuelVal = fuelRaw ? parseFloat(fuelRaw) / 100 : 0;
    const foodVal = foodRaw ? parseFloat(foodRaw) / 100 : 0;
    const dateStr = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
    const appStr = formData.get('app')?.toString() || 'Uber';
    
    const sessionData = {
      user_id: user.id,
      app: appStr,
      amount: round(amount),
      fuel_spent: round(fuelVal),
      food_spent: round(foodVal),
      fuel_consumption: parseFloat(formData.get('fuel_consumption') as string || '10'),
      km_driven: parseFloat(kmRaw),
      trips: parseInt(tripsRaw),
      hours_worked: formData.get('hours_worked') || '08:00',
      date: dateStr,
      observation: formData.get('observation')
    };

    try {
      const { error: sessionError } = await supabase.from('driver_sessions').insert([sessionData]);
      if (sessionError) throw sessionError;

      const ledgerEntries = [];
      ledgerEntries.push({
        user_id: user.id,
        description: `Ganhos ${appStr}`,
        amount: round(amount),
        type: 'income',
        category: 'Transporte',
        date: dateStr,
        payment_method: 'Pix'
      });
      
      if (fuelVal > 0) {
        ledgerEntries.push({
          user_id: user.id,
          description: `Combustível (${appStr})`,
          amount: round(fuelVal),
          type: 'expense',
          category: 'Transporte',
          date: dateStr,
          payment_method: 'Pix'
        });
      }
      
      if (foodVal > 0) {
        ledgerEntries.push({
          user_id: user.id,
          description: `Refeição (${appStr})`,
          amount: round(foodVal),
          type: 'expense',
          category: 'Alimentação',
          date: dateStr,
          payment_method: 'Dinheiro'
        });
      }

      const { error: ledgerError } = await supabase.from('transactions').insert(ledgerEntries);
      if (ledgerError) throw ledgerError;

      setIsDriverModalOpen(false); 
      setAmountRaw(''); setFuelRaw(''); setFoodRaw(''); setKmRaw(''); setTripsRaw('');
      fetchAllData();
    } catch (err: any) {
      handleAppError(err, "registrar a sessão de ganhos");
    }
  };

  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    let targetVal = goalType === 'financial' ? (amountRaw ? parseFloat(amountRaw)/100 : 0) : 100;
    if (targetVal <= 0) return;

    try {
      const { error } = await supabase.from('goals').insert([{
        user_id: user.id,
        description: formData.get('description'),
        target_amount: targetVal,
        current_amount: 0,
        deadline: formData.get('deadline') || null,
        type: goalType
      }]);
      if (error) throw error;
      setIsGoalModalOpen(false); setAmountRaw('');
      fetchAllData();
    } catch (err: any) {
      handleAppError(err, "criar a meta");
    }
  };

  const handleContribution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user || !selectedGoal) return;
    let contrib = selectedGoal.type === 'financial' ? (amountRaw ? parseFloat(amountRaw)/100 : 0) : parseInt(amountRaw || '0');
    if (contrib <= 0) return;

    try {
      const { error } = await supabase.from('goals').update({ 
        current_amount: selectedGoal.currentAmount + contrib 
      }).eq('id', selectedGoal.id);
      if (error) throw error;
      setIsContributionModalOpen(false); setAmountRaw('');
      fetchAllData();
    } catch (err: any) {
      handleAppError(err, "registrar o aporte");
    }
  };

  const handleAddShoppingItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user) return;
    const formData = new FormData(e.currentTarget);
    const price = amountRaw ? parseFloat(amountRaw) / 100 : 0;
    
    try {
      const { error } = await supabase.from('shopping_items').insert([{
        user_id: user.id,
        name: formData.get('name'),
        quantity: parseFloat(formData.get('quantity') as string) || 1,
        unit: formData.get('unit'),
        estimated_price: round(price),
        completed: false
      }]);
      if (error) throw error;
      setIsShoppingModalOpen(false); setAmountRaw('');
      fetchAllData();
    } catch (err: any) {
      handleAppError(err, "adicionar item à lista");
    }
  };

  const toggleShoppingItem = async (item: ShoppingItem) => {
    await supabase.from('shopping_items').update({ completed: !item.completed }).eq('id', item.id);
    fetchAllData();
  };

  const updateShoppingItemPrice = async (itemId: string, newPrice: number) => {
    await supabase.from('shopping_items').update({ estimated_price: newPrice }).eq('id', itemId);
    setEditingPriceId(null); setInlinePriceRaw('');
    fetchAllData();
  };

  const deleteShoppingItem = async (id: string) => {
    await supabase.from('shopping_items').delete().eq('id', id);
    fetchAllData();
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete || !user) return;
    const isFixed = fixedTransactions.some(ft => ft.id === transactionToDelete);
    const table = isFixed ? 'fixed_transactions' : 'transactions';
    
    try {
      const { error } = await supabase.from(table).delete().eq('id', transactionToDelete);
      if (error) throw error;
      
      if (isFixed) {
        setFixedTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
      } else {
        setTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
      }
    } catch (err: any) {
      handleAppError(err, "excluir o lançamento");
    } finally {
      setTransactionToDelete(null);
    }
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      const { error } = await supabase.from('goals').delete().eq('id', goalToDelete);
      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== goalToDelete));
    } catch (err: any) {
      handleAppError(err, "excluir a meta");
    } finally {
      setGoalToDelete(null);
    }
  };

  // --- Memos ---
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
    const registerExpenses = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (driverTimeframe === 'diario') return t.date === selectedDay;
      return t.date?.startsWith(selectedMonth);
    }).reduce((acc, t) => acc + (t.amount || 0), 0);
    const fixedExpTotal = driverTimeframe === 'mensal' 
      ? fixedTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0)
      : 0;
    const totalAmount = sessions.reduce((acc, s) => acc + (s.amount || 0), 0);
    const totalTrips = sessions.reduce((acc, s) => acc + (s.trips || 0), 0);
    const totalKm = sessions.reduce((acc, s) => acc + (s.kmDriven || 0), 0);
    let totalMinutes = 0;
    sessions.forEach(s => {
      if (s.hoursWorked) {
        const parts = s.hoursWorked.split(':');
        totalMinutes += (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
      }
    });
    const totalHoursDecimal = totalMinutes / 60;
    const formattedHours = `${Math.floor(totalMinutes/60).toString().padStart(2, '0')}:${(totalMinutes%60).toString().padStart(2, '0')}`;
    const totalCost = round(registerExpenses + fixedExpTotal);
    const netProfit = round(totalAmount - totalCost);
    const appBreakdown: Record<string, number> = { Uber: 0, '99': 0, InDrive: 0, Particular: 0 };
    sessions.forEach(s => { if (s.app && appBreakdown[s.app] !== undefined) appBreakdown[s.app] += (s.amount || 0); });
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
  }, [driverSessions, transactions, fixedTransactions, selectedMonth, selectedDay, driverTimeframe]);

  const driverMetrics = useMemo(() => [
    { label: 'TOTAL DE VIAGENS', value: driverStats.totalTrips },
    { label: 'HORAS TRABALHADAS', value: driverStats.formattedHours },
    { label: 'KMS RODADOS', value: driverStats.totalKm.toFixed(2) },
    { label: 'FAT. POR VIAGENS', value: formatCurrency(driverStats.fatPorViagem) },
    { label: 'FAT. MÉDIO POR HORA', value: formatCurrency(driverStats.fatPorHora) },
    { label: 'FAT. MÉDIO POR KM', value: formatCurrency(driverStats.fatPorKm) },
    { label: 'LUCRO POR VIAGENS', value: formatCurrency(driverStats.lucroPorViagem) },
    { label: 'LUCRO POR HORA', value: formatCurrency(driverStats.lucroPorHora) },
    { label: 'LUCRO POR KM', value: formatCurrency(driverStats.lucroPorKm) }
  ], [driverStats]);

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
              timeline.push({ label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(), value: round(cur) }); 
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
              timeline.push({ label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(), value: round(Math.max(0, cur)) }); 
            } 
            if (cur <= 0) { cur = 0; break; } 
          }
          setCalcResult({ total: round(cur), finalBalance: round(cur), totalWithdrawn: round(totalWith), invested: round(initial), interest: round(Math.max(0, (cur + totalWith) - initial)), timeline: timeline.slice(-6) });
      } else if (calcType === 'emergency') {
          const targetVal = round(monthlyCostInput * coverageMonths);
          const missingVal = round(Math.max(0, targetVal - initial));
          let monthsToTargetVal = 0; let cur = initial; 
          if (missingVal > 0 && (monthly > 0 || monthlyRate > 0)) { 
            while (cur < targetVal && monthsToTargetVal < 1200) { cur = (cur * (1 + monthlyRate)) + monthly; monthsToTargetVal++; } 
          }
          const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToTargetVal);
          setCalcResult({ total: round(cur), target: targetVal, missing: missingVal, monthsToTarget: monthsToTargetVal, years: Math.floor(monthsToTargetVal / 12), months: monthsToTargetVal % 12, targetDate: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }), invested: round(initial + (monthly * monthsToTargetVal)), interest: round(Math.max(0, cur - (initial + (monthly * monthsToTargetVal)))) });
      } else if (calcType === 'million') {
          const targetMil = 1000000; 
          if (initial >= targetMil) { setCalcResult({ reached: true, total: round(initial) }); return; }
          if (millionMode === 'term') { 
            let balance = initial; let monthsCount = 0; 
            while (balance < targetMil && monthsCount < 1200) { balance = (balance * (1 + monthlyRate)) + monthly; monthsCount++; } 
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsCount); 
            setCalcResult({ term: monthsCount, years: Math.floor(monthsCount / 12), months: monthsCount % 12, targetDate: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }), total: round(balance), invested: round(initial + (monthly * monthsCount)), interest: round(balance - (initial + (monthly * monthsCount))) }); 
          } else { 
            const factor = Math.pow(1 + monthlyRate, totalMonths); 
            const fvInitial = initial * factor; 
            const annuityFactor = monthlyRate === 0 ? totalMonths : (factor - 1) / monthlyRate; 
            const needed = (targetMil - fvInitial) / annuityFactor; 
            setCalcResult({ total: targetMil, neededAmount: round(Math.max(0, needed)), invested: initial }); 
          }
      } else if (calcType === 'driver') {
          const carVal = parseInt(driverInputs.vehicleValueRaw || '0') / 100; 
          const mKm = parseInt(driverInputs.monthlyKmRaw || '1'); 
          const fuelPrice = parseInt(driverInputs.fuelPriceRaw || '0') / 100; 
          const fuelCons = parseFloat(driverInputs.fuelConsumptionRaw || '10'); 
          const dProfit = parseInt(driverInputs.desiredProfitRaw || '0') / 100;
          
          const annualIpva = parseInt(driverInputs.ipvaRaw || '0') / 100;
          const monthlyInsurance = parseInt(driverInputs.insuranceRaw || '0') / 100;
          const tireSetPrice = parseInt(driverInputs.tireCostRaw || '0') / 100;
          const oilPrice = parseInt(driverInputs.oilCostRaw || '0') / 100;
          const oilInterval = parseFloat(driverInputs.oilIntervalRaw || '10000');
          const installment = parseInt(driverInputs.installmentRaw || '0') / 100;

          let fixedMonthlyCosts = 0;
          if (driverInputs.vehicleType === 'financed') {
            fixedMonthlyCosts = installment + (annualIpva / 12) + monthlyInsurance;
          } else if (driverInputs.vehicleType === 'rented') {
            fixedMonthlyCosts = installment;
          } else {
            fixedMonthlyCosts = (annualIpva / 12) + monthlyInsurance + (carVal * 0.01); // 1% provision for maintenance on owned car
          }

          // Variable maintenance costs
          // Jogo de pneu dura em média um ano
          const tireMonthlyCost = (driverInputs.vehicleType !== 'rented' || !driverInputs.maintenanceIncluded) ? (tireSetPrice / 12) : 0;
          // Troca de óleo a cada 10 mil KM
          const oilMonthlyCost = (driverInputs.vehicleType !== 'rented' || !driverInputs.maintenanceIncluded) ? (oilPrice / (oilInterval / Math.max(1, mKm))) : 0;
          
          // Consumption cost
          const fuelKmCost = fuelPrice / Math.max(0.1, fuelCons);

          const totalMonthlyExpenses = fixedMonthlyCosts + tireMonthlyCost + oilMonthlyCost + (mKm * fuelKmCost);
          const costPerKm = totalMonthlyExpenses / Math.max(1, mKm);
          const minRatePerKm = (totalMonthlyExpenses + dProfit) / Math.max(1, mKm);
          
          setCalcResult({ 
            total: dProfit, 
            target: dProfit, 
            monthlyCost: totalMonthlyExpenses, 
            costPerKm: round(costPerKm), 
            minRatePerKm: round(minRatePerKm) 
          });
      }
  }, [calcInputs, calcType, driverInputs]);

  const navigatePeriod = (offset: number) => {
    if (activeTab === 'driver-panel' && driverTimeframe === 'diario') {
      const d = new Date(selectedDay + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      setSelectedDay(d.toISOString().split('T')[0]);
    } else {
      const d = new Date(selectedMonth + '-01');
      d.setMonth(d.getMonth() + offset);
      setSelectedMonth(d.toISOString().slice(0, 7));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full mb-4" />
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Carregando...</p>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="bg-emerald-500 p-4 rounded-3xl shadow-2xl shadow-emerald-500/20 w-fit mx-auto mb-6">
              <TrendingUp size={40} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-white">FIN<span className="text-emerald-500">CONTROL</span></h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Sua Inteligência Financeira</p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase mb-8 text-center">
              {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-2xl px-12 py-4 text-white focus:border-emerald-500/50 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-2xl px-12 py-4 text-white focus:border-emerald-500/50 outline-none transition-all" 
                  />
                </div>
              </div>

              {authError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase p-3 rounded-xl text-center animate-pulse">
                  {authError}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
              >
                {authMode === 'login' ? <LogIn size={18} strokeWidth={3} /> : <UserPlus size={18} strokeWidth={3} />}
                {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(null); }}
                className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-slate-950">
        <div className="p-10 flex items-center gap-4">
          <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20"><TrendingUp size={24} className="text-white" strokeWidth={3} /></div>
          <h1 className="text-xl font-black tracking-tighter uppercase">FIN<span className="text-emerald-500">CONTROL</span></h1>
        </div>
        <nav className="flex-1 px-6 space-y-1">
          {[
            { id: 'inicio', icon: LayoutDashboard, label: 'Início' },
            { id: 'transactions', icon: Wallet, label: 'Lançamentos' },
            { id: 'fixed', icon: Repeat, label: 'Contas Fixas' },
            { id: 'driver-panel', icon: Car, label: 'Painel Motorista' },
            { id: 'shopping', icon: ShoppingCart, label: 'Lista Compras' },
            { id: 'goals', icon: Flag, label: 'Metas' },
            { id: 'investment', icon: Calculator, label: 'Calculadora' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/5 text-emerald-400' : 'text-slate-500 hover:text-slate-200'}`}>
              <item.icon size={18} /><span className="font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 mt-auto space-y-4">
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-3 group hover:border-emerald-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <CircleUser size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Sua Conta</p>
              <p className="text-xs font-bold text-slate-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all font-bold group">
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" /><span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex items-center justify-between p-4 md:p-6 md:px-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-1 md:gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                <button onClick={() => navigatePeriod(-1)} className="p-1.5 md:p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] px-2 md:px-3 min-w-[100px] md:min-w-[180px] text-center text-slate-300 truncate">
                  {activeTab === 'driver-panel' && driverTimeframe === 'diario' 
                    ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : monthLabel}
                </span>
                <button onClick={() => navigatePeriod(1)} className="p-1.5 md:p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronRight size={16} /></button>
            </div>
            <button onClick={() => { 
                setAmountRaw(''); 
                setEditingTransaction(null);
                setIsFixedForm(activeTab === 'fixed');
                if (activeTab === 'goals') setIsGoalModalOpen(true); 
                else if (activeTab === 'driver-panel') setIsDriverModalOpen(true); 
                else if (activeTab === 'shopping') setIsShoppingModalOpen(true); 
                else setIsModalOpen(true); 
              }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black transition-all active:scale-95 text-[9px] md:text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20">
              <Plus size={16} strokeWidth={3} /> {activeTab === 'goals' ? 'Nova Meta' : activeTab === 'driver-panel' ? 'Nova Entrada' : activeTab === 'shopping' ? 'Novo Item' : 'Novo Lançamento'}
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24 md:pb-10">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-12">
                {activeTab === 'inicio' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden group hover:border-white/10 transition-colors">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Saldo Mensal</span>
                              <h3 className={`text-xl md:text-2xl lg:text-4xl font-black tracking-tighter ${stats.balance >= 0 ? 'text-white' : 'text-rose-500'}`}>{formatCurrency(stats.balance)}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden group hover:border-emerald-500/10 transition-colors">
                              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 block">Entradas</span>
                              <h3 className="text-xl md:text-2xl lg:text-4xl font-black text-white">{formatCurrency(stats.totalIncome)}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden group hover:border-rose-500/10 transition-colors">
                              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3 block">Saídas</span>
                              <h3 className="text-xl md:text-2xl lg:text-4xl font-black text-white">{formatCurrency(stats.totalExpense)}</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                            <div className="lg:col-span-5 bg-slate-900/40 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl text-center"><h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 md:mb-8">Gastos por Categoria</h4><DonutChart data={chartData.pieData} colors={DASHBOARD_COLORS} /></div>
                            <div className="lg:col-span-7 bg-slate-900/40 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl overflow-hidden"><h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 md:mb-8">Evolução de Ganhos</h4><BarChart data={chartData.barData} height={200} /></div>
                        </div>
                    </div>
                )}

                {activeTab === 'driver-panel' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                      <div className="flex p-1 bg-[#020617] rounded-2xl border border-white/5 w-fit">
                        {['diario', 'mensal'].map(tf => (
                          <button key={tf} onClick={() => setDriverTimeframe(tf as any)} className={`px-10 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${driverTimeframe === tf ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{tf}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="bg-gradient-to-br from-emerald-600 to-emerald-400 p-6 md:p-10 rounded-[2.5rem] shadow-xl shadow-emerald-950/20 text-center flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px] transition-all hover:scale-[1.02]">
                        <span className="text-[9px] md:text-[10px] font-black text-emerald-950/60 uppercase block mb-2 md:mb-3 tracking-widest">
                          {driverTimeframe === 'diario' ? 'FATURAMENTO DIÁRIO' : 'FATURAMENTO MENSAL'}
                        </span>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-sm">
                          {formatCurrency(driverStats.totalAmount)}
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-rose-600 to-rose-400 p-6 md:p-10 rounded-[2.5rem] shadow-xl shadow-rose-950/20 text-center flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px] transition-all hover:scale-[1.02]">
                        <span className="text-[9px] md:text-[10px] font-black text-rose-950/60 uppercase block mb-2 md:mb-3 tracking-widest">GASTOS TOTAIS</span>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-sm">
                          {formatCurrency(driverStats.totalCost)}
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-600 to-indigo-400 p-6 md:p-10 rounded-[2.5rem] shadow-xl shadow-indigo-950/20 text-center flex flex-col items-center justify-center min-h-[140px] md:min-h-[180px] transition-all hover:scale-[1.02]">
                        <span className="text-[9px] md:text-[10px] font-black text-indigo-950/60 uppercase block mb-2 md:mb-3 tracking-widest">SALDO LÍQUIDO</span>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-sm">
                          {formatCurrency(driverStats.netProfit)}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      {driverMetrics.map((m, i) => (
                        <div key={i} className="bg-slate-900/40 border border-white/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center text-center gap-1.5 md:gap-3 transition-colors hover:bg-slate-800/40">
                          <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">{m.label}</span>
                          <span className="text-lg md:text-2xl font-black text-white truncate w-full">{m.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#0b1120] border border-white/5 rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-12 space-y-8 md:space-y-12 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-center">
                           <div className="bg-slate-900/60 border border-emerald-500/20 px-6 md:px-10 py-2.5 md:py-3.5 rounded-full">
                             <span className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">FATURAMENTO POR APLICATIVO</span>
                           </div>
                        </div>
                        <div className="space-y-3 md:space-y-4 max-w-5xl mx-auto">
                            {[
                                { id: '99', label: '99', color: 'bg-amber-500', icon: CircleUser, amount: driverStats.appBreakdown['99'] },
                                { id: 'uber', label: 'Uber', color: 'bg-[#020617]', icon: CircleUser, amount: driverStats.appBreakdown['Uber'] },
                                { id: 'indrive', label: 'InDrive', color: 'bg-indigo-500', icon: CircleUser, amount: driverStats.appBreakdown['InDrive'] },
                                { id: 'particular', label: 'Particular', color: 'bg-blue-600', icon: CircleUser, amount: driverStats.appBreakdown['Particular'] }
                            ].map(app => (
                                <div key={app.id} className="bg-[#020617]/50 border border-white/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between hover:bg-white/[0.03] transition-all group">
                                    <div className="flex items-center gap-3 md:gap-6">
                                        <div className={`${app.color} w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl border border-white/10`}>
                                            <app.icon size={20} className="md:w-6 md:h-6" />
                                        </div>
                                        <span className="text-sm md:text-xl font-black text-white uppercase tracking-tight">{app.label}</span>
                                    </div>
                                    <span className="text-lg md:text-2xl font-black text-slate-100 font-mono tracking-tight">
                                        {formatCurrency(app.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
                )}

                {activeTab === 'shopping' && (
                  <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-2">
                    {/* Shopping Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="bg-gradient-to-br from-emerald-600/80 to-emerald-400/80 border border-emerald-400/20 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-md">
                        <span className="text-[9px] md:text-[10px] font-black text-emerald-950/60 uppercase tracking-widest mb-2 md:mb-3">GASTO PLANEJADO TOTAL</span>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-sm">{formatCurrency(shoppingTotal)}</h3>
                      </div>
                      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 md:mb-3">ITENS NA LISTA</span>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter">{shoppingList.length} itens</h3>
                      </div>
                    </div>

                    <div className="bg-[#0b1120]/40 border border-white/5 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden backdrop-blur-sm">
                      <div className="p-6 md:p-8 px-6 md:px-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <CheckSquare size={20} />
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">CHECKLIST DE COMPRAS</h3>
                        </div>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-900/60 px-4 py-1.5 rounded-full border border-white/5">DICA: CLIQUE NO PREÇO PARA ALTERAR</p>
                      </div>
                      
                      <div className="p-4 md:p-8 space-y-3">
                        {shoppingList.length === 0 ? (
                          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                            <ShoppingCart size={48} strokeWidth={1} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sua lista está vazia</p>
                          </div>
                        ) : shoppingList.map(item => (
                          <div key={item.id} className={`bg-[#020617]/40 border border-white/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between group hover:bg-white/[0.03] transition-all gap-3 md:gap-6 ${item.completed ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                            <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                              <button 
                                onClick={() => toggleShoppingItem(item)} 
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center transition-all border-2 ${item.completed ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-900 border-white/10 text-slate-700 hover:border-white/20'}`}
                              >
                                {item.completed ? <Check size={24} strokeWidth={4} /> : <Square size={24} />}
                              </button>
                              <div className="truncate flex-1">
                                <p className={`font-black text-base md:text-xl lg:text-2xl text-white truncate leading-tight ${item.completed ? 'line-through opacity-50' : ''}`}>{item.name}</p>
                                <div className="flex items-center gap-2 mt-1 md:mt-1.5">
                                  <span className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-white/5">
                                    <Scale size={10} /> {item.quantity} {item.unit}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                              {editingPriceId === item.id ? (
                                <input 
                                  autoFocus 
                                  type="text" 
                                  inputMode="decimal"
                                  value={formatDisplayAmount(inlinePriceRaw)} 
                                  onChange={(e) => setInlinePriceRaw(e.target.value.replace(/\D/g, ""))} 
                                  onBlur={() => updateShoppingItemPrice(item.id, inlinePriceRaw ? parseFloat(inlinePriceRaw)/100 : 0)} 
                                  onKeyDown={(e) => { if (e.key === 'Enter') updateShoppingItemPrice(item.id, inlinePriceRaw ? parseFloat(inlinePriceRaw)/100 : 0); }} 
                                  className="w-24 md:w-32 bg-slate-950 border-2 border-emerald-500 rounded-xl px-3 py-2.5 md:py-3 text-sm md:text-lg font-mono font-black text-white focus:outline-none shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                                />
                              ) : (
                                <button 
                                  onClick={() => { setEditingPriceId(item.id); setInlinePriceRaw((item.estimatedPrice * 100).toString()); }} 
                                  className={`bg-white/5 hover:bg-white/10 p-2.5 md:p-4 md:px-8 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all min-w-[100px] md:min-w-[140px] border border-white/5 ${item.estimatedPrice === 0 ? 'border-amber-500/30' : ''}`}
                                >
                                  {item.estimatedPrice > 0 ? (
                                    <span className="text-sm md:text-xl font-mono font-black text-emerald-400 leading-none">{formatCurrency(item.estimatedPrice * item.quantity)}</span>
                                  ) : (
                                    <span className="text-[9px] md:text-sm font-black text-amber-500 uppercase tracking-tighter">Definir valor</span>
                                  )}
                                  <span className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1 hidden sm:block">TOQUE PARA ALTERAR</span>
                                </button>
                              )}
                              <button onClick={() => deleteShoppingItem(item.id)} className="p-3 md:p-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl md:rounded-2xl transition-all active:scale-95 border border-rose-500/20">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'goals' && (
                  <div className="space-y-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {goals.map(goal => {
                        const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                        const isActivity = goal.type === 'activity';
                        const colorClass = isActivity ? 'blue' : 'emerald';
                        return (
                          <div key={goal.id} className="bg-[#0b1120] border border-white/5 p-10 rounded-[3.5rem] shadow-2xl space-y-8 relative group">{progress >= 100 && (<div className={`absolute top-8 right-8 text-${colorClass}-500`}><div className={`bg-${colorClass}-500/10 p-1.5 rounded-full border border-${colorClass}-500/20`}><Check size={18} strokeWidth={4} /></div></div>)}<div className="space-y-1"><div className="flex items-center gap-3"><div className={`text-${colorClass}-500`}>{goal.type === 'financial' ? <Trophy size={20} strokeWidth={3} /> : <Activity size={20} strokeWidth={3} />}</div><h4 className="text-2xl font-black text-white lowercase tracking-tight">{goal.description}</h4></div><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{goal.type === 'financial' ? `Meta: ${formatCurrency(goal.targetAmount)}` : 'Hábito / Atividade'}</p></div><div className="space-y-4"><div className="flex justify-between items-end"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso</span><span className={`text-[10px] font-black text-${colorClass}-400`}>{Math.round(progress)}%</span></div><div className="h-3.5 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden"><div className={`h-full bg-gradient-to-r from-${colorClass}-600 to-${colorClass}-400 shadow-[0_0_15px_rgba(${isActivity ? '59,130,246' : '16,185,129'},0.3)] transition-all duration-1000`} style={{ width: `${progress}%` }} /></div><div className="flex justify-between items-center text-[10px] font-black">{goal.type === 'financial' ? (<><span className="text-emerald-500">{formatCurrency(goal.currentAmount)}</span><span className="text-slate-500 uppercase tracking-tighter">{goal.currentAmount >= goal.targetAmount ? 'concluído' : `${formatCurrency(goal.targetAmount - goal.currentAmount)} faltando`}</span></>) : (<><span className="text-blue-500">{Math.round(progress)}% concluído</span><span className="text-slate-500 uppercase tracking-tighter">{100 - Math.round(progress)}% restante</span></>)}</div></div><div className="grid grid-cols-2 gap-4 pt-2"><button onClick={() => { setSelectedGoal(goal); setIsContributionModalOpen(true); }} className="flex items-center justify-center gap-2 py-4 bg-slate-800/40 hover:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all active:scale-95">{goal.type === 'financial' ? <Coins size={14} /> : <ArrowUpCircle size={14} />}{goal.type === 'financial' ? 'Aportar' : 'Evoluir'}</button><button onClick={() => setGoalToDelete(goal.id)} className="flex items-center justify-center gap-2 py-4 bg-rose-500/5 hover:bg-rose-500/10 rounded-2xl font-black text-[10px] uppercase tracking-widest text-rose-500 transition-all active:scale-95 border border-rose-500/10"><Trash2 size={14} />Excluir</button></div></div>
                        );
                      })}
                      <button onClick={() => setIsGoalModalOpen(true)} className="border-2 border-dashed border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-emerald-500/20 rounded-[3.5rem] p-10 flex flex-col items-center justify-center gap-6 group transition-all min-h-[300px]"><div className="w-20 h-20 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl relative"><div className="absolute inset-0 rounded-full border-2 border-slate-800 animate-ping opacity-20 group-hover:opacity-40" /><Target size={32} className="text-slate-700 group-hover:text-emerald-500 transition-colors" /></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-slate-300">Criar Nova Meta</span></button>
                    </div>
                  </div>
                )}

                {activeTab === 'investment' && (
                  <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-2">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Integrated Container for Sub-tabs and Inputs */}
                      <div className="lg:col-span-6 bg-[#0b1120] border border-white/5 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Integrated Menu Header */}
                        <div className="p-4 md:p-6 border-b border-white/5 bg-slate-900/30">
                          <div className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-950/50 rounded-2xl border border-white/5">
                            {[
                              {id:'million', label:'1 MILHÃO', icon: Target}, 
                              {id:'compound', label:'JUROS', icon: Calculator}, 
                              {id:'income', label:'RENDA', icon: Coins}, 
                              {id:'emergency', label:'RESERVA', icon: ShieldCheck}, 
                              {id:'driver', label:'DRIVER', icon: Car}
                            ].map(t => (
                              <button 
                                key={t.id} 
                                onClick={() => { setCalcType(t.id as any); setCalcResult(null); }} 
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap flex-1 justify-center ${calcType === t.id ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                <t.icon size={14} />
                                <span className="hidden sm:inline">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Redesigned Compact Inputs Content */}
                        <div className="p-6 md:p-10 space-y-8">
                          {calcType === 'driver' ? (
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">TIPO DE VEÍCULO:</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {['financed', 'rented', 'owned'].map(vt => (
                                    <button key={vt} onClick={() => setDriverInputs(p => ({...p, vehicleType: vt as any}))} className={`py-3 rounded-xl font-black text-[8px] uppercase tracking-widest border-2 transition-all ${driverInputs.vehicleType === vt ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-white/5 text-slate-600'}`}>{vt === 'financed' ? 'FINANCIADO' : vt === 'rented' ? 'ALUGADO' : 'QUITADO'}</button>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{driverInputs.vehicleType === 'rented' ? 'ALUGUEL' : 'VALOR CARRO'}</label>
                                  <input type="text" inputMode="decimal" value={driverInputs.vehicleType === 'rented' ? formatDisplayAmount(driverInputs.installmentRaw) : formatDisplayAmount(driverInputs.vehicleValueRaw)} onChange={(e) => driverInputs.vehicleType === 'rented' ? handleDriverInputChange('installmentRaw', e.target.value) : handleDriverInputChange('vehicleValueRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{driverInputs.vehicleType === 'financed' ? 'PARCELA' : 'KM MENSAL MÉDIO'}</label>
                                  <input type="text" inputMode="decimal" value={driverInputs.vehicleType === 'financed' ? formatDisplayAmount(driverInputs.installmentRaw) : driverInputs.monthlyKmRaw} onChange={(e) => handleDriverInputChange(driverInputs.vehicleType === 'financed' ? 'installmentRaw' : 'monthlyKmRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                </div>
                              </div>

                              {(driverInputs.vehicleType === 'financed' || driverInputs.vehicleType === 'owned') && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">IPVA (ANUAL)</label>
                                    <input type="text" inputMode="decimal" value={formatDisplayAmount(driverInputs.ipvaRaw)} onChange={(e) => handleDriverInputChange('ipvaRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">SEGURO (MENSAL)</label>
                                    <input type="text" inputMode="decimal" value={formatDisplayAmount(driverInputs.insuranceRaw)} onChange={(e) => handleDriverInputChange('insuranceRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">LITRO COMBUST.</label>
                                  <input type="text" inputMode="decimal" value={formatDisplayAmount(driverInputs.fuelPriceRaw)} onChange={(e) => handleDriverInputChange('fuelPriceRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">CONSUMO (KM/L)</label>
                                  <input type="text" inputMode="decimal" value={driverInputs.fuelConsumptionRaw} onChange={(e) => handleDriverInputChange('fuelConsumptionRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                </div>
                              </div>

                              {(driverInputs.vehicleType === 'financed' || driverInputs.vehicleType === 'owned' || !driverInputs.maintenanceIncluded) && (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">TROCA ÓLEO (A CADA 10 MIL KM)</label>
                                      <input type="text" inputMode="decimal" value={formatDisplayAmount(driverInputs.oilCostRaw)} onChange={(e) => handleDriverInputChange('oilCostRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                    </div>
                                    {driverInputs.vehicleType === 'financed' && (
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">KM MENSAL MÉDIO</label>
                                        <input type="text" inputMode="decimal" value={driverInputs.monthlyKmRaw} onChange={(e) => handleDriverInputChange('monthlyKmRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">VALOR JOGO PNEUS (1 ANO)</label>
                                    <input type="text" inputMode="decimal" value={formatDisplayAmount(driverInputs.tireCostRaw)} onChange={(e) => handleDriverInputChange('tireCostRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none transition-all" />
                                  </div>
                                </>
                              )}

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">LUCRO DESEJADO (MÊS)</label>
                                <input type="text" inputMode="decimal" value={formatDisplayAmount(driverInputs.desiredProfitRaw)} onChange={(e) => handleDriverInputChange('desiredProfitRaw', e.target.value)} className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-6 py-5 text-2xl text-emerald-400 font-mono font-black focus:border-emerald-500/40 outline-none text-center" />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">DATA INÍCIO</label>
                                  <div className="relative">
                                    <input type="date" value={calcInputs.startDate} onChange={(e) => handleCalcInputChange('startDate', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-black [color-scheme:dark] focus:border-emerald-500/30 outline-none" />
                                    <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{calcType === 'emergency' ? 'RESERVA ATUAL' : 'VALOR INICIAL'}</label>
                                  <input type="text" inputMode="decimal" value={formatDisplayAmount(calcInputs.initialRaw)} onChange={(e) => handleCalcInputChange('initialRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none" />
                                </div>
                              </div>

                              {calcType === 'million' && (
                                <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => setCalcInputs(p => ({...p, millionMode: 'term'}))} className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 transition-all ${calcInputs.millionMode === 'term' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 text-emerald-500 shadow-md shadow-emerald-500/20' : 'border-white/5 text-slate-600'}`}>Calcular Prazo</button>
                                  <button onClick={() => setCalcInputs(p => ({...p, millionMode: 'amount'}))} className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 transition-all ${calcInputs.millionMode === 'amount' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 text-emerald-500 shadow-md shadow-emerald-500/20' : 'border-white/5 text-slate-600'}`}>Calcular Aporte</button>
                                </div>
                              )}

                              {calcType === 'emergency' && (
                                <div className="grid grid-cols-3 gap-2">
                                  {['clt', 'autonomo', 'publico'].map(et => (
                                    <button key={et} onClick={() => setCalcInputs(p => ({...p, employmentType: et, coverageMonths: et === 'clt' ? 6 : et === 'autonomo' ? 12 : 3}))} className={`py-3 rounded-xl font-black text-[8px] uppercase tracking-widest border-2 transition-all ${calcInputs.employmentType === et ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 text-emerald-500 shadow-md shadow-emerald-500/20' : 'border-white/5 text-slate-600'}`}>{et === 'clt' ? 'CLT' : et === 'autonomo' ? 'AUTÔNOMO' : 'PÚBLICO'}</button>
                                  ))}
                                </div>
                              )}

                              {(calcType === 'compound' || calcType === 'million' || calcType === 'emergency') && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{calcType === 'emergency' ? 'CUSTO MENSAL' : 'APORTE MENSAL'}</label>
                                  <input type="text" inputMode="decimal" value={calcType === 'emergency' ? formatDisplayAmount(calcInputs.monthlyCostRaw) : formatDisplayAmount(calcInputs.monthlyRaw)} onChange={(e) => handleCalcInputChange(calcType === 'emergency' ? 'monthlyCostRaw' : 'monthlyRaw', e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-mono font-black focus:border-emerald-500/30 outline-none" />
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">JUROS (%)</label>
                                  <input type="number" inputMode="decimal" value={calcInputs.rate} onChange={(e) => setCalcInputs(p => ({...p, rate: parseFloat(e.target.value)}))} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-black focus:border-emerald-500/30 outline-none" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">TAXA</label>
                                  <select value={calcInputs.rateType} onChange={(e) => setCalcInputs(p => ({...p, rateType: e.target.value}))} className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-white font-black appearance-none focus:border-emerald-500/30 outline-none"><option value="annual">Anual</option><option value="monthly">Mensal</option></select>
                                </div>
                              </div>
                            </div>
                          )}

                          <button onClick={calculateInvestments} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-500/10 active:scale-[0.97] transition-all">Simular Agora</button>
                        </div>
                      </div>
                      
                      {/* Results Box */}
                      <div className="lg:col-span-6 bg-[#0b1120]/40 border border-white/5 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl min-h-[500px] flex flex-col items-center justify-center text-center p-8 md:p-12 overflow-hidden relative">
                        {calcResult ? (
                          <div className="space-y-8 w-full animate-in fade-in zoom-in duration-500 z-10">
                            <div className="space-y-6">
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Projeção Financeira</span>
                              
                              {(calcType === 'million' || calcType === 'emergency') ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 md:p-12 rounded-[2.5rem] shadow-inner space-y-4">
                                  <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter capitalize leading-none">{calcResult.targetDate}</h3>
                                  <div className="flex items-center justify-center gap-4 pt-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-900/60 px-4 py-1.5 rounded-full border border-white/5">
                                      {calcType === 'million' ? `${calcResult.years}A e ${calcResult.months}M` : `Meta: ${formatCurrency(calcResult.target || 0)}`}
                                    </span>
                                  </div>
                                </div>
                              ) : calcType === 'driver' ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 md:p-12 rounded-[2.5rem] shadow-inner space-y-6">
                                  <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                                    TAXA MÍNIMA POR KM PARA O LUCRO DESEJADO
                                  </p>
                                  <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none">R$ {calcResult.minRatePerKm?.toFixed(2)}</h3>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">{formatCurrency(calcResult.total || 0)}</h3>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mt-4">Montante Estimado</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                              <div className="bg-slate-900/60 p-5 md:p-7 rounded-[2rem] border border-white/5 flex flex-col justify-center transition-all hover:bg-slate-900/80">
                                <span className="text-[8px] font-black text-slate-500 uppercase block mb-2">{calcType === 'driver' ? 'CUSTO POR KM' : 'VALOR INVESTIDO'}</span>
                                <span className="text-xs md:text-lg font-black text-white truncate block">
                                  {calcType === 'driver' ? `R$ ${calcResult.costPerKm?.toFixed(2)}` : formatCurrency(calcResult.invested || 0)}
                                </span>
                              </div>
                              <div className="bg-slate-900/60 p-5 md:p-7 rounded-[2rem] border border-white/5 flex flex-col justify-center transition-all hover:bg-slate-900/80">
                                <span className="text-[8px] font-black text-emerald-500 uppercase block mb-2">{calcType === 'driver' ? 'CUSTO MENSAL' : 'RENDIMENTO TOTAL'}</span>
                                <span className="text-xs md:text-lg font-black text-emerald-400 truncate block">
                                  {calcType === 'driver' ? formatCurrency(calcResult.monthlyCost || 0) : formatCurrency(calcResult.interest || 0)}
                                </span>
                              </div>
                            </div>

                            {calcResult.timeline && (
                              <div className="pt-4 w-full">
                                <BarChart data={calcResult.timeline} height={100} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-8 animate-pulse text-center">
                            <div className="w-24 h-24 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto shadow-2xl">
                                <Calculator size={32} className="text-slate-800" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-slate-200 font-black uppercase text-[11px] tracking-[0.4em]">SIMULADOR FINANCEIRO</p>
                                <p className="text-slate-600 font-bold uppercase text-[8px] tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">INSIRA OS PARÂMETROS À ESQUERDA PARA VISUALIZAR A PROJEÇÃO</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Decorative background element */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.03)_0%,_transparent_70%)] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'transactions' || activeTab === 'fixed') && (
                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl md:rounded-[3rem] overflow-hidden shadow-2xl">
                        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between"><h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tight">{activeTab === 'fixed' ? 'Contas Mensais Fixas' : `${monthLabel}`}</h3></div>
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
                                          {!t.isFixed && t.date && <span className="opacity-60">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
                                      <span className={`text-xs md:text-xl font-mono font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenEditModal(t)} className="p-2.5 md:p-4 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-xl md:rounded-2xl transition-all active:scale-90 flex-shrink-0">
                                          <Edit3 size={16} />
                                        </button>
                                        <button onClick={() => setTransactionToDelete(t.id)} className="p-2.5 md:p-4 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl md:rounded-2xl transition-all active:scale-90 flex-shrink-0">
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 px-4 flex items-center justify-between z-40">
            {[
              { id: 'inicio', icon: LayoutDashboard, label: 'Início' },
              { id: 'driver-panel', icon: Car, label: 'Painel' },
              { id: 'transactions', icon: Wallet, label: 'Extrato' },
              { id: 'shopping', icon: ShoppingCart, label: 'Lista' },
              { id: 'goals', icon: Flag, label: 'Metas' },
              { id: 'investment', icon: Calculator, label: 'Calculadora' }
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                <item.icon size={18} /><span className="text-[6px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
        </nav>
      </main>

      {/* MODALS */}
      {(isModalOpen || isGoalModalOpen || isDriverModalOpen || isShoppingModalOpen || isContributionModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border-t md:border border-white/10 w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 md:p-10 border-b border-white/5 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                      {isModalOpen ? (editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento') : isGoalModalOpen ? 'Nova Meta' : isDriverModalOpen ? 'Nova Sessão' : isShoppingModalOpen ? 'Novo Item' : 'Novo Aporte'}
                    </h3>
                    <button onClick={() => { setIsModalOpen(false); setIsGoalModalOpen(false); setIsDriverModalOpen(false); setIsShoppingModalOpen(false); setIsContributionModalOpen(false); setEditingTransaction(null); }} className="bg-slate-800 p-2.5 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto pb-12">
                    {isModalOpen && (
                        <form onSubmit={handleAddTransaction} className="space-y-6">
                            {!editingTransaction && (
                              <div className="space-y-2 mb-6">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">TIPO DE REGISTRO</label>
                                <div className="grid grid-cols-2 gap-3">
                                  <button type="button" onClick={() => setIsFixedForm(false)} className={`py-4 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${!isFixedForm ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-800 text-slate-500'}`}>Lançamento Avulso</button>
                                  <button type="button" onClick={() => setIsFixedForm(true)} className={`py-4 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${isFixedForm ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-800 text-slate-500'}`}>Conta Mensal Fixa</button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-4"><label className="cursor-pointer group"><input type="radio" name="type" value="expense" checked={formType === 'expense'} onChange={() => setFormType('expense')} className="peer sr-only" /><div className="text-center py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black peer-checked:border-rose-500 peer-checked:text-rose-500 transition-all uppercase text-[9px]">Saída</div></label><label className="cursor-pointer group"><input type="radio" name="type" value="income" checked={formType === 'income'} onChange={() => { setAuthError(null); setFormType('income'); }} className="peer sr-only" /><div className="text-center py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black peer-checked:border-emerald-500 peer-checked:text-emerald-500 transition-all uppercase text-[9px]">Entrada</div></label></div>
                            <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Descrição</label><input name="description" required defaultValue={editingTransaction?.description || ''} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" /></div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2 flex-1"><label className="text-[9px] font-black text-slate-500 uppercase">Valor</label><input type="text" inputMode="decimal" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-mono font-black focus:outline-none" /></div>
                              {!isFixedForm && (
                                <div className="space-y-2 flex-1"><label className="text-[9px] font-black text-slate-500 uppercase">Método de Pagamento</label><select name="payment_method" defaultValue={editingTransaction?.payment_method || 'Pix'} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black appearance-none focus:outline-none"><option value="Pix">Pix</option><option value="Transferência">Transferência</option><option value="Dinheiro">Dinheiro</option><option value="Débito">Débito</option><option value="Crédito">Crédito</option></select></div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {!isFixedForm && <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Data</label><input name="date" type="date" defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]} required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none [color-scheme:dark]" /></div>}
                              <div className="space-y-2 flex-1"><label className="text-[9px] font-black text-slate-500 uppercase">Categoria</label><select name="category" defaultValue={editingTransaction?.category || (formType === 'expense' ? 'Moradia' : 'Salário')} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black appearance-none focus:outline-none">{formType === 'expense' ? (<><option value="Moradia">Moradia</option><option value="Alimentação">Alimentação</option><option value="Carro">Carro</option><option value="Financiamento">Financiamento</option><option value="Assinaturas">Assinaturas</option><option value="Lazer">Lazer</option><option value="Investimento">Investimento</option><option value="Transporte">Transporte</option><option value="Saúde">Saúde</option><option value="Educação">Educação</option><option value="Outros">Outros</option></>) : (<><option value="Salário">Salário</option><option value="Extra">Extra</option><option value="Dividendos">Dividendos</option><option value="Aluguéis">Aluguéis</option><option value="Investimentos">Investimentos</option><option value="Transferências">Transferências</option><option value="Outros">Outros</option></>)}</select></div>
                            </div>
                            <button type="submit" className={`w-full font-black py-5 rounded-2xl active:scale-95 text-white transition-all text-sm uppercase ${formType === 'income' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}>
                              {editingTransaction ? 'Atualizar' : 'Guardar'}
                            </button>
                        </form>
                    )}
                    
                    {isGoalModalOpen && (
                      <form onSubmit={handleAddGoal} className="space-y-6">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <button type="button" onClick={() => setGoalType('financial')} className={`p-4 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${goalType === 'financial' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-slate-800 text-slate-500'}`}>Financeira</button>
                          <button type="button" onClick={() => setGoalType('activity')} className={`p-4 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${goalType === 'activity' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : 'border-slate-800 text-slate-500'}`}>Não-Financeira</button>
                        </div>
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Descrição da Meta</label><input name="description" required placeholder="Ex: Novo Carro" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" /></div>
                        {goalType === 'financial' && (
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Valor Alvo</label><input type="text" inputMode="decimal" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-mono font-black focus:outline-none" /></div>
                        )}
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Data Limite (Opcional)</label><input name="deadline" type="date" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none [color-scheme:dark]" /></div>
                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all text-sm uppercase">Criar Meta</button>
                      </form>
                    )}

                    {isDriverModalOpen && (
                      <form onSubmit={handleAddDriverSession} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Data</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white [color-scheme:dark]" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">App</label><select name="app" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white appearance-none"><option value="Uber">Uber</option><option value="99">99</option><option value="InDrive">InDrive</option><option value="Particular">Particular</option></select></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-emerald-500 uppercase">Ganhos</label><input type="text" inputMode="decimal" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} placeholder="R$ 0,00" required className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-xl text-emerald-400 font-mono font-black" /></div>
                        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-rose-500 uppercase">Combustível</label><input type="text" inputMode="decimal" value={formatDisplayAmount(fuelRaw)} onChange={(e) => setFuelRaw(e.target.value.replace(/\D/g, ""))} placeholder="R$ 0,00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-rose-400 font-mono" /></div><div className="space-y-2"><label className="text-[10px] font-black text-amber-500 uppercase">Comida</label><input type="text" inputMode="decimal" value={formatDisplayAmount(foodRaw)} onChange={(e) => setFoodRaw(e.target.value.replace(/\D/g, ""))} placeholder="R$ 0,00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-amber-400 font-mono" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Km</label><input type="number" step="0.01" inputMode="decimal" value={kmRaw} onChange={(e) => setKmRaw(e.target.value)} required placeholder="0.00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Viagens</label><input type="number" inputMode="numeric" value={tripsRaw} onChange={(e) => setTripsRaw(e.target.value)} required placeholder="10" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-white" /></div></div>
                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-xl transition-all text-sm uppercase">Salvar Sessão</button>
                      </form>
                    )}

                    {isShoppingModalOpen && (
                      <form onSubmit={handleAddShoppingItem} className="space-y-6">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Item</label><input name="name" required placeholder="Ex: Arroz 5kg" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-black focus:outline-none" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Qtd</label><input name="quantity" type="number" step="0.1" inputMode="decimal" defaultValue="1" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white" /></div>
                          <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Un</label><select name="unit" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-4 py-4 text-white"><option value="UN">UN</option><option value="KG">KG</option><option value="L">L</option></select></div>
                        </div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase">Preço Unitário Estimado</label><input type="text" inputMode="decimal" value={formatDisplayAmount(amountRaw)} onChange={handleAmountChange} placeholder="R$ 0,00" className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-4 text-white font-mono" /></div>
                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-xl uppercase text-sm">Adicionar</button>
                      </form>
                    )}

                    {isContributionModalOpen && (
                      <form onSubmit={handleContribution} className="space-y-6 text-center">
                        <h4 className="text-xl font-black text-white">{selectedGoal?.description}</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">{selectedGoal?.type === 'financial' ? 'Valor do Aporte' : 'Evolução Adicional (%)'}</label>
                          <input 
                            type="text" 
                            inputMode={selectedGoal?.type === 'financial' ? 'decimal' : 'numeric'}
                            value={selectedGoal?.type === 'financial' ? formatDisplayAmount(amountRaw) : amountRaw} 
                            onChange={(e) => {
                              if (selectedGoal?.type === 'activity') {
                                if (/^\d*$/.test(e.target.value)) setAmountRaw(e.target.value);
                              } else {
                                handleAmountChange(e);
                              }
                            }} 
                            required 
                            className="w-full bg-slate-800/50 border-2 border-slate-800 rounded-xl px-5 py-6 text-2xl text-white font-mono font-black text-center" 
                          />
                        </div>
                        <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-5 rounded-2xl uppercase text-sm">Confirmar</button>
                      </form>
                    )}
                </div>
            </div>
        </div>
      )}

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
