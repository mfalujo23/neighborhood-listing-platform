import {afterEach,describe,expect,test,vi} from 'vitest'
import {getImgProps} from 'next/dist/shared/lib/get-img-props'
import {imageConfigDefault,prepareImageConfig} from 'next/dist/shared/lib/image-config'
import imageSettings from '../../config/mfalujo23-media-image-config.mjs'
import manifest from '../../config/mfalujo23-media-manifest.json'
import {exactMediaLoader} from '../media/renditions'
import {captureMediaPerformance} from '../media/performance'

afterEach(()=>vi.unstubAllGlobals())
describe('Exact Next image width descriptors',()=>{
  test('Next emits only three unique URLs whose encoded widths equal each descriptor',()=>{
    const asset=manifest.assets[0]
    const imgConf=prepareImageConfig({...imageConfigDefault,...imageSettings})
    const result=getImgProps({src:asset.src,alt:asset.alt,width:1280,height:720,sizes:'(max-width:600px) calc(100vw - 62px),998px',loader:exactMediaLoader(asset.renditions)}, {imgConf,defaultLoader:({src,width})=>`${src}?w=${width}`})
    const candidates=result.props.srcSet!.split(', ').map(part=>{const[url,descriptor]=part.split(' ');return{url,width:Number(descriptor.slice(0,-1))}})
    expect(candidates.map(candidate=>candidate.width)).toEqual([320,640,1280])
    expect(new Set(candidates.map(candidate=>candidate.url)).size).toBe(3)
    for(const candidate of candidates){const url=new URL(candidate.url,'http://localhost');expect(Number(url.pathname.match(/property-(\d+)\.webp/)![1])).toBe(candidate.width);expect(Number(url.searchParams.get('w'))).toBe(candidate.width)}
  })
  test('unknown widths and missing exact renditions fail instead of aliasing1280',()=>{
    expect(()=>exactMediaLoader(manifest.assets[0].renditions)({width:3840})).toThrow('Unsupported media width')
    expect(()=>exactMediaLoader([])({width:640})).toThrow('exact-width')
  })
})
describe('Synthetic ResourceTiming selector regression (not browser measurements)',()=>{
  test('matches preload link, ignores HEAD fetch and preserves unavailable LCP',async()=>{
    const url='http://127.0.0.1:3000/mfalujo23-media/property-1280.webp?w=1280'
    const entry={name:url,initiatorType:'link',transferSize:161392,encodedBodySize:161092,responseStart:10,responseEnd:30,duration:25}
    vi.stubGlobal('performance',{getEntriesByType:(kind:string)=>kind==='resource'?[entry,{...entry,initiatorType:'fetch',transferSize:0,responseEnd:80}]:[]})
    vi.stubGlobal('document',{querySelectorAll:()=>[{currentSrc:url,src:url,dataset:{mediaAsset:'fictional-property'},getBoundingClientRect:()=>({width:998}),naturalWidth:1280,naturalHeight:720,complete:true}],visibilityState:'hidden',hidden:true,hasFocus:()=>false})
    vi.stubGlobal('location',{origin:'http://127.0.0.1:3000',pathname:'/media-demo'})
    vi.stubGlobal('innerWidth',1280);vi.stubGlobal('innerHeight',900);vi.stubGlobal('devicePixelRatio',1)
    vi.stubGlobal('PerformanceObserver',{supportedEntryTypes:['largest-contentful-paint']})
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:200,headers:{'Content-Type':'image/webp'}})))
    const result=await captureMediaPerformance(null,null,'observing')
    expect(result.records[0]).toMatchObject({initiatorType:'link',requestURL:url,currentSrc:url,transferBytes:161392,downloadMs:20})
    expect(result.records[0].matchingImageRequests).toHaveLength(1)
    expect(result.lcpMs).toBeNull();expect(result.lcpDiagnostics).toMatchObject({visibilityState:'hidden',documentHidden:true,observedLcpAvailable:false})
  })
})
