import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function BrandLogo({
  alt = 'Finku logo',
  className,
  imageClassName,
  priority = false,
  sizes = '96px',
}: BrandLogoProps) {
  return (
    <span className={cn('relative block shrink-0', className)}>
      <Image
        src="/branding/finku-black-512.png"
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn('object-contain dark:hidden', imageClassName)}
      />
      <Image
        src="/branding/finku-white-512.png"
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn('hidden object-contain dark:block', imageClassName)}
      />
    </span>
  );
}
