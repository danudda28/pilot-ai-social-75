// ============= Full file contents =============

import * as React from 'react'
import { Body, Container } from '@react-email/components'

export const BRAND = {
  primary: '#6D28D9',
  primaryDark: '#5B21B6',
  indigo: '#4F46E5',
  text: '#1E1B2E',
  muted: '#6B7280',
  border: '#E9E4F5',
  cardBg: '#ffffff',
}

export const fontStack =
  "'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

export const s = {
  main: {
    backgroundColor: '#F6F4FB',
    fontFamily: fontStack,
    padding: '32px 16px',
  },
  container: { maxWidth: '560px' as const, margin: '0 auto' },
  logo: {
    fontSize: '22px',
    fontWeight: 800,
    color: BRAND.primary,
    letterSpacing: '-0.5px',
    margin: '0 0 18px',
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: BRAND.cardBg,
    border: `1px solid ${BRAND.border}`,
    borderRadius: '16px',
    padding: '32px 28px',
  },
  h1: {
    fontSize: '22px',
    fontWeight: 700,
    color: BRAND.text,
    margin: '0 0 16px',
  },
  text: {
    fontSize: '15px',
    color: BRAND.text,
    lineHeight: '1.6',
    margin: '0 0 16px',
  },
  muted: {
    fontSize: '14px',
    color: BRAND.muted,
    lineHeight: '1.6',
    margin: '0 0 16px',
  },
  link: { color: BRAND.primary, textDecoration: 'underline' },
  button: {
    backgroundColor: BRAND.primary,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '12px',
    padding: '13px 26px',
    textDecoration: 'none',
    display: 'inline-block' as const,
  },
  code: {
    fontSize: '30px',
    fontWeight: 700,
    color: BRAND.primary,
    letterSpacing: '8px',
    margin: '8px 0 20px',
  },
  footer: {
    fontSize: '12px',
    color: '#9B96B8',
    textAlign: 'center' as const,
    margin: '20px 0 0',
  },
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Body style={s.main}>
      <Container style={s.container}>
        <div style={s.logo}>
          Social<span style={{ color: BRAND.indigo }}>Spark</span>
        </div>
        <div style={s.card}>{children}</div>
        <div style={s.footer}>
          SocialSpark · socialspark.ro · Postări AI pentru afacerea ta
        </div>
      </Container>
    </Body>
  )
}

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    body { background-color: #0F0D17 !important; }
    .dm-card { background-color: #17141F !important; border-color: #2A2440 !important; }
    .dm-text { color: #E5E1F0 !important; }
    .dm-muted { color: #9B96B8 !important; }
    .dm-h1 { color: #F3F0FF !important; }
  }
  [data-ogsc] body { background-color: #0F0D17 !important; }
  [data-ogsc] .dm-card { background-color: #17141F !important; border-color: #2A2440 !important; }
  [data-ogsc] .dm-text { color: #E5E1F0 !important; }
  [data-ogsc] .dm-muted { color: #9B96B8 !important; }
  [data-ogsc] .dm-h1 { color: #F3F0FF !important; }
`
