type FallbackImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null;
  fallback: string;
};

/**
 * Component for displaying an image with a fallback image in case the main image fails to load.
 * @param src The URL of the main image
 * @param fallback The URL of the fallback image
 * @param props Additional props for the img element
 */
export default function FallbackImage({ src, fallback, ...props }: FallbackImageProps) {
  return (
    <img
      key={src}
      src={src || fallback}
      onError={(e) => {
        e.currentTarget.src = fallback;
        props.onError?.(e);
      }}
      {...props}
    />
  );
}
