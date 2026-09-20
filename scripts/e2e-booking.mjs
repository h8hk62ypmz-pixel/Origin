import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const BASE = process.env.DRIVE_SA_URL || 'http://127.0.0.1:5173'
const outDir = '/opt/cursor/artifacts/screenshots'
fs.mkdirSync(outDir, { recursive: true })

const licencePath = '/tmp/sa-learner-licence.jpg'

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1400,900'],
  })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  await page.goto(BASE + '/')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(outDir, '01-home.png'), fullPage: true })

  await page.getByRole('link', { name: /see open times/i }).click()
  await page.waitForURL('**/book')
  await page.waitForSelector('.slot-row, .slot-chip')
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(outDir, '02-calendar.png'), fullPage: true })

  const firstSlot = page.locator('.slot-row').first()
  await firstSlot.click()
  await page.waitForSelector('#studentName')
  await page.waitForTimeout(400)

  await page.fill('#studentName', 'Alex Chen')
  await page.fill('#phone', '0400 111 222')
  await page.fill('#email', 'alex.chen@example.com')
  await page.fill('#notes', 'Prefer automatic')
  await page.selectOption('#licenceType', 'learner')
  await page.fill('#licenceNumber', 'L7654321')

  await page.locator('input[type="file"]').setInputFiles(licencePath)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, '03-details-licence.png'), fullPage: true })

  await page.getByRole('button', { name: /continue to payment/i }).click()
  await page.waitForSelector('.pay-demo')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, '04-payment.png'), fullPage: true })

  await page.getByRole('button', { name: /pay .* & book/i }).click()
  await page.waitForURL('**/confirmation/**')
  await page.waitForSelector('.success-panel .check')
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(outDir, '05-confirmation.png'), fullPage: true })

  const ref = await page.locator('.booking-meta dd').first().textContent()
  console.log('BOOKING_OK', ref?.trim())

  await page.goto(BASE + '/manage')
  await page.waitForSelector('.calendar-panel h3, .wizard p')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(outDir, '06-my-bookings.png'), fullPage: true })

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
