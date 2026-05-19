import { type FC, type ReactNode } from 'react';

interface MyBoxProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  component?: string;
  onClick?: () => void;
  role?: string;
  id?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export const MyBox: FC<MyBoxProps> = ({
  children,
  className = '',
  sx = {},
  component: Component = 'div',
  ...props
}) => {
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};
