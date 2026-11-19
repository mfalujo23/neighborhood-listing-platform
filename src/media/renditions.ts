import mediaImageConfig from '../../config/mfalujo23-media-image-config.mjs'
interface Rendition {path:string;format:string;width:number}
export function exactMediaLoader(renditions:readonly Rendition[]) {
  return ({width}:{width:number}) => {
    if (!mediaImageConfig.deviceSizes.includes(width)) throw new Error('Unsupported media width; image configuration must use the inventoried widths.')
    const selected = renditions.find((rendition) => rendition.format === 'webp' && rendition.width === width)
    if (!selected) throw new Error('An exact-width media rendition is missing.')
    return `${selected.path}?w=${width}`
  }
}
