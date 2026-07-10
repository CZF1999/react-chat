import React, { useState, useCallback } from 'react';

// 使用 React.memo 优化的子组件
const Child = React.memo(function Child({ text, onSubmit }) {
  console.log('🔴 子组件渲染了');
  return (
    <div>
      <p>当前文本：{text}</p>
      <button onClick={onSubmit}>提交</button>
    </div>
  );
});
export default Child;
