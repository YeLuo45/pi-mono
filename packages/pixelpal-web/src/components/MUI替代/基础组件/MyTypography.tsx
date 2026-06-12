import { type FC, type CSSProperties } from 'react';

export interface MyTypographyProps {
  children?: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'subtitle1' | 'subtitle2' | 'button' | 'overline';
  color?: 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  align?: 'left' | 'center' | 'right' | 'justify';
  gutterBottom?: boolean;
  noWrap?: boolean;
  className?: string;
  sx?: CSSProperties;
  component?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
}

export const MyTypography: FC<MyTypographyProps> = ({
  children,
  variant = 'body1',
  color = 'textPrimary',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  className = '',
  sx = {},
  component,
  onClick,
}) => {
  const variantStyles: Record<string, CSSProperties> = {
    h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.25 },
    h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
    button: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5, textTransform: 'uppercase' },
    overline: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '1px' },
  };

  const colorMap: Record<string, string> = {
    primary: '#5e6ad2',
    secondary: '#7170ff',
    textPrimary: '#f7f8f8',
    textSecondary: '#d0d6e0',
    error: '#ef5350',
    warning: '#ff9800',
    success: '#4caf50',
    info: '#2196f3',
    inherit: 'inherit',
  };

  const Component = (component || 'p') as keyof JSX.IntrinsicElements;

  return (
    <Component
      onClick={onClick}
      className={className}
      style={{
        margin: 0,
        padding: 0,
        textAlign: align,
        marginBottom: gutterBottom ? '0.5em' : 0,
        overflow: noWrap ? 'hidden' : undefined,
        textOverflow: noWrap ? 'ellipsis' : undefined,
        whiteSpace: noWrap ? 'nowrap' : undefined,
        color: colorMap[color] || colorMap.textPrimary,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...variantStyles[variant],
        ...sx,
      }}
    >
      {children}
    </Component>
  );
};

export default MyTypography;
