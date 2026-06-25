// Toggle mobile nav
const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');
if(navToggle){
  navToggle.addEventListener('click', ()=>{
    navList.style.display = (navList.style.display === 'flex' || navList.style.display === '') ? 'none' : 'flex';
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const target = document.querySelector(a.getAttribute('href'));
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
      if(window.innerWidth <= 720 && navList){ navList.style.display = 'none'; }
    }
  });
});

const pokemonForm = document.getElementById('pokemonForm');
const pokemonStatus = document.getElementById('pokemonStatus');
const pokemonResult = document.getElementById('pokemonResult');

const typeNames = {
  normal:'一般', fire:'火', water:'水', electric:'電', grass:'草', ice:'冰',
  fighting:'格鬥', poison:'毒', ground:'地面', flying:'飛行', psychic:'超能力',
  bug:'蟲', rock:'岩石', ghost:'幽靈', dragon:'龍', dark:'惡', steel:'鋼', fairy:'妖精'
};

const statNames = {
  hp:'HP', attack:'攻擊', defense:'防禦', 'special-attack':'特攻', 'special-defense':'特防', speed:'速度'
};

const nameLookup = {};
const namesReady = Promise.all([
  fetch('pokemon-names.json')
    .then(res => res.json())
    .then(list => {
      list.forEach(entry => {
        const english = entry.name.english.toLowerCase();
        const chinese = entry.name.chinese.toLowerCase();
        nameLookup[english] = entry.name.english;
        nameLookup[chinese] = entry.name.english;
      });
    }),
  fetch('pokemon-traditional-map.json')
    .then(res => res.json())
    .then(map => {
      Object.entries(map).forEach(([traditional, english]) => {
        nameLookup[traditional.toLowerCase()] = english;
      });
    })
])
  .catch(() => {
    console.warn('無法載入中文名稱對照表，僅支援英文名稱與編號。');
  });

function prettyName(value){
  return value.replace(/-/g, ' ').replace(/\b[a-z]/g, char => char.toUpperCase());
}

function localizeName(names){
  const zhHant = names.find(item => item.language.name === 'zh-hant');
  const zhHans = names.find(item => item.language.name === 'zh-hans');
  return zhHant?.name || zhHans?.name || names.find(item => item.language.name === 'en')?.name || '';
}

function parseEvolutionChain(chain){
  const species = prettyName(chain.species.name);
  if(!chain.evolves_to.length){
    return species;
  }

  const evolves = chain.evolves_to.map(branch => parseEvolutionChain(branch));
  return `${species} → ${evolves.join(' / ')}`;
}

function renderPokemon(pokemon, evolution, chineseName, moveNames){
  const types = pokemon.types.map(t => `<span class="poke-chip">${typeNames[t.type.name] || prettyName(t.type.name)}</span>`).join('');
  const stats = pokemon.stats.map(stat => `<li>${statNames[stat.stat.name] || prettyName(stat.stat.name)}: ${stat.base_stat}</li>`).join('');
  const moves = moveNames.map(move => `<li>${move}</li>`).join('');
  const sprite = pokemon.sprites.front_default;
  const gasUrl = document.getElementById('gasUrl')?.value.trim();

  return `
    <article class="poke-card">
      <div class="poke-header">
        <div>
          <h3>${chineseName || prettyName(pokemon.name)}</h3>
          <div class="poke-row"><strong>屬性：</strong>${types}</div>
        </div>
        ${sprite ? `<img src="${sprite}" alt="${chineseName || prettyName(pokemon.name)}" class="poke-sprite">` : ''}
      </div>
      <div class="poke-grid">
        <div>
          <h4>種族值</h4>
          <ul class="poke-list">${stats}</ul>
        </div>
        <div>
          <h4>技能（前 8 項）</h4>
          <ul class="poke-list">${moves}</ul>
        </div>
      </div>
      <div class="poke-row"><strong>進化型：</strong>${evolution}</div>
      ${gasUrl ? `<div class="poke-row" style="margin-top:16px;gap:8px;"><button type="button" class="btn save-pokemon-btn" data-pokemon="${encodeURIComponent(JSON.stringify({pokemon:pokemon.name,chineseName,id:pokemon.id,types:pokemon.types.map(t=>t.type.name),stats:pokemon.stats,moves:moveNames,evolution}))}">💾 保存到 Google Sheets</button></div>` : ''}
    </article>
  `;
}

async function fetchMoveChineseName(moveUrl){
  try {
    const res = await fetch(moveUrl);
    if(!res.ok){
      throw new Error('move-fail');
    }
    const moveData = await res.json();
    const localized = localizeName(moveData.names);
    return localized || prettyName(moveData.name);
  } catch {
    return '技能資料無法取得';
  }
}

