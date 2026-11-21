// Katalogu i konfirmuar nga Regina Color, 19.11.2026.
// 'Reparti' eshte vetem metadata; agjenti sheh nje katalog te bashkuar.
const raw = [
['regina-ngjyra','Urbano',['0.75 L','3 L','9 L','14 L']],
['regina-ngjyra','Bianca',['3 L','9 L','14 L']],
['regina-ngjyra','Armonia Base A',['3 L','9 L','14 L']],
['regina-ngjyra','Armonia Base B',['3 L','9 L','14 L']],
['regina-ngjyra','Armonia Base C',['3 L','9 L','14 L']],
['regina-ngjyra','Acrilin',['0.75 L','3 L','9 L']],
['regina-ngjyra','Acrilex',['0.75 L','3 L','9 L']],
['regina-ngjyra','Primafas',['5 kg','15 kg','20 kg']],
['regina-ngjyra','Primabet',['5 kg','15 kg','20 kg']],
['regina-ngjyra','Fortecril',['0.75 L','3 L','9 L']],
['regina-ngjyra','Recril',['0.75 L','3 L','9 L','14 L']],
['regina-ngjyra','Recril Base C',['3 L','9 L','14 L']],
['regina-ngjyra','Quarzo Base Bianco',['3 L','9 L','14 L']],
['regina-ngjyra','Quarzo Base A',['3 L','9 L','14 L']],
['regina-ngjyra','Quarzo Base B',['3 L','9 L','14 L']],
['regina-ngjyra','Quarzo Base C',['3 L','9 L','14 L']],
['regina-ngjyra','Recasa Base A 1.5mm',['25 kg']],
['regina-ngjyra','Recasa Base A 2mm',['25 kg']],
['regina-ngjyra','Recasa Base B 1.5mm',['25 kg']],
['regina-ngjyra','Recasa Base B 2mm',['25 kg']],
['regina-ngjyra','Recasa Base C 1.5mm',['25 kg']],
['regina-ngjyra','Recasa Base C 2mm',['25 kg']],
['regina-ngjyra','Recasa RG',['25 kg'],{prefix:'RG',start:101,end:172}],
['regina-ngjyra','Marmo Mix MX',['20 kg'],{prefix:'MX',start:101,end:124}],
['bau-pluhura','BP 110',['25 kg']],
['bau-pluhura','BP 10',['25 kg']],
['bau-pluhura','BP 110 Mase Rrafshuese',['25 kg']],
['bau-pluhura','BP 950',['25 kg']],
['bau-pluhura','BP 900',['25 kg']],
['bau-pluhura','BP 970 Weiss',['25 kg']],
['bau-pluhura','BP 970 Grau',['25 kg']],
['bau-pluhura','BP 990',['25 kg']],
['regina-pluhura','Reflex Grigio',['25 kg']],
['regina-pluhura','Reflex Bianco',['25 kg']],
['regina-pluhura','Collacem Grigio',['25 kg']],
['regina-pluhura','Collacem Bianco',['25 kg']],
['regina-pluhura','Reflex Waterproofing (A+B)',['25 kg + 8 kg']],
['bau-ngjyra','Classic Farbe',['5 kg','15 kg','25 kg']],
['bau-ngjyra','Acryl Farbe',['1 kg','5 kg','15 kg','25 kg']],
['bau-ngjyra','Star Farbe',['5 kg','15 kg','25 kg']],
['bau-ngjyra','Fasadex',['5 kg','15 kg','25 kg']],
['bau-ngjyra','Betoncontact',['5 kg','15 kg','20 kg']],
['bau-ngjyra','Grundfarbe',['1 kg','5 kg','20 kg']],
['bau-ngjyra','Putzgrund',['5 kg','15 kg','20 kg']],
['bau-ngjyra','Teifgrund',['1 kg','4 kg','15 kg']],
['bau-ngjyra','Bau Fassade Full A 1.5mm',['25 kg']],
['bau-ngjyra','Bau Fassade Full A 2mm',['25 kg']],
['bau-ngjyra','Bau Fassade Full B 1.5mm',['25 kg']],
['bau-ngjyra','Bau Fassade Full B 2mm',['25 kg']],
['bau-ngjyra','Bau Fassade Full C 1.5mm',['25 kg']],
['bau-ngjyra','Bau Fassade Full C 2mm',['25 kg']],
['bau-ngjyra','Bau Fassade ST A 2mm',['25 kg']],
['bau-ngjyra','Bau Fassade ST B 2mm',['25 kg']],
['bau-ngjyra','Bau Fassade Silikonike Full A 1.5mm',['25 kg']],
];
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const DEPARTMENTS = { 'regina-ngjyra':'Ngjyrat Regina','bau-pluhura':'Pluhurat Bau','regina-pluhura':'Pluhurat Regina','bau-ngjyra':'Ngjyrat Bau','tjeter':'Tjetër' };
// Product photos: small WebP copies in assets/products/, made from the images on reginacolori.com.
const PHOTOS = {"urbano":"urbano","bianca":"bianca","armonia-base-a":"armonia","armonia-base-b":"armonia","armonia-base-c":"armonia","acrilin":"acrilin","acrilex":"acrilex","primafas":"primafas","primabet":"primabet","fortecril":"fortecril","recril":"recril","recril-base-c":"recril","quarzo-base-bianco":"quarzo","quarzo-base-a":"quarzo","quarzo-base-b":"quarzo","quarzo-base-c":"quarzo","recasa-base-a-1-5mm":"recasa","recasa-base-a-2mm":"recasa","recasa-base-b-1-5mm":"recasa","recasa-base-b-2mm":"recasa","recasa-base-c-1-5mm":"recasa","recasa-base-c-2mm":"recasa","recasa-rg":"recasa","marmo-mix-mx":"marmomix","bp-110":"bp-110-putz","bp-10":"bp-10","bp-110-mase-rrafshuese":"bp-110-mortel","bp-950":"bp-950","bp-900":"bp-900","bp-970-weiss":"bp-970-weiss","bp-970-grau":"bp-970-grau","bp-990":"bp-990","reflex-grigio":"reflex-grigio","reflex-bianco":"reflex-bianco","collacem-grigio":"collacem-grigio","collacem-bianco":"collacem-bianco","reflex-waterproofing-a-b":"reflex-waterproofing","classic-farbe":"classic-farbe","acryl-farbe":"acryl-farbe","star-farbe":"star-farbe","fasadex":"fasadex","betoncontact":"betoncontact","grundfarbe":"grundfarbe","putzgrund":"putzgrund","teifgrund":"tiefgrund","bau-fassade-full-a-1-5mm":"bau-fassade","bau-fassade-full-a-2mm":"bau-fassade","bau-fassade-full-b-1-5mm":"bau-fassade","bau-fassade-full-b-2mm":"bau-fassade","bau-fassade-full-c-1-5mm":"bau-fassade","bau-fassade-full-c-2mm":"bau-fassade","bau-fassade-st-a-2mm":"bau-fassade","bau-fassade-st-b-2mm":"bau-fassade","bau-fassade-silikonike-full-a-1-5mm":"bau-fassade"};
export const CATALOG_PRODUCTS = raw.map(([department,name,sizes,shades]) => ({id:slug(name),name,department,sizes,shades: shades || null,image_url:PHOTOS[slug(name)]?`/assets/products/${PHOTOS[slug(name)]}.webp`:null,active:true}));
export const CATALOG_VARIANTS = CATALOG_PRODUCTS.flatMap(p=>{
  const shadeCodes=p.shades?Array.from({length:p.shades.end-p.shades.start+1},(_,i)=>p.shades.prefix+' '+(p.shades.start+i)):[null];
  return shadeCodes.flatMap(shade=>p.sizes.map(size=>({id:slug(p.name+'-'+(shade||'')+'-'+size),product_id:p.id,size_label:size,shade_code:shade,label:shade?`${shade} · ${size}`:size,active:true})));
});
export const CATALOG_COUNTS={products:CATALOG_PRODUCTS.length,variants:CATALOG_VARIANTS.length};
