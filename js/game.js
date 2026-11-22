/* Oyun verisi (gamedata/): tür/stat, ability, evrim, mega, hamle tabloları. Kimlik = oyun dex id'si
   (1..1025 ulusal dex, 3000+ alternatif form: mega, shadow, baby, event). PokéAPI kullanılmaz. */
const FILES = ['tables/DexDB.json', 'tables/AbilityDb.json', 'tables/EvolveDb.json', 'tables/MegaDb.json', 'tables/MoveData.json', 'abilities.json', 'form-map.json'];
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

let P = null;
export const game = () => P ??= Promise.all(FILES.map(async f => {
  const r = await fetch('gamedata/' + f);
  if(!r.ok) throw new Error(`gamedata/${f}: HTTP ${r.status}`);
  return r.json();
})).then(build).catch(e => { P = null; throw e; });

function build([dex, abil, evo, mega, moves, abDesc, fm]){
  const forms = fm.species_forms ?? fm, formRoot = {}, byName = {}, moveBy = {}, descBy = {};
  for(const [sp, ids] of Object.entries(forms)) ids.forEach(id => { formRoot[id] = +sp; });
  // ad → id: önce ulusal dex (<3000), sonra yalnızca adı benzersiz olan alternatif formlar
  for(const [id, d] of Object.entries(dex)) if(+id < 3000) byName[norm(d.Name)] ??= +id;
  for(const [id, d] of Object.entries(dex)) if(+id >= 3000) byName[norm(d.Name)] ??= +id;
  for(const m of Object.values(moves)) moveBy[norm(m.Name)] = m;
  for(const [n, d] of Object.entries(abDesc)) descBy[norm(n)] = d;
  const megaIds = {}; // tür → [mega form id'leri]
  for(const [sp, list] of Object.entries(mega)) megaIds[sp] = list.map(([stone, i]) => ({ id: forms[sp]?.[+i], stone })).filter(x => x.id);
  const isMegaId = new Set(Object.values(megaIds).flat().map(x => x.id));
  const rootOf = id => formRoot[id] ?? id;
  return {
    dex, rootOf,
    idByName(name){
      const k = norm(name);
      return byName[k] ?? byName[norm(String(name).split('-')[0])] ?? null; // "Slowbro-Galar" → Slowbro (form bilgisi yoksa)
    },
    /** türün mega olmayan formları [tür, ...alternatifler] */
    formsOf: root => [root, ...(forms[root] ?? []).filter(id => !isMegaId.has(id))],
    megasOf: root => (megaIds[root] ?? []).map(x => x.id),
    megaStone: id => Object.values(megaIds).flat().find(x => x.id === id)?.stone ?? '',
    /** PC'den gelen (dex, form) çifti → oyun form id'si (form 1-indeksli; form yoksa dex'in kendisi) */
    formId: (dex, f) => (+dex < 3000 && f > 0 ? forms[dex]?.[f - 1] : null) ?? +dex,
    /** form id'nin kendi evrim girdisi var mı (örn. Alolan Rattata 3057 → 3058) */
    hasEvo: id => !!evo[id]?.length,
    /** evrim zincirinin son halleri (kök hariç); start = alternatif formdan başlamak için (EvolveDb'de form id'leri de var) */
    finalsOf(root, start = root){
      const out = [], mid = [], seen = new Set([root, start]);
      const walk = id => {
        const next = (evo[id] ?? []).map(e => e[0]).filter(n => !seen.has(n) && dex[n]);
        if(!next.length){ if(id !== root) out.push(id); return; }
        if(id !== start) mid.push(id);   // ara evrim (ör. Charmeleon)
        next.forEach(n => { seen.add(n); walk(n); });
      };
      walk(start);
      return [...new Set([...out, ...mid])];   // son halleri önce: varsayılan seçim hep son hal
    },
    hiddenOf(id){ const h = abil[id]?.Ha; return h && h !== 'None' ? h : null; },
    abilitiesOf(id){ const a = abil[id]; return a ? [a.A1, a.A2, a.Ha].filter(x => x && x !== 'None') : []; },
    abilityDesc: name => descBy[norm(name)] ?? null,
    move: name => moveBy[norm(name)] ?? null,
    stats(id){
      const d = dex[id];
      return { HP: d.Hp, Atk: d.Atk, Def: d.Def, SpA: d.Spa, SpD: d.Spd, Spe: d.Spe };
    },
    types: id => [dex[id].Type1, dex[id].Type2].filter(Boolean),
    label(id){
      const d = dex[id];
      if(isMegaId.has(id)){ const s = this.megaStone(id).match(/ ([XY])$/)?.[1]; return `Mega ${d.Name}${s ? ' ' + s : ''}`; }
      return id < 3000 ? d.Name : `${d.Name} · ${[d.Type1, d.Type2].filter(Boolean).join('/')} · #${id}`;
    },
  };
}
