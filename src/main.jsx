import React, { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const LEGACY_SOURCES = {
  pokemon: (name) => `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name.toLowerCase())}`,
  radio: 'https://de1.api.radio-browser.info/json/stations/search?limit=8&hidebroken=true&order=clickcount&reverse=true&tag=rock',
  quote: 'https://dummyjson.com/quotes/random',
  lexicon: 'https://randomlexicon.com/api',
  lexiconFallback: 'https://random-word-api.herokuapp.com/word?number=1&diff=2',
  lexiconFallback2: 'https://random-words-api.vercel.app/word',
  reddit: 'https://tradestie.com/v1/apps/reddit',
  meme: 'https://justmeme.wtf/api/v1/random',
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()
  if (!contentType.includes('json')) {
    throw new Error('The source returned a non-JSON response.')
  }
  try { return JSON.parse(text) } catch { throw new Error('The source returned invalid JSON.') }
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.text()
}

function Loading({ label = 'Loading…' }) { return <p className="status" role="status" aria-live="polite">{label}</p> }
function ErrorMessage({ message, onRetry }) {
  return <div className="status error" role="alert"><span>{message}</span>{onRetry && <button className="button inline-action" type="button" onClick={onRetry}>Try again</button>}</div>
}
function EmptyState({ title = 'Nothing to show yet.', children }) {
  return <div className="empty-state"><strong>{title}</strong>{children && <span>{children}</span>}</div>
}
function SourceNote({ children }) {
  return <p className="source-note">Source: {children}</p>
}

function Card({ id, eyebrow, title, children, actions }) {
  return <section className="card" id={id}>
    <div className="card-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{actions && <div className="actions">{actions}</div>}</div>
    {children}
  </section>
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const user = username.trim().toLowerCase()
    const normalizedEmail = email.trim().toLowerCase()

    if (!isSupabaseConfigured) return setError('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.')
    if (!/^[a-z0-9_]{3,24}$/.test(user)) return setError('Username must be 3–24 characters using letters, numbers, or underscores.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')

    setBusy(true)
    try {
      if (mode === 'register') {
        const { data, error: signError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { username: user } },
        })
        if (signError) throw signError
        if (!data.user) throw new Error('Unable to create the account.')

        if (!data.session) {
          setNotice('Account created. Check your email for the confirmation link, then sign in.')
          setMode('login')
          setPassword('')
          return
        }
      } else {
        const { data, error: signError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (signError) throw signError
        if (!data.user) throw new Error('Unable to sign in.')
      }
      onLogin(user)
    } catch (err) {
      setError(err.message || 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setNotice('')
  }

  return <main className="auth-shell">
    <div className="auth-card">
      <p className="eyebrow">A FUN TIME</p>
      <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
      <p className="lead">
        {mode === 'login'
          ? 'Sign in with the email and password you used when registering.'
          : 'Choose a public username and register with your email and password.'}
      </p>
      <form onSubmit={submit}>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); setNotice('') }} autoComplete="username" placeholder="e.g. kaushik_01" />

        <label htmlFor="email" className="field-label">Email address</label>
        <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); setNotice('') }} autoComplete="email" placeholder="you@example.com" />

        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); setNotice('') }} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" />

        {error && <ErrorMessage message={error} />}
        {notice && <p className="status notice" role="status">{notice}</p>}
        <button className="button primary full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      <button className="switch-auth" type="button" onClick={switchMode}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
      </button>
      <div className="demo-notice"><strong>Secure account storage</strong><span>Supabase Auth handles password storage and verification. Your username is stored in the profiles table for search, connections, and chat; passwords are not stored there.</span></div>
    </div>
  </main>
}
function PokemonSection() {
  const [pokemon, setPokemon] = useState(null), [query, setQuery] = useState('pikachu'), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const load = useCallback(async (name = query) => { setLoading(true); setError(''); try { setPokemon(await fetchJson(LEGACY_SOURCES.pokemon(name)))} catch { setPokemon(null); setError('Pokémon not found. Try a name such as pikachu or charizard.')} finally { setLoading(false) } }, [query])
  useEffect(() => { load('pikachu') }, [])
  return <Card id="pokemon" eyebrow="01 · Pokémon data" title="Pokémon explorer">
    <form className="input-row" onSubmit={(e) => { e.preventDefault(); load() }}><input aria-label="Pokémon name" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try pikachu or charizard" /><button className="button primary" disabled={loading}>{loading ? 'Loading…' : 'Search'}</button></form>
    <p className="widget-help">Search public Pokémon data and see a Pokémon’s basic stats.</p>
    {loading && <Loading label="Fetching Pokémon data…" />}{error && <ErrorMessage message={error} onRetry={() => load()} />}
    {pokemon && !loading && <><div className="pokemon"><img src={pokemon.sprites?.front_default} alt="" /><div><h3>{pokemon.name}</h3><p className="meta">#{String(pokemon.id).padStart(4, '0')} · {pokemon.types.map((t) => t.type.name).join(' / ')}</p><p className="statline">Height {pokemon.height / 10} m · Weight {pokemon.weight / 10} kg</p></div></div><SourceNote>Pokémon data · public data retrieved when you search.</SourceNote></>}
  </Card>
}

const SUITS = ['♠','♥','♦','♣']
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']

function makeDeck() {
  return SUITS.flatMap(suit => RANKS.map((rank, index) => ({ rank, suit, value: index + 2, red: suit === '♥' || suit === '♦' })))
}
function shuffle(cards) {
  const a = [...cards]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function combinations(cards, n) {
  if (n === 0) return [[]]
  if (cards.length < n) return []
  const [first, ...rest] = cards
  return [...combinations(rest, n - 1).map(x => [first, ...x]), ...combinations(rest, n)]
}
function scoreFive(cards) {
  const counts = Object.values(cards.reduce((m, c) => { m[c.value] = (m[c.value] || 0) + 1; return m }, {})).sort((a,b) => b-a)
  const vals = [...new Set(cards.map(c => c.value))].sort((a,b) => b-a)
  if (vals.includes(14)) vals.push(1)
  let straightHigh = null
  for (let i=0;i<=vals.length-5;i++) if (vals[i]-vals[i+4]===4) { straightHigh=vals[i]; break }
  const flush = cards.every(c => c.suit === cards[0].suit)
  const groups = {}
  cards.forEach(c => { (groups[c.value] ||= []).push(c) })
  const byCount = Object.entries(groups).sort((a,b) => b[1].length-a[1].length || Number(b[0])-Number(a[0]))
  if (flush && straightHigh) return [8, straightHigh]
  if (counts[0]===4) return [7, Number(byCount[0][0]), Number(byCount[1][0])]
  if (counts[0]===3 && counts[1]===2) return [6, Number(byCount[0][0]), Number(byCount[1][0])]
  if (flush) return [5, ...vals]
  if (straightHigh) return [4, straightHigh]
  if (counts[0]===3) return [3, Number(byCount[0][0]), ...vals.filter(v=>v!==Number(byCount[0][0]))]
  if (counts[0]===2 && counts[1]===2) { const pairs=byCount.filter(x=>x[1].length===2).map(x=>Number(x[0])).sort((a,b)=>b-a); return [2,...pairs, ...vals.filter(v=>!pairs.includes(v))] }
  if (counts[0]===2) { const pair=Number(byCount.find(x=>x[1].length===2)[0]); return [1,pair,...vals.filter(v=>v!==pair)] }
  return [0,...vals]
}
function compareScore(a,b) { for(let i=0;i<Math.max(a.length,b.length);i++){ const d=(a[i]||0)-(b[i]||0); if(d) return d } return 0 }
function bestScore(cards) { return combinations(cards,5).map(scoreFive).sort(compareScore).pop() || [0,0] }
function handName(score) { return ['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'][score[0]] }
function cardText(c) { return `${c.rank}${c.suit}` }

function PokerCard({ card, hidden=false }) {
  if (hidden) return <div className="poker-card poker-back"><span>♠</span></div>
  return <div className={`poker-card ${card.red ? 'red' : ''}`}><b>{card.rank}</b><span>{card.suit}</span></div>
}

function PokerSection() {
  const initial = () => ({
    players: [{ name:'You', chips:1000, hand:[], folded:false }, { name:'Bot 1', chips:1000, hand:[], folded:false }, { name:'Bot 2', chips:1000, hand:[], folded:false }, { name:'Bot 3', chips:1000, hand:[], folded:false }],
    deck: [], community: [], pot:0, currentBet:0, street:'preflop', playerBet:0, bets:[0,0,0,0], status:'Start a hand.', message:'', winner:'', gameOver:false
  })
  const [game,setGame] = useState(initial)
  const dealHand = () => {
    let deck=shuffle(makeDeck()), players=game.players.map(p=>({...p,hand:[deck.shift(),deck.shift()],folded:false})), bets=[0,0,0,0]
    players[1].chips-=5; bets[1]=5; players[2].chips-=5; bets[2]=5
    setGame({...initial(), players, deck, pot:10, currentBet:5, playerBet:0, bets, street:'preflop', status:'Your turn — call, raise, or fold.', message:'Blinds are $5 / $5. Play money only.'})
  }
  const finishRound = (state) => {
    const active=state.players.filter(p=>!p.folded)
    if(active.length===1){ const idx=state.players.indexOf(active[0]); const ps=state.players.map((p,i)=>i===idx?{...p,chips:p.chips+state.pot}:p); return {...state,players:ps,pot:0,gameOver:true,winner:`${active[0].name} wins $${state.pot} — everyone else folded.`,status:'Hand complete.'} }
    const scored=active.map(p=>({p,score:bestScore([...p.hand,...state.community])})).sort((a,b)=>compareScore(b.score,a.score))
    const best=scored[0].score, winners=scored.filter(x=>compareScore(x.score,best)===0).map(x=>x.p)
    const share=Math.floor(state.pot/winners.length), ps=state.players.map(p=>winners.includes(p)?{...p,chips:p.chips+share}:p)
    return {...state,players:ps,pot:0,gameOver:true,winner:`${winners.map(w=>w.name).join(' & ')} win $${share}${winners.length>1?' each':''} with ${handName(best)}.`,status:'Hand complete.'}
  }
  const revealStreet = (state, street) => {
    const deck=[...state.deck], community=[...state.community]
    if(street==='flop') community.push(deck.shift(),deck.shift(),deck.shift())
    if(street==='turn'||street==='river') community.push(deck.shift())
    return {...state,deck,community,street,currentBet:0,playerBet:0,bets:[0,0,0,0],status:'Your turn.',message: street==='river'?'Final betting round.':'New cards are on the table.'}
  }
  const botActions = (state) => {
    let s={...state,players:state.players.map(p=>({...p})),bets:[...state.bets]}
    for(let i=1;i<4;i++){
      const p=s.players[i]; if(p.folded || p.chips<=0) continue
      const strength=bestScore([...p.hand,...s.community])[0]
      const need=s.currentBet-s.bets[i]
      if(strength===0 && Math.random()<0.38){ p.folded=true; continue }
      const add=Math.min(need,p.chips)
      p.chips-=add; s.bets[i]+=add; s.pot+=add
      if(Math.random()<0.18 && strength>=1 && p.chips>20){ const raise=Math.min(20,p.chips); p.chips-=raise; s.bets[i]+=raise; s.pot+=raise; s.currentBet=Math.max(s.currentBet,s.bets[i]) }
    }
    return s
  }
  const act = (kind) => setGame(prev=>{
    if(prev.gameOver || !prev.players[0].hand.length) return prev
    let s={...prev,players:prev.players.map(p=>({...p})),bets:[...prev.bets]}
    if(kind==='fold'){ s.players[0].folded=true; return finishRound(s) }
    const need=Math.max(0,s.currentBet-s.bets[0])
    if(kind==='call' && need>0){ const add=Math.min(need,s.players[0].chips); s.players[0].chips-=add; s.bets[0]+=add; s.pot+=add }
    if(kind==='check' && need>0) return prev
    if(kind==='raise'){ const add=Math.min(need+25,s.players[0].chips); s.players[0].chips-=add; s.bets[0]+=add; s.pot+=add; s.currentBet=Math.max(s.currentBet,s.bets[0]) }
    s=botActions(s)
    if(s.players.filter(p=>!p.folded).length===1) return finishRound(s)
    const nextStreet=s.street==='preflop'?'flop':s.street==='flop'?'turn':s.street==='turn'?'river':'showdown'
    if(nextStreet==='showdown') return finishRound(s)
    return revealStreet(s,nextStreet)
  })
  const hero=game.players[0], canAct=hero?.hand?.length && !game.gameOver
  return <Card id="poker" eyebrow="03 · Texas Hold’em" title="Play poker in the website" actions={<button className="button secondary" onClick={dealHand}>{game.gameOver || !hero.hand.length ? 'New hand' : 'Restart'}</button>}>
    <p className="widget-help">Play a self-contained Texas Hold’em hand against three bots. Use the action buttons when it is your turn.</p><div className="poker-shell">
      <div className="poker-top"><span>Play money · $1,000 starting stack</span><strong>Pot ${game.pot}</strong></div>
      <div className="poker-table">
        <div className="poker-opponents">{game.players.slice(1).map((p,i)=><div className={`poker-seat ${p.folded?'folded':''}`} key={p.name}><strong>{p.name}</strong><span>${p.chips}</span><div className="poker-hand-mini"><PokerCard hidden/><PokerCard hidden/></div>{p.folded&&<small>Folded</small>}</div>)}</div>
        <div className="poker-community"><span className="street-label">{game.street.toUpperCase()}</span><div className="poker-cards">{game.community.map((c,i)=><PokerCard key={i} card={c}/>)}</div>{!game.community.length&&<div className="poker-empty">Community cards</div>}</div>
        <div className="poker-hero"><div><strong>You</strong><span>${hero.chips}</span></div><div className="poker-cards">{hero.hand.map((c,i)=><PokerCard key={i} card={c}/>)}</div></div>
      </div>
      <div className="poker-status"><strong>{game.winner || game.status}</strong><span>{game.message}</span></div>
      {!hero.hand.length && <button className="button primary poker-start" onClick={dealHand}>Deal cards</button>}
      {canAct && !game.winner && <div className="poker-actions"><button className="button secondary" onClick={()=>act('fold')}>Fold</button><button className="button primary" onClick={()=>act(game.currentBet>game.bets[0]?'call':'check')}>{game.currentBet>game.bets[0]?`Call $${game.currentBet-game.bets[0]}`:'Check'}</button><button className="button primary" onClick={()=>act('raise')}>Raise +$25</button></div>}
      {game.winner && <div className="poker-result">{game.winner}</div>}
      <p className="poker-note">A self-contained Texas Hold’em game. No real money, accounts, or external poker service are used.</p><SourceNote>Built into A Fun Time · no external data.</SourceNote>
    </div>
  </Card>
}
function RadioSection() {
  const [stations, setStations] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); try { setStations(await fetchJson(LEGACY_SOURCES.radio)) } catch (e) { setError(e.message || 'Unable to load radio stations.') } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])
  return <Card id="radio" eyebrow="04 · Radio Browser" title="Live radio directory" actions={<button className="button secondary" onClick={load} disabled={loading}>Refresh</button>}>
    {loading ? <Loading label="Finding radio stations…" /> : error ? <ErrorMessage message={error} onRetry={load} /> : stations.length ? <><p className="widget-help">Browse the current top rock stations returned by Radio Browser and press play on any station.</p><div className="list">{stations.map((s) => <div className="list-item" key={s.stationuuid}><div><strong>{s.name}</strong><span>{s.countrycode || '—'} · {s.tags || 'Radio'}</span></div>{s.url_resolved ? <audio controls preload="none" src={s.url_resolved} aria-label={`Play ${s.name}`} /> : <span className="muted-inline">No stream</span>}</div>)}</div><SourceNote>Radio Browser · station directory results fetched on refresh.</SourceNote></> : <EmptyState title="No stations were returned.">Try Refresh to search again.</EmptyState>}
  </Card>
}

