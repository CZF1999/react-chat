import { Button, Popconfirm } from "antd";
import type { ButtonProps, PopconfirmProps } from "antd";
import React from "react";
export interface JatButtonProps extends ButtonProps {
  /** 是否为删除操作，为 true 时自动启用二次确认 */
  isDelete?: boolean;
  /** 二次确认的提示文本。如果不传且 isDelete 为 true，则默认为 '确定要删除吗？' */
  confirmTitle?: React.ReactNode;
  /** 透传给 Popconfirm 的其他属性 */
  popconfirmProps?: Omit<PopconfirmProps, "title" | "onConfirm" | "children">;
}
const jatButton: React.FC<JatButtonProps> = ({
  isDelete,
  confirmTitle,
  popconfirmProps,
  children, // 👈 新增解构
  onClick, // 👈 新增解构
  ...restProps
}) => {
  // 判断是否需要二次确认
  const needConfirm = isDelete || !!confirmTitle;
  // 确定确认框的标题
  const title = confirmTitle || (isDelete ? "确定要删除吗？" : "");
  // 渲染 Button 节点，如果需要确认，则屏蔽 Button 自身的 onClick
  const buttonNode = (
    <Button {...restProps} onClick={needConfirm ? undefined : onClick}>
      {children}
    </Button>
  );
  if (needConfirm) {
    return (
      <Popconfirm title={title} onConfirm={(e) => onClick?.(e as React.MouseEvent<HTMLElement, MouseEvent>)} {...popconfirmProps}>
        {buttonNode}
      </Popconfirm>
    );
  }
  return buttonNode;
};
export default jatButton;
