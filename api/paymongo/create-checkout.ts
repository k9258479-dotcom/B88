export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { amount, phone, description } = req.body || {};
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount < 50) {
    return res.status(400).json({ success: false, message: 'Minimum deposit is ₱50.' });
  }

  const cleanPhone = phone || '09060489645';
  const refNo = `PM-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const txId = `tx_pm_${Date.now()}`;

  // Instant simulation checkout page
  const simCheckoutUrl = `/paymongo-checkout.html?amount=${numAmount}&phone=${cleanPhone}&ref=${refNo}&tx=${txId}`;

  return res.json({
    success: true,
    checkoutUrl: simCheckoutUrl,
    referenceNo: refNo,
    transactionId: txId,
  });
}