function QuoteSection() {
  const [quote, setQuote] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await fetchJson(LEGACY_SOURCES.quote)
      const item = Array.isArray(data) ? data[0] : (data?.data || data)
      const normalized = item?.content ? item : { content: item?.quote, author: item?.author }
      if (!normalized?.content || !normalized?.author) throw new Error('The quote service returned an unexpected response.')
      setQuote(normalized)
    } catch (e) { setQuote(null); setError('The quote service is temporarily unavailable. Please try New quote again.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return <Card id="quote" eyebrow="05 · Quotes" title="Random quote" actions={<button className="button secondary" onClick={load} disabled={loading}>New quote</button>}>
    {loading ? <Loading label="Finding a quote…" /> : error ? <ErrorMessage message={error} onRetry={load} /> : quote ? <><blockquote className="quote">“{quote.content}”<cite>— {quote.author}</cite></blockquote><SourceNote>DummyJSON Quotes · sample quote data, fetched when requested.</SourceNote></> : <EmptyState title="No quote is available.">Try New quote to request another.</EmptyState>}
  </Card>
}

function extractLexiconWord(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return extractLexiconWord(data[0])
  return data.word || data.term || data.lexeme || data.text || data.name || ''
}

function LexiconSection() {
  const [word, setWord] = useState(''), [source, setSource] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
                  let candidate = ''
      try {
        const data = await fetchJson(LEGACY_SOURCES.lexiconFallback)
        candidate = extractLexiconWord(data)
        if (candidate) setSource('Random Word source')
      } catch {
        const data = await fetchJson(LEGACY_SOURCES.lexiconFallback2)
        candidate = extractLexiconWord(data)
        if (candidate) setSource('Random Words source')
      }
      if (!candidate) throw new Error('No random word was returned.')
      setWord(candidate)
    } catch (e) { setWord(''); setSource(''); setError('The random-word service is temporarily unavailable. Please try Randomise again.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return <Card id="word" eyebrow="06 · Random Word" title="Random word" actions={<button className="button secondary" onClick={load} disabled={loading}>Randomise</button>}>
    {loading ? <Loading label="Generating a random word…" /> : error ? <ErrorMessage message={error} onRetry={load} /> : word ? <><div className="lexicon"><span>{word}</span><small>{source}</small></div><SourceNote>{source} · random word requested from the public endpoint.</SourceNote></> : <EmptyState title="No word is available.">Try Randomise to request another.</EmptyState>}
  </Card>
}

function RedditSection() {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let data
      data = await fetchJson(LEGACY_SOURCES.reddit)
      if (!Array.isArray(data)) throw new Error('The sentiment source returned an unexpected response.')
      setRows(data)
    } catch (e) { setRows([]); setError('Reddit sentiment is temporarily unavailable. Try Refresh again in a moment.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return <Card id="sentiment" eyebrow="07 · Tradestie" title="Reddit market sentiment" actions={<button className="button secondary" onClick={load} disabled={loading}>Refresh</button>}>
    {loading ? <Loading label="Loading Reddit sentiment…" /> : error ? <ErrorMessage message={error} onRetry={load} /> : rows.length ? <><p className="widget-help">See which stocks are being discussed most on WallStreetBets and whether the collected sentiment is bullish or bearish.</p><div className="table-wrap"><table><caption className="sr-only">Reddit market sentiment</caption><thead><tr><th>Ticker</th><th>Sentiment</th><th>Score</th><th>Comments</th></tr></thead><tbody>{rows.slice(0, 10).map((r, i) => <tr key={`${r.ticker}-${i}`}><td>{r.ticker}</td><td><span className={`pill ${String(r.sentiment).toLowerCase()}`}>{r.sentiment}</span></td><td>{Number(r.sentiment_score).toFixed(2)}</td><td>{r.no_of_comments}</td></tr>)}</tbody></table></div><SourceNote>Tradestie Reddit · data is updated about every 15 minutes.</SourceNote></> : <EmptyState title="No sentiment data was returned.">Try Refresh to request the latest available snapshot.</EmptyState>}
  </Card>
}

function SocialSection({ currentUserId }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [connections, setConnections] = useState([])
  const [pending, setPending] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadConnections = useCallback(async () => {
    const { data, error: e } = await supabase.from('connections').select('id,sender_id,receiver_id,status,sender:profiles!connections_sender_id_fkey(id,username),receiver:profiles!connections_receiver_id_fkey(id,username)').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).eq('status','accepted')
    const { data: incoming, error: pendingError } = await supabase.from('connections').select('id,sender_id,receiver_id,status,sender:profiles!connections_sender_id_fkey(id,username)').eq('receiver_id', currentUserId).eq('status','pending')
    if (e || pendingError) setError('We could not load your community connections. Try again.')
    else { setConnections(data || []); setPending(incoming || []) }
  }, [currentUserId])

  const searchUsers = async (event) => {
    event?.preventDefault(); setError(''); setLoading(true)
    try {
      const term = query.trim().toLowerCase()
      if (term.length < 2) { setUsers([]); setLoading(false); return }
      const { data, error: e } = await supabase.from('profiles').select('id,username,created_at').ilike('username', `%${term}%`).neq('id', currentUserId).limit(20)
      if (e) throw e
      setUsers(data || [])
    } catch (e) { setError('We could not search the community right now. Check your connection and try again.') }
    finally { setLoading(false) }
  }

  const respondToRequest = async (id, status) => {
    const { error: e } = await supabase.from('connections').update({ status }).eq('id', id).eq('receiver_id', currentUserId)
    if (e) setError('We could not update that connection request. Try again.')
    else { setError(status === 'accepted' ? 'Connection accepted.' : 'Connection declined.'); await loadConnections() }
  }

  const connect = async (userId) => {
    setError('')
    const { error: e } = await supabase.from('connections').insert({ sender_id: currentUserId, receiver_id: userId, status: 'pending' })
    if (e) setError(e.code === '23505' ? 'A connection request already exists.' : 'We could not send that request. Try again.')
    else setError('Connection request sent.')
  }

  const openChat = async (other) => {
    setSelected(other); setError('')
    const { data, error: e } = await supabase.from('messages').select('id,sender_id,receiver_id,body,created_at').or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${other.id}),and(sender_id.eq.${other.id},receiver_id.eq.${currentUserId})`).order('created_at', { ascending: true }).limit(100)
    if (e) setError('We could not load this chat. Try opening it again.')
    else setMessages(data || [])
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!selected || !message.trim()) return
    const body = message.trim(); setMessage('')
    const { error: e } = await supabase.from('messages').insert({ sender_id: currentUserId, receiver_id: selected.id, body })
    if (e) setError('Your message could not be sent. Check your connection and try again.')
  }

  useEffect(() => { loadConnections() }, [loadConnections])
  useEffect(() => {
    if (!selected) return
    const channel = supabase.channel(`chat-${currentUserId}-${selected.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, payload => {
      if (payload.new.sender_id === selected.id) setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, selected])

  return <Card id="community" eyebrow="10 · Community" title="Find users & chat">
    <p className="widget-help">Search for another A Fun Time username, send a connection request, accept requests, and chat privately with accepted connections. Connecting is only for the community features; it does not connect an external account.</p><form className="input-row" onSubmit={searchUsers}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a username" aria-label="Search community usernames" /><button className="button primary" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></form>
    {error && <p className="status notice" role="status" aria-live="polite">{error}</p>}
    <div className="social-layout">
      <div>
        <h3 className="subheading">Search results</h3>
        <div className="user-list">{users.map(u => <div className="user-row" key={u.id}><div><strong>{u.username}</strong><span>Public profile</span></div><button className="button secondary" onClick={() => connect(u.id)}>Connect</button></div>)}{!users.length && <EmptyState title={query.trim().length < 2 ? 'No search yet.' : 'No matching users.'}>{query.trim().length < 2 ? 'Enter at least 2 characters to find another username.' : 'Try a different username or spelling.'}</EmptyState>}</div>
        <h3 className="subheading">Incoming requests</h3>
        <div className="user-list">{pending.map(c => <div className="user-row" key={c.id}><div><strong>{c.sender.username}</strong><span>Wants to connect</span></div><div className="actions"><button className="button secondary" onClick={() => respondToRequest(c.id, 'accepted')}>Accept</button><button className="button secondary" onClick={() => respondToRequest(c.id, 'rejected')}>Decline</button></div></div>)}{!pending.length && <EmptyState title="No pending requests.">New incoming connection requests will appear here.</EmptyState>}</div>
        <h3 className="subheading">Connections</h3>
        <div className="user-list">{connections.map(c => { const other = c.sender_id === currentUserId ? c.receiver : c.sender; return <button className={`user-row chat-select ${selected?.id === other.id ? 'selected' : ''}`} key={c.id} onClick={() => openChat(other)}><div><strong>{other.username}</strong><span>Connected · Open chat</span></div><span>›</span></button> })}{!connections.length && <EmptyState title="No connections yet.">Search for someone above and send a connection request to start building your community.</EmptyState>}</div>
      </div>
      <div className="chat-box">
        {selected ? <><div className="chat-header"><strong>Chat with {selected.username}</strong><span>Live</span></div><div className="messages">{messages.map(m => <div key={m.id} className={`message ${m.sender_id === currentUserId ? 'mine' : ''}`}>{m.body}<small>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>)}{!messages.length && <EmptyState title="No messages yet.">Say hello to start the conversation.</EmptyState>}</div><form className="chat-compose" onSubmit={sendMessage}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a message…" aria-label="Message" /><button className="button primary">Send</button></form></> : <div className="chat-empty"><strong>Select a connection</strong><p>Choose an accepted connection to start a private chat.</p></div>}
      </div>
    </div><SourceNote>Supabase community data · your account, connections, and private messages.</SourceNote>
  </Card>
}

function MemeSection() {
  const [meme, setMeme] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); try { const json = await fetchJson(LEGACY_SOURCES.meme); if (!json?.template?.url) throw new Error('Unexpected meme response.'); setMeme(json.template) } catch (e) { setError(e.message || 'Unable to load meme.') } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])
  return <Card id="meme" eyebrow="09 · JustMeme" title="Random meme template" actions={<button className="button secondary" onClick={load} disabled={loading}>Another meme</button>}>
    {loading ? <Loading label="Finding a meme…" /> : error ? <ErrorMessage message={error} onRetry={load} /> : meme ? <><div className="meme"><img src={meme.url} alt={meme.name} /><strong>{meme.name}</strong></div><SourceNote>JustMeme · template returned by the public endpoint.</SourceNote></> : <EmptyState title="No meme template is available.">Try Another meme to request one.</EmptyState>}
  </Card>
}


