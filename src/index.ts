import { OutputOptions } from 'rollup'
import type { AssetInfo, ChunkInfo } from './rollup-types.js'
import subsetFont from 'subset-font'

const IsAssetInfo = (info: AssetInfo | ChunkInfo): info is AssetInfo => {
  return info.type === 'asset'
}

const extractGlyphSet = (info: AssetInfo | ChunkInfo): Set<string> => {
  if (IsAssetInfo(info)) {
    if (typeof (info.source) === 'string') {
      return new Set(info.source)
    }
    else {
      return new Set()
    }
  }
  return new Set(info.code)
}

async function generateBundle (
  options: OutputOptions,
  bundle: { [fileName: string]: AssetInfo | ChunkInfo },
) {
  // list files
  const fontFiles = Object.keys(bundle).filter((fileName) => {
    return fileName.match(/\.woff2$/)
  })
  const sourceFiles = Object.keys(bundle).filter((fileName) => {
    return fileName.match(/\.(js|css|htm|html)$/)
  })
  console.log("subsetting font")
  console.log("subset target:", fontFiles)
  console.log("subset based on:", sourceFiles)
  
  // compute glyph set
  const glyphSet = sourceFiles.map(
    (fileName) => extractGlyphSet(bundle[fileName])
  ).reduce(
    (acc, set) => new Set([...acc, ...set]), new Set<string>()
  );
  console.log("glyph set size:", glyphSet.size);
  const glyphSetString = Array.from(glyphSet).join('')

  // subset fonts
  for (const fileName of fontFiles) {
    const font = bundle[fileName]
    if (IsAssetInfo(font) && typeof (font.source) !== 'string') {
      const subset = await subsetFont(
        Buffer.from(font.source),
        glyphSetString,
        { targetFormat: 'woff2' }
      )
      font.source = new Uint8Array(subset)
    }
  }
}

export function fontSubsetter() {
  return {
    name: "font-subsetter",
    generateBundle
  }
}