async function fetchEvolutionAndSpecies(speciesUrl){
  const speciesRes = await fetch(speciesUrl);
  if(!speciesRes.ok){
    throw new Error('species-fail');
  }
  const speciesData = await speciesRes.json();
  const chainRes = await fetch(speciesData.evolution_chain.url);
  if(!chainRes.ok){
    throw new Error('evolution-fail');
  }
  const chainData = await chainRes.json();
  return {
    evolution: parseEvolutionChain(chainData.chain),
    speciesData
  };
}

async function loadPokemon(query){
  await namesReady;
  const lookup = nameLookup[query] || query;
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(lookup)}`);
  if(!response.ok){
    const error = new Error('notfound');
    error.code = response.status;
    throw error;
  }
  const data = await response.json();
  const { evolution, speciesData } = await fetchEvolutionAndSpecies(data.species.url);
  const chineseName = localizeName(speciesData.names);
  const moveNames = await Promise.all(data.moves.slice(0, 8).map(move => fetchMoveChineseName(move.move.url)));
  return { data, evolution, chineseName, moveNames };
}

if(pokemonForm){
  pokemonForm.addEventListener('submit', async e => {
    e.preventDefault();
    const query = pokemonForm.pokemonName.value.trim().toLowerCase();
    if(!query){
      pokemonStatus.textContent = '請輸入寶可夢中文名稱、英文名稱或編號。';
      pokemonResult.innerHTML = '';
      return;
    }

    pokemonStatus.textContent = '查詢中...';
    pokemonResult.innerHTML = '';

    try {
      const { data, evolution, chineseName, moveNames } = await loadPokemon(query);
      pokemonStatus.textContent = '';
      pokemonResult.innerHTML = renderPokemon(data, evolution, chineseName, moveNames);
    } catch (error) {
      if(error.message === 'notfound'){
        pokemonStatus.textContent = '找不到該寶可夢，請確認名稱或編號是否正確。';
      } else {
        pokemonStatus.textContent = '查詢時發生錯誤，請稍後再試。';
        console.error(error);
      }
      pokemonResult.innerHTML = '';
    }
  });

  const randomBtn = document.getElementById('randomPokemonBtn');
  if(randomBtn){
    randomBtn.addEventListener('click', async e => {
      e.preventDefault();
      const randomId = Math.floor(Math.random() * 1025) + 1;
      
      pokemonStatus.textContent = '隨機產生中...';
      pokemonResult.innerHTML = '';
      pokemonForm.pokemonName.value = randomId;

      try {
        const { data, evolution, chineseName, moveNames } = await loadPokemon(randomId.toString());
        pokemonStatus.textContent = '';
        pokemonResult.innerHTML = renderPokemon(data, evolution, chineseName, moveNames);
        attachSaveButton();
      } catch (error) {
        if(error.message === 'notfound'){
          pokemonStatus.textContent = '找不到該寶可夢編號，請重新嘗試。';
        } else {
          pokemonStatus.textContent = '查詢時發生錯誤，請稍後再試。';
          console.error(error);
        }
        pokemonResult.innerHTML = '';
      }
    });
  }

  function attachSaveButton(){
    document.querySelectorAll('.save-pokemon-btn').forEach(btn => {
      if(btn._listenerAttached) return;
      btn._listenerAttached = true;
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const gasUrl = document.getElementById('gasUrl')?.value.trim();
        if(!gasUrl){
          pokemonStatus.textContent = '請先輸入 Google Apps Script 網址';
          return;
        }

        const pokemonData = JSON.parse(decodeURIComponent(btn.dataset.pokemon));
        const saveStatus = document.getElementById('saveStatus');
        saveStatus.textContent = '保存中...';

        try {
          const response = await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pokemon: pokemonData.pokemon,
              chineseName: pokemonData.chineseName,
              id: pokemonData.id,
              types: pokemonData.types.join(', '),
              moves: pokemonData.moves.join(', '),
              evolution: pokemonData.evolution,
              timestamp: new Date().toISOString()
            })
          });
          saveStatus.textContent = '✓ 已成功保存到 Google Sheets';
          setTimeout(() => { saveStatus.textContent = ''; }, 3000);
        } catch (error) {
          saveStatus.textContent = '保存失敗，請檢查 GAS 網址是否正確';
          console.error('Save error:', error);
        }
      });
    });
  }

  pokemonForm.addEventListener('change', attachSaveButton);
  pokemonResult.addEventListener('click', attachSaveButton);
}

// Simple form validation + faux submit
const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
if(form){
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    if(!name || !email || !message){
      status.textContent = '請填寫所有欄位。';
      return;
    }
    status.textContent = '送出中...';
    // simulate send
    setTimeout(()=>{
      status.textContent = '已成功送出，感謝您！';
      form.reset();
    },800);
  });
}