const SOURCES = {
  fact: 'https://asli-fun-fact-api.herokuapp.com/api/v2/facts/random',
  joke: 'https://v2.jokeapi.dev/joke/Any?safe-mode',
  dadJoke: 'https://icanhazdadjoke.com/',
  advice: 'https://api.adviceslip.com/advice',
  quotable: 'https://api.quotable.io/random',
  kanye: 'https://api.kanye.rest',
  zen: 'https://zenquotes.io/api/random',
  datamuse: (q) => `https://api.datamuse.com/words?sp=${encodeURIComponent(q)}&max=12`,
  justMeme: 'https://justmeme.wtf/api/v1/random',
  imgflip: 'https://api.imgflip.com/get_memes',
  memesio: (q='funny') => `https://memesio.com/api/free/templates?q=${encodeURIComponent(q)}&pageSize=8&mode=hybrid&mediaType=image`,
  memeMaker: 'https://alpha-meme-maker.herokuapp.com/1',
  pokemon: (name) => `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name.toLowerCase())}`,
  trivia: 'https://opentdb.com/api.php?amount=10&category=23&difficulty=medium&type=multiple&encode=base64',
  games: 'https://www.freetogame.com/api/games',
  gameDetail: (id) => `https://www.freetogame.com/api/game?id=${encodeURIComponent(id)}`,
  rick: 'https://rickandmortyapi.com/api/character',
  genre: 'https://binaryjazz.us/wp-json/genrenator/v1/genre/',
  lyrics: (artist, title) => `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
  lyricsFallback: (artist, title) => `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
  lyricsSearch: (artist, title) => `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
  noozra: 'https://noozra.com/api',
  spaceflight: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=8',
  florida: 'https://juliayxhuang.github.io/florida-man-api',
  foodish: 'https://foodish-api.com/api/',
  meals: 'https://www.themealdb.com/api/json/v1/1/random.php',
  axolotl: 'https://theaxolotlapi.netlify.app/api/axolotl',
  insult: 'https://evilinsult.com/generate_insult.php?lang=en&type=json',
  ghibli: 'https://ghibliapi.vercel.app/api/films',
}

function decode64(value) {
  try { return decodeURIComponent(Array.prototype.map.call(atob(value), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')) } catch { return value }
}
function safeText(value) { return typeof value === 'string' ? value : String(value ?? '') }
function ToolGrid({ children }) { return <div className="tool-grid">{children}</div> }
function MiniTool({ title, source, children, actions }) { return <article className="mini-card"><div className="mini-card-head"><div><p className="eyebrow">{source}</p><h3>{title}</h3></div>{actions}</div>{children}</article> }

function DiscoverSection() {
  const fallbackFacts = [
    'Bananas are berries, but strawberries are not botanically berries.',
    'Octopuses have three hearts and blue blood.',
    'A day on Venus is longer than a year on Venus.',
    'Wombat droppings are cube-shaped.',
    'Honey can remain edible for extremely long periods when stored properly.',
    'The Eiffel Tower can become slightly taller in hot weather because metal expands.'
  ]
  const [data, setData] = useState(null), [kind, setKind] = useState('fact'), [loading, setLoading] = useState(false)
  const load = useCallback(async (nextKind = kind) => {
    setLoading(true)
    if (nextKind !== 'fact') setData(null)
    try {
      let value
      if (nextKind === 'fact') {
        value = { fact: fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)] }
        try {
          const remote = await fetchJson(SOURCES.fact)
          const remoteFact = remote?.fact || remote?.text || remote?.data
          if (remoteFact) value = { fact: remoteFact }
        } catch { /* Keep the built-in facts so this section never becomes unavailable. */ }
      }
      if (nextKind === 'joke') value = await fetchJson(SOURCES.joke)
      if (nextKind === 'dad') value = await fetchJson(SOURCES.dadJoke, { headers: { Accept: 'application/json' } })
      if (nextKind === 'advice') value = await fetchJson(SOURCES.advice)
      if (nextKind === 'quotable') value = await fetchJson(SOURCES.quotable)
      if (nextKind === 'kanye') value = await fetchJson(SOURCES.kanye)
      if (nextKind === 'zen') value = await fetchJson(SOURCES.zen)
      setData(value)
    } catch {
      setData({ fallback: 'Nothing new came back from this source. Select another discovery.' })
    } finally { setLoading(false) }
  }, [kind])
  useEffect(() => { load('fact') }, [load])
  const render = () => {
    if (!data) return null
    if (data.fallback) return <p className="feature-text muted-result">{data.fallback}</p>
    if (kind === 'fact') return <p className="feature-text">{data.fact || data.text || data.data || 'No fact returned.'}</p>
    if (kind === 'joke') return <p className="feature-text">{data.type === 'twopart' ? `${data.setup} — ${data.delivery}` : data.joke}</p>
    if (kind === 'dad') return <p className="feature-text">{data.joke}</p>
    if (kind === 'advice') return <p className="feature-text">{data.slip?.advice || data.advice}</p>
    if (kind === 'quotable') return <blockquote className="quote">“{data.content}”<cite>— {data.author}</cite></blockquote>
    if (kind === 'kanye') return <p className="feature-text">“{data.quote}”</p>
    if (kind === 'zen') { const q = Array.isArray(data) ? data[0] : data; return <blockquote className="quote">“{q.q}”<cite>— {q.a}</cite></blockquote> }
    return null
  }
  const options = [['fact', 'Fun fact'], ['joke', 'Jokes'], ['dad', 'Dad jokes'], ['advice', 'Advice'], ['quotable', 'Quotes'], ['kanye', 'Kanye'], ['zen', 'Zen quotes']]
  return <Card eyebrow="DISCOVER" title="Random things worth discovering" actions={<button className="button secondary" onClick={() => load(kind)} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>}>
    <div className="chip-row">{options.map(([value, label]) => <button key={value} className={`button ${kind === value ? 'primary' : 'secondary'}`} onClick={() => { setKind(value); load(value) }}>{label}</button>)}</div>
    {loading ? <Loading label="Finding something…" /> : <div className="feature-result">{render()}</div>}
  </Card>
}

function WordLabSection() {
  const [query, setQuery] = useState('happy'), [words, setWords] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const search = async (e) => { e?.preventDefault(); if (!query.trim()) return; setLoading(true); setError(''); try { setWords(await fetchJson(SOURCES.datamuse(query.trim()))) } catch { setWords([]); setError('Word search is temporarily unavailable.') } finally { setLoading(false) } }
  useEffect(() => { search() }, [])
  return <Card eyebrow="WORDS" title="Word explorer"><form className="input-row" onSubmit={search}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Try happy, music, ocean…" /><button className="button primary" disabled={loading}>{loading ? 'Searching…' : 'Explore'}</button></form>{loading ? <Loading label="Finding related words…" /> : error ? <ErrorMessage message={error} onRetry={search} /> : <div className="chip-row word-results">{words.map(w => <span className="pill" key={w.word}>{w.word}</span>)}</div>}</Card>
}

function MemeHubSection() {
  const [items, setItems] = useState([]), [selected, setSelected] = useState(null), [top, setTop] = useState(''), [bottom, setBottom] = useState(''), [loading, setLoading] = useState(true), [making, setMaking] = useState(false), [result, setResult] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const x = await fetchJson(SOURCES.memesio('funny'))
      const data = (x.items || []).filter(i => i.mediaType === 'image' && i.imageUrl)
      if (!data.length) throw new Error()
      setItems(data); setSelected(data[0]); setResult(null)
    } catch {
      try {
        const x = await fetchJson(SOURCES.imgflip)
        const data = (x.memes || []).slice(0, 12).map(m => ({ slug: String(m.id), name: m.name, imageUrl: m.url, captions: [{ id: 'top' }, { id: 'bottom' }] }))
        setItems(data); setSelected(data[0]); setResult(null)
      } catch { setItems([]); setSelected(null) }
    } finally { setLoading(false) }
  }, [])
  const create = async (e) => {
    e.preventDefault(); if (!selected || (!top.trim() && !bottom.trim())) return
    setMaking(true)
    const captions = []
    if (top.trim()) captions.push({ id: selected.captions?.[0]?.id || 'top', text: top.trim() })
    if (bottom.trim()) captions.push({ id: selected.captions?.[1]?.id || 'bottom', text: bottom.trim() })
    try {
      const response = await fetch('https://memesio.com/api/v1/memes/caption-template', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ templateSlug: selected.slug, captions, visibility: 'private' }) })
      const x = await response.json()
      if (!response.ok || !x.data?.imageUrl) throw new Error()
      setResult(x.data)
    } catch {
      setResult({ local: true, imageUrl: selected.imageUrl, captions })
    } finally { setMaking(false) }
  }
  useEffect(() => { load() }, [load])
  return <Card eyebrow="MEMES" title="Make a meme" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh templates'}</button>}>
    {loading ? <Loading label="Loading meme templates…" /> : !items.length ? <p className="muted-inline">No meme templates are available right now.</p> : <div className="meme-maker-layout">
      <div><p className="widget-help">Pick a template, add text, then preview the finished meme.</p><div className="meme-grid">{items.slice(0, 8).map(m => <button type="button" className={`meme-tile meme-select ${selected?.slug === m.slug ? 'selected' : ''}`} key={m.slug} onClick={() => { setSelected(m); setTop(''); setBottom(''); setResult(null) }}><img src={m.imageUrl} alt={m.name} /><strong>{m.name}</strong></button>)}</div></div>
      <div className="meme-editor">{selected && <><div className="meme-live-preview"><img src={result?.imageUrl || selected.imageUrl} alt={selected.name} /><div className="meme-caption meme-caption-top">{top}</div><div className="meme-caption meme-caption-bottom">{bottom}</div></div><form onSubmit={create} className="lyrics-form"><label>Top text<input value={top} onChange={e => setTop(e.target.value)} placeholder="Top caption" /></label><label>Bottom text<input value={bottom} onChange={e => setBottom(e.target.value)} placeholder="Bottom caption" /></label><button className="button primary" disabled={making}>{making ? 'Creating…' : 'Create meme'}</button></form>{result?.local && <p className="muted-inline">Preview created in the site. The external renderer was unavailable, so your captions are shown directly over the template.</p>}{result?.pageUrl && <a className="button secondary" href={result.pageUrl} target="_blank" rel="noreferrer">Open finished meme</a>}</>}</div>
    </div>}
  </Card>
}

function TriviaCard() {
  const [question, setQuestion] = useState(null), [loading, setLoading] = useState(false), [selected, setSelected] = useState(null)
  const load = async () => { setLoading(true); setSelected(null); try { const x = await fetchJson(SOURCES.trivia); const q = x.results?.[0]; if (!q) throw new Error(); setQuestion({ question: decode64(q.question), correct: decode64(q.correct_answer), answers: q.incorrect_answers.map(decode64).concat(decode64(q.correct_answer)).sort(() => Math.random() - .5) }) } catch { setQuestion(null) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  return <MiniTool title="Trivia" source="Open Trivia" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'New question'}</button>}>
    {question ? <><p className="feature-text">{question.question}</p><div className="trivia-options">{question.answers.map((answer, i) => { const picked = selected === answer; const correct = answer === question.correct; return <button key={`${answer}-${i}`} type="button" className={`trivia-option ${picked ? (correct ? 'correct' : 'wrong') : ''}`} onClick={() => setSelected(answer)} disabled={selected !== null}><span>{String.fromCharCode(65 + i)}</span>{answer}</button> })}</div>{selected && <p className={`trivia-feedback ${selected === question.correct ? 'correct-text' : 'wrong-text'}`}>{selected === question.correct ? 'Correct.' : `Not quite. The correct answer is ${question.correct}.`}</p>}</> : <p className="muted-inline">No question is available right now.</p>}
  </MiniTool>
}

function FreeGameCard() {
  const [game, setGame] = useState(null), [detail, setDetail] = useState(null), [loading, setLoading] = useState(false), [detailLoading, setDetailLoading] = useState(false)
  const load = async () => { setLoading(true); setDetail(null); try { const games = await fetchJson(SOURCES.games); const list = Array.isArray(games) ? games.filter(g => g && g.title) : []; setGame(list[Math.floor(Math.random() * list.length)] || null) } catch { setGame(null) } finally { setLoading(false) } }
  const open = async () => { if (!game?.id) return; setDetailLoading(true); try { setDetail(await fetchJson(SOURCES.gameDetail(game.id))) } catch { setDetail(game) } finally { setDetailLoading(false) } }
  useEffect(() => { load() }, [])
  return <MiniTool title={game?.title || 'Free-to-play game'} source="FreeToGame" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>}>
    {game ? <><div className="game-card-body">{game.thumbnail && <img className="game-image" src={game.thumbnail} alt={game.title} />}<div><p>{game.short_description}</p><p className="meta">{game.genre || 'Game'} · {game.platform || 'Multiple platforms'}</p><button className="button primary" onClick={open} disabled={detailLoading}>{detailLoading ? 'Loading details…' : 'View details'}</button></div></div>{detail && <div className="game-detail"><h4>{detail.title}</h4>{detail.description && <p>{detail.description}</p>}{detail.instructions && <p><strong>How to play:</strong> {detail.instructions}</p>}{detail.screenshots?.slice(0, 2).map((s, i) => <img key={i} className="game-screenshot" src={s.image} alt={`${detail.title} screenshot ${i + 1}`} />)}</div>}</> : <p className="muted-inline">No game is available right now.</p>}
  </MiniTool>
}

function RickCard() {
  const [character, setCharacter] = useState(null), [loading, setLoading] = useState(false)
  const load = async () => { setLoading(true); try { const x = await fetchJson(SOURCES.rick); const list = x.results || []; setCharacter(list[Math.floor(Math.random() * list.length)] || null) } catch { setCharacter(null) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  return <MiniTool title={character?.name || 'Rick & Morty'} source="Rick & Morty" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>}>
    {character ? <div className="character-card"><img className="character-image" src={character.image} alt={`Picture of ${character.name}`} /><div><h4>{character.name}</h4><p>{character.name} is a {character.status.toLowerCase()} {character.species.toLowerCase()}.</p><p className="meta">Origin: {character.origin?.name || 'Unknown'} · Location: {character.location?.name || 'Unknown'}</p></div></div> : <p className="muted-inline">No character is available right now.</p>}
  </MiniTool>
}

function GamesHubSection() {
  return <Card eyebrow="GAMES" title="Games and trivia"><ToolGrid><TriviaCard /><FreeGameCard /><RickCard /></ToolGrid></Card>
}

function MusicSection() {
  const [artist, setArtist] = useState(''), [title, setTitle] = useState(''), [lyrics, setLyrics] = useState(''), [loading, setLoading] = useState(false), [genre, setGenre] = useState(''), [genreLoading, setGenreLoading] = useState(false)
  const getLyrics = async (e) => {
    e.preventDefault()
    if (!artist.trim() || !title.trim()) return
    setLoading(true); setLyrics('')
    try {
      let x
      try { x = await fetchJson(SOURCES.lyrics(artist.trim(), title.trim())) } catch { x = null }
      if (x?.lyrics) setLyrics(x.lyrics)
      else {
        try { x = await fetchJson(SOURCES.lyricsFallback(artist.trim(), title.trim())) } catch { x = null }
        if (x?.plainLyrics) setLyrics(x.plainLyrics)
        else {
          const matches = await fetchJson(SOURCES.lyricsSearch(artist.trim(), title.trim()))
          const best = Array.isArray(matches) && matches.length ? matches[0] : null
          setLyrics(best?.plainLyrics || 'Lyrics were not found for that artist and song.')
        }
      }
    } catch { setLyrics('Lyrics were not found for that artist and song.') }
    finally { setLoading(false) }
  }
  const gen = async () => { setGenreLoading(true); try { const x = await fetchText(SOURCES.genre); setGenre(x.trim()) } catch { setGenre('Unable to generate a genre right now.') } finally { setGenreLoading(false) } }
  return <Card eyebrow="MUSIC" title="Music discovery">
    <div className="music-layout music-layout-simple">
      <MiniTool title="Lyrics lookup" source="Lyrics.ovh + LRCLIB">
        <p className="widget-help">Search by artist and song title. A second lyrics source is used when the first one has no match.</p>
        <form className="lyrics-form" onSubmit={getLyrics}>
          <label>Artist<input value={artist} onChange={e => setArtist(e.target.value)} placeholder="e.g. Coldplay" /></label>
          <label>Song<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Yellow" /></label>
          <button className="button secondary" disabled={loading}>{loading ? 'Finding lyrics…' : 'Search lyrics'}</button>
        </form>
        {lyrics && <pre className="lyrics">{lyrics}</pre>}
      </MiniTool>
      <MiniTool title="Genre generator" source="Binary Jazz" actions={<button className="button secondary" onClick={gen} disabled={genreLoading}>{genreLoading ? 'Generating…' : 'Generate'}</button>}>
        <p className="feature-text genre-result">{genre || 'Click Generate for a random genre.'}</p>
      </MiniTool>
    </div>
  </Card>
}

function NewsSection() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [article, setArticle] = useState(null)
  const load = async () => {
    setLoading(true); setError('')
    const results = await Promise.allSettled([fetchJson(SOURCES.spaceflight), fetchJson(SOURCES.florida), fetchJson(SOURCES.noozra)])
    const space = results[0].status === 'fulfilled' ? results[0].value : {}
    const florida = results[1].status === 'fulfilled' ? results[1].value : []
    const noozra = results[2].status === 'fulfilled' ? results[2].value : []
    const s = (space.results || []).map(x => ({ title: x.title, url: x.url, date: x.published_at, source: 'Spaceflight News', summary: x.summary || x.description, image: x.image_url }))
    const f = Array.isArray(florida) ? florida.slice(0, 5).map(x => ({ title: x.title || x.headline || x.text || 'Florida Man', url: x.url, date: x.date, source: 'Florida Man', summary: x.description || x.text })) : []
    const n = (Array.isArray(noozra) ? noozra : (noozra.articles || noozra.data || [])).slice(0, 5).map(x => ({ title: x.title || x.headline || x.name, url: x.url || x.link, date: x.publishedAt || x.published_at || x.date, source: 'Noozra', summary: x.description || x.summary, image: x.image || x.urlToImage }))
    const combined = [...s, ...f, ...n].filter(x => x.title && x.url)
    setItems(combined)
    if (!combined.length) setError('No stories are available right now.')
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  return <Card eyebrow="NEWS" title="Fresh stories" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>}>
    <p className="widget-help">Click a story to read the information supplied by the news source. The full publisher page opens only when you choose it.</p>
    {loading ? <Loading label="Loading stories…" /> : error ? <p className="muted-inline">{error}</p> : <>{article && <div className="article-reader"><div className="article-reader-head"><div><p className="eyebrow">{article.source}</p><h3>{article.title}</h3></div><button className="button secondary" onClick={() => setArticle(null)}>Close</button></div>{article.image && <img className="article-image" src={article.image} alt="" />}<p className="article-summary">{article.summary || 'This source did not provide a summary.'}</p><a className="button primary" href={article.url} target="_blank" rel="noreferrer">Read full story at source</a></div>}<div className="news-list">{items.slice(0, 12).map((x, i) => <button className="news-item" key={`${x.title}-${i}`} onClick={() => setArticle(x)}><div>{x.image && <img className="news-thumb" src={x.image} alt="" />}<span className="news-copy"><strong>{x.title}</strong><small>{x.source}{x.date ? ' · ' + new Date(x.date).toLocaleDateString() : ''}</small></span></div><span className="news-read">Read</span></button>)}</div></>}
  </Card>
}

function FoodSection() {
  const [meals, setMeals] = useState([]), [selected, setSelected] = useState(null), [loading, setLoading] = useState(false)
  const load = async () => { setLoading(true); try { const value = await fetchJson(SOURCES.meals); setMeals(value.meals?.[0] ? [value.meals[0]] : []); setSelected(null) } catch { setMeals([]) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  return <Card eyebrow="FOOD" title="Recipes" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh recipes'}</button>}>
    <p className="widget-help">Click any dish to open its full recipe, ingredients, and cooking instructions.</p>
    {loading ? <Loading label="Finding recipes…" /> : <div className="food-grid">{meals.map(meal => <button type="button" className="food-card" key={meal.idMeal} onClick={() => setSelected(meal)}><img src={meal.strMealThumb} alt={meal.strMeal} /><span><strong>{meal.strMeal}</strong><small>{meal.strCategory} · {meal.strArea}</small></span></button>)}</div>}
    {selected && <div className="recipe-panel"><div className="recipe-head"><div><p className="eyebrow">RECIPE</p><h3>{selected.strMeal}</h3></div><button className="button secondary" onClick={() => setSelected(null)}>Close</button></div><div className="recipe-layout"><img className="recipe-image" src={selected.strMealThumb} alt={selected.strMeal} /><div><h4>Ingredients</h4><ul className="ingredients">{Array.from({ length: 20 }, (_, i) => i + 1).map(i => { const ingredient = selected[`strIngredient${i}`]; const measure = selected[`strMeasure${i}`]; return ingredient?.trim() ? <li key={i}>{measure?.trim()} {ingredient.trim()}</li> : null })}</ul></div></div><h4>Instructions</h4><p className="recipe-instructions">{selected.strInstructions}</p></div>}
  </Card>
}

function FunOdditiesSection() {
  const fallback = [
    ['Why wombat poop is cube-shaped', 'Wombats produce cube-shaped droppings, which helps them mark territory without the pieces rolling away.'],
    ['Octopus hearts', 'An octopus has three hearts; two pump blood through the gills and one pumps it around the body.'],
    ['Banana botany', 'A banana is botanically a berry, while a strawberry is an aggregate fruit rather than a true berry.'],
    ['Venus timing', 'Venus rotates so slowly that one rotation takes longer than one orbit around the Sun.'],
    ['Sharks are older than trees', 'Sharks have existed for hundreds of millions of years, predating the first trees in the fossil record.']
  ]
  const [items, setItems] = useState([]), [loading, setLoading] = useState(false)
  const load = async () => { setLoading(true); const results = await Promise.allSettled([fetchJson(SOURCES.axolotl), fetchJson(SOURCES.insult), fetchJson(SOURCES.ghibli)]); const next = []; if (results[0].status === 'fulfilled') { const v = results[0].value; next.push({ title: 'Axolotl', text: 'A random axolotl from the animal source.', image: v?.url || v?.image }) } if (results[1].status === 'fulfilled') { const v = results[1].value; next.push({ title: 'Unexpected insult', text: v?.insult || v }) } if (results[2].status === 'fulfilled') { const films = results[2].value || []; const film = films[Math.floor(Math.random() * films.length)]; if (film) next.push({ title: film.title, text: film.description || 'A randomly selected Studio Ghibli film.', image: film.image }) } if (!next.length) { const [title, text] = fallback[Math.floor(Math.random() * fallback.length)]; next.push({ title, text }) } setItems(next); setLoading(false) }
  useEffect(() => { load() }, [])
  return <Card eyebrow="ODDITIES" title="Things you probably didn't know" actions={<button className="button secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>}>
    {loading ? <Loading label="Finding something strange…" /> : <ToolGrid>{items.map((item, i) => <MiniTool key={i} title={item.title} source="Oddity"><>{item.image && <img className="oddity-image" src={item.image} alt={item.title} />}<p className="feature-text">{item.text}</p></></MiniTool>)}</ToolGrid>}
  </Card>
}

function HomePage() {
  return <section className="ps2-home" aria-label="Home">
    <div className="ps2-home-copy">
      <p>Hi. this here is my site, if u have suggestions to make it better, lmk here <a href="https://github.com/2bitthug" target="_blank" rel="noreferrer">github.com/2bitthug</a></p>
    </div>
  </section>
}

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home'
  const [route, setRoute] = useState(read)
  useEffect(() => { const onChange = () => setRoute(read()); window.addEventListener('hashchange', onChange); return () => window.removeEventListener('hashchange', onChange) }, [])
  return route
}

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const route = useHashRoute()

  useEffect(() => {
    if (!supabase) { setChecking(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (checking) return <main className="auth-shell"><Loading label="Checking session…" /></main>
  if (!isSupabaseConfigured && route !== 'home') return <Auth onLogin={() => window.location.reload()} />

  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Guest'
  const signOut = async () => { await supabase.auth.signOut() }
  const nav = [
    ['home', 'Home'], ['discover', 'Discover'], ['words', 'Words'], ['memes', 'Memes'], ['games', 'Games'], ['music', 'Music'], ['news', 'News'], ['food', 'Food'], ['oddities', 'Oddities'], ['community', 'Community']
  ]

  const page = {
    home: <HomePage />,
    discover: <DiscoverSection />,
    words: <WordLabSection />,
    memes: <MemeHubSection />,
    games: <GamesHubSection />,
    music: <MusicSection />,
    news: <NewsSection />,
    food: <FoodSection />,
    oddities: <FunOdditiesSection />,
    community: <SocialSection currentUserId={session?.user?.id} />,
  }[route] || <HomePage />

  // Keep the landing screen public. Account-only areas still use the existing sign-in flow.
  if (route !== 'home' && !session) return <Auth onLogin={() => window.location.reload()} />

  return <div className="ps2-shell">
    <div className="ps2-scanlines" aria-hidden="true" />
    <header className="ps2-topbar">
      <div className="ps2-brand">
        <span className="ps2-logo-mark">2</span>
        <div>
          <p className="ps2-brand-title">A FUN TIME</p>
          <p className="ps2-brand-sub">SYSTEM MENU</p>
        </div>
      </div>
      <div className="ps2-status">
        <span>{session ? `USER: ${username}` : 'GUEST MODE'}</span>
        <span className="ps2-online"><i /> ONLINE</span>
      </div>
    </header>

    <div className="ps2-layout">
      <aside className="ps2-sidebar">
        <p className="ps2-menu-label">MAIN MENU</p>
        <nav className="ps2-nav" aria-label="Main navigation">
          {nav.map(([id, label], index) => <a key={id} className={route === id ? 'active' : ''} href={`#/${id}`}>
            <span className="ps2-nav-index">{String(index + 1).padStart(2, '0')}</span>
            <span>{label}</span>
            {route === id && <b>▶</b>}
          </a>)}
        </nav>
        <div className="ps2-controls">
          <span><b>↑↓</b> SELECT</span>
          <span><b>×</b> ENTER</span>
        </div>
        {session && <button className="ps2-signout" onClick={signOut}>SIGN OUT</button>}
      </aside>

      <main className="ps2-main">
        <div className="ps2-page-title">
          <span>MEMORY CARD</span>
          <strong>{nav.find(x => x[0] === route)?.[1]?.toUpperCase() || 'HOME'}</strong>
        </div>
        {page}
      </main>
    </div>

        <footer className="ps2-footer">
      <span>© A FUN TIME</span>
      <a href="https://github.com/2bitthug" target="_blank" rel="noreferrer">CONTACT / SUGGESTIONS</a>
      <span>v1.0</span>
    </footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)