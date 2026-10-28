import * as React from 'react'
import { Head, Html, Link, Preview, Text } from '@react-email/components'
import { Layout, darkModeCss, s } from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Ai fost invitat(ă) în {siteName}</Preview>
    <Layout>
      <h1 className="dm-h1" style={s.h1}>
        Ai fost invitat(ă) în {siteName}
      </h1>
      <Text className="dm-muted" style={s.muted}>
        Cineva te-a invitat în{' '}
        <Link href={siteUrl} style={s.link}>
          <strong>{siteName}</strong>
        </Link>
        , platforma care creează și publică postări AI pentru afacerea ta.
      </Text>
      <Text className="dm-muted" style={s.muted}>
        Apasă butonul de mai jos ca să îți activezi contul:
      </Text>
      <a className="dm-btn" style={s.button} href={confirmationUrl}>
        Acceptă invitația
      </a>
      <Text className="dm-muted" style={{ ...s.muted, marginTop: '24px' }}>
        Butonul nu merge? Copiază acest link în browser: <br />
        <Link href={confirmationUrl} style={s.link}>
          {confirmationUrl}
        </Link>
      </Text>
    </Layout>
  </Html>
)

export default InviteEmail
