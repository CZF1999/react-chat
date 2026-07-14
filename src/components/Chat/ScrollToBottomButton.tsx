import React from 'react';

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
  >
    返回底部
  </button>
);
