import * as React from 'react'
import { Head, Html, Link, Preview, Text } from '@react-email/components'
import { Layout, darkModeCss, s } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirmă-ți adresa de email pentru {siteName}</Preview>
    <Layout>
      <h1 className="dm-h1" style={s.h1}>
        Bun venit în {siteName}!
      </h1>
      <Text className="dm-text" style={s.text}>
        Te-ai înscris în{' '}
        <Link href={siteUrl} style={s.link}>
          <strong>{siteName}</strong>
        </Link>
        , platforma care creează postări AI pentru afacerea ta.
      </Text>
      <Text className="dm-muted" style={s.muted}>
        Confirmă adresa de email (
        <Link href={`mailto:${recipient}`} style={s.link}>
          {recipient}
        </Link>
        ) apăsând butonul de mai jos:
      </Text>
      <a className="dm-btn" style={s.button} href={confirmationUrl}>
        Verifică emailul
      </a>
      <Text className="dm-muted" style={{ ...s.muted, marginTop: '24px' }}>
        Dacă nu tu ți-ai creat contul, poți ignora acest email în siguranță.
      </Text>
      <Text className="dm-muted" style={{ ...s.muted, margin: 0 }}>
        Butonul nu merge? Copiază acest link în browser: <br />
        <Link href={confirmationUrl} style={s.link}>
          {confirmationUrl}
        </Link>
      </Text>
    </Layout>
  </Html>
)

export default SignupEmail
