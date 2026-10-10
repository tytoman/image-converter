import fs from 'node:fs';
import assert from 'node:assert/strict';
import init, {capabilities, inspect, convert} from '../public/wasm/image_converter.js';
await init({module_or_path: fs.readFileSync('public/wasm/image_converter_bg.wasm')});
const caps = JSON.parse(capabilities());
for (const name of ['SVG','EXR','HDR','JXL','TGA']) assert(caps.inputs.includes(name), `missing input ${name}`);
for (const name of ['JXL','TGA']) assert(caps.outputs.includes(name), `missing output ${name}`);
for (const name of ['SVG','EXR','HDR']) assert(!caps.outputs.includes(name), `unexpected output ${name}`);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"><rect width="2" height="1" fill="#4080c0" fill-opacity="0.5"/></svg>');
const hdr = Buffer.concat([Buffer.from('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 2\n'),Buffer.from([128,64,32,129,64,128,32,129])]);
const tga = new Uint8Array(26);
tga[2]=2; tga[12]=2; tga[14]=1; tga[16]=32; tga[17]=0x28;
tga.set([192,128,64,128,0,255,0,255],18);
const png = convert(svg,'test.svg',JSON.stringify({format:'png'}));
const squarePng = convert(png,'test.png',JSON.stringify({format:'png',width:2,height:2}));
const jxl = convert(squarePng,'test.png',JSON.stringify({format:'jxl'}));
const sources = [['test.svg',svg],['test.hdr',hdr],['test.tga',tga],['test.jxl',jxl]];
sources.push(['test.exr',fs.readFileSync('engine/fixtures/tiny.exr')]);
const tgaOutput=(bytes,name)=>Buffer.from(convert(bytes,name,JSON.stringify({format:'tga'})));
assert.deepEqual(tgaOutput(jxl,'test.jxl'),tgaOutput(squarePng,'test.png'),'JXL must preserve colors and alpha');
const expectedHdr=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"><rect width="1" height="1" fill="rgb(255,188,137)"/><rect x="1" width="1" height="1" fill="rgb(188,255,137)"/></svg>');
assert.deepEqual(tgaOutput(hdr,'test.hdr'),tgaOutput(expectedHdr,'expected.svg'),'HDR linear RGB must be converted to sRGB');
const expectedExr=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="1"><rect width="2" height="1" fill="rgb(255,188,137)"/></svg>');
assert.deepEqual(tgaOutput(sources.at(-1)[1],'test.exr'),tgaOutput(expectedExr,'expected.svg'),'EXR linear RGB must be converted to sRGB');
for (const [name,bytes] of sources) {
  const info=JSON.parse(inspect(bytes,name));
  assert(info.width>0 && info.height>0 && info.frames>=1,name);
  for (const format of ['png','jxl','tga']) {
    const size=format==='jxl'?2:1;
    const out=convert(bytes,name,JSON.stringify({format,width:size,height:size}));
    const result=JSON.parse(inspect(out,`result.${format}`));
    assert.equal(result.width,size); assert.equal(result.height,size);
  }
  console.log(`${name}: inspect and PNG/JXL/TGA resize conversions passed`);
}
for (const format of ['svg','exr','hdr']) assert.throws(()=>convert(svg,'test.svg',JSON.stringify({format})));
assert.throws(()=>convert(svg,'test.svg',JSON.stringify({format:'jxl',width:1,height:1})),/2/);
assert.throws(()=>inspect(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="1"/>'),'large.svg'));
assert.throws(()=>inspect(new Uint8Array([255,10]),'broken.jxl'));
console.log('Input-only output rejection, dimensions, malformed JXL passed');
