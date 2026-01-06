
import React from 'react';
import { formatCurrency } from '../utils/format';

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  colors: string[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, colors }) => {
  const total = data?.reduce((acc, item) => acc + (item.value || 0), 0) || 0;
  let accumulatedAngle = 0;

  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-4">
      <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Sem Dados</span>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Adicione despesas para ver o gráfico</p>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row items-center justify-center gap-8 py-2">
      {/* Gráfico Donut */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.4)]">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const largeArcFlag = percentage > 0.5 ? 1 : 0;
            const r = 38;
            const cx = 50; const cy = 50;
            
            const x1 = cx + r * Math.cos((Math.PI * accumulatedAngle) / 180);
            const y1 = cy + r * Math.sin((Math.PI * accumulatedAngle) / 180);
            accumulatedAngle += angle;
            const x2 = cx + r * Math.cos((Math.PI * accumulatedAngle) / 180);
            const y2 = cy + r * Math.sin((Math.PI * accumulatedAngle) / 180);
            
            return (
              <path 
                key={index} 
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`} 
                fill={colors[index % colors.length]} 
                stroke="rgb(15, 23, 42)" 
                strokeWidth="2.5"
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              />
            );
          })}
          <circle cx="50" cy="50" r="28" fill="rgb(15, 23, 42)" />
        </svg>
        
        {/* Texto Central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-slate-900/60 backdrop-blur-md rounded-full w-24 h-24 flex flex-col items-center justify-center border border-white/10 shadow-inner">
              <span className="block text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Gasto</span>
              <span className="block text-[10px] sm:text-[11px] font-black text-white leading-tight px-2">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Legenda Detalhada - Ajustada para não transbordar */}
      <div className="w-full xl:flex-1 grid grid-cols-1 gap-2 max-w-md mx-auto xl:max-w-none">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group overflow-hidden">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: colors[index % colors.length] }} 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors truncate">
                    {item.name}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase whitespace-nowrap">
                    {percentage}% do total
                  </span>
                </div>
              </div>
              <div className="text-right pl-3 flex-shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-300 group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 150 }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex items-end justify-between gap-3 w-full px-2" style={{ height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 group relative h-full justify-end">
          <div 
            className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-400/40 rounded-t-xl transition-all duration-500 group-hover:from-emerald-500 group-hover:to-emerald-400 relative" 
            style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: '8px' }}
          >
             <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap z-10 border border-slate-700 pointer-events-none transition-all duration-200">
               {formatCurrency(d.value)}
             </div>
          </div>
          <span className="text-[9px] font-black text-slate-500 mt-4 uppercase tracking-tighter truncate w-full text-center group-hover:text-slate-300">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
};
