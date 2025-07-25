import bunnyAvatar from '@/assets/avatar-bunny.png';
import lionAvatar from '@/assets/avatar-lion.png';
import puppyAvatar from '@/assets/avatar-puppy.png';

export type AvatarType = 'bunny' | 'lion' | 'puppy';

interface AvatarDisplayProps {
  avatarType: AvatarType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarImages = {
  bunny: bunnyAvatar,
  lion: lionAvatar,
  puppy: puppyAvatar
};

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10', 
  lg: 'w-16 h-16'
};

export const AvatarDisplay = ({ avatarType, size = 'md', className = '' }: AvatarDisplayProps) => {
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden flex items-center justify-center buddy-gradient shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${className}`}>
      <img 
        src={avatarImages[avatarType]} 
        alt={`${avatarType} avatar`}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
      />
    </div>
  );
};