import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from 'antd';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ChartContent } from '@/types/chat';

// 按需注册 ECharts 组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

interface DataChartRendererProps {
  data: ChartContent;
  isLoading?: boolean;
  onReady?: () => void;
}

const chartTypeLabels: Record<string, string> = {
  bar: '柱状图',
  line: '折线图',
  pie: '饼图',
  scatter: '散点图',
};

export const DataChartRenderer: React.FC<DataChartRendererProps> = ({
  data,
  isLoading = false,
  onReady,
}) => {
  const [phase, setPhase] = useState<'skeleton' | 'expanding' | 'ready'>(
    isLoading ? 'skeleton' : 'ready'
  );
  const [chartReady, setChartReady] = useState(false);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!isLoading && phase === 'skeleton') {
      const t1 = setTimeout(() => setPhase('expanding'), 80);
      const t2 = setTimeout(() => {
        setPhase('ready');
      }, 550);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isLoading, phase]);

  useEffect(() => {
    if (data && !isLoading && phase === 'skeleton') {
      const t1 = setTimeout(() => setPhase('expanding'), 50);
      const t2 = setTimeout(() => setPhase('ready'), 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [data, isLoading]);

  // 图表渲染完成后回调
  const handleChartReady = () => {
    setChartReady(true);
    onReady?.();
  };

  // phase 变为 ready 后图表才有机会挂载
  const showChart = phase === 'expanding' || phase === 'ready';

  return (
    <div className={`data-chart-renderer phase-${phase}`}>
      {/* 标题 */}
      {data?.title && (
        <h4 className="data-chart-renderer__title">
          <span className="data-chart-renderer__type-badge">
            {chartTypeLabels[data.chartType] || '图表'}
          </span>
          {data.title}
        </h4>
      )}

      {/* 骨架屏层 */}
      <div className={`data-chart-renderer__skeleton ${!showChart ? '' : 'is-hidden'}`}>
        <Skeleton.Image
          active
          style={{ width: '100%', height: 300 }}
        />
      </div>

      {/* 图表层 */}
      <div
        className={`data-chart-renderer__chart ${!showChart ? 'is-hidden' : ''} ${chartReady ? 'is-ready' : ''}`}
        style={{ minHeight: 300 }}
      >
        {data && showChart && (
          <ReactECharts
            ref={chartRef}
            echarts={echarts}
            option={data.config}
            style={{ height: 350, width: '100%' }}
            notMerge
            lazyUpdate
            onChartReady={handleChartReady}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </div>

      <style>{`
        .data-chart-renderer {
          position: relative;
          margin: 12px 0;
        }
        .data-chart-renderer__title {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .data-chart-renderer__type-badge {
          display: inline-block;
          padding: 1px 8px;
          background: #1677ff;
          color: #fff;
          font-size: 11px;
          border-radius: 10px;
          font-weight: 400;
        }
        .data-chart-renderer__skeleton {
          transition: opacity 0.35s ease, transform 0.35s ease;
          opacity: 1;
          transform: translateY(0);
        }
        .data-chart-renderer__skeleton.is-hidden {
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          position: absolute;
          width: 100%;
        }
        .data-chart-renderer__chart {
          transition: opacity 0.6s ease, transform 0.6s ease;
          opacity: 0;
          transform: translateY(12px) scale(0.97);
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          padding: 12px;
          background: #fff;
        }
        .data-chart-renderer__chart.is-ready {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .data-chart-renderer__chart.is-hidden {
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
          position: absolute;
          width: 100%;
        }
        /* expanding 阶段 */
        .data-chart-renderer.phase-expanding .data-chart-renderer__chart {
          opacity: 0.5;
          transform: translateY(4px) scale(0.98);
        }
        @media (prefers-color-scheme: dark) {
          .data-chart-renderer__title {
            color: #e8e8e8;
          }
          .data-chart-renderer__chart {
            background: #1f1f1f;
            border-color: #333;
          }
        }
      `}</style>
    </div>
  );
};
