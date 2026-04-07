/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NukuConnect'
const LOGO_URL = 'https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/email-assets/nukuconnect-logo.png'

interface OrderItem {
  name: string
  quantity: number
  unitPrice: number
  unit: string
  sellerName: string
}

interface OrderConfirmationProps {
  buyerName?: string
  invoiceNumber?: string
  orderDate?: string
  orderItems?: OrderItem[]
  subtotal?: number
  deliveryPrice?: number
  total?: number
  deliveryMethod?: string
  paymentMethod?: string
  deliveryCity?: string
}

const formatCFA = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`

const OrderConfirmationEmail = ({
  buyerName = 'Client',
  invoiceNumber = 'NC-000000',
  orderDate = '',
  orderItems = [],
  subtotal = 0,
  deliveryPrice = 0,
  total = 0,
  deliveryMethod = '',
  paymentMethod = '',
  deliveryCity = '',
}: OrderConfirmationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmation de commande {invoiceNumber} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        <Heading style={h1}>Merci {buyerName} ! 🎉</Heading>
        <Text style={text}>
          Votre commande <strong style={{ color: '#008000' }}>{invoiceNumber}</strong> a été
          enregistrée avec succès{orderDate ? ` le ${orderDate}` : ''}.
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
                    <td style={td}>
                      <strong>{item.name}</strong>
                      <br />
                      <span style={sellerText}>Fournisseur : {item.sellerName}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' as const }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ ...td, textAlign: 'right' as const, fontWeight: 'bold' as const }}>
                      {formatCFA(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section style={summarySection}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={summaryLabel}>Sous-total</td>
                <td style={summaryValue}>{formatCFA(subtotal)}</td>
              </tr>
              <tr>
                <td style={summaryLabel}>Livraison ({deliveryMethod})</td>
                <td style={summaryValue}>{deliveryPrice === 0 ? 'Gratuit' : formatCFA(deliveryPrice)}</td>
              </tr>
            </tbody>
          </table>
          <Hr style={divider} />
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={totalLabel}>TOTAL</td>
                <td style={totalValue}>{formatCFA(total)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section style={infoBox}>
          <Text style={infoText}>🚚 <strong>Livraison :</strong> {deliveryMethod}</Text>
          {deliveryCity && <Text style={infoText}>📍 {deliveryCity}</Text>}
          <Text style={infoText}>💳 <strong>Paiement :</strong> {paymentMethod}</Text>
        </Section>

        <Text style={footer}>
          Une facture PDF a été générée automatiquement. Vous pouvez la re-télécharger depuis votre tableau de bord.
        </Text>
        <Text style={footer}>
          {SITE_NAME} — Marketplace Agricole du Togo
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Confirmation de commande ${data.invoiceNumber || ''} — ${SITE_NAME}`,
  displayName: 'Confirmation de commande',
  previewData: {
    buyerName: 'Kofi Mensah',
    invoiceNumber: 'NC-240701-001',
    orderDate: '01/07/2024',
    orderItems: [
      { name: 'Tomates fraîches bio', quantity: 5, unitPrice: 1500, unit: 'kg', sellerName: 'Ferme Lomé' },
      { name: 'Maïs jaune', quantity: 10, unitPrice: 800, unit: 'kg', sellerName: 'Agri Kara' },
    ],
    subtotal: 15500,
    deliveryPrice: 2000,
    total: 17500,
    deliveryMethod: 'Livraison express',
    paymentMethod: 'Mobile Money',
    deliveryCity: 'Lomé',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 0 24px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#008000', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(210, 10%, 45%)', lineHeight: '1.6', margin: '0 0 24px' }
const tableSection = { margin: '0 0 24px', border: '1px solid #e4e4e7', borderRadius: '8px', overflow: 'hidden' as const }
const table = { width: '100%', borderCollapse: 'collapse' as const }
const tableHeaderRow = { backgroundColor: '#f4f4f5' }
const th = { padding: '10px 16px', fontSize: '11px', fontWeight: 'bold' as const, color: '#71717a', textAlign: 'left' as const, textTransform: 'uppercase' as const }
const td = { padding: '12px 16px', fontSize: '13px', color: '#18181b', borderTop: '1px solid #e4e4e7' }
const sellerText = { color: '#a1a1aa', fontSize: '11px' }
const summarySection = { margin: '0 0 24px' }
const summaryLabel = { padding: '4px 0', fontSize: '13px', color: '#71717a' }
const summaryValue = { padding: '4px 0', fontSize: '13px', color: '#18181b', textAlign: 'right' as const }
const divider = { borderTop: '2px solid #008000', margin: '8px 0' }
const totalLabel = { padding: '4px 0', fontSize: '18px', fontWeight: 'bold' as const, color: '#008000' }
const totalValue = { padding: '4px 0', fontSize: '18px', fontWeight: 'bold' as const, color: '#008000', textAlign: 'right' as const }
const infoBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '0 0 24px' }
const infoText = { margin: '0 0 8px', fontSize: '13px', color: '#18181b' }
const footer = { fontSize: '12px', color: '#999999', margin: '8px 0 0', lineHeight: '1.5' }
