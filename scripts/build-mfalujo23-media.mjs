import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const sourceRoot = path.resolve('assets/mfalujo23-media/source');
const destination = path.resolve('public/mfalujo23-media');
await fs.mkdir(destination, { recursive: true });
await fs.mkdir('config', { recursive: true });
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const definitions = [
  { id: 'fictional-property', category: 'property-photo', file: 'property-generated-v1.png', width: 1280, height: 720, purpose: 'informational', alt: 'AI-generated fictional cream house with a wood entrance and front garden; not a real listing.', sourceKind: 'actual-built-in-image-generation', proof: 'assets/mfalujo23-media/source/generation-record.json' },
  { id: 'fictional-partner', category: 'partner-banner', file: 'partner-banner.svg', width: 640, height: 240, purpose: 'informational', alt: 'Leaf and plant illustration for the Fictional Garden Partner classroom banner.', sourceKind: 'self-authored-svg-by-codex', proof: 'assets/mfalujo23-media/source/partner-banner.svg' },
  { id: 'home-navigation', category: 'navigation-icon', file: 'home-icon.svg', width: 48, height: 48, purpose: 'decorative', alt: '', sourceKind: 'self-authored-svg-by-codex', proof: 'assets/mfalujo23-media/source/home-icon.svg' },
];
const assets = [];
for (const definition of definitions) {
  const input = await fs.readFile(path.join(sourceRoot, definition.file));
  const metadata = await sharp(input).metadata();
  const renditions = [];
  const save = async (name, bytes) => {
    await fs.writeFile(path.join(destination, name), bytes);
    const output = await sharp(bytes).metadata();
    const format = output.format === 'heif' && output.compression === 'av1' && bytes.toString('ascii', 4, 12) === 'ftypavif' ? 'avif' : output.format;
    const record = { path: `/mfalujo23-media/${name}`, format, decoderFormat: output.format, compression: output.compression ?? null, width: output.width, height: output.height, bytes: bytes.length, sha256: sha(bytes) };
    renditions.push(record); return record;
  };
  let primary;
  if (definition.category === 'property-photo') {
    for (const width of [320, 640, 1280]) {
      const height = width * 9 / 16;
      const image = sharp(input).rotate().resize(width, height, { fit: 'cover', position: 'centre', withoutEnlargement: true });
      const webp = await save(`property-${width}.webp`, await image.clone().webp({ quality: 78, effort: 5 }).toBuffer());
      await save(`property-${width}.avif`, await image.clone().avif({ quality: 48, effort: 5 }).toBuffer());
      if (width === 1280) primary = webp;
    }
    await save('property-baseline-1280.jpg', await sharp(input).rotate().resize(1280, 720, { fit: 'cover', withoutEnlargement: true }).jpeg({ quality: 95, mozjpeg: true }).toBuffer());
  } else {
    primary = await save(definition.file, input);
    // A genuine raster derivative is recorded for format verification; the UI
    // uses the smaller vector original for these simple code-authored graphics.
    await save(`${definition.id}.webp`, await sharp(input).webp({ quality: 80 }).toBuffer());
  }
  assets.push({
    id: definition.id, category: definition.category, purpose: definition.purpose, alt: definition.alt,
    width: definition.width, height: definition.height, src: primary.path,
    source: { path: `assets/mfalujo23-media/source/${definition.file}`, kind: definition.sourceKind, proof: definition.proof, format: metadata.format, width: metadata.width, height: metadata.height, bytes: input.length, sha256: sha(input) },
    permission: 'Created for this authorized fictional classroom project; no third-party photo or stakeholder endorsement claimed.',
    approval: { status: 'approved', scope: 'fixture_test', actor: 'test-fixture-only', humanReviewed: false, date: '2026-11-19', productionStatus: 'draft' },
    renditions,
  });
}
const record = { generatedAtUTC: new Date().toISOString(), sharpVersion: sharp.versions.sharp, measurement: 'Actual local encoded file bytes and decoded formats/dimensions. Not transferred bytes, download time, LCP or a provider performance measurement.', assets };
await fs.writeFile('config/mfalujo23-media-manifest.json', JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ sharpVersion: record.sharpVersion, assets: assets.map((asset) => ({ id: asset.id, sourceBytes: asset.source.bytes, primary: asset.renditions.find((item) => item.path === asset.src), renditions: asset.renditions.length })) }));
