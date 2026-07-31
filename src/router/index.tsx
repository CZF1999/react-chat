import {
  createBrowserRouter,
  Outlet,
  Route,
  Routes,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import useAsyncRouterStore from "@/store/useAsyncRouterStore";
import { useEffect } from "react";
import LayoutLoading from "@/components/layoutLoading";
// ================= 1. 路由守卫组件 =================

// 支持多层目录匹配
const pageModules = import.meta.glob("../pages/**/index.tsx");
const RequireAuth = () => {
  // 1. 将所有 Hooks 移到组件顶部，严格遵守 React Hooks 规则
  const [searchParams, setSearchParams] = useSearchParams();
  const { asyncRouter, getAsyncRouter } = useAsyncRouterStore();

  // 2. 同时获取 URL 中的 token 和 本地存储的 token 进行综合判断
  const urlToken = searchParams.get("token") || searchParams.get("val");
  const localToken = localStorage.getItem("token");
  const isAuthenticated = !!(urlToken || localToken);

  // 3. 将 URL 中的 token 持久化到 localStorage，并清理 URL
  useEffect(() => {
    if (urlToken) {
      localStorage.setItem("token", urlToken);
      // 从 URL 中移除 token，保持链接整洁并防止 token 泄露
      searchParams.delete("token");
      setSearchParams(searchParams, { replace: true });
    }
  }, [urlToken, searchParams, setSearchParams]);

  // 4. 获取异步路由（确保在已登录状态下才请求）
  useEffect(() => {
    if (isAuthenticated && !asyncRouter.length) {
      getAsyncRouter({ yydm: "jat-case" });
    }
  }, [isAuthenticated, asyncRouter.length, getAsyncRouter]);

  // 5. 鉴权拦截（必须在所有 Hooks 之后）
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 6. 已登录，渲染子路由
  return <Outlet />;
};
// ================= 2. 动态路由组件 =================
const DynamicRoutes = () => {
  const { asyncRouter } = useAsyncRouterStore();

  // 👇 2. 封装一个获取组件的方法，统一处理 glob 匹配
  const getComponent = (path: string) => {
    // 拼接出 glob 扫描时的相对路径格式
    const modulePath = `../pages/${path}/index.tsx`;
    const loader = pageModules[modulePath];

    if (loader) {
      return lazy(loader as any);
    } else {
      console.warn(`⚠️ 未找到对应的组件文件: ${modulePath}`);
      // 如果找不到文件，返回一个默认的占位组件，防止页面崩溃
      return () => <div style={{ color: "red" }}>页面不存在: {path}</div>;
    }
  };
  // 👇 修改：移除 parentPath 参数，改为明确的两层遍历
  const generateRoutes = (items: any[]): JSX.Element[] => {
    return items.map((item) => {
      const currentPath = item.map.zydz;

      // 👇 如果有子节点（第二层），只处理第二层，不再向下递归
      if (item.children && item.children.length > 0) {
        return (
          <Route key={currentPath} path={currentPath} element={<Outlet />}>
            {item.children.map((child: any) => {
              const childPath = child.map.zydz;
              let childComponentPath = childPath;
              if (childPath && childPath[0] === "/") {
                childComponentPath = childPath.slice(1);
              }

              // 👇 3. 使用封装好的方法获取组件
              const ChildComponent = getComponent(childComponentPath);

              return (
                <Route
                  key={childPath}
                  path={childPath}
                  element={
                    <Suspense fallback={<div>Loading {child.map.yymc}...</div>}>
                      <ChildComponent />
                    </Suspense>
                  }
                />
              );
            })}
          </Route>
        );
      }

      // 👇 第一层叶子节点（没有 children），直接绑定组件
      let componentPath = currentPath;
      if (currentPath && currentPath[0] === "/") {
        componentPath = currentPath.slice(1);
      }
      // 👇 4. 第一层叶子节点也使用同样的方法
      const Component = getComponent(componentPath);

      return (
        <Route
          key={currentPath}
          path={currentPath}
          element={
            <Suspense fallback={<div>Loading {item.map.yymc}...</div>}>
              <Component />
            </Suspense>
          }
        />
      );
    });
  };

  // 👇 致命错误修复：必须 return 包含 <Routes> 的 JSX
  return (
    <Routes>
      {/* 渲染所有一级路由 */}
      {generateRoutes(asyncRouter)}
      {/* 默认重定向 */}
      <Route
        index
        element={
          <Navigate to={asyncRouter[0]?.map.zydz || "dashboard"} replace />
        }
      />
      {/* 404 */}
      <Route path="*" element={<div>页面不存在</div>} />
    </Routes>
  );
};

// ================= 3. 静态路由配置 =================
const Layout = lazy(() => import("../pages/Layout/Layout"));
const router = createBrowserRouter([
  {
    // 需要鉴权的路由父节点
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: (
          <Suspense fallback={<LayoutLoading />}>
            <Layout />
          </Suspense>
        ),
        children: [
          // 使用通配符捕获所有子路由，交给 DynamicRoutes 动态处理
          {
            path: "*",
            element: <DynamicRoutes />,
          },
        ],
      },
    ],
  },
  {
    // 全局 404
    path: "*",
    element: <div>404 - Page Not Found</div>,
  },
]);
export default router;
