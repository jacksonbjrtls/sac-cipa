import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';
import { BarChart2, Filter, AlertCircle, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Registration } from '../types';

export type MainCategoryKey = 
  | 'duvidas' 
  | 'sugestoes' 
  | 'criticas' 
  | 'elogios' 
  | 'condicoes_inseguras' 
  | 'meio_ambiente';

export interface CategoryDefinition {
  key: MainCategoryKey;
  label: string;
  emoji: string;
  shortLabel: string;
  color: string;
  hoverColor: string;
  bgLight: string;
  borderLight: string;
  textColor: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: 'duvidas',
    label: 'Dúvidas',
    shortLabel: 'Dúvidas',
    emoji: '❓',
    color: '#0284c7', // Sky 600
    hoverColor: '#0369a1',
    bgLight: 'bg-sky-50',
    borderLight: 'border-sky-200',
    textColor: 'text-sky-800'
  },
  {
    key: 'sugestoes',
    label: 'Sugestões',
    shortLabel: 'Sugestões',
    emoji: '💡',
    color: '#eab308', // Yellow 500
    hoverColor: '#ca8a04',
    bgLight: 'bg-yellow-50',
    borderLight: 'border-yellow-200',
    textColor: 'text-yellow-800'
  },
  {
    key: 'criticas',
    label: 'Críticas / Reclamações',
    shortLabel: 'Críticas',
    emoji: '📢',
    color: '#ef4444', // Red 500
    hoverColor: '#dc2626',
    bgLight: 'bg-red-50',
    borderLight: 'border-red-200',
    textColor: 'text-red-800'
  },
  {
    key: 'elogios',
    label: 'Elogios',
    shortLabel: 'Elogios',
    emoji: '👏',
    color: '#10b981', // Emerald 500
    hoverColor: '#059669',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textColor: 'text-emerald-800'
  },
  {
    key: 'condicoes_inseguras',
    label: 'Condições Inseguras',
    shortLabel: 'Cond. Inseguras',
    emoji: '⚠️',
    color: '#f97316', // Orange 500
    hoverColor: '#ea580c',
    bgLight: 'bg-orange-50',
    borderLight: 'border-orange-200',
    textColor: 'text-orange-850'
  },
  {
    key: 'meio_ambiente',
    label: 'Meio Ambiente',
    shortLabel: 'Meio Ambiente',
    emoji: '♻️',
    color: '#0d9488', // Teal 600
    hoverColor: '#0f766e',
    bgLight: 'bg-teal-50',
    borderLight: 'border-teal-200',
    textColor: 'text-teal-800'
  }
];

export const normalizeCategoryKey = (categoryName?: string): MainCategoryKey | 'outros' => {
  if (!categoryName) return 'outros';
  const c = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (c.includes('duvida')) return 'duvidas';
  if (c.includes('sugest')) return 'sugestoes';
  if (c.includes('critica') || c.includes('reclam')) return 'criticas';
  if (c.includes('elogio') || c.includes('reconheciment')) return 'elogios';
  if (c.includes('insegur') || c.includes('acidente') || c.includes('risco')) return 'condicoes_inseguras';
  if (c.includes('ambiente') || c.includes('ambiental') || c.includes('ecolog') || c.includes('residuo')) return 'meio_ambiente';

  return 'outros';
};

interface CategoryBarChartProps {
  registrations: Registration[];
  selectedCategory: string | null;
  onSelectCategory: (categoryKey: string | null) => void;
}

