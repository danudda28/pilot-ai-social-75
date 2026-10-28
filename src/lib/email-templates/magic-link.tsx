import * as React from 'react'
import { Head, Html, Link, Preview, Text } from '@react-email/components'
import { Layout, darkModeCss, s } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Linkul tău de autentificare pentru {siteName}</Preview>
    <Layout>
      <h1 className="dm-h1" style={s.h1}>
        Autentifică-te în {siteName}
      </h1>
      <Text className="dm-muted" style={s.muted}>
        Apasă butonul de mai jos ca să intri în cont, fără parolă. Linkul
        expiră în curând și poate fi folosit o singură dată.
      </Text>
      <a className="dm-btn" style={s.button} href={confirmationUrl}>
        Autentifică-te
      </a>
      <Text className="dm-muted" style={{ ...s.muted, marginTop: '24px' }}>
        Dacă nu tu ai solicitat acest link, poți ignora acest email în
        siguranță.
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

export default MagicLinkEmail
