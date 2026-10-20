import type { MarketingImage } from "@/lib/marketing-images";

type Props = {
  image: MarketingImage;
  /** Pe ecrane mici, scroll orizontal local ca textele din mockup să rămână lizibile. */
  scrollOnMobile?: boolean;
  className?: string;
  priority?: boolean;
  /** Ascunde mențiunea dacă e deja în imagine. */
  showCaption?: boolean;
};

export function DemoVisual({
  image,
  scrollOnMobile = true,
  className = "",
  priority = false,
  showCaption = true,
}: Props) {
  const img = (
    <img
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className="m-demo-img block h-auto w-full max-w-none"
    />
  );

  return (
    <figure className={`m-demo ${className}`}>
      {scrollOnMobile ? (
        <div className="m-demo-scroll">
          <div className="m-demo-scroll-inner">{img}</div>
          <p className="m-demo-hint sm:hidden">Glisează pentru detalii</p>
        </div>
      ) : (
        img
      )}
      {showCaption && (
        <figcaption className="m-demo-caption">Exemplu demonstrativ</figcaption>
      )}
    </figure>
  );
}
