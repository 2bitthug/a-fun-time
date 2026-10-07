$path = "src\main.jsx"
$source = Get-Content -LiteralPath $path -Raw

if ($source -notmatch "@dicebear/core") {
    $source = $source.Replace(
        "import { isSupabaseConfigured, supabase } from './lib/supabase'",
        "import { isSupabaseConfigured, supabase } from './lib/supabase'`r`nimport { Avatar } from '@dicebear/core'`r`nimport pixelArt from '@dicebear/styles/pixel-art.json'"
    )
}

$start = $source.IndexOf("function SettingsPage({ currentUserId })")
$end = $source.IndexOf("function App()", $start)

if ($start -lt 0 -or $end -lt 0) {
    Write-Host "Could not locate SettingsPage." -ForegroundColor Red
    exit 1
}

$newSettings = @'
const PROFILE_AVATARS = [
  ['pixel-01', 'Arcade 01', 'aft-pixel-01'],
  ['pixel-02', 'Arcade 02', 'aft-pixel-02'],
  ['pixel-03', 'Arcade 03', 'aft-pixel-03'],
  ['pixel-04', 'Arcade 04', 'aft-pixel-04'],
  ['pixel-05', 'Arcade 05', 'aft-pixel-05'],
  ['pixel-06', 'Arcade 06', 'aft-pixel-06'],
  ['pixel-07', 'Arcade 07', 'aft-pixel-07'],
  ['pixel-08', 'Arcade 08', 'aft-pixel-08'],
  ['pixel-09', 'Arcade 09', 'aft-pixel-09'],
  ['pixel-10', 'Arcade 10', 'aft-pixel-10'],
  ['pixel-11', 'Arcade 11', 'aft-pixel-11'],
  ['pixel-12', 'Arcade 12', 'aft-pixel-12'],
  ['pixel-13', 'Arcade 13', 'aft-pixel-13'],
  ['pixel-14', 'Arcade 14', 'aft-pixel-14'],
  ['pixel-15', 'Arcade 15', 'aft-pixel-15'],
  ['pixel-16', 'Arcade 16', 'aft-pixel-16'],
  ['pixel-17', 'Arcade 17', 'aft-pixel-17'],
  ['pixel-18', 'Arcade 18', 'aft-pixel-18'],
  ['pixel-19', 'Arcade 19', 'aft-pixel-19'],
  ['pixel-20', 'Arcade 20', 'aft-pixel-20'],
  ['pixel-21', 'Arcade 21', 'aft-pixel-21'],
  ['pixel-22', 'Arcade 22', 'aft-pixel-22'],
  ['pixel-23', 'Arcade 23', 'aft-pixel-23'],
  ['pixel-24', 'Arcade 24', 'aft-pixel-24'],
  ['pixel-25', 'Arcade 25', 'aft-pixel-25'],
  ['pixel-26', 'Arcade 26', 'aft-pixel-26'],
  ['pixel-27', 'Arcade 27', 'aft-pixel-27'],
  ['pixel-28', 'Arcade 28', 'aft-pixel-28'],
  ['pixel-29', 'Arcade 29', 'aft-pixel-29'],
  ['pixel-30', 'Arcade 30', 'aft-pixel-30'],
  ['pixel-31', 'Arcade 31', 'aft-pixel-31'],
  ['pixel-32', 'Arcade 32', 'aft-pixel-32'],
  ['pixel-33', 'Arcade 33', 'aft-pixel-33'],
  ['pixel-34', 'Arcade 34', 'aft-pixel-34'],
  ['pixel-35', 'Arcade 35', 'aft-pixel-35'],
  ['pixel-36', 'Arcade 36', 'aft-pixel-36'],
  ['pixel-37', 'Arcade 37', 'aft-pixel-37'],
  ['pixel-38', 'Arcade 38', 'aft-pixel-38'],
  ['pixel-39', 'Arcade 39', 'aft-pixel-39'],
  ['pixel-40', 'Arcade 40', 'aft-pixel-40']
]

