$ErrorActionPreference = "Stop"

$root = Get-Location
$mainPath = Join-Path $root "src\main.jsx"
$cssPath = Join-Path $root "src\styles.css"

if (!(Test-Path $mainPath)) {
    throw "src\main.jsx was not found. Make sure you are in C:\Users\hp\Downloads\upppppdated"
}

if (!(Test-Path $cssPath)) {
    throw "src\styles.css was not found."
}

# Backup current files before changing anything.
Copy-Item $mainPath "$mainPath.profile-backup-latest" -Force
Copy-Item $cssPath "$cssPath.profile-backup-latest" -Force

$main = Get-Content $mainPath -Raw

$startMarker = "function SettingsPage({ currentUserId }) {"
$endMarker = "function App() {"

$start = $main.IndexOf($startMarker)
$end = $main.IndexOf($endMarker, $start)

if ($start -lt 0) {
    throw "Could not find the existing SettingsPage in src\main.jsx"
}

if ($end -lt 0) {
    throw "Could not find App() after SettingsPage in src\main.jsx"
}

$profileCode = @'
const PROFILE_DEFAULTS = {
  display_name: '',
  avatar_preset: 'star',
  accent_color: '#39ff14',
  banner_preset: 'default',
  profile_sections: {
    interests: true,
    favoriteWords: true,
    achievements: true
  },
  bio: '',
  interests: ''
}

const PROFILE_AVATARS = [
  { id: 'star', label: 'Star', symbol: '★' },
  { id: 'diamond', label: 'Diamond', symbol: '◆' },
  { id: 'spark', label: 'Spark', symbol: 'ϟ' },
  { id: 'moon', label: 'Moon', symbol: '☾' },
  { id: 'smile', label: 'Smile', symbol: '☺' },
  { id: 'orbit', label: 'Orbit', symbol: '◈' }
]

const PROFILE_COLORS = [
  { id: 'green', label: 'Neon green', value: '#39ff14' },
  { id: 'pink', label: 'Neon pink', value: '#ff4fd8' },
  { id: 'lavender', label: 'Lavender', value: '#c9a7ff' },
  { id: 'orange', label: 'Orange', value: '#ff9d3d' },
  { id: 'yellow', label: 'Yellow', value: '#ffe66d' },
  { id: 'white', label: 'White', value: '#f2f2f2' }
]

const PROFILE_BANNERS = [
  { id: 'default', label: 'Default' },
  { id: 'grid', label: 'Grid' },
  { id: 'scanlines', label: 'Scanlines' },
  { id: 'sunset', label: 'Dark sunset' },
  { id: 'mono', label: 'Monochrome' }
]

const PROFILE_INTERESTS = [
  'Music',
  'Games',
  'Cricket',
  'Football',
  'Movies',
  'Books',
  'Technology',
  'Travel'
]

function cleanProfileText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, maxLength)
}

function normalizeProfile(data) {
  const sections = data?.profile_sections && typeof data.profile_sections === 'object'
    ? data.profile_sections
    : {}

  return {
    display_name: cleanProfileText(data?.display_name || data?.username || '', 32),
    avatar_preset: PROFILE_AVATARS.some(item => item.id === data?.avatar_preset)
      ? data.avatar_preset
      : 'star',
    accent_color: PROFILE_COLORS.some(item => item.value === data?.accent_color)
      ? data.accent_color
      : '#39ff14',
    banner_preset: PROFILE_BANNERS.some(item => item.id === data?.banner_preset)
      ? data.banner_preset
      : 'default',
    profile_sections: {
      interests: sections.interests !== false,
      favoriteWords: sections.favoriteWords !== false,
      achievements: sections.achievements !== false
    },
    bio: cleanProfileText(data?.bio || '', 240),
    interests: cleanProfileText(data?.interests || '', 240)
  }
}

