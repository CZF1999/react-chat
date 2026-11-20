import { useMemo } from "react";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import useAsyncRouterStore from "@/store/useAsyncRouterStore";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 从 store 中获取动态路由数据
  const { asyncRouter } = useAsyncRouterStore();

  // 将后端返回的树形结构转换为 Ant Design Menu 所需的格式
  const getMenuItems = (items: any[]): MenuProps["items"] => {
    return items.map((item) => {
      const menuItem: any = {
        key: item.map.zydz || item.id,
        label: item.map.zymc,
      };

      // 如果存在 children，直接映射为第二层菜单，忽略第三层及以后的 children
      if (item.children && item.children.length > 0) {
        menuItem.children = item.children.map((child: any) => ({
          key: child.map.zydz || child.id,
          label: child.map.zymc,
        }));
      }

      return menuItem;
    });
  };
  console.log(asyncRouter);
  const menuItems = useMemo(() => {
    const items = getMenuItems(asyncRouter) ?? [];
    const hasChat = items.some(
      (item) =>
        item?.key === "sbsjjc" ||
        (Array.isArray(item?.children) &&
          item.children.some((child: { key?: string }) => child?.key === "sbsjjc"))
    );
    if (!hasChat) {
      items.push({ key: "sbsjjc", label: "AI 对话" });
    }
    return items;
  }, [asyncRouter]);

  // 根据当前 URL 计算高亮项
  const selectedKeys = useMemo(() => {
    const currentPath = location.pathname.replace(/^\//, "");
    return [currentPath];
  }, [location.pathname]);

  // 点击菜单跳转
  const onClick: MenuProps["onClick"] = (e) => {
    navigate(`/${e.key}`);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        onClick={onClick}
        style={{ width: 256 }}
        items={menuItems}
      />
      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {/* ⚠️ 必须保留 Outlet，用于渲染 DynamicRoutes 中的子页面 */}
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
