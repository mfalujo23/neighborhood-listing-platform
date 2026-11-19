Michael Falujo

# Digital Asset Pipeline & Performance Audit

## Asset A: Primary Property Listing Image

Source: /mfalujo23-media/property-1280.webp. Original/proof: assets/mfalujo23-media/source/property-generated-v1.png; assets/mfalujo23-media/source/generation-record.json. Custodian: mfalujo23.
Permission source: the user-authorized actual built-in image-generation request and saved result. No existing realtor photograph or real business endorsement is represented.
Approval field: media_asset_records.asset_id='fictional-property', approval_status='approved', approval_scope='fixture_test', human_reviewed=false, production_status='draft'. The actual local database record is test-only; human production clearance is pending.
Purpose: informational. Exact attribute: alt={asset.purpose === 'decorative' ? '' : asset.alt}. Actual alt: "AI-generated fictional cream house with a wood entrance and front garden; not a real listing.".
Responsive binding: width=1280, height=720; exact 320/640/1280 WebP source widths and responsive sizes. Shared actual JSX follows the asset answers.
| Network/layout | 390px viewport | 1280px viewport |
|---|---|---|
| Rendered CSS width | 313px | 998px |
| Selected file | property-640.webp | property-1280.webp |
| Transferred kB (1000B) | 47.506 | 161.392 |
| Content-Type | image/webp | image/webp |
| Download ms | 720.6 | 2457.3 |
Risk: oversized raster payloads and layout movement. The source PNG remains outside public; Sharp crops genuine 16:9 WebP/AVIF renditions. Next generates only 320/640/1280 width descriptors matched to exact files, with explicit dimensions/sizes and a reserved fallback frame.

## Asset B: Local Business Partner Ad Banner

Source: /mfalujo23-media/partner-banner.svg. Original/proof: assets/mfalujo23-media/source/partner-banner.svg; assets/mfalujo23-media/source/partner-banner.svg. Custodian: mfalujo23.
Permission source: SVG source authored for this authorized fictional project. No existing realtor photograph or real business endorsement is represented.
Approval field: media_asset_records.asset_id='fictional-partner', approval_status='approved', approval_scope='fixture_test', human_reviewed=false, production_status='draft'. The actual local database record is test-only; human production clearance is pending.
Purpose: informational. Exact attribute: alt={asset.purpose === 'decorative' ? '' : asset.alt}. Actual alt: "Leaf and plant illustration for the Fictional Garden Partner classroom banner.".
Responsive binding: width=640, height=240; 640px maximum banner container. Shared actual JSX follows the asset answers.
| Network/layout | 390px viewport | 1280px viewport |
|---|---|---|
| Rendered CSS width | 313px | 640px |
| Selected file | partner-banner.svg | partner-banner.svg |
| Transferred kB (1000B) | 1.006 | 1.006 |
| Content-Type | image/svg+xml | image/svg+xml |
| Download ms | 0.6 | 0.5 |
Risk: rasterizing a simple banner wastes payload. The page serves the 706-byte SVG with a reserved 640x240 ratio and a 640px maximum container; loading is lazy.

## Asset C: UI / Navigational Graphic

Source: /mfalujo23-media/home-icon.svg. Original/proof: assets/mfalujo23-media/source/home-icon.svg; assets/mfalujo23-media/source/home-icon.svg. Custodian: mfalujo23.
Permission source: SVG source authored for this authorized fictional project. No existing realtor photograph or real business endorsement is represented.
Approval field: media_asset_records.asset_id='home-navigation', approval_status='approved', approval_scope='fixture_test', human_reviewed=false, production_status='draft'. The actual local database record is test-only; human production clearance is pending.
Purpose: decorative. Exact attribute: alt={asset.purpose === 'decorative' ? '' : asset.alt}. Actual alt: "". The visible Home text gives the link its name, so empty alt avoids repetition.
Responsive binding: width=48, height=48; fixed 32px CSS/navigation sizes. Shared actual JSX follows the asset answers.
| Network/layout | 390px viewport | 1280px viewport |
|---|---|---|
| Rendered CSS width | 32px | 32px |
| Selected file | home-icon.svg | home-icon.svg |
| Transferred kB (1000B) | 0.614 | 0.614 |
| Content-Type | image/svg+xml | image/svg+xml |
| Download ms | 0.9 | 1.0 |
Risk: navigation shifts or duplicate screen-reader labels. The SVG has a fixed 32px CSS box and empty alt because adjacent Home text supplies the name.

## Responsive Image JSX

```tsx
<Image
      data-media-asset={asset.id} src={source} alt={asset.purpose === 'decorative' ? '' : asset.alt}
      width={asset.width} height={asset.height}
      sizes={navigation ? '32px' : raster ? '(max-width: 600px) calc(100vw - 62px), (max-width: 1100px) calc(100vw - 102px), 998px' : '(max-width: 600px) calc(100vw - 62px), (max-width: 742px) calc(100vw - 102px), 640px'}
      {...(raster && !baseline && !broken ? { loader } : { unoptimized: true })}
      loading={raster || navigation ? 'eager' : 'lazy'} fetchPriority={raster ? 'high' : 'auto'}
      className={styles.image} onError={() => setFailed(true)}
    />
```

Network method: exact-currentSrc ResourceTiming img/preload-link matches; Content-Type from separate successful same-origin HEAD requests. The controlled loopback proxy paces only raster image bodies at 64KiB/s after 400ms; all responses use no-store. HTML/JS/CSS/SVG are unthrottled. No Chrome Slow3G or DevTools cache-disabled setting was used. These are four fresh foreground observations with all images complete, from the media-correction build before the provider-draft review overlay.
