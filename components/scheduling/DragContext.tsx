// components/scheduling/DragContext.tsx
// React context for managing drag state across scheduling components

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DraggedBlog {
  id: string;
  title: string;
  type: string;
}

interface DragContextType {
  draggedBlog: DraggedBlog | null;
  setDraggedBlog: (blog: DraggedBlog | null) => void;
  isDragging: boolean;
  hoveredDate: string | null;
  setHoveredDate: (date: string | null) => void;
}

const DragContext = createContext<DragContextType | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const [draggedBlog, setDraggedBlogState] = useState<DraggedBlog | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const setDraggedBlog = useCallback((blog: DraggedBlog | null) => {
    setDraggedBlogState(blog);
    if (!blog) {
      setHoveredDate(null);
    }
  }, []);

  return (
    <DragContext.Provider
      value={{
        draggedBlog,
        setDraggedBlog,
        isDragging: draggedBlog !== null,
        hoveredDate,
        setHoveredDate,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDrag must be used within a DragProvider");
  }
  return context;
}

export default DragContext;
