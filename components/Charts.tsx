
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
    <div className="flex flex-col lg:flex-row items-center justify-center gap-10 py-4">
      {/* Gráfico Donut - Container centralizado e com sombra suave */}
      <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const largeArcFlag = percentage > 0.5 ? 1 : 0;
            const r = 40; // Raio ligeiramente maior
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
                strokeWidth="3"
                className="transition-all duration-500 hover:opacity-90 cursor-pointer"
              />
            );
          })}
          {/* Círculo interno para efeito de donut */}
          <circle cx="50" cy="50" r="30" fill="rgb(15, 23, 42)" />
        </svg>
        
        {/* Texto Centralizado Profissional */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center flex flex-col items-center justify-center">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">TOTAL</span>
              <span className="block text-sm sm:text-base font-black text-white leading-tight px-4 border-y border-white/5 py-1">
                {formatCurrency(total)}
              </span>
          </div>
        </div>
      </div>

      {/* Legenda Lateral - Melhor alinhamento e design premium */}
      <div className="w-full lg:flex-1 space-y-2.5 max-w-sm">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center gap-4 min-w-0">
                {/* Indicador de cor com brilho */}
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
                  style={{ 
                    backgroundColor: colors[index % colors.length],
                    boxShadow: `0 0 12px ${colors[index % colors.length]}40`
                  }} 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black text-slate-200 uppercase tracking-wide truncate group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      {percentage}%
                    </span>
                    {/* Barra de progresso miniatura */}
                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                      <div 
                        className="h-full transition-all duration-1000" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: colors[index % colors.length]
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right pl-4">
                <span className="text-xs font-mono font-black text-slate-300 group-hover:text-emerald-400 transition-colors">
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
