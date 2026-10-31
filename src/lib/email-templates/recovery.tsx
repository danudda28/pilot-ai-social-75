import * as React from 'react'
import { Head, Html, Link, Preview, Text } from '@react-email/components'
import { Layout, darkModeCss, s } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Resetează-ți parola pentru {siteName}</Preview>
    <Layout>
      <h1 className="dm-h1" style={s.h1}>
        Resetează-ți parola
      </h1>
      <Text className="dm-muted" style={s.muted}>
        Am primit o solicitare de resetare a parolei pentru contul tău din{' '}
        <Link href={`https://socialspark.ro`} style={s.link}>
          {siteName}
        </Link>
        .
      </Text>
      <Text className="dm-muted" style={s.muted}>
        Apasă butonul de mai jos ca să setezi o parolă nouă. Linkul expiră în
        curând, deci folosește-l cât mai repede.
      </Text>
      <a className="dm-btn" style={s.button} href={confirmationUrl}>
        Resetează parola
      </a>
      <Text className="dm-muted" style={{ ...s.muted, marginTop: '24px' }}>
        Dacă nu tu ai solicitat resetarea, poți ignora acest email — parola ta
        actuală rămâne neschimbată.
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

export default RecoveryEmail
