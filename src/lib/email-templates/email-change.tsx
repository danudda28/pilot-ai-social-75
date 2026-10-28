import * as React from 'react'
import { Head, Html, Link, Preview, Text } from '@react-email/components'
import { Layout, darkModeCss, s } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirmă noua adresă de email pentru {siteName}</Preview>
    <Layout>
      <h1 className="dm-h1" style={s.h1}>
        Confirmă schimbarea emailului
      </h1>
      <Text className="dm-muted" style={s.muted}>
        Ai solicitat schimbarea adresei de email din contul tău{' '}
        <strong>{siteName}</strong>:
      </Text>
      <Text className="dm-text" style={{ ...s.text, margin: '0 0 8px' }}>
        Veche adresă: <strong>{oldEmail}</strong>
      </Text>
      <Text className="dm-text" style={{ ...s.text, margin: '0 0 20px' }}>
        Adresă nouă: <strong>{newEmail}</strong>
      </Text>
      <Text className="dm-muted" style={s.muted}>
        Apasă butonul de mai jos ca să confirmi noua adresă:
      </Text>
      <a className="dm-btn" style={s.button} href={confirmationUrl}>
        Confirmă noul email
      </a>
      <Text className="dm-muted" style={{ ...s.muted, marginTop: '24px' }}>
        Dacă nu tu ai solicitat schimbarea, ignoră acest email — adresa actuală
        rămâne neschimbată.
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

export default EmailChangeEmail
