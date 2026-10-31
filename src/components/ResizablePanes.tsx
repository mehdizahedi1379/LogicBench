import React, { useState, useEffect, useCallback } from 'react';
import { useWorkbench } from '../store/workbenchStore';

export const ResizableSplitter: React.FC = () => {
  const { sidebarCollapsed, sidebarWidth, setSidebarWidth } = useWorkbench();
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDoubleClick = () => {
    setSidebarWidth(260); // Reset to default width
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate width from left edge of screen (accounting for navigation rail 48px)
      const railWidth = 48;
      const newWidth = e.clientX - railWidth;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setSidebarWidth]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth(sidebarWidth - 10);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth(sidebarWidth + 10);
    }
  };

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuenow={sidebarWidth}
      aria-valuemin={180}
      aria-valuemax={480}
      aria-label="Resize sidebar pane (Double click to reset)"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={`w-1 hover:w-1.5 cursor-col-resize select-none shrink-0 transition-colors z-20 flex items-center justify-center ${
        isDragging
          ? 'bg-cyan-500 w-1.5'
          : 'bg-transparent hover:bg-cyan-500/50'
      }`}
      title="Drag to resize sidebar (Double click to reset)"
    >
      <div className="w-0.5 h-6 bg-border-medium rounded-full pointer-events-none opacity-40 hover:opacity-100" />
    </div>
  );
};
