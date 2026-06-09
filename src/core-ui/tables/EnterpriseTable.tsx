import React, { useRef, useEffect } from 'react';
// @ts-ignore
import { List } from 'react-window';
import { cn } from '@/lib/utils';

export interface Column {
  key: string;
  header: React.ReactNode;
  width: number;
  sticky?: 'left' | 'right';
  render?: (row: any, index: number) => React.ReactNode;
}

interface EnterpriseTableProps {
  columns: Column[];
  data: any[];
  rowHeight?: number;
  headerHeight?: number;
  containerHeight: number;
  className?: string;
  onRowClick?: (row: any) => void;
}

const TableRow = React.memo(({ 
  index, 
  style, 
  data, 
  columns, 
  onRowClick 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: any[]; 
  columns: Column[]; 
  onRowClick?: (row: any) => void;
}) => {
  const rowData = data[index];
  if (!rowData) return null;

  return (
    <div 
      className={cn(
        "d-flex align-items-center transition-colors group",
        index % 2 === 0 ? "bg-surface" : "bg-subtle"
      )}
      style={{ 
        ...style, 
        width: 'max-content',
        borderBottom: '1px solid var(--border-subtle)',
      }}
      onClick={() => onRowClick?.(rowData)}
    >
      {columns.map((col) => (
        <div 
          key={col.key} 
          className={cn(
            "px-2 d-flex align-items-center overflow-hidden border-end",
            col.sticky === 'left' && "position-sticky start-0 z-10"
          )}
          style={{ 
            width: col.width, 
            height: '100%', 
            flexShrink: 0, 
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            backgroundColor: col.sticky === 'left' ? (index % 2 === 0 ? 'var(--surface)' : 'var(--background-alt)') : 'transparent',
            borderColor: 'var(--border-subtle)',
            boxShadow: col.sticky === 'left' ? '4px 0 8px -4px rgb(0 0 0 / 0.1)' : 'none'
          }}
        >
          <div className="text-truncate w-100">
            {col.render ? col.render(rowData, index) : rowData[col.key]}
          </div>
        </div>
      ))}
    </div>
  );
});

export const EnterpriseTable = ({
  columns,
  data,
  rowHeight = 32, 
  headerHeight = 36,
  containerHeight,
  className,
  onRowClick
}: EnterpriseTableProps) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outerElement = outerRef.current;
    if (!outerElement) return;

    const handleHorizontalScroll = () => {
      if (headerRef.current) {
        headerRef.current.scrollLeft = outerElement.scrollLeft;
      }
    };

    outerElement.addEventListener('scroll', handleHorizontalScroll);
    return () => outerElement.removeEventListener('scroll', handleHorizontalScroll);
  }, []);

  return (
    <div 
      className={cn("enterprise-table border-subtle rounded-3 overflow-hidden bg-surface shadow-sm", className)} 
      style={{ height: containerHeight }}
    >
      {/* Header */}
      <div 
        ref={headerRef}
        className="d-flex overflow-hidden sticky-top z-20 border-bottom border-subtle"
        style={{ 
          height: headerHeight, 
          width: '100%',
          background: 'var(--surface-raised)',
        }}
      >
        <div className="d-flex" style={{ width: 'max-content' }}>
          {columns.map((col) => (
            <div 
              key={col.key} 
              className={cn(
                "px-2 d-flex align-items-center fw-bold tracking-widest text-uppercase border-end",
                col.sticky === 'left' && "position-sticky start-0 z-30"
              )}
              style={{ 
                width: col.width, 
                fontSize: '0.6rem', 
                color: 'var(--foreground-dim)',
                background: 'inherit',
                borderColor: 'var(--border-subtle)',
                boxShadow: col.sticky === 'left' ? '4px 0 8px -4px rgb(0 0 0 / 0.2)' : 'none'
              }}
            >
              {col.header}
            </div>
          ))}
        </div>
      </div>

      {/* Body with Virtualization */}
      <List
        height={containerHeight - headerHeight}
        itemCount={data.length}
        itemSize={rowHeight}
        width="100%"
        outerRef={outerRef}
        className="custom-scrollbar"
        itemData={{ data, columns, onRowClick }}
      >
        {/* @ts-ignore */}
        {({ index, style, data }) => (
          <TableRow 
            index={index} 
            style={style} 
            data={data.data} 
            columns={data.columns} 
            onRowClick={data.onRowClick} 
          />
        )}
      </List>
    </div>
  );
};
