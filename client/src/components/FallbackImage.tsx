type FallbackImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null;
  fallback: string;
};

export default function FallbackImage({ src, fallback, ...props }: FallbackImageProps) {
  return (
    <img
      key={src}
      src={src ?? fallback}
      onError={(e) => {
        e.currentTarget.src = fallback;
        props.onError?.(e);
      }}
      {...props}
    />
  );
}
