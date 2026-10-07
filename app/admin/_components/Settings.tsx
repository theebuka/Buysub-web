'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { API, Card, FieldLabel, Loading, SmallBtn, T, apiFetch, inputStyle } from '../_lib/shared'

export function SettingsTab() {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/v2/admin/settings')
      .then(r => {
        if (r?.ok && r.data) {
          setSettings(r.data)
        } else {
          setSettings({}) // fallback prevents null lock
        }
      })
      .catch(() => {
        setSettings({}) // network/error fallback
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const saveSettings = async () => {
    const r = await apiFetch('/v2/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })

    if (r?.ok) toast.success('Settings saved')
    else toast.error(r?.error || 'Failed to save')
  }

  if (loading) return <Loading />

  return (
    <Card title="General Settings">
      {/* Was a hard `1fr 1fr`. `1fr` is `minmax(auto, 1fr)` and an <input>'s
          auto minimum is its intrinsic ~170px+, so at 360 — where this card has
          about 262px of content once Shell's gutters and Card's padding are
          taken — the two tracks overflowed the card rather than just crowding.

          This grid has seven children, so a plain auto-fit would keep adding
          tracks and turn the desktop layout into five columns. The track
          minimum is therefore the LARGER of 240px and half the row: at 1440 the
          half-row term wins and pins it to exactly two columns, which is what
          desktop renders today, unchanged; at 360 the 240px term wins and only
          one track fits. Mobile is the only width whose layout moves. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(max(min(240px, 100%), (100% - var(--bs-space-3)) / 2), 1fr))', gap: 'var(--bs-space-3)' }}>
        <FieldLabel label="Phone">
          <input
            style={inputStyle()}
            value={settings.phone || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, phone: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="Instagram">
          <input
            style={inputStyle()}
            value={settings.instagram || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, instagram: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="Facebook">
          <input
            style={inputStyle()}
            value={settings.facebook || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, facebook: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="X (Twitter)">
          <input
            style={inputStyle()}
            value={settings.x || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, x: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="TikTok">
          <input
            style={inputStyle()}
            value={settings.tiktok || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, tiktok: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="Receipt Caption (optional)">
          <textarea
            style={{ ...inputStyle(), height: 80, padding: '10px 14px' } as any}
            value={settings.receipt_caption || ''}
            onChange={e =>
              setSettings((s: any) => ({
                ...s,
                receipt_caption: e.target.value,
              }))
            }
          />
        </FieldLabel>

        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
          <SmallBtn color={T.accent} onClick={saveSettings}>
            Save Settings
          </SmallBtn>
        </div>
      </div>
    </Card>
  )
}
console.log("API URL:", API)