export default function CategoryBarChart({
  registrations,
  selectedCategory,
  onSelectCategory
}: CategoryBarChartProps) {
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');

  const totalRegistrations = registrations.length;

  // Aggregate counts per category
  const categoryCounts: Record<MainCategoryKey, number> = {
    duvidas: 0,
    sugestoes: 0,
    criticas: 0,
    elogios: 0,
    condicoes_inseguras: 0,
    meio_ambiente: 0
  };

  registrations.forEach(r => {
    const key = normalizeCategoryKey(r.category);
    if (key !== 'outros') {
      categoryCounts[key]++;
    }
  });

  const chartData = CATEGORY_DEFINITIONS.map(def => {
    const count = categoryCounts[def.key];
    const percentage = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
    return {
      key: def.key,
      name: `${def.emoji} ${def.shortLabel}`,
      shortLabel: def.shortLabel,
      fullName: def.label,
      emoji: def.emoji,
      count,
      percentage,
      color: def.color,
      hoverColor: def.hoverColor,
      bgLight: def.bgLight,
      borderLight: def.borderLight,
      textColor: def.textColor
    };
  });

  const maxVal = Math.max(...chartData.map(d => d.count), 5);

  const handleBarClick = (entry: any) => {
    if (!entry) return;
    const key = entry.key || entry.activePayload?.[0]?.payload?.key;
    if (key) {
      onSelectCategory(selectedCategory === key ? null : key);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
            <span>{data.emoji}</span>
            <span>{data.fullName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-700/60">
            <span>Total de Relatos:</span>
            <span className="font-extrabold text-white text-sm font-mono">{data.count}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Proporção:</span>
            <span className="font-bold text-emerald-400 font-mono">{data.percentage}%</span>
          </div>
          <div className="pt-1 text-[10px] text-emerald-300 font-medium italic">
            * Clique na barra para filtrar esses chamados
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 text-left">
      {/* Header with Title and Layout Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-0.5">
          <h4 className="font-sans font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <BarChart2 className="h-4.5 w-4.5 text-emerald-600" />
            <span>Distribuição de Relatos por Categoria (Recharts)</span>
          </h4>
          <p className="text-[11px] text-slate-500">
            Monitoramento de Dúvidas, Sugestões, Críticas, Elogios, Condições Inseguras e Meio Ambiente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Limpar Filtro</span>
            </button>
          )}

          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLayout('vertical')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                layout === 'vertical'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Colunas
            </button>
            <button
              type="button"
              onClick={() => setLayout('horizontal')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                layout === 'horizontal'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Barras
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Container */}
      {totalRegistrations === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
          <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
          <span>Nenhum relato computado no período selecionado.</span>
        </div>
      ) : (
        <div className="w-full h-72 sm:h-80 select-none">
          <ResponsiveContainer width="100%" height="100%">
            {layout === 'vertical' ? (
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 15, left: -20, bottom: 25 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    handleBarClick(state.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                  domain={[0, Math.ceil(maxVal * 1.15)]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  className="cursor-pointer transition-all duration-300"
                >
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fill: '#334155', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }}
                  />
                  {chartData.map((entry) => {
                    const isSelected = selectedCategory === entry.key;
                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        opacity={selectedCategory ? (isSelected ? 1 : 0.35) : 0.9}
                        stroke={isSelected ? '#0f172a' : 'transparent'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    handleBarClick(state.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                  domain={[0, Math.ceil(maxVal * 1.15)]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />
                <Bar
                  dataKey="count"
                  radius={[0, 8, 8, 0]}
                  className="cursor-pointer transition-all duration-300"
                >
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fill: '#334155', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }}
                  />
                  {chartData.map((entry) => {
                    const isSelected = selectedCategory === entry.key;
                    return (
                      <Cell
                        key={`cell-horiz-${entry.key}`}
                        fill={entry.color}
                        opacity={selectedCategory ? (isSelected ? 1 : 0.35) : 0.9}
                        stroke={isSelected ? '#0f172a' : 'transparent'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Interactive Category Badges / Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
        {chartData.map(item => {
          const isSelected = selectedCategory === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectCategory(isSelected ? null : item.key)}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 select-none ${
                isSelected
                  ? 'ring-2 ring-emerald-500 shadow-xs border-emerald-400 bg-white'
                  : 'hover:border-slate-300 border-slate-200 bg-slate-50/60 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-base">{item.emoji}</span>
                <span className="font-mono text-xs font-black text-slate-800">
                  {item.count}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700 truncate leading-tight">
                  {item.shortLabel}
                </p>
                <p className="text-[9px] font-mono text-slate-400">
                  {item.percentage}% do total
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