const PROFILE_COLORS = [
  ['#39ff14', 'Neon green'],
  ['#ff4fd8', 'Neon pink'],
  ['#c9a7ff', 'Lavender'],
  ['#ff9d3d', 'Orange'],
  ['#ffe66d', 'Yellow'],
  ['#f2f2f2', 'White']
]

const PROFILE_BANNERS = [
  ['default', 'Default'],
  ['grid', 'Grid'],
  ['scanlines', 'Scanlines'],
  ['sunset', 'Dark sunset'],
  ['mono', 'Monochrome']
]

function avatarDataUri(seed) {
  try {
    return new Avatar(pixelArt, {
      seed,
      size: 128,
      backgroundColor: ['transparent']
    }).toDataUri()
  } catch {
    return ''
  }
}

function SettingsPage({ currentUserId }) {
  const [profile, setProfile] = useState({
    username: '',
    display_name: '',
    bio: '',
    interests: '',
    avatar_preset: 'pixel-01',
    accent_color: '#39ff14',
    banner_preset: 'default',
    profile_sections: {
      interests: true,
      favoriteWords: true,
      achievements: true
    }
  })

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!currentUserId) return

      setLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('username,bio,interests,display_name,avatar_preset,accent_color,banner_preset,profile_sections')
        .eq('id', currentUserId)
        .single()

      if (!active) return

      if (error) {
        setMessage('Could not load profile details.')
      } else if (data) {
        setProfile({
          username: data.username || '',
          display_name: data.display_name || data.username || '',
          bio: data.bio || '',
          interests: data.interests || '',
          avatar_preset: PROFILE_AVATARS.some(a => a[0] === data.avatar_preset)
            ? data.avatar_preset
            : 'pixel-01',
          accent_color: PROFILE_COLORS.some(c => c[0] === data.accent_color)
            ? data.accent_color
            : '#39ff14',
          banner_preset: PROFILE_BANNERS.some(b => b[0] === data.banner_preset)
            ? data.banner_preset
            : 'default',
          profile_sections: {
            interests: data.profile_sections?.interests !== false,
            favoriteWords: data.profile_sections?.favoriteWords !== false,
            achievements: data.profile_sections?.achievements !== false
          }
        })
      }

      setLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [currentUserId])

  const selectedAvatar = PROFILE_AVATARS.find(a => a[0] === profile.avatar_preset) || PROFILE_AVATARS[0]
  const selectedAvatarUri = useMemo(
    () => avatarDataUri(selectedAvatar[2]),
    [selectedAvatar]
  )

  const chooseAvatar = (id) => {
    setAvatarError(false)
    setProfile(current => ({ ...current, avatar_preset: id }))
  }

  const generateAnother = () => {
    const available = PROFILE_AVATARS.filter(a => a[0] !== profile.avatar_preset)
    const next = available[Math.floor(Math.random() * available.length)]
    if (next) chooseAvatar(next[0])
  }

  const toggleSection = (key) => {
    setProfile(current => ({
      ...current,
      profile_sections: {
        ...current.profile_sections,
        [key]: !current.profile_sections[key]
      }
    }))
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name.trim().slice(0, 32),
        bio: profile.bio.trim().slice(0, 240),
        interests: profile.interests.trim().slice(0, 240),
        avatar_preset: profile.avatar_preset,
        avatar_url: null,
        accent_color: profile.accent_color,
        banner_preset: profile.banner_preset,
        profile_sections: profile.profile_sections
      })
      .eq('id', currentUserId)

    setMessage(error ? 'Could not save profile details.' : 'Profile saved.')
    setSaving(false)
  }

  if (loading) {
    return (
      <Card eyebrow="SETTINGS" title="Profile & settings">
        <Loading label="Loading profile..." />
      </Card>
    )
  }

  return (
    <Card eyebrow="SETTINGS" title="Profile & settings">
      <form className="settings-form profile-settings-form" onSubmit={save}>
        <div className="profile-editor-layout">
          <section className={`profile-preview-card banner-${profile.banner_preset}`} style={{ '--profile-accent': profile.accent_color }}>
            <div className="profile-preview-avatar">
              {selectedAvatarUri && !avatarError ? (
                <img
                  src={selectedAvatarUri}
                  alt={`${selectedAvatar[1]} profile avatar`}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="profile-avatar-fallback" aria-hidden="true">?</span>
              )}
            </div>
            <strong>{profile.display_name || profile.username || 'Your profile'}</strong>
            <span>@{profile.username}</span>
            {profile.bio && <p>{profile.bio}</p>}
          </section>

          <div className="profile-editor-fields">
            <label>
              Username
              <input value={profile.username} disabled />
            </label>

            <label>
              Display name
              <input
                value={profile.display_name}
                maxLength={32}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your display name"
              />
            </label>

            <label>
              Bio
              <textarea
                value={profile.bio}
                maxLength={240}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                placeholder="A short description about you."
              />
              <small>{profile.bio.length}/240</small>
            </label>

            <label>
              Interests
              <input
                value={profile.interests}
                maxLength={240}
                onChange={e => setProfile({ ...profile, interests: e.target.value })}
                placeholder="music, games, cricket"
              />
            </label>
          </div>
        </div>

        <fieldset className="profile-editor-section">
          <legend>Choose your avatar</legend>
          <p className="widget-help">
            Select an avatar or generate another one. Your selection stays the same after refresh.
          </p>

          <div className="profile-avatar-grid" role="group" aria-label="Profile avatars">
            {PROFILE_AVATARS.map(([id, label, seed]) => {
              const uri = avatarDataUri(seed)
              const selected = profile.avatar_preset === id

              return (
                <button
                  type="button"
                  key={id}
                  className={`profile-avatar-choice ${selected ? 'selected' : ''}`}
                  aria-label={`${label}${selected ? ', selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => chooseAvatar(id)}
                >
                  {uri ? (
                    <img src={uri} alt="" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">?</span>
                  )}
                  {selected && <span className="profile-avatar-selected-label">SELECTED</span>}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="button secondary profile-generate-button"
            onClick={generateAnother}
          >
            Generate another
          </button>
        </fieldset>

        <fieldset className="profile-editor-section">
          <legend>Accent colour</legend>
          <div className="profile-color-grid" role="group" aria-label="Profile accent colours">
            {PROFILE_COLORS.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`profile-color-choice ${profile.accent_color === value ? 'selected' : ''}`}
                style={{ '--choice-color': value }}
                aria-label={`${label}${profile.accent_color === value ? ', selected' : ''}`}
                aria-pressed={profile.accent_color === value}
                onClick={() => setProfile({ ...profile, accent_color: value })}
              >
                <span aria-hidden="true" />
                <b>{label}</b>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="profile-editor-section">
          <legend>Profile banner</legend>
          <div className="profile-banner-grid" role="group" aria-label="Profile banners">
            {PROFILE_BANNERS.map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={`profile-banner-choice banner-${id} ${profile.banner_preset === id ? 'selected' : ''}`}
                aria-label={`${label}${profile.banner_preset === id ? ', selected' : ''}`}
                aria-pressed={profile.banner_preset === id}
                onClick={() => setProfile({ ...profile, banner_preset: id })}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="profile-editor-section">
          <legend>Visible sections</legend>
          <div className="profile-toggle-list">
            {[
              ['interests', 'Interests'],
              ['favoriteWords', 'Favorite words'],
              ['achievements', 'Achievements']
            ].map(([key, label]) => (
              <label className="profile-toggle" key={key}>
                <input
                  type="checkbox"
                  checked={profile.profile_sections[key]}
                  onChange={() => toggleSection(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {message && <p className="status" role="status">{message}</p>}

        <div className="actions profile-save-actions">
          <button className="button primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </Card>
  )
}

'@

$source = $source.Substring(0, $start) + $newSettings + "`r`n" + $source.Substring($end)

Set-Content -LiteralPath $path -Value $source -Encoding UTF8

Write-Host "DiceBear profile editor installed." -ForegroundColor Green