import React, { useState } from 'react';
import type { ThinkingStage } from '@/types/chat';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';

interface ThinkingProcessProps {
  stages: ThinkingStage[];
  isStreaming?: boolean;
}

const stageConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  analyzing: {
    icon: <SearchOutlined />,
    label: '分析问题',
    color: '#1677ff',
  },
  searching: {
    icon: <SearchOutlined />,
    label: '检索数据',
    color: '#722ed1',
  },
  processing: {
    icon: <ThunderboltOutlined />,
    label: '处理数据',
    color: '#fa8c16',
  },
  generating: {
    icon: <BarChartOutlined />,
    label: '生成内容',
    color: '#52c41a',
  },
  done: {
    icon: <CheckCircleOutlined />,
    label: '完成',
    color: '#52c41a',
  },
};

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ stages, isStreaming }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!stages || stages.length === 0) return null;

  // 获取当前活跃阶段（最后一个非 done 的阶段）
  const activeStage = [...stages].reverse().find(s => s.type !== 'done');
  const isAllDone = stages.length > 0 && stages[stages.length - 1]?.type === 'done' && !isStreaming;

  return (
    <div className="thinking-process">
      {/* 折叠头部 */}
      <div
        className="thinking-process__header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="thinking-process__toggle">
          {collapsed ? <RightOutlined /> : <DownOutlined />}
        </span>

        {isAllDone ? (
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
        ) : (
          <LoadingOutlined style={{ color: '#1677ff', marginRight: 6 }} />
        )}

        <span className="thinking-process__title">
          {isAllDone
            ? `思考完成（${stages.length} 个步骤）`
            : activeStage
              ? stageConfig[activeStage.type]?.label || '处理中'
              : '思考中...'}
        </span>

        {!isAllDone && activeStage && (
          <span className="thinking-process__current-msg">
            {activeStage.message}
          </span>
        )}
      </div>

      {/* 展开的步骤列表 */}
      {!collapsed && (
        <div className="thinking-process__steps">
          {stages.map((stage, index) => {
            const config = stageConfig[stage.type];
            const isDone = stage.type === 'done';
            const isLast = index === stages.length - 1;

            return (
              <div
                key={`${stage.type}_${index}`}
                className={`thinking-process__step ${isDone ? 'is-done' : ''} ${isLast && !isDone ? 'is-active' : ''}`}
              >
                {/* 步骤指示线 */}
                <div className="thinking-process__step-indicator">
                  <div className="thinking-process__dot" style={{ borderColor: config?.color }}>
                    {isDone ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                    ) : isLast ? (
                      <LoadingOutlined style={{ color: config?.color, fontSize: 12 }} />
                    ) : (
                      <span style={{ color: config?.color, fontSize: 12 }}>{config?.icon}</span>
                    )}
                  </div>
                  {index < stages.length - 1 && (
                    <div
                      className={`thinking-process__line ${isDone ? 'is-done' : ''}`}
                    />
                  )}
                </div>

                {/* 步骤内容 */}
                <div className="thinking-process__step-content">
                  <span
                    className="thinking-process__step-label"
                    style={{ color: isLast ? config?.color : undefined }}
                  >
                    {config?.label || stage.type}
                  </span>
                  <span className="thinking-process__step-msg">{stage.message}</span>
                </div>

                {/* 时间 */}
                <span className="thinking-process__step-time">
                  {new Date(stage.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .thinking-process {
          margin-bottom: 8px;
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          background: #fafafa;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .thinking-process__header {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          user-select: none;
          font-size: 12px;
          transition: background 0.2s;
        }
        .thinking-process__header:hover {
          background: #f0f0f0;
        }
        .thinking-process__toggle {
          margin-right: 4px;
          font-size: 10px;
          color: #999;
        }
        .thinking-process__title {
          font-weight: 500;
          color: #333;
        }
        .thinking-process__current-msg {
          margin-left: auto;
          color: #999;
          font-size: 11px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .thinking-process__steps {
          padding: 4px 12px 8px;
          border-top: 1px solid #f0f0f0;
        }
        .thinking-process__step {
          display: flex;
          align-items: flex-start;
          padding: 4px 0;
          font-size: 12px;
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        .thinking-process__step.is-active {
          opacity: 1;
        }
        .thinking-process__step.is-done {
          opacity: 0.8;
        }
        .thinking-process__step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 10px;
          flex-shrink: 0;
        }
        .thinking-process__dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #d9d9d9;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .thinking-process__step.is-active .thinking-process__dot {
          border-color: #1677ff;
          box-shadow: 0 0 8px rgba(22, 119, 255, 0.3);
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        .thinking-process__line {
          width: 2px;
          height: 18px;
          background: #e8e8e8;
          margin: 2px 0;
          transition: background 0.3s;
        }
        .thinking-process__line.is-done {
          background: #52c41a;
        }
        .thinking-process__step-content {
          flex: 1;
          min-width: 0;
        }
        .thinking-process__step-label {
          display: block;
          font-weight: 500;
          color: #666;
        }
        .thinking-process__step-msg {
          display: block;
          color: #999;
          font-size: 11px;
        }
        .thinking-process__step-time {
          color: #bbb;
          font-size: 10px;
          flex-shrink: 0;
          margin-left: 8px;
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 4px rgba(22, 119, 255, 0.2); }
          50% { box-shadow: 0 0 12px rgba(22, 119, 255, 0.5); }
        }
        @media (prefers-color-scheme: dark) {
          .thinking-process {
            border-color: #333;
            background: #1f1f1f;
          }
          .thinking-process__header:hover {
            background: #262626;
          }
          .thinking-process__title {
            color: #e8e8e8;
          }
          .thinking-process__steps {
            border-top-color: #333;
          }
          .thinking-process__dot {
            background: #1f1f1f;
            border-color: #444;
          }
          .thinking-process__line {
            background: #333;
          }
          .thinking-process__step-label {
            color: #bbb;
          }
        }
      `}</style>
    </div>
  );
};
