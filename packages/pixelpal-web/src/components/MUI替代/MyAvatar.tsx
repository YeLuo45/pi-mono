import { type FC, type ReactNode } from 'react';

interface MyAvatarProps {
  children?: ReactNode;
  sx?: Record<string, string | number | undefined>;
  className?: string;
  title?: string;
}

export const MyAvatar: FC<MyAvatarProps> = ({ children, sx = {}, className = '', title }) => {
  const size = sx.width || sx.height || 40;

  return (
    <div
      className={className}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        color: '#fff',
        backgroundColor: sx.bgcolor || sx.backgroundColor || '#5e6ad2',
        fontSize: sx.fontSize || 14,
        fontWeight: 600,
        ...sx,
      }}
    >
      {children}
    </div>
  );
};

export default MyAvatar;
