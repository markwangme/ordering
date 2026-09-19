/**
 * Default DuitNow QR assets for Restaurants A, B, C
 */
function createSvgQr(merchantName: string, color: string = '#ed0a54') {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="100%" height="100%" style="background-color:white; font-family: sans-serif;">
  <rect x="0" y="0" width="500" height="700" fill="#ffffff" />
  
  <!-- Top DuitNow Logo Section -->
  <g transform="translate(200, 30)">
    <circle cx="50" cy="40" r="30" fill="${color}" />
    <path d="M 38 25 Q 65 20 65 40 Q 65 60 38 55 Z" fill="#ffffff" />
    <circle cx="48" cy="40" r="10" fill="${color}" />
    <text x="50" y="90" text-anchor="middle" font-size="22" font-weight="900" fill="#000000">DuitNow</text>
    <text x="50" y="108" text-anchor="middle" font-size="16" font-weight="bold" fill="${color}">QR</text>
  </g>

  <!-- QR Code Container Outer Frame -->
  <rect x="90" y="150" width="320" height="320" fill="#ffffff" stroke="${color}" stroke-width="4" rx="16" />

  <!-- Inner QR pattern representation -->
  <g fill="${color}">
    <!-- Top-Left Target -->
    <rect x="110" y="170" width="80" height="80" rx="8" />
    <rect x="125" y="185" width="50" height="50" rx="4" fill="#ffffff" />
    <rect x="140" y="200" width="20" height="20" rx="2" fill="${color}" />

    <!-- Top-Right Target -->
    <rect x="310" y="170" width="80" height="80" rx="8" />
    <rect x="325" y="185" width="50" height="50" rx="4" fill="#ffffff" />
    <rect x="340" y="200" width="20" height="20" rx="2" fill="${color}" />

    <!-- Bottom-Left Target -->
    <rect x="110" y="370" width="80" height="80" rx="8" />
    <rect x="125" y="385" width="50" height="50" rx="4" fill="#ffffff" />
    <rect x="140" y="400" width="20" height="20" rx="2" fill="${color}" />

    <!-- QR Data Matrix Dots -->
    <rect x="210" y="170" width="20" height="20" />
    <rect x="250" y="170" width="30" height="20" />
    <rect x="210" y="210" width="40" height="20" />
    <rect x="270" y="210" width="20" height="20" />
    <rect x="200" y="250" width="20" height="40" />
    <rect x="240" y="270" width="40" height="20" />
    <rect x="300" y="270" width="80" height="20" />
    <rect x="110" y="270" width="70" height="20" />
    <rect x="110" y="310" width="30" height="40" />
    <rect x="160" y="310" width="40" height="20" />
    <rect x="220" y="310" width="60" height="40" />
    <rect x="300" y="310" width="40" height="40" />
    <rect x="360" y="310" width="30" height="20" />
    <rect x="210" y="370" width="40" height="30" />
    <rect x="270" y="370" width="30" height="20" />
    <rect x="320" y="370" width="70" height="20" />
    <rect x="210" y="420" width="80" height="30" />
    <rect x="310" y="410" width="40" height="40" />
    <rect x="370" y="410" width="20" height="40" />
  </g>

  <!-- Merchant Name -->
  <text x="250" y="505" text-anchor="middle" font-size="22" font-weight="900" fill="#000000">${merchantName}</text>

  <!-- Banner -->
  <rect x="0" y="530" width="500" height="50" fill="${color}" />
  <text x="250" y="563" text-anchor="middle" font-size="20" font-weight="bold" fill="#ffffff" letter-spacing="2">MALAYSIA NATIONAL QR</text>

  <!-- Bottom eWallet info -->
  <text x="250" y="615" text-anchor="middle" font-size="14" font-weight="600" fill="#444444">Accepted by participating Banks and e-Wallets</text>
  <rect x="180" y="635" width="140" height="45" rx="8" fill="#00529b" />
  <text x="250" y="662" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">Touch 'n Go eWallet</text>
</svg>`;
}

export const DEFAULT_RESTAURANT_A_QR_URL = createSvgQr('A餐厅 DuitNow (Delicious Cuckoo)', '#ed0a54');
export const DEFAULT_RESTAURANT_B_QR_URL = createSvgQr('B餐厅 DuitNow (Economic Rice)', '#0284c7');
export const DEFAULT_RESTAURANT_C_QR_URL = createSvgQr('C餐厅 DuitNow (Roasted Delights)', '#d97706');
export const DEFAULT_RESTAURANT_QR_URL = DEFAULT_RESTAURANT_A_QR_URL;
