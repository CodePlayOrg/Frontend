// TimetableContext.tsx
import React, { createContext, useContext, useState } from 'react';

export type Day = '월' | '화' | '수' | '목' | '금';

export interface ClassItem {
  id: string;
  name: string;
  day: Day;
  start: number;
  end: number;
}

interface TimetableContextType {
  classes: ClassItem[];
  addClass: (cls: ClassItem) => void;
  removeClass: (id: string) => void; // 삭제 함수 추가
}

const TimetableContext = createContext<TimetableContextType>({
  classes: [],
  addClass: () => {},
  removeClass: () => {},
});

export const TimetableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const addClass = (cls: ClassItem) => {
    setClasses((prev) => [...prev, cls]);
  };

  const removeClass = (id: string) => {
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
  };

  return (
    <TimetableContext.Provider value={{ classes, addClass, removeClass }}>
      {children}
    </TimetableContext.Provider>
  );
};

export const useTimetable = () => useContext(TimetableContext);
