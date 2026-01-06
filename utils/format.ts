
export const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const formatCurrency = (val: number | string) => {
  const amount = Number(val);
  if (isNaN(amount)) return "R$ 0,00";
  return amount.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatDisplayAmount = (raw: string) => {
  if (!raw || raw === '0') return '';
  const number = parseInt(raw) / 100;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
