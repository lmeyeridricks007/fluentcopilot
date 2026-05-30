import Image from 'next/image'

export interface StepIllustration {
  /** Public path (e.g. `/curriculum/.../x.svg`) or absolute `http(s)` URL */
  src: string
  alt: string
  width?: number
  height?: number
}

/**
 * Renders curriculum step illustrations. Local files live under `public/`.
 * SVG and remote URLs use `unoptimized` / native img where Next image config would block.
 */
export function LessonStepIllustration({ illustration }: { illustration: StepIllustration }) {
  const { src, alt, width = 400, height = 120 } = illustration
  const isRemote = /^https?:\/\//i.test(src)
  const isSvg = /\.svg(\?|$)/i.test(src)

  if (isRemote) {
    return (
      // Remote assets: no domain allowlist required for <img>
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full max-w-lg h-auto rounded-lg border border-slate-200 bg-white mx-auto block shadow-sm"
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={isSvg}
      className="w-full max-w-lg h-auto rounded-lg border border-slate-200 bg-white mx-auto block shadow-sm"
    />
  )
}
