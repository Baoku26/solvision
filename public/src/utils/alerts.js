import { get, set }          from '../services/storage.js';
import { STORAGE_KEYS }      from '../constants.js';
import { pushNotification }  from '../components/notification.js';
import { formatPrice }       from './format.js';

export function checkPriceAlerts(prices) {
  const alerts = get(STORAGE_KEYS.PRICE_ALERTS);
  if (!alerts?.length) return;

  let changed = false;
  for (const alert of alerts) {
    if (alert.triggered) continue;
    const p = prices[alert.mint]?.price;
    if (p == null) continue;

    const crossed = alert.direction === 'above' ? p >= alert.threshold : p <= alert.threshold;
    if (crossed) {
      alert.triggered = true;
      changed = true;
      const arrow = alert.direction === 'above' ? '↑' : '↓';
      pushNotification('◈', `${alert.symbol} ${arrow} ${formatPrice(alert.threshold)}`);
    }
  }

  if (changed) set(STORAGE_KEYS.PRICE_ALERTS, alerts);
}
