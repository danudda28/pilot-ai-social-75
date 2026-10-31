import * as React from 'react'
import { Head, Html, Preview, Text } from '@react-email/components'
import { Layout, darkModeCss, s } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Codul tău de verificare SocialSpark</Preview>
    <Layout>
      <h1 className="dm-h1" style={s.h1}>
        Codul tău de verificare
      </h1>
      <Text className="dm-muted" style={s.muted}>
        Folosește codul de mai jos pentru a confirma această acțiune
        (de exemplu, schimbarea parolei):
      </Text>
      <div className="dm-h1" style={s.code}>
        {token}
      </div>
      <Text className="dm-muted" style={s.muted}>
        Codul expiră în câteva minute. Dacă nu tu ai solicitat codul, ignoră
        acest email.
      </Text>
    </Layout>
  </Html>
)

export default ReauthenticationEmail
