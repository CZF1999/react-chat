import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Result } from "antd";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("应用未捕获错误:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Result
            status="error"
            title="页面出现异常"
            subTitle={
              import.meta.env.DEV
                ? this.state.error?.message || "未知错误"
                : "请尝试刷新页面，或联系管理员。"
            }
            extra={[
              <Button
                type="primary"
                key="retry"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>,
              <Button key="retry-state" onClick={this.handleRetry}>
                尝试恢复
              </Button>,
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