function ProfilePreview({ profile }) {
  const avatar = PROFILE_AVATARS.find(item => item.id === profile.avatar_preset) || PROFILE_AVATARS[0]
  const interests = profile.interests
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12)

  return (
    <div
      className={`profile-preview profile-banner-${profile.banner_preset}`}
      style={{ '--profile-accent': profile.accent_color }}
    >
      <div className="profile-preview-banner" aria-hidden="true" />
      <div className="profile-preview-body">
        <div
          className="profile-avatar"
          role="img"
          aria-label={`${avatar.label} profile icon`}
        >
          {avatar.symbol}
        </div>

        <div className="profile-preview-heading">
          <div className="profile-preview-name">
            {profile.display_name || 'Your display name'}
          </div>
          <div className="profile-preview-handle">
            Your A Fun Time profile
          </div>
        </div>

        <p className="profile-preview-bio">
          {profile.bio || 'Your short profile description will appear here.'}
        </p>

        {profile.profile_sections.interests && (
          <section className="profile-preview-section">
            <h4>Interests</h4>
            {interests.length ? (
              <div className="profile-interest-list">
                {interests.map(item => (
                  <span className="profile-interest-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="profile-empty-text">No interests added yet.</p>
            )}
          </section>
        )}

        {profile.profile_sections.favoriteWords && (
          <section className="profile-preview-section">
            <h4>Favorite words</h4>
            <p className="profile-empty-text">
              Word Explorer favorites are not currently stored, so nothing is shown here yet.
            </p>
          </section>
        )}

        {profile.profile_sections.achievements && (
          <section className="profile-preview-section">
            <h4>Achievements</h4>
            <p className="profile-empty-text">
              No achievement or activity records are currently available.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

function SettingsPage({ currentUserId }) {
  const [profile, setProfile] = useState(PROFILE_DEFAULTS)
  const [savedProfile, setSavedProfile] = useState(PROFILE_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const draftKey = `aft-profile-draft-${currentUserId || 'unknown'}`

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false)
      return
    }

    let active = true

    const loadProfile = async () => {
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('profiles')
        .select('username,bio,interests,avatar_url,display_name,avatar_preset,accent_color,banner_preset,profile_sections')
        .eq('id', currentUserId)
        .single()

      if (!active) return

      if (loadError) {
        setError(loadError.message || 'Could not load your profile.')
        setLoading(false)
        return
      }

      const normalized = normalizeProfile(data)
      const storedDraft = sessionStorage.getItem(draftKey)

      if (storedDraft) {
        try {
          const draft = normalizeProfile(JSON.parse(storedDraft))
          setProfile(draft)
        } catch {
          setProfile(normalized)
          sessionStorage.removeItem(draftKey)
        }
      } else {
        setProfile(normalized)
      }

      setSavedProfile(normalized)
      setLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [currentUserId])

  const dirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(savedProfile),
    [profile, savedProfile]
  )

  useEffect(() => {
    if (!dirty) {
      sessionStorage.removeItem(draftKey)
      return
    }

    sessionStorage.setItem(draftKey, JSON.stringify(profile))
  }, [dirty, draftKey, profile])

  useEffect(() => {
    const beforeUnload = event => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const updateProfile = changes => {
    setMessage('')
    setError('')
    setProfile(current => ({ ...current, ...changes }))
  }

  const updateSections = section => {
    setProfile(current => ({
      ...current,
      profile_sections: {
        ...current.profile_sections,
        [section]: !current.profile_sections[section]
      }
    }))
  }

  const save = async event => {
    event.preventDefault()

    const displayName = cleanProfileText(profile.display_name, 32).trim()

    if (!displayName) {
      setError('Display name cannot be blank.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    const cleanProfile = {
      ...profile,
      display_name: displayName,
      bio: cleanProfileText(profile.bio, 240).trim(),
      interests: cleanProfileText(profile.interests, 240).trim()
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        display_name: cleanProfile.display_name,
        avatar_preset: cleanProfile.avatar_preset,
        accent_color: cleanProfile.accent_color,
        banner_preset: cleanProfile.banner_preset,
        profile_sections: cleanProfile.profile_sections,
        bio: cleanProfile.bio,
        interests: cleanProfile.interests,
        avatar_url: null
      })
      .eq('id', currentUserId)

    if (saveError) {
      setError(saveError.message || 'Could not save your profile.')
      setSaving(false)
      return
    }

    setProfile(cleanProfile)
    setSavedProfile(cleanProfile)
    sessionStorage.removeItem(draftKey)
    setMessage('Profile saved.')
    setSaving(false)
  }

  const cancel = () => {
    setProfile(savedProfile)
    setMessage('Unsaved changes discarded.')
    setError('')
    sessionStorage.removeItem(draftKey)
  }

  const resetDefaults = () => {
    setProfile({
      ...PROFILE_DEFAULTS,
      display_name: savedProfile.display_name
    })
    setMessage('Defaults loaded. Save to apply them.')
    setError('')
  }

  if (!currentUserId) {
    return (
      <Card eyebrow="PROFILE" title="Profile">
        <EmptyState
          title="Sign in required"
          text="Sign in to customize your profile."
        />
      </Card>
    )
  }

  if (loading) {
    return (
      <Card eyebrow="PROFILE" title="Customize your profile">
        <Loading />
      </Card>
    )
  }

  return (
    <Card eyebrow="PROFILE" title="Customize your profile">
      <div
        className="profile-layout"
        style={{ '--profile-accent': profile.accent_color }}
      >
        <div className="profile-preview-column">
          <ProfilePreview profile={profile} />

          <div className="profile-editor-note">
            <strong>Private profile</strong>
            <span>
              Profiles are currently used for your signed-in experience only.
              Public profile visibility is not enabled.
            </span>
          </div>
        </div>

        <form className="profile-editor" onSubmit={save}>
          <section className="profile-editor-section">
            <h3>Basic details</h3>

            <label>
              Display name
              <input
                value={profile.display_name}
                onChange={event => updateProfile({
                  display_name: event.target.value.slice(0, 32)
                })}
                maxLength={32}
                required
                placeholder="Choose a display name"
                autoComplete="nickname"
              />
              <small>1–32 characters. This is the name shown on your profile.</small>
            </label>

            <label>
              Bio
              <textarea
                value={profile.bio}
                onChange={event => updateProfile({
                  bio: event.target.value.slice(0, 240)
                })}
                maxLength={240}
                rows={4}
                placeholder="A short description about you."
              />
              <small>{profile.bio.length}/240</small>
            </label>

            <label>
              Interests
              <input
                value={profile.interests}
                onChange={event => updateProfile({
                  interests: event.target.value.slice(0, 240)
                })}
                maxLength={240}
                placeholder="music, games, cricket"
              />
              <small>Separate interests with commas.</small>
            </label>

            <div className="profile-interest-presets">
              {PROFILE_INTERESTS.map(item => {
                const selected = profile.interests
                  .split(',')
                  .map(value => value.trim().toLowerCase())
                  .includes(item.toLowerCase())

                return (
                  <button
                    key={item}
                    type="button"
                    className={`profile-interest-option ${selected ? 'selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => {
                      const values = profile.interests
                        .split(',')
                        .map(value => value.trim())
                        .filter(Boolean)

                      const index = values.findIndex(
                        value => value.toLowerCase() === item.toLowerCase()
                      )

                      if (index >= 0) {
                        values.splice(index, 1)
                      } else {
                        values.push(item)
                      }

                      updateProfile({ interests: values.join(', ') })
                    }}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="profile-editor-section">
            <h3>Profile icon</h3>

            <div className="profile-avatar-grid" role="group" aria-label="Profile icon">
              {PROFILE_AVATARS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-avatar-choice ${profile.avatar_preset === item.id ? 'selected' : ''}`}
                  aria-label={`Use ${item.label} profile icon`}
                  aria-pressed={profile.avatar_preset === item.id}
                  onClick={() => updateProfile({ avatar_preset: item.id })}
                >
                  <span aria-hidden="true">{item.symbol}</span>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="profile-editor-section">
            <h3>Accent color</h3>

            <div className="profile-color-grid" role="group" aria-label="Accent color">
              {PROFILE_COLORS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-color-choice ${profile.accent_color === item.value ? 'selected' : ''}`}
                  style={{ '--choice-color': item.value }}
                  aria-label={`Use ${item.label} accent color`}
                  aria-pressed={profile.accent_color === item.value}
                  onClick={() => updateProfile({ accent_color: item.value })}
                >
                  <span aria-hidden="true" />
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="profile-editor-section">
            <h3>Profile banner</h3>

            <div className="profile-banner-grid" role="group" aria-label="Profile banner">
              {PROFILE_BANNERS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-banner-choice profile-banner-${item.id} ${profile.banner_preset === item.id ? 'selected' : ''}`}
                  aria-label={`Use ${item.label} profile banner`}
                  aria-pressed={profile.banner_preset === item.id}
                  onClick={() => updateProfile({ banner_preset: item.id })}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="profile-editor-section">
            <h3>Optional sections</h3>
            <p className="profile-section-description">
              These sections can be shown or hidden from your profile preview.
            </p>

            <label className="profile-toggle">
              <input
                type="checkbox"
                checked={profile.profile_sections.interests}
                onChange={() => updateSections('interests')}
              />
              <span>Interests</span>
            </label>

            <label className="profile-toggle">
              <input
                type="checkbox"
                checked={profile.profile_sections.favoriteWords}
                onChange={() => updateSections('favoriteWords')}
              />
              <span>Favorite words</span>
            </label>

            <label className="profile-toggle">
              <input
                type="checkbox"
                checked={profile.profile_sections.achievements}
                onChange={() => updateSections('achievements')}
              />
              <span>Achievements</span>
            </label>
          </section>

          <section className="profile-editor-section profile-data-note">
            <h3>Existing data</h3>
            <p>
              Favorite words will use Word Explorer data once saved-word
              persistence exists. No artificial favorites or achievement
              statistics are being created.
            </p>
          </section>

          {error && <ErrorMessage message={error} />}

          {message && (
            <p className="status" role="status" aria-live="polite">
              {message}
            </p>
          )}

          <div className="profile-actions">
            <button
              className="button primary"
              type="submit"
              disabled={saving || !profile.display_name.trim()}
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={cancel}
              disabled={saving || !dirty}
            >
              Cancel
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={resetDefaults}
              disabled={saving}
            >
              Reset defaults
            </button>
          </div>

          {dirty && (
            <p className="profile-unsaved" role="status">
              Unsaved changes are being preserved on this device.
            </p>
          )}
        </form>
      </div>
    </Card>
  )
}

'@

$main = $main.Substring(0, $start) + $profileCode + "`r`n" + $main.Substring($end)

Set-Content -Path $mainPath -Value $main -Encoding UTF8

# Replace any previous profile CSS block, then append the current one.
$css = Get-Content $cssPath -Raw

$cssMarkerStart = "/* AFT PROFILE STYLES START */"
$cssMarkerEnd = "/* AFT PROFILE STYLES END */"

$existingStart = $css.IndexOf($cssMarkerStart)
$existingEnd = $css.IndexOf($cssMarkerEnd)

if ($existingStart -ge 0 -and $existingEnd -gt $existingStart) {
    $afterEnd = $existingEnd + $cssMarkerEnd.Length
    $css = $css.Substring(0, $existingStart).TrimEnd() + "`r`n" + $css.Substring($afterEnd).TrimStart()
}

$profileCss = @'
/* AFT PROFILE STYLES START */

.profile-layout {
  display: grid;
  grid-template-columns: minmax(280px, .9fr) minmax(320px, 1.1fr);
  gap: 20px;
  align-items: start;
}

.profile-preview-column,
.profile-editor {
  min-width: 0;
}

.profile-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--profile-accent, #39ff14);
  border-radius: 20px;
  background: #090909;
  box-shadow: 0 0 12px rgba(57, 255, 20, .2);
}

.profile-preview-banner {
  height: 120px;
  border-bottom: 1px solid var(--profile-accent, #39ff14);
}

.profile-preview.profile-banner-default .profile-preview-banner {
  background: linear-gradient(135deg, #111 0%, #050505 55%, #151515 100%);
}

.profile-preview.profile-banner-grid .profile-preview-banner {
  background-color: #090909;
  background-image:
    linear-gradient(rgba(57,255,20,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57,255,20,.12) 1px, transparent 1px);
  background-size: 18px 18px;
}

.profile-preview.profile-banner-scanlines .profile-preview-banner {
  background: repeating-linear-gradient(
    0deg,
    #070707 0,
    #070707 5px,
    #151515 6px,
    #151515 7px
  );
}

.profile-preview.profile-banner-sunset .profile-preview-banner {
  background: linear-gradient(135deg, #24131d 0%, #3a2117 48%, #17100c 100%);
}

.profile-preview.profile-banner-mono .profile-preview-banner {
  background: linear-gradient(135deg, #222 0%, #111 50%, #050505 100%);
}

.profile-preview-body {
  position: relative;
  padding: 18px;
}

.profile-avatar {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  margin-top: -54px;
  border: 2px solid var(--profile-accent, #39ff14);
  border-radius: 18px;
  background: #050505;
  color: var(--profile-accent, #39ff14);
  font-size: 34px;
  line-height: 1;
  box-shadow: 0 0 12px rgba(57,255,20,.2);
}

.profile-preview-heading {
  margin-top: 12px;
}

.profile-preview-name {
  color: #f2f2f2;
  font-size: 1.35rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.profile-preview-handle {
  margin-top: 3px;
  color: #999;
  font-size: .82rem;
}

.profile-preview-bio {
  margin: 14px 0;
  color: #ddd;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.profile-preview-section {
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #292929;
}

.profile-preview-section h4 {
  margin: 0 0 9px;
  color: var(--profile-accent, #39ff14);
  font-size: .82rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.profile-interest-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.profile-interest-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--profile-accent, #39ff14);
  border-radius: 999px;
  color: #f2f2f2;
  font-size: .8rem;
}

.profile-empty-text {
  margin: 0;
  color: #8f8f8f;
  font-size: .84rem;
  line-height: 1.45;
}

.profile-editor {
  display: grid;
  gap: 16px;
}

.profile-editor-section {
  padding: 16px;
  border: 1px solid #292929;
  border-radius: 16px;
  background: #0b0b0b;
}

.profile-editor-section h3 {
  margin: 0 0 13px;
  color: #f2f2f2;
  font-size: 1rem;
}

.profile-editor-section label:not(.profile-toggle) {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}

.profile-editor-section small {
  color: #888;
  font-size: .76rem;
}

.profile-interest-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: -4px;
}

.profile-interest-option {
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid #333 !important;
  border-radius: 999px !important;
  background: #111 !important;
  color: #ccc !important;
  box-shadow: none !important;
  cursor: pointer;
}

.profile-interest-option.selected {
  border-color: var(--profile-accent, #39ff14) !important;
  color: #fff !important;
}

.profile-avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(70px, 1fr));
  gap: 8px;
}

.profile-avatar-choice {
  min-height: 84px;
  display: grid;
  place-items: center;
  gap: 5px;
  padding: 8px;
  border: 1px solid #333 !important;
  border-radius: 14px !important;
  background: #111 !important;
  color: #aaa !important;
  box-shadow: none !important;
  cursor: pointer;
}

.profile-avatar-choice span {
  font-size: 25px;
  color: #ddd;
}

.profile-avatar-choice.selected {
  border-color: var(--profile-accent, #39ff14) !important;
  color: #fff !important;
}

.profile-avatar-choice.selected span {
  color: var(--profile-accent, #39ff14);
}

.profile-color-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(90px, 1fr));
  gap: 8px;
}

.profile-color-choice {
  min-height: 62px;
  display: grid;
  place-items: center;
  gap: 5px;
  padding: 8px;
  border: 1px solid #333 !important;
  border-radius: 14px !important;
  background: #111 !important;
  color: #aaa !important;
  box-shadow: none !important;
  cursor: pointer;
}

.profile-color-choice > span {
  width: 22px;
  height: 22px;
  display: block;
  border-radius: 50%;
  background: var(--choice-color);
  border: 2px solid #050505;
  outline: 1px solid #555;
}

.profile-color-choice.selected {
  border-color: var(--choice-color) !important;
  color: #fff !important;
}

.profile-banner-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 8px;
}

.profile-banner-choice {
  min-height: 70px;
  display: grid;
  place-items: center;
  padding: 8px;
  border: 1px solid #333 !important;
  border-radius: 14px !important;
  color: #ddd !important;
  box-shadow: none !important;
  cursor: pointer;
  overflow: hidden;
}

.profile-banner-choice.selected {
  border: 2px solid var(--profile-accent, #39ff14) !important;
  color: #fff !important;
}

.profile-banner-choice.profile-banner-default {
  background: linear-gradient(135deg, #111 0%, #050505 55%, #151515 100%) !important;
}

.profile-banner-choice.profile-banner-grid {
  background-color: #090909 !important;
  background-image:
    linear-gradient(rgba(57,255,20,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57,255,20,.12) 1px, transparent 1px) !important;
  background-size: 18px 18px !important;
}

.profile-banner-choice.profile-banner-scanlines {
  background: repeating-linear-gradient(
    0deg,
    #070707 0,
    #070707 5px,
    #151515 6px,
    #151515 7px
  ) !important;
}

.profile-banner-choice.profile-banner-sunset {
  background: linear-gradient(135deg, #24131d 0%, #3a2117 48%, #17100c 100%) !important;
}

.profile-banner-choice.profile-banner-mono {
  background: linear-gradient(135deg, #222 0%, #111 50%, #050505 100%) !important;
}

.profile-section-description {
  margin: -5px 0 14px;
  color: #888;
  font-size: .82rem;
  line-height: 1.45;
}

.profile-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  margin: 0 !important;
  color: #ddd;
}

.profile-toggle input {
  width: auto !important;
  accent-color: var(--profile-accent, #39ff14);
}

.profile-data-note p {
  margin: 0;
  color: #999;
  font-size: .82rem;
  line-height: 1.5;
}

.profile-editor-note {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid #292929;
  border-radius: 14px;
  background: #0b0b0b;
  color: #999;
  font-size: .8rem;
  line-height: 1.45;
}

.profile-editor-note strong {
  color: #ddd;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.profile-unsaved {
  margin: 0;
  color: #aaa;
  font-size: .8rem;
}

.profile-editor button:focus-visible,
.profile-editor input:focus-visible,
.profile-editor textarea:focus-visible {
  outline: 2px solid var(--profile-accent, #39ff14);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-avatar-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .profile-color-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-preview,
  .profile-editor * {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}

/* AFT PROFILE STYLES END */
'@

$css = $css.TrimEnd() + "`r`n`r`n" + $profileCss.Trim() + "`r`n"

Set-Content -Path $cssPath -Value $css -Encoding UTF8

Write-Host ""
Write-Host "Profile files updated successfully." -ForegroundColor Green
Write-Host "Running production build..." -ForegroundColor Cyan
Write-Host ""

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed. The previous files were backed up as *.profile-backup-latest"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "PROFILE UPDATE COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Build completed successfully."
Write-Host "You can now test the site locally."
Write-Host ""