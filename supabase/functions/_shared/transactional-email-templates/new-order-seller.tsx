/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NukuConnect'
const LOGO_URL = 'https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/email-assets/nukuconnect-logo.png'

interface OrderItem {
  name: string
  quantity: number
  unitPrice: number
  unit: string
}

interface NewOrderSellerProps {
  sellerName?: string
  buyerName?: string
  invoiceNumber?: string
  orderDate?: string
  orderItems?: OrderItem[]
  total?: number
  deliveryMethod?: string
  deliveryCity?: string
  buyerPhone?: string
  invoiceUrl?: string
  sellerActionUrl?: string
}

const formatCFA = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`

const NewOrderSellerEmail = ({
  sellerName = 'Vendeur',
  buyerName = 'Client',
  invoiceNumber = '',
  orderDate = '',
  orderItems = [],
  total = 0,
  deliveryMethod = '',
  deliveryCity = '',
  buyerPhone = '',
  invoiceUrl = '',
  sellerActionUrl = '',
}: NewOrderSellerProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouvelle commande {invoiceNumber} à préparer — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="80" height="80" style={logo} />
        <Heading style={h1}>🛒 Nouvelle commande à préparer</Heading>
        <Text style={text}>
          Bonjour <strong>{sellerName}</strong>, vous avez reçu une nouvelle commande
          {invoiceNumber ? <> <strong style={{ color: '#008000' }}>{invoiceNumber}</strong></> : null}
          {orderDate ? ` le ${orderDate}` : ''}.
        </Text>

        {orderItems.length > 0 && (
          <Section style={tableSection}>
            <table style={table}>
              <thead>
                <tr style={tableHeaderRow}>
                  <th style={th}>Produit</th>
                  <th style={{ ...th, textAlign: 'center' as const }}>Qté</th>
                  <th style={{ ...th, textAlign: 'right' as const }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, i) => (
                  <tr key={i}>
                    <td style={td}><strong>{item.name}</strong></td>
                    <td style={{ ...td, textAlign: 'center' as const }}>{item.quantity} {item.unit}</td>
                    <td style={{ ...td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                      {formatCFA(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Hr style={divider} />
        <Text style={totalLine}>TOTAL commande : <strong>{formatCFA(total)}</strong></Text>

        <Section style={infoBox}>
          <Text style={infoText}>👤 <strong>Acheteur :</strong> {buyerName}</Text>
          {buyerPhone && <Text style={infoText}>📞 {buyerPhone}</Text>}
          {deliveryMethod && <Text style={infoText}>🚚 <strong>Livraison :</strong> {deliveryMethod}</Text>}
          {deliveryCity && <Text style={infoText}>📍 {deliveryCity}</Text>}
        </Section>

        <Text style={text}>
          Ce produit a été payé sur votre compte. Vérifiez la commande, confirmez sa réception et lancez la livraison depuis votre tableau de bord {SITE_NAME}.
        </Text>
        {sellerActionUrl && (
          <Link href={sellerActionUrl} style={buttonLink}>
            Confirmer la commande et organiser la livraison
          </Link>
        )}
        {invoiceUrl && (
          <Link href={invoiceUrl} style={secondaryLink}>
            Voir la facture de la commande
          </Link>
        )}
        <Text style={footer}>
          {SITE_NAME} — Marketplace Agricole intelligente
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewOrderSellerEmail,
  subject: (data: Record<string, any>) =>
    `🛒 Nouvelle commande ${data.invoiceNumber || ''} à préparer — ${SITE_NAME}`,
  displayName: 'Nouvelle commande (vendeur)',
  previewData: {
    sellerName: 'Ferme Lomé',
    buyerName: 'Kofi Mensah',
    invoiceNumber: 'NK-20260601-093015',
    orderDate: '01/06/2026',
    orderItems: [
      { name: 'Tomates fraîches bio', quantity: 5, unitPrice: 1500, unit: 'kg' },
    ],
    total: 7500,
    deliveryMethod: 'Livreur NukuConnect',
    deliveryCity: 'Lomé',
    buyerPhone: '+228 90 00 00 00',
    invoiceUrl: 'https://nukuconnect.com/factures?invoice=NK-20260601-093015',
    sellerActionUrl: 'https://nukuconnect.com/tableau-de-bord?tab=orders&invoice=NK-20260601-093015',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 auto 24px', display: 'block', objectFit: 'contain' as const, width: '80px', height: '80px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#008000', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 16px' }
const tableSection = { margin: '0 0 16px', border: '1px solid #e4e4e7', borderRadius: '8px', overflow: 'hidden' as const }
const table = { width: '100%', borderCollapse: 'collapse' as const }
const tableHeaderRow = { backgroundColor: '#f4f4f5' }
const th = { padding: '10px 16px', fontSize: '11px', fontWeight: 'bold' as const, color: '#71717a', textAlign: 'left' as const, textTransform: 'uppercase' as const }
const td = { padding: '12px 16px', fontSize: '13px', color: '#18181b', borderTop: '1px solid #e4e4e7' }
const divider = { borderTop: '2px solid #008000', margin: '8px 0' }
const totalLine = { fontSize: '16px', color: '#008000', margin: '0 0 16px', textAlign: 'right' as const }
const infoBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '0 0 16px' }
const infoText = { margin: '0 0 6px', fontSize: '13px', color: '#18181b' }
const footer = { fontSize: '12px', color: '#999999', margin: '16px 0 0', lineHeight: '1.5' }
const buttonLink = { display: 'block', backgroundColor: '#008000', color: '#ffffff', textDecoration: 'none', textAlign: 'center' as const, padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, margin: '16px 0 8px' }
const secondaryLink = { display: 'block', color: '#008000', textDecoration: 'underline', textAlign: 'center' as const, fontSize: '13px', fontWeight: 'bold' as const, margin: '8px 0 16px' }
